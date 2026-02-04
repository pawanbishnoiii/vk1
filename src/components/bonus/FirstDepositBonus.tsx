import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { formatINR } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { Gift, CheckCircle, Lock, Loader2, ArrowRight, Sparkles } from 'lucide-react';

interface FirstDepositBonusProps {
  offer: {
    id: string;
    title: string;
    description: string | null;
    bonus_percentage: number;
    bonus_amount: number;
    min_amount: number;
    max_amount: number | null;
    theme: string | null;
  };
}

export default function FirstDepositBonus({ offer }: FirstDepositBonusProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isClaiming, setIsClaiming] = useState(false);

  // Check if user has made first deposit
  const { data: depositData } = useQuery({
    queryKey: ['first-deposit-check', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      // Get first approved deposit
      const { data: deposit } = await supabase
        .from('deposit_requests')
        .select('id, amount, status')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      
      // Check if already claimed
      const { data: claimed } = await supabase
        .from('user_bonuses')
        .select('id')
        .eq('user_id', user.id)
        .eq('offer_id', offer.id)
        .maybeSingle();
      
      return {
        hasDeposit: !!deposit,
        depositAmount: deposit?.amount || 0,
        isClaimed: !!claimed,
      };
    },
    enabled: !!user?.id,
  });

  const claimBonus = useMutation({
    mutationFn: async () => {
      if (!user?.id || !depositData?.hasDeposit) throw new Error('Not eligible');
      
      // Calculate bonus
      const bonusAmount = offer.bonus_percentage > 0
        ? (depositData.depositAmount * offer.bonus_percentage / 100)
        : offer.bonus_amount;
      
      const finalBonus = offer.max_amount 
        ? Math.min(bonusAmount, offer.max_amount) 
        : bonusAmount;
      
      const { data, error } = await supabase.rpc('claim_bonus_direct', {
        p_user_id: user.id,
        p_offer_id: offer.id,
        p_bonus_amount: finalBonus,
        p_bonus_type: 'first_deposit',
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      if (data?.success) {
        toast({
          title: '🎉 Bonus Claimed!',
          description: `${formatINR(data.bonus_amount)} has been added to your wallet!`,
        });
        queryClient.invalidateQueries({ queryKey: ['first-deposit-check'] });
        queryClient.invalidateQueries({ queryKey: ['wallet'] });
      } else {
        toast({
          title: 'Error',
          description: data?.error || 'Failed to claim bonus',
          variant: 'destructive',
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleClaim = async () => {
    setIsClaiming(true);
    try {
      await claimBonus.mutateAsync();
    } finally {
      setIsClaiming(false);
    }
  };

  const progress = depositData?.hasDeposit ? 100 : 0;
  const isClaimable = depositData?.hasDeposit && !depositData?.isClaimed;
  const isClaimed = depositData?.isClaimed;

  const getThemeClasses = () => {
    switch (offer.theme) {
      case 'gold':
        return 'from-yellow-500/20 to-amber-600/10 border-yellow-500/30';
      case 'diamond':
        return 'from-cyan-400/20 to-blue-600/10 border-cyan-400/30';
      case 'fire':
        return 'from-orange-500/20 to-red-600/10 border-orange-500/30';
      case 'neon':
        return 'from-purple-500/20 to-pink-500/10 border-purple-500/30';
      case 'emerald':
        return 'from-emerald-500/20 to-teal-600/10 border-emerald-500/30';
      default:
        return 'from-primary/20 to-primary/5 border-primary/30';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
    >
      <Card className={cn(
        "relative overflow-hidden border-2 transition-all",
        "bg-gradient-to-br",
        getThemeClasses(),
        isClaimed && "opacity-60"
      )}>
        {/* Sparkle effects */}
        {isClaimable && (
          <motion.div
            className="absolute top-2 right-2"
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          >
            <Sparkles className="h-5 w-5 text-yellow-500" />
          </motion.div>
        )}

        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-600 shadow-lg">
              <Gift className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg">{offer.title}</h3>
              <p className="text-sm text-muted-foreground">{offer.description}</p>
            </div>
            {isClaimed && (
              <Badge className="bg-profit/20 text-profit">
                <CheckCircle className="h-3 w-3 mr-1" /> Claimed
              </Badge>
            )}
          </div>

          {/* Bonus details */}
          <div className="p-4 rounded-lg bg-background/50 backdrop-blur">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Bonus</span>
              <span className="font-bold text-lg text-profit">
                {offer.bonus_percentage > 0 
                  ? `${offer.bonus_percentage}% up to ${formatINR(offer.max_amount || 10000)}`
                  : formatINR(offer.bonus_amount)
                }
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Min Deposit: {formatINR(offer.min_amount)}</span>
              {offer.max_amount && <span>Max Bonus: {formatINR(offer.max_amount)}</span>}
            </div>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-mono">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              {!depositData?.hasDeposit 
                ? 'Make your first deposit to unlock' 
                : isClaimed 
                  ? 'Bonus claimed successfully!' 
                  : 'Ready to claim!'}
            </p>
          </div>

          {/* Action Button */}
          {!isClaimed && (
            <Button
              className={cn(
                "w-full h-12 text-lg font-semibold transition-all",
                isClaimable
                  ? "bg-gradient-to-r from-profit to-profit/80 hover:from-profit/90 hover:to-profit/70"
                  : ""
              )}
              disabled={!isClaimable || isClaiming}
              onClick={handleClaim}
            >
              {isClaiming ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : isClaimable ? (
                <>
                  🎁 Claim Bonus
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Deposit to Unlock
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
