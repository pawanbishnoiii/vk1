 import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
 import { supabase } from '@/integrations/supabase/client';
 import { useAuth } from './useAuth';
 import { useToast } from './use-toast';
 
 export interface SpinPrize {
   amount: number;
   probability: number;
   label: string;
   color: string;
 }
 
 export function useDailySpin(offerId?: string) {
   const { user } = useAuth();
   const { toast } = useToast();
   const queryClient = useQueryClient();
 
   // Get active spin offers
   const { data: spinOffers, isLoading: loadingOffers } = useQuery({
     queryKey: ['spin-offers'],
     queryFn: async () => {
       const { data, error } = await supabase
         .from('offers')
         .select('*')
         .eq('offer_type', 'daily_spin')
         .eq('is_active', true)
         .eq('spin_enabled', true);
       if (error) throw error;
       return data;
     },
   });
 
   // Get user's spin history
   const { data: spinHistory, isLoading: loadingHistory } = useQuery({
     queryKey: ['spin-history', user?.id],
     queryFn: async () => {
       if (!user?.id) return [];
       const { data, error } = await supabase
         .from('daily_spins')
         .select('*')
         .eq('user_id', user.id)
         .order('spun_at', { ascending: false })
         .limit(50);
       if (error) throw error;
       return data;
     },
     enabled: !!user?.id,
   });
 
   // Check if can spin for specific offer
   const canSpinOffer = (offer: any) => {
     if (!user || !spinHistory) return true;
     
     const lastSpin = spinHistory.find(s => s.offer_id === offer.id);
     if (!lastSpin) return true;
     
     const lastSpunAt = new Date(lastSpin.spun_at);
     const cooldownMs = (offer.spin_cooldown_hours || 24) * 60 * 60 * 1000;
     const nextSpinTime = new Date(lastSpunAt.getTime() + cooldownMs);
     
     return new Date() >= nextSpinTime;
   };
 
   // Claim spin prize
   const claimPrize = useMutation({
     mutationFn: async (params: {
       offerId: string;
       prizeAmount: number;
       prizeIndex: number;
       prizeLabel: string;
     }) => {
       const { data, error } = await supabase.rpc('claim_spin_prize', {
         p_user_id: user?.id,
         p_offer_id: params.offerId,
         p_prize_amount: params.prizeAmount,
         p_prize_index: params.prizeIndex,
         p_prize_label: params.prizeLabel,
       });
       if (error) throw error;
       return data;
     },
     onSuccess: (data: any) => {
       queryClient.invalidateQueries({ queryKey: ['spin-history'] });
       queryClient.invalidateQueries({ queryKey: ['wallet'] });
       
       if (data.success && data.prize_amount > 0) {
         toast({
           title: '🎉 You Won!',
           description: `₹${data.prize_amount} has been added to your wallet!`,
         });
       }
     },
     onError: (error: any) => {
       toast({
         title: 'Spin Failed',
         description: error.message,
         variant: 'destructive',
       });
     },
   });
 
   return {
     spinOffers,
     spinHistory,
     loadingOffers,
     loadingHistory,
     canSpinOffer,
     claimPrize,
   };
 }