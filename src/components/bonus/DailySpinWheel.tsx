 import { useState, useCallback, useRef } from 'react';
 import { motion, AnimatePresence } from 'framer-motion';
 import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
 import { supabase } from '@/integrations/supabase/client';
 import { useAuth } from '@/hooks/useAuth';
 import { Card, CardContent } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Badge } from '@/components/ui/badge';
 import { useToast } from '@/hooks/use-toast';
 import { formatINR } from '@/lib/formatters';
 import { cn } from '@/lib/utils';
 import { Loader2, Gift, Clock, Sparkles, Star } from 'lucide-react';
 import { SOUNDS, soundManager } from '@/lib/sounds';
 
 interface SpinPrize {
   amount: number;
   probability: number;
   label: string;
   color: string;
 }
 
 interface DailySpinWheelProps {
   offer: {
     id: string;
     title: string;
     spin_prizes: SpinPrize[];
     spin_cooldown_hours: number;
     theme?: string;
   };
 }
 
 // Default prizes if none configured
 const DEFAULT_PRIZES: SpinPrize[] = [
   { amount: 0, probability: 25, label: 'Try Again', color: '#6b7280' },
   { amount: 10, probability: 20, label: '₹10', color: '#22c55e' },
   { amount: 25, probability: 18, label: '₹25', color: '#3b82f6' },
   { amount: 50, probability: 15, label: '₹50', color: '#8b5cf6' },
   { amount: 100, probability: 10, label: '₹100', color: '#f59e0b' },
   { amount: 250, probability: 7, label: '₹250', color: '#ef4444' },
   { amount: 500, probability: 4, label: '₹500', color: '#ec4899' },
   { amount: 1000, probability: 1, label: '₹1000', color: '#f97316' },
 ];
 
 export default function DailySpinWheel({ offer }: DailySpinWheelProps) {
   const { user } = useAuth();
   const { toast } = useToast();
   const queryClient = useQueryClient();
   const [isSpinning, setIsSpinning] = useState(false);
   const [rotation, setRotation] = useState(0);
   const [wonPrize, setWonPrize] = useState<SpinPrize | null>(null);
   const wheelRef = useRef<HTMLDivElement>(null);
 
   const prizes = offer.spin_prizes?.length > 0 ? offer.spin_prizes : DEFAULT_PRIZES;
   const segmentAngle = 360 / prizes.length;
 
   // Check if user can spin
   const { data: lastSpin, isLoading: checkingSpins } = useQuery({
     queryKey: ['last-spin', user?.id, offer.id],
     queryFn: async () => {
       if (!user?.id) return null;
       
       const { data, error } = await supabase
         .from('daily_spins')
         .select('*')
         .eq('user_id', user.id)
         .eq('offer_id', offer.id)
         .order('spun_at', { ascending: false })
         .limit(1)
         .maybeSingle();
       
       if (error) throw error;
       return data;
     },
     enabled: !!user?.id,
   });
 
   // Calculate next spin time
   const getNextSpinTime = useCallback(() => {
     if (!lastSpin) return null;
     const lastSpunAt = new Date(lastSpin.spun_at);
     const cooldownMs = (offer.spin_cooldown_hours || 24) * 60 * 60 * 1000;
     return new Date(lastSpunAt.getTime() + cooldownMs);
   }, [lastSpin, offer.spin_cooldown_hours]);
 
   const nextSpinTime = getNextSpinTime();
   const canSpin = !nextSpinTime || new Date() >= nextSpinTime;
 
   // Calculate time remaining
   const getTimeRemaining = useCallback(() => {
     if (!nextSpinTime || canSpin) return null;
     const diff = nextSpinTime.getTime() - Date.now();
     const hours = Math.floor(diff / (1000 * 60 * 60));
     const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
     return `${hours}h ${minutes}m`;
   }, [nextSpinTime, canSpin]);
 
   // Select prize based on probability
   const selectPrize = useCallback(() => {
     const random = Math.random() * 100;
     let cumulative = 0;
     
     for (let i = 0; i < prizes.length; i++) {
       cumulative += prizes[i].probability;
       if (random <= cumulative) {
         return { prize: prizes[i], index: i };
       }
     }
     return { prize: prizes[0], index: 0 };
   }, [prizes]);
 
   // Claim prize mutation
   const claimPrize = useMutation({
     mutationFn: async ({ prize, index }: { prize: SpinPrize; index: number }) => {
       const { data, error } = await supabase.rpc('claim_spin_prize', {
         p_user_id: user?.id,
         p_offer_id: offer.id,
         p_prize_amount: prize.amount,
         p_prize_index: index,
         p_prize_label: prize.label,
       });
       if (error) throw error;
       return data;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['last-spin'] });
       queryClient.invalidateQueries({ queryKey: ['wallet'] });
     },
   });
 
  const handleSpin = async () => {
    if (isSpinning || !canSpin || !user) return;
    
    setIsSpinning(true);
    setWonPrize(null);
    soundManager.play(SOUNDS.spinStart);
    
    // Select winning prize
    const { prize, index } = selectPrize();
     
     // Calculate rotation
     // The wheel needs to rotate to land on the selected segment
     // Segments are positioned starting from the right (3 o'clock) going clockwise
     const targetAngle = index * segmentAngle + segmentAngle / 2;
     const spins = 5; // Full rotations
     const finalRotation = 360 * spins + (360 - targetAngle) + 90; // +90 to align with pointer at top
     
     setRotation(prev => prev + finalRotation);
     
     // Wait for spin animation to complete
     setTimeout(async () => {
       try {
         const result = await claimPrize.mutateAsync({ prize, index });
          const resultData = result as { success?: boolean; error?: string };
          
          if (resultData.success) {
           setWonPrize(prize);
           if (prize.amount > 0) {
             soundManager.play(SOUNDS.tradeWin);
             toast({
               title: '🎉 Congratulations!',
               description: `You won ${formatINR(prize.amount)}!`,
             });
           } else {
             toast({
               title: '😅 Better Luck Next Time!',
               description: 'Spin again tomorrow!',
             });
           }
         } else {
           toast({
             title: 'Error',
              description: resultData.error || 'Failed to claim prize',
             variant: 'destructive',
           });
         }
       } catch (err: any) {
         toast({
           title: 'Error',
           description: err.message,
           variant: 'destructive',
         });
       } finally {
         setIsSpinning(false);
       }
     }, 5000);
   };
 
   const getThemeClasses = () => {
     switch (offer.theme) {
       case 'gold': return 'from-yellow-500/20 to-amber-600/10 border-yellow-500/30';
       case 'diamond': return 'from-cyan-400/20 to-blue-600/10 border-cyan-400/30';
       case 'fire': return 'from-orange-500/20 to-red-600/10 border-orange-500/30';
       case 'neon': return 'from-purple-500/20 to-pink-500/10 border-purple-500/30';
       default: return 'from-primary/20 to-primary/5 border-primary/30';
     }
   };
 
   return (
     <Card className={cn(
       "relative overflow-hidden border-2 bg-gradient-to-br",
       getThemeClasses()
     )}>
       <CardContent className="p-6 space-y-6">
         {/* Header */}
         <div className="text-center">
           <div className="flex items-center justify-center gap-2 mb-2">
             <Sparkles className="h-6 w-6 text-yellow-500" />
             <h3 className="text-2xl font-bold">{offer.title}</h3>
             <Sparkles className="h-6 w-6 text-yellow-500" />
           </div>
           <p className="text-muted-foreground">Spin to win amazing prizes!</p>
         </div>
 
         {/* Wheel Container */}
         <div className="relative mx-auto w-72 h-72">
           {/* Pointer */}
           <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10">
             <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-yellow-500 drop-shadow-lg" />
           </div>
 
           {/* Wheel */}
           <motion.div
             ref={wheelRef}
             className="w-full h-full rounded-full relative shadow-2xl"
             style={{
               background: 'conic-gradient(from 0deg, ' + 
                 prizes.map((p, i) => 
                   `${p.color} ${i * segmentAngle}deg ${(i + 1) * segmentAngle}deg`
                 ).join(', ') + ')',
             }}
             animate={{ rotate: rotation }}
             transition={{ duration: 5, ease: [0.25, 0.1, 0.25, 1] }}
           >
             {/* Prize Labels */}
             {prizes.map((prize, i) => {
               const angle = i * segmentAngle + segmentAngle / 2;
               return (
                 <div
                   key={i}
                   className="absolute inset-0 flex items-center justify-center"
                   style={{ transform: `rotate(${angle}deg)` }}
                 >
                   <span 
                     className="absolute text-white font-bold text-sm drop-shadow-lg"
                     style={{ 
                       transform: 'translateX(70px) rotate(90deg)',
                       textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
                     }}
                   >
                     {prize.label}
                   </span>
                 </div>
               );
             })}
 
             {/* Center Button */}
             <div className="absolute inset-0 flex items-center justify-center">
               <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 border-4 border-yellow-300 shadow-xl flex items-center justify-center">
                 <Star className="h-8 w-8 text-white fill-white" />
               </div>
             </div>
           </motion.div>
 
           {/* Decorative Ring */}
           <div className="absolute inset-0 rounded-full border-8 border-yellow-500/30 pointer-events-none" />
         </div>
 
         {/* Win Display */}
         <AnimatePresence>
           {wonPrize && (
             <motion.div
               initial={{ opacity: 0, scale: 0.5 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.5 }}
               className={cn(
                 "text-center p-4 rounded-xl",
                 wonPrize.amount > 0 
                   ? "bg-profit/20 border border-profit/30"
                   : "bg-muted/50"
               )}
             >
               <p className="text-2xl font-bold">
                 {wonPrize.amount > 0 ? (
                   <span className="text-profit">🎉 You Won {formatINR(wonPrize.amount)}!</span>
                 ) : (
                   <span className="text-muted-foreground">😅 {wonPrize.label}</span>
                 )}
               </p>
             </motion.div>
           )}
         </AnimatePresence>
 
         {/* Spin Button */}
         <Button
           className={cn(
             "w-full h-14 text-lg font-bold",
             canSpin && !isSpinning
               ? "bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 animate-pulse"
               : ""
           )}
           disabled={!canSpin || isSpinning || checkingSpins}
           onClick={handleSpin}
         >
           {checkingSpins ? (
             <Loader2 className="h-5 w-5 animate-spin" />
           ) : isSpinning ? (
             <>
               <Loader2 className="h-5 w-5 mr-2 animate-spin" />
               Spinning...
             </>
           ) : canSpin ? (
             <>
               <Gift className="h-5 w-5 mr-2" />
               SPIN NOW!
             </>
           ) : (
             <>
               <Clock className="h-5 w-5 mr-2" />
               Next spin in {getTimeRemaining()}
             </>
           )}
         </Button>
 
         {/* Prize List */}
         <div className="grid grid-cols-4 gap-2">
           {prizes.slice(0, 8).map((prize, i) => (
             <div
               key={i}
               className="text-center p-2 rounded-lg bg-background/50"
               style={{ borderLeft: `3px solid ${prize.color}` }}
             >
               <p className="text-xs text-muted-foreground">Prize</p>
               <p className="font-bold text-sm">{prize.label}</p>
             </div>
           ))}
         </div>
       </CardContent>
     </Card>
   );
 }