import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { usePrices } from '@/hooks/usePrices';
import UserLayout from '@/components/layouts/UserLayout';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { formatCurrency, formatPercent, TRADING_PAIRS, TradingPair } from '@/lib/constants';
import { formatINR } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import TradingViewWidget from '@/components/TradingViewWidget';
import TradePanel from '@/components/trade/TradePanel';
import FloatingSocialButtons from '@/components/social/FloatingSocialButtons';
import { TrendingUp, TrendingDown, Activity, Zap } from 'lucide-react';

export default function Trade() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { balance } = useWallet();
  const { prices, isConnected } = usePrices();

  const [selectedPair, setSelectedPair] = useState<TradingPair>(TRADING_PAIRS[0]);

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
  const isPositive = change24h >= 0;

  return (
    <UserLayout>
      <div className="space-y-4">
        {/* Header with Pair Selector */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <Select 
              value={selectedPair.symbol} 
              onValueChange={(v) => {
                const pair = TRADING_PAIRS.find(p => p.symbol === v);
                if (pair) setSelectedPair(pair);
              }}
            >
              <SelectTrigger className="w-44 h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRADING_PAIRS.map((pair) => (
                  <SelectItem key={pair.symbol} value={pair.symbol}>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{pair.icon}</span>
                      <span className="font-medium">{pair.symbol}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium",
              isConnected ? "bg-profit/20 text-profit" : "bg-warning/20 text-warning"
            )}>
              <span className={cn(
                "h-2 w-2 rounded-full",
                isConnected ? "bg-profit pulse-live" : "bg-warning"
              )} />
              {isConnected ? 'Live' : 'Reconnecting...'}
            </div>
          </div>

          {/* Price Display */}
          <motion.div 
            className="text-right"
            key={currentPrice}
            initial={{ scale: 1 }}
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 0.3 }}
          >
            <p className="text-3xl font-bold font-mono">
              {currentPrice > 0 ? `$${currentPrice.toLocaleString('en-US', { minimumFractionDigits: selectedPair.decimals, maximumFractionDigits: selectedPair.decimals })}` : '--'}
            </p>
            <div className={cn(
              "flex items-center justify-end gap-1 text-sm font-mono",
              isPositive ? "text-profit" : "text-loss"
            )}>
              {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {change24h !== 0 ? formatPercent(change24h) : '--'} (24h)
            </div>
          </motion.div>
        </motion.div>

        {/* Quick Stats */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-3"
        >
          <Card className="border-border/50 bg-gradient-to-br from-card to-secondary/30">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">24h High</p>
              <p className="font-mono font-semibold text-profit">
                ${(currentPrice * 1.02).toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-gradient-to-br from-card to-secondary/30">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">24h Low</p>
              <p className="font-mono font-semibold text-loss">
                ${(currentPrice * 0.98).toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-gradient-to-br from-card to-secondary/30">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Your Balance</p>
              <p className="font-mono font-semibold text-primary">
                {formatINR(balance)}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* TradingView Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-border/50 overflow-hidden">
            <CardContent className="p-0">
              <div className="h-[350px] md:h-[450px]">
                <TradingViewWidget symbol={`BINANCE:${selectedPair.base}USDT`} />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Trading Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <TradePanel 
            selectedPair={selectedPair}
            currentPrice={currentPrice}
          />
        </motion.div>

        {/* Risk Disclaimer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center text-xs text-muted-foreground p-4"
        >
          <p>⚠️ Trading involves risk. Only trade with funds you can afford to lose.</p>
        </motion.div>
      </div>

      <FloatingSocialButtons />
    </UserLayout>
  );
}
