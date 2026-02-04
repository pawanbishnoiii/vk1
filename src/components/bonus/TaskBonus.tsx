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
import { Target, Trophy, Loader2, CheckCircle, ArrowRight, Zap } from 'lucide-react';

interface TaskBonusProps {
  offer: {
    id: string;
    title: string;
    description: string | null;
    bonus_amount: number;
    task_target_count?: number;
    task_type?: string;
    theme: string | null;
  };
}

export default function TaskBonus({ offer }: TaskBonusProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isClaiming, setIsClaiming] = useState(false);

  const targetCount = offer.task_target_count || 5;

  // Fetch task progress
  const { data: progressData } = useQuery({
    queryKey: ['task-progress', user?.id, offer.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      // Get progress record
      const { data: progress } = await supabase
        .from('bonus_task_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('offer_id', offer.id)
        .maybeSingle();
      
      // If no progress, calculate from trades
      if (!progress) {
        const { count } = await supabase
          .from('trades')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .in('status', ['won', 'lost']);
        
        return {
          current: count || 0,
          target: targetCount,
          isCompleted: (count || 0) >= targetCount,
          isClaimed: false,
        };
      }
      
      return {
        current: progress.current_progress,
        target: progress.target_progress,
        isCompleted: progress.is_completed,
        isClaimed: progress.is_claimed,
      };
    },
    enabled: !!user?.id,
  });

  const claimBonus = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('claim_task_bonus', {
        p_user_id: user?.id,
        p_offer_id: offer.id,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      if (data?.success) {
        toast({
          title: '🎯 Task Completed!',
          description: `You received ${formatINR(data.amount)}!`,
        });
        queryClient.invalidateQueries({ queryKey: ['task-progress'] });
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
      await claimBonus.mutateAsync();
    } finally {
      setIsClaiming(false);
    }
  };

  const progress = progressData 
    ? Math.min(100, (progressData.current / progressData.target) * 100)
    : 0;

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

  const getTaskLabel = () => {
    switch (offer.task_type) {
      case 'trades': return 'trades';
      case 'deposits': return 'deposits';
      case 'wins': return 'winning trades';
      default: return 'tasks';
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
        getThemeClasses(),
        progressData?.isClaimed && "opacity-60"
      )}>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 shadow-lg">
              <Target className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg">{offer.title}</h3>
              <p className="text-sm text-muted-foreground">{offer.description}</p>
            </div>
            {progressData?.isClaimed && (
              <Badge className="bg-profit/20 text-profit">
                <CheckCircle className="h-3 w-3 mr-1" /> Claimed
              </Badge>
            )}
          </div>

          {/* Task Target */}
          <div className="p-4 rounded-lg bg-background/50 backdrop-blur">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-muted-foreground">Complete {targetCount} {getTaskLabel()}</span>
              <span className="font-bold text-profit">{formatINR(offer.bonus_amount)}</span>
            </div>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-mono font-semibold">
                {progressData?.current || 0} / {progressData?.target || targetCount}
              </span>
            </div>
            <Progress value={progress} className="h-3" />
            
            {/* Progress milestones */}
            <div className="flex justify-between">
              {Array.from({ length: Math.min(5, targetCount) }).map((_, i) => {
                const milestone = Math.round((targetCount / Math.min(5, targetCount)) * (i + 1));
                const reached = (progressData?.current || 0) >= milestone;
                return (
                  <div 
                    key={i} 
                    className={cn(
                      "flex flex-col items-center",
                      reached ? "text-profit" : "text-muted-foreground"
                    )}
                  >
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                      reached ? "bg-profit text-white" : "bg-muted"
                    )}>
                      {reached ? <CheckCircle className="h-4 w-4" /> : milestone}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Button */}
          {!progressData?.isClaimed && (
            <Button
              className={cn(
                "w-full h-12 text-lg font-semibold",
                progressData?.isCompleted
                  ? "bg-gradient-to-r from-profit to-profit/80 animate-pulse"
                  : ""
              )}
              disabled={!progressData?.isCompleted || isClaiming}
              onClick={handleClaim}
            >
              {isClaiming ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : progressData?.isCompleted ? (
                <>
                  <Trophy className="h-5 w-5 mr-2" />
                  Claim {formatINR(offer.bonus_amount)}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  {progressData?.target - (progressData?.current || 0)} more to go
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
