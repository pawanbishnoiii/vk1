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
  display_id: number | null;
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
  processing_status?: string;
  settlement_id?: string | null;
}

// Session-level tracking to prevent duplicate notifications across re-renders
const processedTradeIds = new Set<string>();

export function useActiveTrade() {
  const { user } = useAuth();
  const { refetch: refetchWallet } = useWallet();
  const { settings } = useSettings();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [countdown, setCountdown] = useState(0);
  const [tradeResult, setTradeResult] = useState<'won' | 'lost' | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef(false);
  const resultShownRef = useRef<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch active trade - poll for updates
  const { data: activeTrade, refetch: refetchTrade } = useQuery({
    queryKey: ['active-trade', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      // First check for pending trades
      const { data: pending, error: pendingError } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (pendingError) throw pendingError;
      if (pending) return pending as unknown as Trade;
      
      // If no pending, check for recently completed trades (within last 5 seconds) to show result
      const fiveSecondsAgo = new Date(Date.now() - 5000).toISOString();
      const { data: recent } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['won', 'lost'])
        .gte('closed_at', fiveSecondsAgo)
        .order('closed_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (recent && !processedTradeIds.has(recent.id)) {
        return recent as unknown as Trade;
      }
      
      return null;
    },
    enabled: !!user?.id,
    staleTime: 500,
    refetchInterval: (query) => {
      const data = query.state.data as Trade | null;
      return data?.status === 'pending' ? 1000 : 5000;
    },
  });

  // Calculate remaining time from server data
  useEffect(() => {
    if (!activeTrade) {
      setCountdown(0);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // Already processed on server
    if (activeTrade.status !== 'pending') {
      handleTradeCompleted(activeTrade);
      return;
    }

    const calculateRemaining = () => {
      const timerStarted = activeTrade.timer_started_at 
        ? new Date(activeTrade.timer_started_at).getTime() 
        : new Date(activeTrade.created_at).getTime();
      const duration = (activeTrade.duration_seconds || 30) * 1000;
      const endTime = timerStarted + duration;
      
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((endTime - now) / 1000));
      
      return remaining;
    };

    const remaining = calculateRemaining();
    setCountdown(remaining);

    if (remaining <= 0) {
      completeTrade();
    }
  }, [activeTrade?.id, activeTrade?.status]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0 || !activeTrade || activeTrade.status !== 'pending') {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
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

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [countdown, activeTrade?.id]);

  // Handle trade that was completed server-side
  const handleTradeCompleted = useCallback((trade: Trade) => {
    // Prevent showing result multiple times for same trade
    if (resultShownRef.current === trade.id) return;
    if (processedTradeIds.has(trade.id)) return;
    
    resultShownRef.current = trade.id;
    processedTradeIds.add(trade.id);
    
    const won = trade.status === 'won';
    
    if (won) {
      soundManager.play(SOUNDS.tradeWin);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    } else if (trade.status === 'lost') {
      soundManager.play(SOUNDS.tradeLoss);
    }

    setTradeResult(won ? 'won' : 'lost');
    
    toast({
      title: won ? '🎉 Trade Won!' : '📉 Trade Lost',
      description: won 
        ? `You won ${formatINR(Math.abs(Number(trade.profit_loss || 0)))}!`
        : `You lost ${formatINR(Math.abs(Number(trade.profit_loss || 0)))}`,
      variant: won ? 'default' : 'destructive',
    });

    refetchWallet();
    
    // Clear result after display
    setTimeout(() => {
      setTradeResult(null);
      resultShownRef.current = null;
      queryClient.invalidateQueries({ queryKey: ['active-trade'] });
      queryClient.invalidateQueries({ queryKey: ['trades-history'] });
    }, 3000);
  }, [toast, refetchWallet, queryClient]);

  // Complete trade via edge function
  const completeTrade = useCallback(async () => {
    if (!activeTrade || !user || processingRef.current) return;
    if (activeTrade.status !== 'pending') return;
    if (activeTrade.processing_status === 'processing' || activeTrade.settlement_id) return;
    
    processingRef.current = true;
    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('process-trade', {
        body: { tradeId: activeTrade.id, userId: user.id }
      });

      if (error) {
        console.error('Edge function error:', error);
        processingRef.current = false;
        setIsProcessing(false);
        // Refetch to check if server already processed
        refetchTrade();
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
        resultShownRef.current = activeTrade.id;
        processedTradeIds.add(activeTrade.id);
        
        toast({
          title: won ? '🎉 Trade Won!' : '📉 Trade Lost',
          description: won 
            ? `You won ${formatINR(data.profitLoss)}!`
            : `You lost ${formatINR(Math.abs(data.profitLoss))}`,
          variant: won ? 'default' : 'destructive',
        });

        refetchWallet();
        queryClient.invalidateQueries({ queryKey: ['trades-history'] });
        queryClient.invalidateQueries({ queryKey: ['recent-trades'] });
        queryClient.invalidateQueries({ queryKey: ['user-bonuses-full'] });

        setTimeout(() => {
          setTradeResult(null);
          resultShownRef.current = null;
          processingRef.current = false;
          setIsProcessing(false);
          queryClient.invalidateQueries({ queryKey: ['active-trade'] });
        }, 3000);
      } else {
        // Trade might already be processed
        processingRef.current = false;
        setIsProcessing(false);
        refetchTrade();
        refetchWallet();
      }
    } catch (err) {
      console.error('Trade completion error:', err);
      processingRef.current = false;
      setIsProcessing(false);
      refetchTrade();
    }
  }, [activeTrade, user, toast, refetchWallet, queryClient, refetchTrade]);

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

      // Create trade
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
          profit_percentage: settings?.profit_percentage || 80,
          processing_status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      // Lock balance
      await supabase
        .from('wallets')
        .update({ locked_balance: amount })
        .eq('user_id', user.id);

      // Reset state for new trade
      resultShownRef.current = null;
      setTradeResult(null);
      
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
