import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { useActiveTrade } from '@/hooks/useActiveTrade';
import { useTradeSettings } from '@/hooks/useTradeSettings';
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
  Zap,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EnhancedTradePanelProps {
  selectedPair: { symbol: string; base: string; decimals: number };
  currentPrice: number;
}

export default function EnhancedTradePanel({ selectedPair, currentPrice }: EnhancedTradePanelProps) {
  const { user } = useAuth();
  const { availableBalance } = useWallet();
  const { 
    activeTrade, 
    countdown, 
    tradeResult, 
    showConfetti, 
    isProcessing,
    placeTrade,
    tradeDuration 
  } = useActiveTrade();
  const { tradeSettings } = useTradeSettings();
  const { toast } = useToast();

  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(soundManager.isEnabled());
  const actionInProgressRef = useRef(false);

  const amountNum = parseFloat(amount) || 0;
  const minAmount = tradeSettings?.min_trade_amount || 10;
  const maxAmount = tradeSettings?.max_trade_amount || 100000;
  const isTradingEnabled = tradeSettings?.is_trading_enabled ?? true;
  
  const isValidAmount = amountNum >= minAmount && 
                        amountNum <= maxAmount && 
                        amountNum <= availableBalance;

  const handleQuickAmount = (percent: number) => {
    const quickAmount = Math.min(
      (availableBalance * percent / 100),
      maxAmount
    ).toFixed(2);
    setAmount(quickAmount);
    soundManager.play(SOUNDS.click);
  };

  const toggleSound = () => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    soundManager.setEnabled(newState);
  };

  const handleTrade = async () => {
    // Prevent multiple clicks
    if (actionInProgressRef.current || isLoading || activeTrade) return;
    if (!isValidAmount || !user || currentPrice <= 0) return;
    if (!isTradingEnabled) {
      toast({
        title: 'Trading Paused',
        description: 'Trading is temporarily paused. Please try again later.',
        variant: 'destructive',
      });
      return;
    }

    actionInProgressRef.current = true;
    setIsLoading(true);

    try {
      await placeTrade(tradeType, amountNum, selectedPair.symbol, currentPrice);
      setAmount('');
      
      toast({
        title: '⚡ Trade Placed!',
        description: `${tradeType === 'buy' ? 'Long' : 'Short'} ${selectedPair.base} for ${formatINR(amountNum)}`,
      });
    } catch (err: any) {
      console.error('Trade error:', err);
      toast({
        title: 'Trade failed',
        description: err.message || 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      actionInProgressRef.current = false;
    }
  };

  // Calculate progress percentage for circular timer
  const progressPercent = activeTrade 
    ? ((tradeDuration - countdown) / tradeDuration) * 100
    : 0;

  return (
    <>
      <Confetti active={showConfetti} />
      
      <Card className="border-border/50 overflow-hidden relative">
        {/* Trading disabled overlay */}
        {!isTradingEnabled && !activeTrade && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center">
            <div className="text-center p-6">
              <AlertTriangle className="h-12 w-12 text-warning mx-auto mb-3" />
              <p className="font-semibold">Trading Paused</p>
              <p className="text-sm text-muted-foreground">Please try again later</p>
            </div>
          </div>
        )}

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
                  "relative p-6 rounded-xl border-2 text-center transition-all duration-500",
                  tradeResult === 'won' ? "border-profit bg-profit/10 shadow-lg shadow-profit/20" :
                  tradeResult === 'lost' ? "border-loss bg-loss/10 shadow-lg shadow-loss/20" :
                  "border-primary bg-primary/5"
                )}>
                  {/* Animated Timer Circle */}
                  <div className="relative mx-auto w-36 h-36 mb-4">
                    <svg className="w-full h-full transform -rotate-90">
                      {/* Background circle */}
                      <circle
                        cx="72"
                        cy="72"
                        r="66"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        className="text-muted/30"
                      />
                      {/* Progress circle */}
                      <motion.circle
                        cx="72"
                        cy="72"
                        r="66"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        strokeLinecap="round"
                        className={cn(
                          tradeResult === 'won' ? "text-profit" :
                          tradeResult === 'lost' ? "text-loss" :
                          countdown <= 5 ? "text-warning" : "text-primary"
                        )}
                        style={{
                          strokeDasharray: 415,
                          strokeDashoffset: 415 - (progressPercent / 100) * 415,
                        }}
                        animate={{
                          strokeDashoffset: 415 - (progressPercent / 100) * 415,
                        }}
                        transition={{ duration: 0.5, ease: "linear" }}
                      />
                    </svg>
                    
                    {/* Center content */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      {tradeResult ? (
                        <motion.div
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: "spring", stiffness: 200 }}
                          className={cn(
                            "text-5xl",
                            tradeResult === 'won' ? "text-profit" : "text-loss"
                          )}
                        >
                          {tradeResult === 'won' ? '🎉' : '📉'}
                        </motion.div>
                      ) : (
                        <>
                          <Timer className={cn(
                            "h-5 w-5 mb-1",
                            countdown <= 5 ? "text-warning animate-pulse" : "text-muted-foreground"
                          )} />
                          <motion.span 
                            className={cn(
                              "text-4xl font-bold font-mono",
                              countdown <= 5 && "text-warning"
                            )}
                            key={countdown}
                            initial={{ scale: 1.2 }}
                            animate={{ scale: 1 }}
                          >
                            {countdown}s
                          </motion.span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Trade Info */}
                  <div className="space-y-3">
                    <motion.div 
                      className="flex items-center justify-center gap-2"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <span className={cn(
                        "px-3 py-1 rounded-full text-sm font-medium",
                        activeTrade.trade_type === 'buy' 
                          ? "bg-profit/20 text-profit" 
                          : "bg-loss/20 text-loss"
                      )}>
                        {activeTrade.trade_type === 'buy' ? '📈 LONG' : '📉 SHORT'}
                      </span>
                      <span className="font-semibold">{selectedPair.base}</span>
                    </motion.div>
                    
                    <p className="text-3xl font-bold font-mono">{formatINR(Number(activeTrade.amount))}</p>
                    
                    {tradeResult && (
                      <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ type: "spring", stiffness: 200 }}
                        className={cn(
                          "text-2xl font-bold mt-4 py-2 px-4 rounded-lg inline-block",
                          tradeResult === 'won' 
                            ? "text-profit bg-profit/20" 
                            : "text-loss bg-loss/20"
                        )}
                      >
                        {tradeResult === 'won' 
                          ? `+${formatINR(Number(activeTrade.amount) * 0.8)}` 
                          : `-${formatINR(Number(activeTrade.amount))}`
                        }
                      </motion.div>
                    )}
                  </div>

                  {/* Processing indicator */}
                  {isProcessing && !tradeResult && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center rounded-xl"
                    >
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Processing...</span>
                      </div>
                    </motion.div>
                  )}
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
                  <TabsList className="grid w-full grid-cols-2 h-12">
                    <TabsTrigger 
                      value="buy" 
                      className="data-[state=active]:bg-profit data-[state=active]:text-primary-foreground text-base"
                    >
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Buy / Long
                    </TabsTrigger>
                    <TabsTrigger 
                      value="sell"
                      className="data-[state=active]:bg-loss data-[state=active]:text-primary-foreground text-base"
                    >
                      <TrendingDown className="h-4 w-4 mr-2" />
                      Sell / Short
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                {/* Amount Input */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="amount" className="text-base">Amount (INR)</Label>
                    <span className="text-sm text-muted-foreground">
                      Available: <span className="text-foreground font-mono font-medium">{formatINR(availableBalance)}</span>
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="font-mono text-lg pl-8 h-12"
                      min={minAmount}
                      max={maxAmount}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Min: {formatINR(minAmount)} • Max: {formatINR(maxAmount)}
                  </p>
                </div>

                {/* Quick Amount Buttons */}
                <div className="flex gap-2">
                  {[25, 50, 75, 100].map((percent) => (
                    <motion.div key={percent} className="flex-1" whileTap={{ scale: 0.95 }}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full transition-all hover:scale-105 hover:border-primary"
                        onClick={() => handleQuickAmount(percent)}
                        disabled={availableBalance <= 0}
                      >
                        {percent}%
                      </Button>
                    </motion.div>
                  ))}
                </div>

                {/* Timer Info */}
                <motion.div 
                  className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-3 px-4 rounded-lg bg-secondary/50"
                  whileHover={{ scale: 1.02 }}
                >
                  <Timer className="h-4 w-4" />
                  <span>Trade duration: <strong className="text-foreground">{tradeDuration} seconds</strong></span>
                </motion.div>

                {/* Potential Profit Display */}
                {amountNum > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="flex items-center justify-between p-3 rounded-lg bg-profit/10 border border-profit/20"
                  >
                    <span className="text-sm">Potential Profit:</span>
                    <span className="font-mono font-semibold text-profit">
                      +{formatINR(amountNum * 0.8)}
                    </span>
                  </motion.div>
                )}

                {/* Trade Button */}
                <motion.div 
                  whileHover={{ scale: isValidAmount ? 1.02 : 1 }} 
                  whileTap={{ scale: isValidAmount ? 0.98 : 1 }}
                >
                  <Button
                    className={cn(
                      "w-full h-14 text-lg font-semibold relative overflow-hidden",
                      tradeType === 'buy' 
                        ? "bg-gradient-to-r from-profit to-profit/80 hover:from-profit/90 hover:to-profit/70" 
                        : "bg-gradient-to-r from-loss to-loss/80 hover:from-loss/90 hover:to-loss/70"
                    )}
                    disabled={!isValidAmount || isLoading || currentPrice <= 0 || !!activeTrade}
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
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-sm text-destructive text-center flex items-center justify-center gap-2"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    Insufficient balance
                  </motion.p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </>
  );
}