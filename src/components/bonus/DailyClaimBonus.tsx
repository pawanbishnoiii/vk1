import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { formatINR } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { Calendar, Gift, Loader2, CheckCircle, Clock, Sparkles } from 'lucide-react';

interface DailyClaimBonusProps {
  offer: {
    id: string;
    title: string;
    description: string | null;
    daily_claim_days?: number;
    daily_min_amount?: number;
    daily_max_amount?: number;
    theme: string | null;
    image_url?: string;
  };
}

export default function DailyClaimBonus({ offer }: DailyClaimBonusProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isClaiming, setIsClaiming] = useState(false);

  const totalDays = offer.daily_claim_days || 7;

  // Fetch claim history
  const { data: claimData } = useQuery({
    queryKey: ['daily-claims', user?.id, offer.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data: claims } = await supabase
        .from('daily_claims')
        .select('*')
        .eq('user_id', user.id)
        .eq('offer_id', offer.id)
        .order('day_number', { ascending: true });
      
      const lastClaim = claims?.[claims.length - 1];
      const canClaimToday = !lastClaim || 
        new Date(lastClaim.claimed_at).toDateString() !== new Date().toDateString();
      
      return {
        claims: claims || [],
        currentDay: lastClaim?.day_number || 0,
        canClaimToday,
        isComplete: (lastClaim?.day_number || 0) >= totalDays,
        totalClaimed: claims?.reduce((sum, c) => sum + Number(c.amount), 0) || 0,
      };
    },
    enabled: !!user?.id,
  });

  const claimDaily = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('claim_daily_bonus', {
        p_user_id: user?.id,
        p_offer_id: offer.id,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      if (data?.success) {
        toast({
          title: `🎉 Day ${data.day} Bonus!`,
          description: `You received ${formatINR(data.amount)}!`,
        });
        queryClient.invalidateQueries({ queryKey: ['daily-claims'] });
        queryClient.invalidateQueries({ queryKey: ['wallet'] });
      } else {
        toast({
          title: 'Error',
          description: data?.error || 'Failed to claim',
          variant: 'destructive',
        });
      }
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleClaim = async () => {
    setIsClaiming(true);
    try {
      await claimDaily.mutateAsync();
    } finally {
      setIsClaiming(false);
    }
  };

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
    >
      <Card className={cn(
        "relative overflow-hidden border-2 transition-all bg-gradient-to-br",
        getThemeClasses()
      )}>
        {offer.image_url && (
          <div 
            className="absolute inset-0 opacity-10 bg-cover bg-center"
            style={{ backgroundImage: `url(${offer.image_url})` }}
          />
        )}

        <CardContent className="relative p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg">{offer.title}</h3>
              <p className="text-sm text-muted-foreground">{offer.description}</p>
            </div>
            <Badge variant="outline" className="font-mono">
              Day {claimData?.currentDay || 0}/{totalDays}
            </Badge>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: totalDays }).map((_, i) => {
              const dayNum = i + 1;
              const isClaimed = claimData?.claims.some(c => c.day_number === dayNum);
              const isToday = dayNum === (claimData?.currentDay || 0) + 1;
              const amount = claimData?.claims.find(c => c.day_number === dayNum)?.amount;
              
              return (
                <motion.div
                  key={dayNum}
                  initial={false}
                  animate={isClaimed ? { scale: [1, 1.1, 1] } : {}}
                  className={cn(
                    "relative p-2 rounded-lg text-center transition-all",
                    isClaimed 
                      ? "bg-profit/20 border border-profit/50" 
                      : isToday && claimData?.canClaimToday
                        ? "bg-primary/20 border-2 border-primary animate-pulse"
                        : "bg-muted/30 border border-border/50"
                  )}
                >
                  <span className="text-xs text-muted-foreground">Day</span>
                  <p className="font-bold">{dayNum}</p>
                  {isClaimed && (
                    <CheckCircle className="absolute -top-1 -right-1 h-4 w-4 text-profit" />
                  )}
                  {amount && (
                    <p className="text-xs text-profit font-mono">+{formatINR(amount)}</p>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
            <div>
              <p className="text-xs text-muted-foreground">Total Claimed</p>
              <p className="font-bold text-profit">{formatINR(claimData?.totalClaimed || 0)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Range</p>
              <p className="font-mono text-sm">
                {formatINR(offer.daily_min_amount || 10)} - {formatINR(offer.daily_max_amount || 100)}
              </p>
            </div>
          </div>

          {/* Claim Button */}
          {!claimData?.isComplete && (
            <Button
              className={cn(
                "w-full h-12 text-lg font-semibold",
                claimData?.canClaimToday
                  ? "bg-gradient-to-r from-primary to-primary/80 animate-pulse"
                  : ""
              )}
              disabled={!claimData?.canClaimToday || isClaiming}
              onClick={handleClaim}
            >
              {isClaiming ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : claimData?.canClaimToday ? (
                <>
                  <Sparkles className="h-5 w-5 mr-2" />
                  Claim Day {(claimData?.currentDay || 0) + 1} Bonus
                </>
              ) : (
                <>
                  <Clock className="h-4 w-4 mr-2" />
                  Come back tomorrow
                </>
              )}
            </Button>
          )}

          {claimData?.isComplete && (
            <div className="text-center p-4 rounded-lg bg-profit/10 border border-profit/30">
              <CheckCircle className="h-8 w-8 text-profit mx-auto mb-2" />
              <p className="font-semibold text-profit">All days claimed!</p>
              <p className="text-sm text-muted-foreground">
                Total earned: {formatINR(claimData?.totalClaimed || 0)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
