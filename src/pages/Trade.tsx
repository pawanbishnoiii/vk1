import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { usePrices } from '@/hooks/usePrices';
import { supabase } from '@/integrations/supabase/client';
import UserLayout from '@/components/layouts/UserLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatPercent, TRADING_PAIRS, TradingPair } from '@/lib/constants';
import { 
  TrendingUp, 
  TrendingDown, 
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import TradingViewWidget from '@/components/TradingViewWidget';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function Trade() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { balance, refetch: refetchWallet } = useWallet();
  const { prices, isConnected } = usePrices();
  const { toast } = useToast();

  const [selectedPair, setSelectedPair] = useState<TradingPair>(TRADING_PAIRS[0]);
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showRiskWarning, setShowRiskWarning] = useState(false);
  const [pendingTrade, setPendingTrade] = useState<{type: 'buy' | 'sell', amount: number} | null>(null);

  // Set initial pair from URL
  useEffect(() => {
    const pairParam = searchParams.get('pair');
    if (pairParam) {
      const pair = TRADING_PAIRS.find(p => p.symbol === pairParam);
      if (pair) setSelectedPair(pair);
    }
  }, [searchParams]);

  const priceData = prices[selectedPair.symbol];
  const currentPrice = priceData?.price || 0;
  const change24h = priceData?.change24h || 0;

  const amountNum = parseFloat(amount) || 0;
  const isValidAmount = amountNum > 0 && amountNum <= balance;

  const handleQuickAmount = (percent: number) => {
    const quickAmount = (balance * percent / 100).toFixed(2);
    setAmount(quickAmount);
  };

  const handleTrade = async () => {
    if (!isValidAmount || !user || currentPrice <= 0) return;

    // Show risk warning on first trade
    const hasSeenWarning = localStorage.getItem('hasSeenTradeWarning');
    if (!hasSeenWarning) {
      setPendingTrade({ type: tradeType, amount: amountNum });
      setShowRiskWarning(true);
      return;
    }

    await executeTrade(tradeType, amountNum);
  };

  const executeTrade = async (type: 'buy' | 'sell', tradeAmount: number) => {
    setIsLoading(true);

    try {
      // Create the trade record
      const { data: trade, error } = await supabase
        .from('trades')
        .insert({
          user_id: user!.id,
          trading_pair: selectedPair.symbol,
          trade_type: type,
          amount: tradeAmount,
          entry_price: currentPrice,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      // Simulate trade result (in production, this would be handled by edge function)
      // For MVP, we'll close the trade immediately with a random outcome
      const won = Math.random() > 0.5; // 50% win rate for demo
      const multiplier = won ? 1.8 : 0; // 80% profit on win, 100% loss on loss
      const profitLoss = won ? tradeAmount * 0.8 : -tradeAmount;

      // Update trade with result
      await supabase
        .from('trades')
        .update({
          exit_price: currentPrice * (won ? 1.01 : 0.99),
          profit_loss: profitLoss,
          status: won ? 'won' : 'lost',
          closed_at: new Date().toISOString(),
        })
        .eq('id', trade.id);

      // Update wallet balance
      const newBalance = balance + profitLoss;
      await supabase
        .from('wallets')
        .update({ balance: newBalance })
        .eq('user_id', user!.id);

      // Record transaction
      await supabase
        .from('transactions')
        .insert({
          user_id: user!.id,
          type: won ? 'trade_win' : 'trade_loss',
          amount: profitLoss,
          balance_before: balance,
          balance_after: newBalance,
          reference_id: trade.id,
          description: `${type.toUpperCase()} ${selectedPair.symbol} - ${won ? 'Won' : 'Lost'}`,
        });

      toast({
        title: won ? '🎉 Trade Won!' : '📉 Trade Lost',
        description: won 
          ? `You won ${formatCurrency(profitLoss)}!`
          : `You lost ${formatCurrency(Math.abs(profitLoss))}`,
        variant: won ? 'default' : 'destructive',
      });

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

  const handleRiskWarningConfirm = () => {
    localStorage.setItem('hasSeenTradeWarning', 'true');
    setShowRiskWarning(false);
    if (pendingTrade) {
      executeTrade(pendingTrade.type, pendingTrade.amount);
      setPendingTrade(null);
    }
  };

  return (
    <UserLayout>
      <div className="space-y-4 animate-fade-in">
        {/* Pair Selector & Price */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Select 
              value={selectedPair.symbol} 
              onValueChange={(v) => {
                const pair = TRADING_PAIRS.find(p => p.symbol === v);
                if (pair) setSelectedPair(pair);
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRADING_PAIRS.map((pair) => (
                  <SelectItem key={pair.symbol} value={pair.symbol}>
                    <div className="flex items-center gap-2">
                      <span>{pair.icon}</span>
                      <span>{pair.symbol}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
              isConnected ? "bg-profit/20 text-profit" : "bg-warning/20 text-warning"
            )}>
              <span className={cn(
                "h-2 w-2 rounded-full",
                isConnected ? "bg-profit pulse-live" : "bg-warning"
              )} />
              {isConnected ? 'Live' : 'Reconnecting...'}
            </div>
          </div>

          <div className="text-right">
            <p className="text-2xl font-bold font-mono">
              {currentPrice > 0 ? formatCurrency(currentPrice, selectedPair.decimals) : '--'}
            </p>
            <p className={cn(
              "text-sm font-mono",
              change24h >= 0 ? "text-profit" : "text-loss"
            )}>
              {change24h !== 0 ? formatPercent(change24h) : '--'} 24h
            </p>
          </div>
        </div>

        {/* TradingView Chart */}
        <Card className="border-border/50 overflow-hidden">
          <CardContent className="p-0">
            <div className="h-[400px] md:h-[500px]">
              <TradingViewWidget symbol={`BINANCE:${selectedPair.base}USDT`} />
            </div>
          </CardContent>
        </Card>

        {/* Trading Panel */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Place Order</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Buy/Sell Tabs */}
            <Tabs value={tradeType} onValueChange={(v) => setTradeType(v as 'buy' | 'sell')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger 
                  value="buy" 
                  className="data-[state=active]:bg-profit data-[state=active]:text-profit-foreground"
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Buy / Long
                </TabsTrigger>
                <TabsTrigger 
                  value="sell"
                  className="data-[state=active]:bg-loss data-[state=active]:text-loss-foreground"
                >
                  <TrendingDown className="h-4 w-4 mr-2" />
                  Sell / Short
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Amount Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="amount">Amount (USDT)</Label>
                <span className="text-sm text-muted-foreground">
                  Available: <span className="text-foreground font-mono">{formatCurrency(balance)}</span>
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
                  className="flex-1"
                  onClick={() => handleQuickAmount(percent)}
                  disabled={balance <= 0}
                >
                  {percent}%
                </Button>
              ))}
            </div>

            {/* Trade Button */}
            <Button
              className={cn(
                "w-full h-12 text-lg font-semibold",
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
                  {tradeType === 'buy' ? 'Buy' : 'Sell'} {selectedPair.base}
                </>
              )}
            </Button>

            {/* Balance Warning */}
            {amountNum > balance && (
              <p className="text-sm text-destructive text-center">
                Insufficient balance
              </p>
            )}
          </CardContent>
        </Card>

        {/* Risk Warning Dialog */}
        <AlertDialog open={showRiskWarning} onOpenChange={setShowRiskWarning}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                Risk Warning
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                <p>
                  Trading cryptocurrencies involves significant risk. You may lose some or all of your investment.
                </p>
                <p>
                  Only trade with funds you can afford to lose. Past performance is not indicative of future results.
                </p>
                <p className="font-semibold">
                  Do you understand and accept these risks?
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPendingTrade(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleRiskWarningConfirm}>
                I Understand, Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </UserLayout>
  );
}
