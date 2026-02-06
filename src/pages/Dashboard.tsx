import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { usePrices } from '@/hooks/usePrices';
import { useNotifications } from '@/hooks/useNotifications';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import UserLayout from '@/components/layouts/UserLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { formatPercent, TRADING_PAIRS } from '@/lib/constants';
import { formatINR } from '@/lib/formatters';
import FloatingSocialButtons from '@/components/social/FloatingSocialButtons';
import NotificationBell from '@/components/ui/notification-bell';
import { Progress } from '@/components/ui/progress';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  ArrowRight, 
  Activity,
  Clock,
  Plus,
  Zap,
  Gift,
  Target,
  BarChart3,
  Sparkles,
  Crown
} from 'lucide-react';
import { cn } from '@/lib/utils';

const VIP_LEVELS = [
  { level: 0, name: 'Bronze', icon: '🥉', color: 'from-amber-700 to-amber-900', minDeposit: 0 },
  { level: 1, name: 'Silver', icon: '🥈', color: 'from-gray-300 to-gray-500', minDeposit: 5000 },
  { level: 2, name: 'Gold', icon: '🥇', color: 'from-yellow-400 to-amber-500', minDeposit: 25000 },
  { level: 3, name: 'Platinum', icon: '💎', color: 'from-cyan-400 to-blue-500', minDeposit: 100000 },
  { level: 4, name: 'Diamond', icon: '👑', color: 'from-purple-400 to-pink-500', minDeposit: 500000 },
];

export default function Dashboard() {
  const { user } = useAuth();
  const { balance, lockedBalance, availableBalance } = useWallet();
  const { prices, isConnected } = usePrices();
  const { unreadCount } = useNotifications();

  const { data: profile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('user_id', user?.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: recentTrades } = useQuery({
    queryKey: ['recent-trades', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trades').select('*').eq('user_id', user?.id)
        .order('created_at', { ascending: false }).limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: pendingDeposits } = useQuery({
    queryKey: ['pending-deposits', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deposit_requests').select('*').eq('user_id', user?.id).eq('status', 'pending');
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const totalPnL = recentTrades?.reduce((acc, trade) => acc + (Number(trade.profit_loss) || 0), 0) || 0;
  const winningTrades = recentTrades?.filter(t => t.status === 'won').length || 0;
  const totalTrades = recentTrades?.filter(t => t.status !== 'pending').length || 0;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

  const vipLevel = profile?.vip_level || 0;
  const currentVIP = VIP_LEVELS[Math.min(vipLevel, VIP_LEVELS.length - 1)];
  const nextVIP = VIP_LEVELS[Math.min(vipLevel + 1, VIP_LEVELS.length - 1)];
  const vipProgress = nextVIP.minDeposit > 0 
    ? Math.min(((profile?.total_deposit || 0) / nextVIP.minDeposit) * 100, 100) : 100;

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
  const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

  return (
    <UserLayout>
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
        {/* Welcome Header */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" /> Dashboard
            </h1>
            <p className="text-muted-foreground">Welcome back, {profile?.full_name || 'Trader'} 👋</p>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <Badge className={cn("px-3 py-1.5 bg-gradient-to-r text-white border-0", currentVIP.color)}>
              <span className="mr-1">{currentVIP.icon}</span> VIP {currentVIP.name}
            </Badge>
            <span className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium",
              isConnected ? "bg-profit/20 text-profit" : "bg-warning/20 text-warning"
            )}>
              <span className={cn("h-2 w-2 rounded-full", isConnected ? "bg-profit pulse-live" : "bg-warning")} />
              {isConnected ? 'Markets Live' : 'Connecting...'}
            </span>
          </div>
        </motion.div>

        {/* VIP Progress */}
        {vipLevel < VIP_LEVELS.length - 1 && (
          <motion.div variants={itemVariants}>
            <Card className="border-border/50 bg-gradient-to-r from-card via-card to-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-warning" />
                    <span className="text-sm font-medium">Next: {nextVIP.icon} {nextVIP.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">
                    {formatINR(profile?.total_deposit || 0)} / {formatINR(nextVIP.minDeposit)}
                  </span>
                </div>
                <Progress value={vipProgress} className="h-2" />
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Stats Cards */}
        <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-3">
          <Card className="border-border/50 bg-gradient-to-br from-card via-card to-primary/5 overflow-hidden relative neon-glow">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
            <CardContent className="p-5 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Balance</p>
                  <motion.p className="text-2xl font-bold font-mono text-primary mt-1" key={balance}
                    initial={{ scale: 1.1 }} animate={{ scale: 1 }}>
                    {formatINR(balance)}
                  </motion.p>
                </div>
                <div className="p-3 rounded-xl bg-primary/10"><Wallet className="h-6 w-6 text-primary" /></div>
              </div>
              <div className="flex items-center gap-2 mt-3 text-xs">
                <span className="text-profit">Available: {formatINR(availableBalance)}</span>
                {lockedBalance > 0 && <span className="text-warning">• Locked: {formatINR(lockedBalance)}</span>}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-gradient-to-br from-card via-card to-secondary/30">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total P&L</p>
                  <p className={cn("text-2xl font-bold font-mono mt-1", totalPnL >= 0 ? "text-profit" : "text-loss")}>
                    {totalPnL >= 0 ? '+' : ''}{formatINR(totalPnL)}
                  </p>
                </div>
                <div className={cn("p-3 rounded-xl", totalPnL >= 0 ? "bg-profit/10" : "bg-loss/10")}>
                  {totalPnL >= 0 ? <TrendingUp className="h-6 w-6 text-profit" /> : <TrendingDown className="h-6 w-6 text-loss" />}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-gradient-to-br from-card via-card to-secondary/30">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Win Rate</p>
                  <p className="text-2xl font-bold font-mono mt-1">{winRate.toFixed(1)}%</p>
                </div>
                <div className="p-3 rounded-xl bg-info/10"><Target className="h-6 w-6 text-info" /></div>
              </div>
              <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                <Activity className="h-3 w-3" /><span>{winningTrades}/{totalTrades} won</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={itemVariants} className="grid gap-3 grid-cols-2 md:grid-cols-4">
          {[
            { to: '/trade', icon: Zap, label: 'Start Trading', cls: 'bg-gradient-to-r from-profit to-profit/80 shadow-lg shadow-profit/20' },
            { to: '/wallet', icon: Plus, label: 'Deposit', cls: '' },
            { to: '/wallet', icon: Gift, label: 'Bonus', cls: '' },
            { to: '/history', icon: Clock, label: 'History', cls: '' },
          ].map((action, i) => (
            <motion.div key={action.label} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button asChild variant={i === 0 ? 'default' : i === 3 ? 'outline' : 'secondary'}
                className={cn("h-auto py-4 w-full flex-col gap-2", action.cls)}>
                <Link to={action.to}><action.icon className="h-5 w-5" /><span>{action.label}</span></Link>
              </Button>
            </motion.div>
          ))}
        </motion.div>

        {/* Market Prices */}
        <motion.div variants={itemVariants}>
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" /> Live Markets
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/trade">Trade Now <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2">
                {TRADING_PAIRS.map((pair, index) => {
                  const priceData = prices[pair.symbol];
                  const change = priceData?.change24h || 0;
                  const isPositive = change >= 0;
                  return (
                    <motion.div key={pair.symbol} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}>
                      <Link to={`/trade?pair=${pair.symbol}`}
                        className="flex items-center justify-between p-3 rounded-xl hover:bg-secondary/50 transition-all group">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-secondary to-card flex items-center justify-center text-lg font-bold group-hover:scale-110 transition-transform">
                            {pair.icon}
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{pair.base}</p>
                            <p className="text-xs text-muted-foreground">{pair.symbol}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-mono font-semibold text-sm">
                            {priceData ? `$${priceData.price.toLocaleString('en-US', { minimumFractionDigits: pair.decimals, maximumFractionDigits: pair.decimals })}` : '--'}
                          </p>
                          <p className={cn("text-xs font-mono", isPositive ? "text-profit" : "text-loss")}>
                            {priceData ? formatPercent(change) : '--'}
                          </p>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Trades */}
        {recentTrades && recentTrades.length > 0 && (
          <motion.div variants={itemVariants}>
            <Card className="border-border/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" /> Recent Trades
                </CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/history">View All <ArrowRight className="ml-1 h-4 w-4" /></Link>
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {recentTrades.slice(0, 3).map((trade, index) => (
                    <motion.div key={trade.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className={cn("flex items-center justify-between p-4 rounded-xl",
                        trade.status === 'won' ? "bg-profit/5" : trade.status === 'lost' ? "bg-loss/5" : "bg-secondary/50")}>
                      <div className="flex items-center gap-3">
                        <div className={cn("p-2 rounded-lg", trade.trade_type === 'buy' ? "bg-profit/10" : "bg-loss/10")}>
                          {trade.trade_type === 'buy' ? <TrendingUp className="h-4 w-4 text-profit" /> : <TrendingDown className="h-4 w-4 text-loss" />}
                        </div>
                        <div>
                          <p className="font-medium">{trade.trading_pair}</p>
                          <p className="text-xs text-muted-foreground">{trade.trade_type.toUpperCase()} • {formatINR(Number(trade.amount))}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={cn("font-mono font-semibold",
                          trade.status === 'won' ? "text-profit" : trade.status === 'lost' ? "text-loss" : "text-muted-foreground")}>
                          {trade.status === 'won' ? '+' : ''}{formatINR(Number(trade.profit_loss || 0))}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">{trade.status}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Pending Deposits */}
        {pendingDeposits && pendingDeposits.length > 0 && (
          <motion.div variants={itemVariants}>
            <Card className="border-warning/50 bg-warning/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-warning/10"><Clock className="h-5 w-5 text-warning" /></div>
                    <div>
                      <p className="font-medium">Pending Deposits</p>
                      <p className="text-sm text-muted-foreground">{pendingDeposits.length} deposit(s) awaiting approval</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild><Link to="/wallet">View</Link></Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>
      <FloatingSocialButtons />
    </UserLayout>
  );
}
