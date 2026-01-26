import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { useSettings } from '@/hooks/useSettings';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { formatINR } from '@/lib/formatters';
import { SOUNDS, soundManager } from '@/lib/sounds';
import { Confetti } from '@/components/ui/lottie-animation';
import { 
  TrendingUp, 
  TrendingDown, 
  Loader2,
  Timer,
  Volume2,
  VolumeX,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TradePanelProps {
  selectedPair: { symbol: string; base: string; decimals: number };
  currentPrice: number;
}

export default function TradePanel({ selectedPair, currentPrice }: TradePanelProps) {
  const { user } = useAuth();
  const { balance, availableBalance, refetch: refetchWallet } = useWallet();
  const { settings } = useSettings();
  const { toast } = useToast();

  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTrade, setActiveTrade] = useState<any>(null);
  const [countdown, setCountdown] = useState(0);
  const [tradeResult, setTradeResult] = useState<'won' | 'lost' | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(soundManager.isEnabled());

  const tradeDuration = settings?.trade_duration || 30;
  const amountNum = parseFloat(amount) || 0;
  const isValidAmount = amountNum > 0 && amountNum <= availableBalance;

  const handleQuickAmount = (percent: number) => {
    const quickAmount = (availableBalance * percent / 100).toFixed(2);
    setAmount(quickAmount);
    soundManager.play(SOUNDS.click);
  };

  const toggleSound = () => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    soundManager.setEnabled(newState);
  };

  const handleTrade = async () => {
    if (!isValidAmount || !user || currentPrice <= 0) return;

    setIsLoading(true);
    soundManager.play(SOUNDS.tradeStart);

    try {
      // Create the trade record
      const { data: trade, error } = await supabase
        .from('trades')
        .insert({
          user_id: user.id,
          trading_pair: selectedPair.symbol,
          trade_type: tradeType,
          amount: amountNum,
          entry_price: currentPrice,
          status: 'pending',
          duration_seconds: tradeDuration,
          timer_started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Lock the balance
      await supabase
        .from('wallets')
        .update({ locked_balance: amountNum })
        .eq('user_id', user.id);

      setActiveTrade(trade);
      setCountdown(tradeDuration);
      setAmount('');
      refetchWallet();

    } catch (err: any) {
      console.error('Trade error:', err);
      toast({
        title: 'Trade failed',
        description: err.message || 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Countdown timer effect
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

  const completeTrade = async () => {
    if (!activeTrade || !user) return;

    try {
      // Get the latest trade status from DB (in case admin modified it)
      const { data: latestTrade, error: fetchError } = await supabase
        .from('trades')
        .select('*')
        .eq('id', activeTrade.id)
        .single();

      if (fetchError) throw fetchError;

      // Determine result based on expected_result or random
      let won = false;
      if (latestTrade.expected_result === 'win') {
        won = true;
      } else if (latestTrade.expected_result === 'loss') {
        won = false;
      } else {
        // Use global win rate
        const winRate = settings?.global_win_rate || 45;
        won = Math.random() * 100 < winRate;
      }

      const profitLoss = won ? amountNum * 0.8 : -amountNum;
      const newBalance = balance + profitLoss;

      // Update trade with result
      await supabase
        .from('trades')
        .update({
          exit_price: currentPrice * (won ? 1.01 : 0.99),
          profit_loss: profitLoss,
          status: won ? 'won' : 'lost',
          closed_at: new Date().toISOString(),
        })
        .eq('id', activeTrade.id);

      // Update wallet balance and unlock
      await supabase
        .from('wallets')
        .update({ 
          balance: newBalance,
          locked_balance: 0 
        })
        .eq('user_id', user.id);

      // Record transaction
      await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          type: won ? 'trade_win' : 'trade_loss',
          amount: profitLoss,
          balance_before: balance,
          balance_after: newBalance,
          reference_id: activeTrade.id,
          description: `${activeTrade.trade_type.toUpperCase()} ${selectedPair.symbol} - ${won ? 'Won' : 'Lost'}`,
        });

      // Create notification
      await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          title: won ? '🎉 Trade Won!' : '📉 Trade Lost',
          message: won 
            ? `You won ${formatINR(profitLoss)} on ${selectedPair.symbol}!`
            : `You lost ${formatINR(Math.abs(profitLoss))} on ${selectedPair.symbol}`,
          type: 'trade_result',
          metadata: { tradeId: activeTrade.id, won, profitLoss },
        });

      // Play sound and show result
      if (won) {
        soundManager.play(SOUNDS.tradeWin);
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      } else {
        soundManager.play(SOUNDS.tradeLoss);
      }

      setTradeResult(won ? 'won' : 'lost');
      refetchWallet();

      toast({
        title: won ? '🎉 Trade Won!' : '📉 Trade Lost',
        description: won 
          ? `You won ${formatINR(profitLoss)}!`
          : `You lost ${formatINR(Math.abs(profitLoss))}`,
        variant: won ? 'default' : 'destructive',
      });

      // Reset after showing result
      setTimeout(() => {
        setActiveTrade(null);
        setTradeResult(null);
      }, 3000);

    } catch (err: any) {
      console.error('Complete trade error:', err);
    }
  };

  return (
    <>
      <Confetti active={showConfetti} />
      
      <Card className="border-border/50 overflow-hidden">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Place Order
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={toggleSound}>
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <AnimatePresence mode="wait">
            {activeTrade ? (
              <motion.div
                key="trading"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="space-y-6"
              >
                {/* Active Trade Display */}
                <div className={cn(
                  "relative p-6 rounded-xl border-2 text-center",
                  tradeResult === 'won' ? "border-profit bg-profit/10" :
                  tradeResult === 'lost' ? "border-loss bg-loss/10" :
                  "border-primary bg-primary/5"
                )}>
                  {/* Timer Circle */}
                  <div className="relative mx-auto w-32 h-32 mb-4">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="58"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        className="text-muted"
                      />
                      <motion.circle
                        cx="64"
                        cy="64"
                        r="58"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        strokeLinecap="round"
                        className={cn(
                          tradeResult === 'won' ? "text-profit" :
                          tradeResult === 'lost' ? "text-loss" :
                          "text-primary"
                        )}
                        initial={{ strokeDasharray: "365", strokeDashoffset: "0" }}
                        animate={{ 
                          strokeDashoffset: tradeResult ? 0 : (365 - (countdown / tradeDuration) * 365)
                        }}
                        transition={{ duration: 0.5 }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      {tradeResult ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className={cn(
                            "text-4xl font-bold",
                            tradeResult === 'won' ? "text-profit" : "text-loss"
                          )}
                        >
                          {tradeResult === 'won' ? '🎉' : '📉'}
                        </motion.div>
                      ) : (
                        <>
                          <Timer className="h-5 w-5 text-muted-foreground mb-1" />
                          <span className="text-3xl font-bold font-mono">{countdown}s</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Trade Info */}
                  <div className="space-y-2">
                    <p className="text-lg font-semibold">
                      {activeTrade.trade_type === 'buy' ? '📈 Long' : '📉 Short'} {selectedPair.base}
                    </p>
                    <p className="text-2xl font-bold font-mono">{formatINR(activeTrade.amount)}</p>
                    
                    {tradeResult && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          "text-xl font-bold mt-4",
                          tradeResult === 'won' ? "text-profit" : "text-loss"
                        )}
                      >
                        {tradeResult === 'won' ? `+${formatINR(activeTrade.amount * 0.8)}` : `-${formatINR(activeTrade.amount)}`}
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* Buy/Sell Tabs */}
                <Tabs value={tradeType} onValueChange={(v) => setTradeType(v as 'buy' | 'sell')}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger 
                      value="buy" 
                      className="data-[state=active]:bg-profit data-[state=active]:text-primary-foreground"
                    >
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Buy / Long
                    </TabsTrigger>
                    <TabsTrigger 
                      value="sell"
                      className="data-[state=active]:bg-loss data-[state=active]:text-primary-foreground"
                    >
                      <TrendingDown className="h-4 w-4 mr-2" />
                      Sell / Short
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                {/* Amount Input */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="amount">Amount (INR)</Label>
                    <span className="text-sm text-muted-foreground">
                      Available: <span className="text-foreground font-mono">{formatINR(availableBalance)}</span>
                    </span>
                  </div>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="font-mono text-lg"
                  />
                </div>

                {/* Quick Amount Buttons */}
                <div className="flex gap-2">
                  {[25, 50, 75, 100].map((percent) => (
                    <Button
                      key={percent}
                      variant="outline"
                      size="sm"
                      className="flex-1 transition-all hover:scale-105"
                      onClick={() => handleQuickAmount(percent)}
                      disabled={availableBalance <= 0}
                    >
                      {percent}%
                    </Button>
                  ))}
                </div>

                {/* Timer Info */}
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-2">
                  <Timer className="h-4 w-4" />
                  <span>Trade duration: <strong className="text-foreground">{tradeDuration} seconds</strong></span>
                </div>

                {/* Trade Button */}
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    className={cn(
                      "w-full h-14 text-lg font-semibold relative overflow-hidden",
                      tradeType === 'buy' 
                        ? "bg-profit hover:bg-profit/90" 
                        : "bg-loss hover:bg-loss/90"
                    )}
                    disabled={!isValidAmount || isLoading || currentPrice <= 0}
                    onClick={handleTrade}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Zap className="mr-2 h-5 w-5" />
                        {tradeType === 'buy' ? 'Buy' : 'Sell'} {selectedPair.base}
                      </>
                    )}
                  </Button>
                </motion.div>

                {/* Balance Warning */}
                {amountNum > availableBalance && (
                  <p className="text-sm text-destructive text-center">
                    Insufficient balance
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </>
  );
}
