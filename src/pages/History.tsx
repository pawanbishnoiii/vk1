import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import UserLayout from '@/components/layouts/UserLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatINR, formatDate } from '@/lib/formatters';
import FloatingSocialButtons from '@/components/social/FloatingSocialButtons';
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  CheckCircle, 
  XCircle,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Gift,
  RefreshCw,
  Timer,
  Activity,
  Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
  created_at: string;
  closed_at: string | null;
}

interface Transaction {
  id: string;
  display_id: number | null;
  user_id: string;
  type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string | null;
  created_at: string;
}

export default function History() {
  const { user } = useAuth();
  const [tradeFilter, setTradeFilter] = useState<'all' | 'pending' | 'won' | 'lost'>('all');
  const [countdown, setCountdown] = useState<{ [key: string]: number }>({});

  // Fetch trades
  const { data: trades, isLoading: tradesLoading, refetch: refetchTrades } = useQuery({
    queryKey: ['trades-history', user?.id, tradeFilter],
    queryFn: async () => {
      let query = supabase
        .from('trades')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (tradeFilter !== 'all') {
        query = query.eq('status', tradeFilter);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Trade[];
    },
    enabled: !!user?.id,
    refetchInterval: 5000, // Refresh every 5 seconds for active trades
  });

  // Fetch transactions
  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['transactions-history', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Update countdowns for active trades
  useEffect(() => {
    const activeTrades = trades?.filter(t => t.status === 'pending') || [];
    if (activeTrades.length === 0) return;

    const updateCountdowns = () => {
      const newCountdowns: { [key: string]: number } = {};
      
      activeTrades.forEach(trade => {
        const timerStarted = trade.timer_started_at 
          ? new Date(trade.timer_started_at).getTime()
          : new Date(trade.created_at).getTime();
        const endTime = timerStarted + (trade.duration_seconds || 30) * 1000;
        const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
        newCountdowns[trade.id] = remaining;
      });
      
      setCountdown(newCountdowns);
    };

    updateCountdowns();
    const interval = setInterval(updateCountdowns, 1000);
    
    return () => clearInterval(interval);
  }, [trades]);

  const activeTrades = trades?.filter(t => t.status === 'pending') || [];
  const completedTrades = trades?.filter(t => t.status !== 'pending') || [];

  const getTradeStatusBadge = (status: string, tradeId: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 animate-pulse">
            <Timer className="h-3 w-3 mr-1" />
            {countdown[tradeId] !== undefined ? `${countdown[tradeId]}s` : 'Active'}
          </Badge>
        );
      case 'won':
        return (
          <Badge variant="outline" className="bg-profit/10 text-profit border-profit/30">
            <CheckCircle className="h-3 w-3 mr-1" /> Won
          </Badge>
        );
      case 'lost':
        return (
          <Badge variant="outline" className="bg-loss/10 text-loss border-loss/30">
            <XCircle className="h-3 w-3 mr-1" /> Lost
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="outline">
            <RefreshCw className="h-3 w-3 mr-1" /> Cancelled
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <ArrowDownRight className="h-4 w-4 text-profit" />;
      case 'withdrawal':
        return <ArrowUpRight className="h-4 w-4 text-loss" />;
      case 'trade_win':
        return <TrendingUp className="h-4 w-4 text-profit" />;
      case 'trade_loss':
        return <TrendingDown className="h-4 w-4 text-loss" />;
      case 'bonus':
        return <Gift className="h-4 w-4 text-warning" />;
      default:
        return <RefreshCw className="h-4 w-4" />;
    }
  };

  // Calculate stats
  const totalPnL = completedTrades.reduce((acc, trade) => acc + (Number(trade.profit_loss) || 0), 0);
  const winCount = completedTrades.filter(t => t.status === 'won').length;
  const lossCount = completedTrades.filter(t => t.status === 'lost').length;
  const winRate = (winCount + lossCount) > 0 ? (winCount / (winCount + lossCount)) * 100 : 0;

  return (
    <UserLayout>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Activity className="h-6 w-6 text-primary" />
              History
            </h1>
            <p className="text-muted-foreground">Track your trades and transactions</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetchTrades()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-border/50">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">Total P&L</p>
              <p className={cn(
                "text-xl font-bold font-mono",
                totalPnL >= 0 ? "text-profit" : "text-loss"
              )}>
                {totalPnL >= 0 ? '+' : ''}{formatINR(totalPnL)}
              </p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">Win Rate</p>
              <p className="text-xl font-bold">{winRate.toFixed(1)}%</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">W / L</p>
              <p className="text-xl font-bold">
                <span className="text-profit">{winCount}</span>
                <span className="text-muted-foreground mx-1">/</span>
                <span className="text-loss">{lossCount}</span>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Active Trades Section */}
        <AnimatePresence>
          {activeTrades.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Card className="border-warning/50 bg-gradient-to-br from-card to-warning/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Timer className="h-5 w-5 text-warning animate-pulse" />
                    Active Trades ({activeTrades.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {activeTrades.map((trade, index) => (
                    <motion.div
                      key={trade.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 border border-warning/20"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded-full",
                          trade.trade_type === 'buy' ? "bg-profit/10" : "bg-loss/10"
                        )}>
                          {trade.trade_type === 'buy' 
                            ? <TrendingUp className="h-4 w-4 text-profit" />
                            : <TrendingDown className="h-4 w-4 text-loss" />
                          }
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{trade.trading_pair}</p>
                            <Badge variant="outline" className={cn(
                              "text-xs",
                              trade.trade_type === 'buy' ? "text-profit" : "text-loss"
                            )}>
                              {trade.trade_type.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Amount: {formatINR(Number(trade.amount))}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {getTradeStatusBadge(trade.status, trade.id)}
                        <p className="text-xs text-muted-foreground mt-1">
                          Potential: <span className="text-profit">+{formatINR(Number(trade.amount) * 0.8)}</span>
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <Tabs defaultValue="trades">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="trades">Trades</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
          </TabsList>

          <TabsContent value="trades" className="space-y-4">
            {/* Trade Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <div className="flex gap-2">
                {(['all', 'won', 'lost'] as const).map((filter) => (
                  <Button
                    key={filter}
                    variant={tradeFilter === filter ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTradeFilter(filter)}
                    className="capitalize"
                  >
                    {filter}
                  </Button>
                ))}
              </div>
            </div>

            <Card className="border-border/50">
              <CardContent className="p-4">
                {tradesLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : completedTrades && completedTrades.length > 0 ? (
                  <div className="space-y-3">
                    <AnimatePresence>
                      {completedTrades.map((trade, index) => (
                        <motion.div 
                          key={trade.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className={cn(
                            "flex items-center justify-between p-4 rounded-lg transition-all",
                            trade.status === 'won' ? "bg-profit/5 hover:bg-profit/10" : 
                            trade.status === 'lost' ? "bg-loss/5 hover:bg-loss/10" : "bg-secondary/50"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "p-2 rounded-full",
                              trade.trade_type === 'buy' ? "bg-profit/10" : "bg-loss/10"
                            )}>
                              {trade.trade_type === 'buy' 
                                ? <TrendingUp className="h-4 w-4 text-profit" />
                                : <TrendingDown className="h-4 w-4 text-loss" />
                              }
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold">{trade.trading_pair}</p>
                                <Badge variant="outline" className={cn(
                                  "text-xs",
                                  trade.trade_type === 'buy' ? "text-profit" : "text-loss"
                                )}>
                                  {trade.trade_type.toUpperCase()}
                                </Badge>
                                {trade.display_id && (
                                  <span className="text-xs text-muted-foreground font-mono">
                                    #{trade.display_id}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Amount: {formatINR(Number(trade.amount))}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(trade.created_at)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            {getTradeStatusBadge(trade.status, trade.id)}
                            {trade.profit_loss !== null && (
                              <motion.p 
                                className={cn(
                                  "font-mono font-semibold mt-1",
                                  Number(trade.profit_loss) >= 0 ? "text-profit" : "text-loss"
                                )}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                              >
                                {Number(trade.profit_loss) >= 0 ? '+' : ''}
                                {formatINR(Number(trade.profit_loss))}
                              </motion.p>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Activity className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">No trades yet</p>
                    <p className="text-sm text-muted-foreground">Start trading to see your history!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base">All Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                {transactionsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : transactions && transactions.length > 0 ? (
                  <div className="space-y-3">
                    {transactions.map((tx, index) => (
                      <motion.div 
                        key={tx.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center justify-between p-4 rounded-lg bg-secondary/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-secondary">
                            {getTransactionIcon(tx.type)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium capitalize">{tx.type.replace('_', ' ')}</p>
                              {(tx as Transaction).display_id && (
                                <span className="text-xs text-muted-foreground font-mono">
                                  #{(tx as Transaction).display_id}
                                </span>
                              )}
                            </div>
                            {tx.description && (
                              <p className="text-sm text-muted-foreground">{tx.description}</p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {formatDate(tx.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={cn(
                            "font-mono font-semibold",
                            Number(tx.amount) >= 0 ? "text-profit" : "text-loss"
                          )}>
                            {Number(tx.amount) >= 0 ? '+' : ''}
                            {formatINR(Number(tx.amount))}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">
                            Bal: {formatINR(Number(tx.balance_after))}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No transactions yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

      <FloatingSocialButtons />
    </UserLayout>
  );
}