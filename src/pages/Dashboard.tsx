import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { usePrices } from '@/hooks/usePrices';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import UserLayout from '@/components/layouts/UserLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { formatCurrency, formatPercent, TRADING_PAIRS } from '@/lib/constants';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  ArrowRight, 
  Activity,
  Clock,
  Plus,
  Minus
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  const { user } = useAuth();
  const { balance, lockedBalance, availableBalance } = useWallet();
  const { prices, isConnected } = usePrices();

  // Fetch recent trades
  const { data: recentTrades } = useQuery({
    queryKey: ['recent-trades', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch pending requests
  const { data: pendingDeposits } = useQuery({
    queryKey: ['pending-deposits', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deposit_requests')
        .select('*')
        .eq('user_id', user?.id)
        .eq('status', 'pending');
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Calculate stats
  const totalPnL = recentTrades?.reduce((acc, trade) => {
    return acc + (Number(trade.profit_loss) || 0);
  }, 0) || 0;

  const winningTrades = recentTrades?.filter(t => t.status === 'won').length || 0;
  const totalTrades = recentTrades?.filter(t => t.status !== 'pending').length || 0;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

  return (
    <UserLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, trader</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
              isConnected ? "bg-profit/20 text-profit" : "bg-warning/20 text-warning"
            )}>
              <span className={cn(
                "h-2 w-2 rounded-full",
                isConnected ? "bg-profit pulse-live" : "bg-warning"
              )} />
              {isConnected ? 'Live' : 'Connecting...'}
            </span>
          </div>
        </div>

        {/* Wallet Overview */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="gradient-card border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Balance</p>
                  <p className="text-2xl font-bold font-mono text-primary">
                    {formatCurrency(balance)}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-primary/10">
                  <Wallet className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="gradient-card border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total P&L</p>
                  <p className={cn(
                    "text-2xl font-bold font-mono",
                    totalPnL >= 0 ? "text-profit" : "text-loss"
                  )}>
                    {totalPnL >= 0 ? '+' : ''}{formatCurrency(totalPnL)}
                  </p>
                </div>
                <div className={cn(
                  "p-3 rounded-full",
                  totalPnL >= 0 ? "bg-profit/10" : "bg-loss/10"
                )}>
                  {totalPnL >= 0 
                    ? <TrendingUp className="h-6 w-6 text-profit" />
                    : <TrendingDown className="h-6 w-6 text-loss" />
                  }
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="gradient-card border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Win Rate</p>
                  <p className="text-2xl font-bold font-mono">
                    {winRate.toFixed(1)}%
                  </p>
                </div>
                <div className="p-3 rounded-full bg-info/10">
                  <Activity className="h-6 w-6 text-info" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Button asChild className="h-auto py-4 flex-col gap-2">
            <Link to="/trade">
              <TrendingUp className="h-5 w-5" />
              <span>Start Trading</span>
            </Link>
          </Button>
          <Button asChild variant="secondary" className="h-auto py-4 flex-col gap-2">
            <Link to="/wallet">
              <Plus className="h-5 w-5" />
              <span>Deposit</span>
            </Link>
          </Button>
          <Button asChild variant="secondary" className="h-auto py-4 flex-col gap-2">
            <Link to="/wallet">
              <Minus className="h-5 w-5" />
              <span>Withdraw</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
            <Link to="/history">
              <Clock className="h-5 w-5" />
              <span>History</span>
            </Link>
          </Button>
        </div>

        {/* Market Prices */}
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Markets</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/trade">
                View All <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {TRADING_PAIRS.map((pair) => {
                const priceData = prices[pair.symbol];
                const change = priceData?.change24h || 0;
                const isPositive = change >= 0;

                return (
                  <Link
                    key={pair.symbol}
                    to={`/trade?pair=${pair.symbol}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-lg font-bold">
                        {pair.icon}
                      </div>
                      <div>
                        <p className="font-semibold">{pair.base}</p>
                        <p className="text-sm text-muted-foreground">{pair.symbol}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-semibold">
                        {priceData ? formatCurrency(priceData.price, pair.decimals) : '--'}
                      </p>
                      <p className={cn(
                        "text-sm font-mono",
                        isPositive ? "text-profit" : "text-loss"
                      )}>
                        {priceData ? formatPercent(change) : '--'}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Pending Deposits Notification */}
        {pendingDeposits && pendingDeposits.length > 0 && (
          <Card className="border-warning/50 bg-warning/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-warning" />
                  <div>
                    <p className="font-medium">Pending Deposits</p>
                    <p className="text-sm text-muted-foreground">
                      You have {pendingDeposits.length} deposit(s) awaiting approval
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/wallet">View</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </UserLayout>
  );
}
