import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useWallet } from './useWallet';
import { useSettings } from './useSettings';
import { useToast } from './use-toast';
import { formatINR } from '@/lib/formatters';
import { SOUNDS, soundManager } from '@/lib/sounds';

interface Trade {
  id: string;
  user_id: string;
  trading_pair: string;
  trade_type: 'buy' | 'sell';
  amount: number;
  entry_price: number;
  exit_price: number | null;
  profit_loss: number | null;
  status: 'pending' | 'won' | 'lost' | 'cancelled';
  duration_seconds: number | null;
  timer_started_at: string | null;
  expected_result: string | null;
  created_at: string;
  closed_at: string | null;
  admin_override: boolean | null;
}

export function useActiveTrade() {
  const { user } = useAuth();
  const { balance, refetch: refetchWallet } = useWallet();
  const { settings } = useSettings();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [countdown, setCountdown] = useState(0);
  const [tradeResult, setTradeResult] = useState<'won' | 'lost' | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef(false);

  // Fetch active trade on mount
  const { data: activeTrade, refetch: refetchTrade } = useQuery({
    queryKey: ['active-trade', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data as unknown as Trade | null;
    },
    enabled: !!user?.id,
    staleTime: 1000,
  });

  // Calculate remaining time from server data
  useEffect(() => {
    if (!activeTrade) {
      setCountdown(0);
      return;
    }

    const calculateRemaining = () => {
      const timerStarted = activeTrade.timer_started_at 
        ? new Date(activeTrade.timer_started_at).getTime() 
        : new Date(activeTrade.created_at).getTime();
      const endTime = timerStarted + (activeTrade.duration_seconds || 30) * 1000;
      
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((endTime - now) / 1000));
      
      return remaining;
    };

    const remaining = calculateRemaining();
    setCountdown(remaining);

    if (remaining <= 0) {
      // Trade expired, process it
      completeTrade();
    }
  }, [activeTrade]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0 || !activeTrade) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          completeTrade();
          return 0;
        }
        // Play tick sound in last 5 seconds
        if (prev <= 6) {
          soundManager.play(SOUNDS.countdown);
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown, activeTrade]);

  // Complete trade - call edge function or process locally
  const completeTrade = useCallback(async () => {
    if (!activeTrade || !user || processingRef.current) return;
    
    processingRef.current = true;
    setIsProcessing(true);

    try {
      // Try to call edge function first
      const { data, error } = await supabase.functions.invoke('process-trade', {
        body: { tradeId: activeTrade.id, userId: user.id }
      });

      if (error) {
        console.error('Edge function error, falling back to local processing:', error);
        await processTradeLocally();
        return;
      }

      if (data.success) {
        const won = data.won;
        
        if (won) {
          soundManager.play(SOUNDS.tradeWin);
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 3000);
        } else {
          soundManager.play(SOUNDS.tradeLoss);
        }

        setTradeResult(won ? 'won' : 'lost');
        
        toast({
          title: won ? '🎉 Trade Won!' : '📉 Trade Lost',
          description: won 
            ? `You won ${formatINR(data.profitLoss)}!`
            : `You lost ${formatINR(Math.abs(data.profitLoss))}`,
          variant: won ? 'default' : 'destructive',
        });

        // Refetch data
        refetchWallet();
        queryClient.invalidateQueries({ queryKey: ['active-trade'] });
        queryClient.invalidateQueries({ queryKey: ['trades-history'] });
        queryClient.invalidateQueries({ queryKey: ['recent-trades'] });

        // Reset after showing result
        setTimeout(() => {
          setTradeResult(null);
          processingRef.current = false;
          setIsProcessing(false);
        }, 3000);
      }
    } catch (err) {
      console.error('Trade completion error:', err);
      await processTradeLocally();
    }
  }, [activeTrade, user, balance, toast, refetchWallet, queryClient]);

  // Fallback local processing
  const processTradeLocally = async () => {
    if (!activeTrade || !user) return;

    try {
      // Get the latest trade status
      const { data: latestTrade, error: fetchError } = await supabase
        .from('trades')
        .select('*')
        .eq('id', activeTrade.id)
        .single();

      if (fetchError) throw fetchError;
      
      // Already processed
      if (latestTrade.status !== 'pending') {
        setTradeResult(latestTrade.status === 'won' ? 'won' : 'lost');
        refetchWallet();
        setTimeout(() => {
          setTradeResult(null);
          processingRef.current = false;
          setIsProcessing(false);
        }, 3000);
        return;
      }

      // Determine result
      let won = false;
      if (latestTrade.expected_result === 'win') {
        won = true;
      } else if (latestTrade.expected_result === 'loss') {
        won = false;
      } else {
        const winRate = settings?.global_win_rate || 45;
        won = Math.random() * 100 < winRate;
      }

      const amount = Number(activeTrade.amount);
      const profitPercentage = 80; // Default profit percentage
      const profitLoss = won ? amount * (profitPercentage / 100) : -amount;
      const newBalance = won ? balance + profitLoss : balance - amount;

      // Update trade
      await supabase
        .from('trades')
        .update({
          exit_price: Number(activeTrade.entry_price) * (won ? 1.01 : 0.99),
          profit_loss: profitLoss,
          status: won ? 'won' : 'lost',
          closed_at: new Date().toISOString(),
        })
        .eq('id', activeTrade.id);

      // Update wallet
      await supabase
        .from('wallets')
        .update({ 
          balance: newBalance,
          locked_balance: 0 
        })
        .eq('user_id', user.id);

      // Create transaction
      await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          type: won ? 'trade_win' : 'trade_loss',
          amount: profitLoss,
          balance_before: balance,
          balance_after: newBalance,
          reference_id: activeTrade.id,
          description: `${activeTrade.trade_type.toUpperCase()} ${activeTrade.trading_pair} - ${won ? 'Won' : 'Lost'}`,
        });

      // Create notification
      await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          title: won ? '🎉 Trade Won!' : '📉 Trade Lost',
          message: won 
            ? `You won ${formatINR(profitLoss)} on ${activeTrade.trading_pair}!`
            : `You lost ${formatINR(Math.abs(profitLoss))} on ${activeTrade.trading_pair}`,
          type: 'trade_result',
          metadata: { tradeId: activeTrade.id, won, profitLoss },
        });

      // Play sounds and show result
      if (won) {
        soundManager.play(SOUNDS.tradeWin);
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      } else {
        soundManager.play(SOUNDS.tradeLoss);
      }

      setTradeResult(won ? 'won' : 'lost');
      refetchWallet();
      queryClient.invalidateQueries({ queryKey: ['active-trade'] });

      toast({
        title: won ? '🎉 Trade Won!' : '📉 Trade Lost',
        description: won 
          ? `You won ${formatINR(profitLoss)}!`
          : `You lost ${formatINR(Math.abs(profitLoss))}`,
        variant: won ? 'default' : 'destructive',
      });

      setTimeout(() => {
        setTradeResult(null);
        processingRef.current = false;
        setIsProcessing(false);
      }, 3000);

    } catch (err) {
      console.error('Local trade processing error:', err);
      processingRef.current = false;
      setIsProcessing(false);
    }
  };

  // Place new trade
  const placeTrade = async (
    tradeType: 'buy' | 'sell',
    amount: number,
    tradingPair: string,
    entryPrice: number
  ) => {
    if (!user || amount <= 0 || entryPrice <= 0) return null;

    const tradeDuration = settings?.trade_duration || 30;
    const now = new Date();
    const endTime = new Date(now.getTime() + tradeDuration * 1000);

    try {
      soundManager.play(SOUNDS.tradeStart);

      // Create trade with end_time for server-side tracking
      const { data: trade, error } = await supabase
        .from('trades')
        .insert({
          user_id: user.id,
          trading_pair: tradingPair,
          trade_type: tradeType,
          amount: amount,
          entry_price: entryPrice,
          status: 'pending',
          duration_seconds: tradeDuration,
          timer_started_at: now.toISOString(),
          end_time: endTime.toISOString(),
          profit_percentage: 80,
        })
        .select()
        .single();

      if (error) throw error;

      // Lock balance
      await supabase
        .from('wallets')
        .update({ locked_balance: amount })
        .eq('user_id', user.id);

      refetchWallet();
      refetchTrade();
      setCountdown(tradeDuration);

      return trade;
    } catch (err: any) {
      console.error('Place trade error:', err);
      throw err;
    }
  };

  return {
    activeTrade,
    countdown,
    tradeResult,
    showConfetti,
    isProcessing,
    placeTrade,
    refetchTrade,
    tradeDuration: settings?.trade_duration || 30,
  };
}