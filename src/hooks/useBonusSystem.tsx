import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { BONUS_TYPES, BonusType } from '@/lib/bonusConfig';

interface UserBonus {
  id: string;
  user_id: string;
  offer_id: string | null;
  bonus_amount: number;
  locked_amount: number;
  unlocked_amount: number;
  wagering_required: number;
  wagering_completed: number;
  status: 'active' | 'completed' | 'expired' | 'cancelled';
  bonus_type: string;
  animation_shown: boolean;
  claimed_at: string;
  expires_at: string | null;
  completed_at: string | null;
  created_at: string;
  offer?: {
    title: string;
    description: string | null;
    offer_type: string;
    theme: string | null;
    icon: string | null;
    animation: string | null;
    color_scheme: string | null;
  };
}

interface Offer {
  id: string;
  title: string;
  description: string | null;
  offer_type: string;
  bonus_amount: number;
  bonus_percentage: number;
  min_amount: number;
  max_amount: number | null;
  wagering_multiplier: number;
  one_time_only: boolean;
  theme: string | null;
  icon: string | null;
  animation: string | null;
  color_scheme: string | null;
  lossback_percentage: number;
  referral_reward: number;
  vip_level: number;
  auto_apply: boolean;
  is_active: boolean;
  valid_from: string;
  valid_until: string | null;
}

export function useBonusSystem() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all active offers
  const { data: offers, isLoading: offersLoading } = useQuery({
    queryKey: ['bonus-offers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Offer[];
    },
    staleTime: 60000,
  });

  // Fetch user's bonuses
  const { data: userBonuses, isLoading: bonusesLoading, refetch: refetchBonuses } = useQuery({
    queryKey: ['user-bonuses-full', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('user_bonuses')
        .select(`
          *,
          offer:offers(title, description, offer_type, theme, icon, animation, color_scheme)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as UserBonus[];
    },
    enabled: !!user?.id,
  });

  // Check if user has claimed a specific offer
  const { data: claimedOffers } = useQuery({
    queryKey: ['claimed-offers', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('bonus_claims')
        .select('offer_id')
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data.map(c => c.offer_id);
    },
    enabled: !!user?.id,
  });

  // Claim a bonus
  const claimBonus = useMutation({
    mutationFn: async ({ 
      offerId, 
      bonusAmount,
      wageringMultiplier = 0,
      bonusType = 'deposit',
      expiresAt = null,
    }: { 
      offerId: string; 
      bonusAmount: number;
      wageringMultiplier?: number;
      bonusType?: string;
      expiresAt?: string | null;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Check if already claimed (for one-time offers)
      const { data: existing } = await supabase
        .from('bonus_claims')
        .select('id')
        .eq('user_id', user.id)
        .eq('offer_id', offerId)
        .maybeSingle();

      if (existing) {
        throw new Error('Bonus already claimed');
      }

      const wageringRequired = bonusAmount * wageringMultiplier;

      // Create user bonus record
      const { error: bonusError } = await supabase
        .from('user_bonuses')
        .insert({
          user_id: user.id,
          offer_id: offerId,
          bonus_amount: bonusAmount,
          locked_amount: wageringRequired > 0 ? bonusAmount : 0,
          wagering_required: wageringRequired,
          wagering_completed: 0,
          status: wageringRequired > 0 ? 'active' : 'completed',
          bonus_type: bonusType,
          expires_at: expiresAt,
          completed_at: wageringRequired > 0 ? null : new Date().toISOString(),
        });

      if (bonusError) throw bonusError;

      // Record claim
      await supabase
        .from('bonus_claims')
        .insert({ user_id: user.id, offer_id: offerId });

      // If no wagering, credit immediately
      if (wageringRequired === 0) {
        const { data: wallet } = await supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', user.id)
          .single();

        const currentBalance = Number(wallet?.balance || 0);
        const newBalance = currentBalance + bonusAmount;

        await supabase
          .from('wallets')
          .update({ balance: newBalance })
          .eq('user_id', user.id);

        await supabase.from('transactions').insert({
          user_id: user.id,
          type: 'bonus',
          amount: bonusAmount,
          balance_before: currentBalance,
          balance_after: newBalance,
          description: 'Bonus credited',
        });

        await supabase.from('notifications').insert({
          user_id: user.id,
          title: '🎁 Bonus Credited!',
          message: `₹${bonusAmount.toLocaleString('en-IN')} bonus has been added to your wallet!`,
          type: 'bonus',
        });
      } else {
        // Add to locked balance
        const { data: wallet } = await supabase
          .from('wallets')
          .select('locked_balance')
          .eq('user_id', user.id)
          .single();

        const currentLocked = Number(wallet?.locked_balance || 0);
        
        await supabase
          .from('wallets')
          .update({ locked_balance: currentLocked + bonusAmount })
          .eq('user_id', user.id);

        await supabase.from('notifications').insert({
          user_id: user.id,
          title: '🎁 Bonus Added!',
          message: `₹${bonusAmount.toLocaleString('en-IN')} bonus is locked. Complete ₹${wageringRequired.toLocaleString('en-IN')} wagering to unlock!`,
          type: 'bonus',
        });
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-bonuses-full'] });
      queryClient.invalidateQueries({ queryKey: ['claimed-offers'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      toast({
        title: '🎉 Bonus Claimed!',
        description: 'Your bonus has been added successfully',
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

  // Mark animation as shown
  const markAnimationShown = useMutation({
    mutationFn: async (bonusId: string) => {
      await supabase
        .from('user_bonuses')
        .update({ animation_shown: true })
        .eq('id', bonusId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-bonuses-full'] });
    },
  });

  // Helper functions
  const hasClaimedOffer = (offerId: string) => {
    return claimedOffers?.includes(offerId) || false;
  };

  const getOffersByType = (type: BonusType) => {
    return offers?.filter(o => o.offer_type === type) || [];
  };

  const getFirstDepositOffer = () => {
    return offers?.find(o => o.offer_type === 'first_deposit' && !hasClaimedOffer(o.id));
  };

  const calculateBonus = (amount: number, offer: Offer) => {
    let bonus = 0;
    
    if (offer.bonus_percentage > 0) {
      bonus = (amount * offer.bonus_percentage) / 100;
    }
    
    if (offer.bonus_amount > 0) {
      bonus += offer.bonus_amount;
    }
    
    if (offer.max_amount && bonus > offer.max_amount) {
      bonus = offer.max_amount;
    }
    
    return bonus;
  };

  // Active bonuses with wagering progress
  const activeBonuses = userBonuses?.filter(b => b.status === 'active') || [];
  
  // Completed bonuses
  const completedBonuses = userBonuses?.filter(b => b.status === 'completed') || [];

  // Total locked bonus amount
  const totalLockedBonus = activeBonuses.reduce((sum, b) => sum + Number(b.locked_amount || 0), 0);

  // Bonuses needing animation (first time showing)
  const pendingAnimations = userBonuses?.filter(b => !b.animation_shown && b.status === 'active') || [];

  return {
    // Offers
    offers: offers || [],
    offersLoading,
    getOffersByType,
    getFirstDepositOffer,
    calculateBonus,
    
    // User bonuses
    userBonuses: userBonuses || [],
    bonusesLoading,
    activeBonuses,
    completedBonuses,
    totalLockedBonus,
    pendingAnimations,
    refetchBonuses,
    
    // Claims
    hasClaimedOffer,
    claimBonus: claimBonus.mutate,
    isClaiming: claimBonus.isPending,
    
    // Animation
    markAnimationShown: markAnimationShown.mutate,
  };
}
