import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { useActiveTrade } from '@/hooks/useActiveTrade';
import { useTradeSettings } from '@/hooks/useTradeSettings';
import { useSettings } from '@/hooks/useSettings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
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
  AlertTriangle,
  Hash,
  Flame,
  Target,
  Shield,
  Sparkles
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
  const { settings } = useSettings();
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
  const profitPercentage = settings?.profit_percentage || 80;
  const lossPercentage = settings?.loss_percentage || 100;
  
  const isValidAmount = amountNum >= minAmount && 
                        amountNum <= maxAmount && 
                        amountNum <= availableBalance;

  // Play custom sounds from settings
  useEffect(() => {
    if (tradeResult === 'won' && settings?.win_sound_url) {
      soundManager.play(settings.win_sound_url);
    } else if (tradeResult === 'lost' && settings?.loss_sound_url) {
      soundManager.play(settings.loss_sound_url);
    }
  }, [tradeResult, settings]);

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

  const potentialProfit = amountNum * (profitPercentage / 100);
  const potentialLoss = amountNum * (lossPercentage / 100);

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
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-primary/50">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            Quick Trade
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono">
              <Timer className="h-3 w-3 mr-1" />
              {tradeDuration}s
            </Badge>
            <Button variant="ghost" size="icon" onClick={toggleSound}>
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
          </div>
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
                  "relative p-6 rounded-2xl border-2 text-center transition-all duration-500",
                  tradeResult === 'won' ? "border-profit bg-profit/10 shadow-lg shadow-profit/20" :
                  tradeResult === 'lost' ? "border-loss bg-loss/10 shadow-lg shadow-loss/20" :
                  "border-primary bg-primary/5"
                )}>
                  {/* Animated Timer Circle */}
                  <div className="relative mx-auto w-40 h-40 mb-4">
                    <svg className="w-full h-full transform -rotate-90">
                      {/* Background circle */}
                      <circle
                        cx="80"
                        cy="80"
                        r="72"
                        stroke="currentColor"
                        strokeWidth="10"
                        fill="none"
                        className="text-muted/30"
                      />
                      {/* Progress circle */}
                      <motion.circle
                        cx="80"
                        cy="80"
                        r="72"
                        stroke="currentColor"
                        strokeWidth="10"
                        fill="none"
                        strokeLinecap="round"
                        className={cn(
                          tradeResult === 'won' ? "text-profit" :
                          tradeResult === 'lost' ? "text-loss" :
                          countdown <= 5 ? "text-warning" : "text-primary"
                        )}
                        style={{
                          strokeDasharray: 452,
                          strokeDashoffset: 452 - (progressPercent / 100) * 452,
                        }}
                        animate={{
                          strokeDashoffset: 452 - (progressPercent / 100) * 452,
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
                            "text-6xl",
                            tradeResult === 'won' ? "text-profit" : "text-loss"
                          )}
                        >
                          {tradeResult === 'won' ? '🎉' : '📉'}
                        </motion.div>
                      ) : (
                        <>
                          <Timer className={cn(
                            "h-6 w-6 mb-1",
                            countdown <= 5 ? "text-warning animate-pulse" : "text-muted-foreground"
                          )} />
                          <motion.span 
                            className={cn(
                              "text-5xl font-bold font-mono",
                              countdown <= 5 && "text-warning"
                            )}
                            key={countdown}
                            initial={{ scale: 1.3 }}
                            animate={{ scale: 1 }}
                          >
                            {countdown}
                          </motion.span>
                          <span className="text-sm text-muted-foreground">seconds</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Trade Info */}
                  <div className="space-y-4">
                    {/* Trade ID */}
                    {activeTrade.display_id && (
                      <motion.div 
                        className="flex items-center justify-center gap-1 text-xs text-muted-foreground"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <Hash className="h-3 w-3" />
                        Trade ID: <span className="font-mono font-semibold">#{activeTrade.display_id}</span>
                      </motion.div>
                    )}
                    
                    <motion.div 
                      className="flex items-center justify-center gap-3"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <Badge className={cn(
                        "px-4 py-2 text-base font-semibold",
                        activeTrade.trade_type === 'buy' 
                          ? "bg-profit/20 text-profit border-profit/30" 
                          : "bg-loss/20 text-loss border-loss/30"
                      )}>
                        {activeTrade.trade_type === 'buy' ? (
                          <>
                            <TrendingUp className="h-4 w-4 mr-2" />
                            LONG
                          </>
                        ) : (
                          <>
                            <TrendingDown className="h-4 w-4 mr-2" />
                            SHORT
                          </>
                        )}
                      </Badge>
                      <span className="text-lg font-semibold">{selectedPair.base}</span>
                    </motion.div>
                    
                    <p className="text-4xl font-bold font-mono">{formatINR(Number(activeTrade.amount))}</p>
                    
                    {tradeResult && (
                      <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ type: "spring", stiffness: 200 }}
                        className={cn(
                          "text-3xl font-bold mt-4 py-3 px-6 rounded-xl inline-block",
                          tradeResult === 'won' 
                            ? "text-profit bg-profit/20 border border-profit/30" 
                            : "text-loss bg-loss/20 border border-loss/30"
                        )}
                      >
                        {tradeResult === 'won' 
                          ? `+${formatINR(Number(activeTrade.amount) * (profitPercentage / 100))}` 
                          : `-${formatINR(Number(activeTrade.amount) * (lossPercentage / 100))}`
                        }
                      </motion.div>
                    )}
                  </div>

                  {/* Processing indicator */}
                  {isProcessing && !tradeResult && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center rounded-2xl"
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
                className="space-y-5"
              >
                {/* Buy/Sell Tabs */}
                <Tabs value={tradeType} onValueChange={(v) => setTradeType(v as 'buy' | 'sell')}>
                  <TabsList className="grid w-full grid-cols-2 h-14">
                    <TabsTrigger 
                      value="buy" 
                      className="data-[state=active]:bg-profit data-[state=active]:text-white text-base h-12 gap-2"
                    >
                      <TrendingUp className="h-5 w-5" />
                      <span className="font-semibold">Buy / Long</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="sell"
                      className="data-[state=active]:bg-loss data-[state=active]:text-white text-base h-12 gap-2"
                    >
                      <TrendingDown className="h-5 w-5" />
                      <span className="font-semibold">Sell / Short</span>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                {/* Amount Input */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="amount" className="text-base font-semibold">Trade Amount</Label>
                    <span className="text-sm text-muted-foreground">
                      Balance: <span className="text-foreground font-mono font-semibold">{formatINR(availableBalance)}</span>
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl text-muted-foreground">₹</span>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="font-mono text-xl pl-10 h-14 text-center"
                      min={minAmount}
                      max={maxAmount}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-3">
                    <span>Min: {formatINR(minAmount)}</span>
                    <span className="text-border">•</span>
                    <span>Max: {formatINR(maxAmount)}</span>
                  </p>
                </div>

                {/* Quick Amount Buttons */}
                <div className="grid grid-cols-4 gap-2">
                  {[25, 50, 75, 100].map((percent) => (
                    <motion.div key={percent} whileTap={{ scale: 0.95 }}>
                      <Button
                        variant="outline"
                        size="lg"
                        className="w-full h-12 font-semibold transition-all hover:bg-primary hover:text-primary-foreground hover:border-primary"
                        onClick={() => handleQuickAmount(percent)}
                        disabled={availableBalance <= 0}
                      >
                        {percent}%
                      </Button>
                    </motion.div>
                  ))}
                </div>

                {/* Profit/Loss Preview */}
                {amountNum > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="grid grid-cols-2 gap-3"
                  >
                    <div className="p-4 rounded-xl bg-profit/10 border border-profit/20 text-center">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <Target className="h-4 w-4 text-profit" />
                        <span className="text-xs text-muted-foreground">If Win ({profitPercentage}%)</span>
                      </div>
                      <p className="font-mono font-bold text-xl text-profit">
                        +{formatINR(potentialProfit)}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-loss/10 border border-loss/20 text-center">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <Shield className="h-4 w-4 text-loss" />
                        <span className="text-xs text-muted-foreground">If Loss ({lossPercentage}%)</span>
                      </div>
                      <p className="font-mono font-bold text-xl text-loss">
                        -{formatINR(potentialLoss)}
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Trade Button */}
                <motion.div 
                  whileHover={{ scale: isValidAmount ? 1.02 : 1 }} 
                  whileTap={{ scale: isValidAmount ? 0.98 : 1 }}
                >
                  <Button
                    className={cn(
                      "w-full h-16 text-xl font-bold relative overflow-hidden",
                      tradeType === 'buy' 
                        ? "bg-gradient-to-r from-profit to-emerald-600 hover:from-profit/90 hover:to-emerald-600/90" 
                        : "bg-gradient-to-r from-loss to-red-600 hover:from-loss/90 hover:to-red-600/90"
                    )}
                    disabled={!isValidAmount || isLoading || currentPrice <= 0 || !!activeTrade}
                    onClick={handleTrade}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        {tradeType === 'buy' ? (
                          <>
                            <TrendingUp className="mr-2 h-6 w-6" />
                            Buy / Long
                          </>
                        ) : (
                          <>
                            <TrendingDown className="mr-2 h-6 w-6" />
                            Sell / Short
                          </>
                        )}
                        {amountNum > 0 && (
                          <span className="ml-3 font-mono">
                            {formatINR(amountNum)}
                          </span>
                        )}
                      </>
                    )}
                  </Button>
                </motion.div>

                {/* Features */}
                <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Flame className="h-3 w-3 text-warning" />
                    <span>Instant Execution</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-primary" />
                    <span>Auto Settlement</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </>
  );
}