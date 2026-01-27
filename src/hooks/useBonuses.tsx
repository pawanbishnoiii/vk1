import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { useWallet } from './useWallet';

interface UserBonus {
  id: string;
  user_id: string;
  offer_id: string;
  bonus_amount: number;
  wagering_required: number;
  wagering_completed: number;
  status: 'active' | 'completed' | 'expired' | 'cancelled';
  claimed_at: string;
  expires_at: string | null;
  completed_at: string | null;
  created_at: string;
  offer?: {
    title: string;
    description: string | null;
    offer_type: string;
  };
}

export function useBonuses() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { refetch: refetchWallet } = useWallet();
  const queryClient = useQueryClient();

  // Fetch user's claimed bonuses
  const { data: userBonuses, isLoading } = useQuery({
    queryKey: ['user-bonuses', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('user_bonuses')
        .select(`
          *,
          offer:offers(title, description, offer_type)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as UserBonus[];
    },
    enabled: !!user?.id,
  });

  // Check if user has already claimed a specific offer
  const hasClaimedOffer = (offerId: string) => {
    return userBonuses?.some(b => b.offer_id === offerId) || false;
  };

  // Claim a bonus
  const claimBonus = useMutation({
    mutationFn: async ({ 
      offerId, 
      bonusAmount,
      wageringMultiplier = 0,
      expiresAt = null,
    }: { 
      offerId: string; 
      bonusAmount: number;
      wageringMultiplier?: number;
      expiresAt?: string | null;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Check if already claimed
      const { data: existing } = await supabase
        .from('user_bonuses')
        .select('id')
        .eq('user_id', user.id)
        .eq('offer_id', offerId)
        .maybeSingle();

      if (existing) {
        throw new Error('Bonus already claimed');
      }

      // Calculate wagering requirement
      const wageringRequired = bonusAmount * wageringMultiplier;

      // Create user bonus record
      const { error: bonusError } = await supabase
        .from('user_bonuses')
        .insert({
          user_id: user.id,
          offer_id: offerId,
          bonus_amount: bonusAmount,
          wagering_required: wageringRequired,
          wagering_completed: 0,
          status: wageringRequired > 0 ? 'active' : 'completed',
          expires_at: expiresAt,
          completed_at: wageringRequired > 0 ? null : new Date().toISOString(),
        });

      if (bonusError) throw bonusError;

      // If no wagering required, credit to wallet immediately
      if (wageringRequired === 0) {
        // Get current wallet balance
        const { data: wallet } = await supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', user.id)
          .single();

        const currentBalance = Number(wallet?.balance || 0);
        const newBalance = currentBalance + bonusAmount;

        // Update wallet
        await supabase
          .from('wallets')
          .update({ balance: newBalance })
          .eq('user_id', user.id);

        // Create transaction
        await supabase.from('transactions').insert({
          user_id: user.id,
          type: 'bonus',
          amount: bonusAmount,
          balance_before: currentBalance,
          balance_after: newBalance,
          description: 'Bonus credited',
        });

        // Create notification
        await supabase.from('notifications').insert({
          user_id: user.id,
          title: '🎁 Bonus Credited!',
          message: `₹${bonusAmount.toLocaleString('en-IN')} bonus has been added to your wallet!`,
          type: 'bonus',
        });
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-bonuses'] });
      refetchWallet();
      toast({
        title: '🎉 Bonus Claimed!',
        description: 'Your bonus has been credited successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to claim bonus',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Get active bonuses with wagering progress
  const activeBonuses = userBonuses?.filter(b => b.status === 'active') || [];
  
  // Get completed bonuses
  const completedBonuses = userBonuses?.filter(b => b.status === 'completed') || [];

  return {
    userBonuses,
    activeBonuses,
    completedBonuses,
    isLoading,
    hasClaimedOffer,
    claimBonus: claimBonus.mutate,
    isClaiming: claimBonus.isPending,
  };
}