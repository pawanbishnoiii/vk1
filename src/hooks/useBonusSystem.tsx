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
  transaction_id: string | null;
  bonus_credited: boolean;
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
  const { data: claimedOffers, refetch: refetchClaims } = useQuery({
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

  // Claim a bonus using atomic database function - DIRECT WALLET CREDIT
  const claimBonus = useMutation({
    mutationFn: async ({ 
      offerId, 
      bonusAmount,
      bonusType = 'deposit',
    }: { 
      offerId: string; 
      bonusAmount: number;
      wageringMultiplier?: number;
      bonusType?: string;
      expiresAt?: string | null;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Use atomic database function for direct bonus claim
      const { data, error } = await supabase.rpc('claim_bonus_direct', {
        p_user_id: user.id,
        p_offer_id: offerId,
        p_bonus_amount: bonusAmount,
        p_bonus_type: bonusType,
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; bonus_id?: string; transaction_id?: string; amount?: number; new_balance?: number };
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to claim bonus');
      }

      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['user-bonuses-full'] });
      queryClient.invalidateQueries({ queryKey: ['claimed-offers'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      
      toast({
        title: '🎉 Bonus Claimed!',
        description: `₹${data.amount?.toLocaleString('en-IN')} has been added to your wallet!`,
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

  // Completed bonuses (credited to wallet)
  const completedBonuses = userBonuses?.filter(b => b.status === 'completed' && b.bonus_credited) || [];
  
  // Active bonuses (waiting for claim)
  const activeBonuses = userBonuses?.filter(b => b.status === 'active') || [];

  // Total bonus earned
  const totalBonusEarned = completedBonuses.reduce((sum, b) => sum + Number(b.bonus_amount || 0), 0);

  // Bonuses needing animation (just claimed)
  const pendingAnimations = userBonuses?.filter(b => !b.animation_shown && b.bonus_credited) || [];

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
    totalBonusEarned,
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