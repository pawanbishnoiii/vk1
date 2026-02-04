import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatINR } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { Percent, Wallet, CheckCircle, ArrowRight, Sparkles } from 'lucide-react';

interface DepositDiscountBonusProps {
  offer: {
    id: string;
    title: string;
    description: string | null;
    deposit_target?: number;
    extra_credit_fixed?: number;
    extra_credit_percent?: number;
    theme: string | null;
  };
}

export default function DepositDiscountBonus({ offer }: DepositDiscountBonusProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const depositTarget = offer.deposit_target || 1000;
  const extraFixed = offer.extra_credit_fixed || 0;
  const extraPercent = offer.extra_credit_percent || 0;

  // Fetch deposit progress
  const { data: progressData } = useQuery({
    queryKey: ['deposit-discount-progress', user?.id, offer.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      // Check if already used
      const { data: claimed } = await supabase
        .from('user_bonuses')
        .select('id')
        .eq('user_id', user.id)
        .eq('offer_id', offer.id)
        .maybeSingle();
      
      // Get total deposits
      const { data: deposits } = await supabase
        .from('deposit_requests')
        .select('amount')
        .eq('user_id', user.id)
        .eq('status', 'approved');
      
      const totalDeposited = deposits?.reduce((sum, d) => sum + Number(d.amount), 0) || 0;
      
      return {
        totalDeposited,
        target: depositTarget,
        progress: Math.min(100, (totalDeposited / depositTarget) * 100),
        isCompleted: totalDeposited >= depositTarget,
        isClaimed: !!claimed,
      };
    },
    enabled: !!user?.id,
  });

  const getThemeClasses = () => {
    switch (offer.theme) {
      case 'gold': return 'from-yellow-500/20 to-amber-600/10 border-yellow-500/30';
      case 'diamond': return 'from-cyan-400/20 to-blue-600/10 border-cyan-400/30';
      case 'fire': return 'from-orange-500/20 to-red-600/10 border-orange-500/30';
      case 'neon': return 'from-purple-500/20 to-pink-500/10 border-purple-500/30';
      case 'emerald': return 'from-emerald-500/20 to-teal-600/10 border-emerald-500/30';
      default: return 'from-primary/20 to-primary/5 border-primary/30';
    }
  };

  const getBonusText = () => {
    if (extraFixed > 0 && extraPercent > 0) {
      return `${formatINR(extraFixed)} + ${extraPercent}%`;
    }
    if (extraFixed > 0) return formatINR(extraFixed);
    if (extraPercent > 0) return `${extraPercent}% Extra`;
    return 'Extra Credit';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
    >
      <Card className={cn(
        "relative overflow-hidden border-2 transition-all bg-gradient-to-br",
        getThemeClasses(),
        progressData?.isClaimed && "opacity-60"
      )}>
        {/* Animated background */}
        {!progressData?.isClaimed && progressData?.isCompleted && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}

        <CardContent className="relative p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg">
              <Percent className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg">{offer.title}</h3>
              <p className="text-sm text-muted-foreground">{offer.description}</p>
            </div>
            {progressData?.isClaimed && (
              <Badge className="bg-profit/20 text-profit">
                <CheckCircle className="h-3 w-3 mr-1" /> Used
              </Badge>
            )}
          </div>

          {/* Bonus Details */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-background/50 text-center">
              <p className="text-xs text-muted-foreground">Deposit Target</p>
              <p className="font-bold text-lg">{formatINR(depositTarget)}</p>
            </div>
            <div className="p-3 rounded-lg bg-profit/10 text-center">
              <p className="text-xs text-muted-foreground">Extra Credit</p>
              <p className="font-bold text-lg text-profit">{getBonusText()}</p>
            </div>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Your Deposits</span>
              <span className="font-mono font-semibold">
                {formatINR(progressData?.totalDeposited || 0)} / {formatINR(depositTarget)}
              </span>
            </div>
            <Progress value={progressData?.progress || 0} className="h-3" />
            {!progressData?.isCompleted && (
              <p className="text-xs text-center text-muted-foreground">
                Deposit {formatINR(depositTarget - (progressData?.totalDeposited || 0))} more to unlock
              </p>
            )}
          </div>

          {/* Action */}
          {!progressData?.isClaimed && (
            <Button
              className={cn(
                "w-full h-12 text-lg font-semibold",
                progressData?.isCompleted
                  ? "bg-gradient-to-r from-profit to-profit/80"
                  : ""
              )}
              onClick={() => navigate('/wallet')}
            >
              {progressData?.isCompleted ? (
                <>
                  <Sparkles className="h-5 w-5 mr-2" />
                  Auto-Applied on Next Deposit
                </>
              ) : (
                <>
                  <Wallet className="h-4 w-4 mr-2" />
                  Deposit Now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          )}

          {progressData?.isCompleted && !progressData?.isClaimed && (
            <p className="text-xs text-center text-profit">
              ✨ Bonus will be automatically added to your next deposit!
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
