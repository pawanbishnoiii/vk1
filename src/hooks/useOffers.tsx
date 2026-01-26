import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Offer {
  id: string;
  title: string;
  description: string | null;
  offer_type: 'first_deposit' | 'deposit_bonus' | 'trade_bonus';
  bonus_percentage: number;
  bonus_amount: number;
  min_amount: number;
  max_amount: number | null;
  is_active: boolean;
  valid_from: string;
  valid_until: string | null;
  created_at: string;
}

export function useOffers() {
  const { data: offers, isLoading, error } = useQuery({
    queryKey: ['offers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Offer[];
    },
    staleTime: 60000, // 1 minute
  });

  const getFirstDepositOffer = () => {
    return offers?.find(o => o.offer_type === 'first_deposit');
  };

  const getDepositBonusOffers = () => {
    return offers?.filter(o => o.offer_type === 'deposit_bonus') || [];
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

  return {
    offers: offers || [],
    isLoading,
    error,
    getFirstDepositOffer,
    getDepositBonusOffers,
    calculateBonus,
  };
}
