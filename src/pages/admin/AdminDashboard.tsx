import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatINR } from '@/lib/formatters';
import { Link } from 'react-router-dom';
import {
  Users,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  LineChart,
  TrendingUp,
  TrendingDown,
  Clock,
  Activity,
  Zap,
  Trophy,
  XCircle,
  Timer,
  RefreshCw,
  ArrowRight,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AdminDashboard() {
  const [countdown, setCountdown] = useState<{ [key: string]: number }>({});

  // Fetch stats
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [
        { count: totalUsers },
        { data: pendingDeposits },
        { data: pendingWithdrawals },
        { data: activeTrades },
        { data: allTrades },
        { data: wallets },
        { data: allDeposits },
        { data: allWithdrawals },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('deposit_requests').select('amount').eq('status', 'pending'),
        supabase.from('withdrawal_requests').select('amount').eq('status', 'pending'),
        supabase.from('trades').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
        supabase.from('trades').select('status, profit_loss'),
        supabase.from('wallets').select('balance'),
        supabase.from('deposit_requests').select('amount').eq('status', 'approved'),
        supabase.from('withdrawal_requests').select('amount').in('status', ['approved', 'paid']),
      ]);

      const totalBalance = wallets?.reduce((sum, w) => sum + Number(w.balance), 0) || 0;
      const pendingDepositAmount = pendingDeposits?.reduce((sum, d) => sum + Number(d.amount), 0) || 0;
      const pendingWithdrawalAmount = pendingWithdrawals?.reduce((sum, w) => sum + Number(w.amount), 0) || 0;
      const totalDeposited = allDeposits?.reduce((sum, d) => sum + Number(d.amount), 0) || 0;
      const totalWithdrawn = allWithdrawals?.reduce((sum, w) => sum + Number(w.amount), 0) || 0;
      
      // Calculate trade stats
      const wonTrades = allTrades?.filter(t => t.status === 'won') || [];
      const lostTrades = allTrades?.filter(t => t.status === 'lost') || [];
      const totalWinPayout = wonTrades.reduce((sum, t) => sum + Math.abs(Number(t.profit_loss || 0)), 0);
      const totalLossCollection = lostTrades.reduce((sum, t) => sum + Math.abs(Number(t.profit_loss || 0)), 0);

      return {
        totalUsers: totalUsers || 0,
        totalBalance,
        pendingDeposits: pendingDeposits?.length || 0,
        pendingDepositAmount,
        pendingWithdrawals: pendingWithdrawals?.length || 0,
        pendingWithdrawalAmount,
        activeTrades: activeTrades || [],
        activeTradesCount: activeTrades?.length || 0,
        totalDeposited,
        totalWithdrawn,
        platformProfit: totalLossCollection - totalWinPayout,
        wonCount: wonTrades.length,
        lostCount: lostTrades.length,
        winRate: wonTrades.length + lostTrades.length > 0 
          ? (lostTrades.length / (wonTrades.length + lostTrades.length)) * 100 
          : 50,
      };
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Update countdowns for active trades
  useEffect(() => {
    const activeTrades = stats?.activeTrades || [];
    if (activeTrades.length === 0) return;

    const updateCountdowns = () => {
      const newCountdowns: { [key: string]: number } = {};
      
      activeTrades.forEach((trade: any) => {
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
  }, [stats?.activeTrades]);

  // Fetch recent activity
  const { data: recentDeposits } = useQuery({
    queryKey: ['admin-recent-deposits'],
    queryFn: async () => {
      const { data } = await supabase
        .from('deposit_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      
      // Get profiles separately
      if (data) {
        const userIds = [...new Set(data.map(d => d.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, email')
          .in('user_id', userIds);
        
        return data.map(d => ({
          ...d,
          profile: profiles?.find(p => p.user_id === d.user_id)
        }));
      }
      return data;
    },
  });

  const { data: recentWithdrawals } = useQuery({
    queryKey: ['admin-recent-withdrawals'],
    queryFn: async () => {
      const { data } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (data) {
        const userIds = [...new Set(data.map(w => w.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, email')
          .in('user_id', userIds);
        
        return data.map(w => ({
          ...w,
          profile: profiles?.find(p => p.user_id === w.user_id)
        }));
      }
      return data;
    },
  });

  const statCards = [
    {
      title: 'Total Users',
      value: stats?.totalUsers || 0,
      icon: Users,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      title: 'Total Balance (Users)',
      value: formatINR(stats?.totalBalance || 0),
      icon: Wallet,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      title: 'Pending Deposits',
      value: `${stats?.pendingDeposits || 0}`,
      subtitle: formatINR(stats?.pendingDepositAmount || 0),
      icon: ArrowDownCircle,
      color: 'text-warning',
      bg: 'bg-warning/10',
      link: '/admin/deposits',
    },
    {
      title: 'Pending Withdrawals',
      value: `${stats?.pendingWithdrawals || 0}`,
      subtitle: formatINR(stats?.pendingWithdrawalAmount || 0),
      icon: ArrowUpCircle,
      color: 'text-orange-500',
      bg: 'bg-orange-500/10',
      link: '/admin/withdrawals',
    },
    {
      title: 'Active Trades',
      value: stats?.activeTradesCount || 0,
      icon: Timer,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
      link: '/admin/trades',
      pulse: (stats?.activeTradesCount || 0) > 0,
    },
    {
      title: 'Platform Profit',
      value: formatINR(stats?.platformProfit || 0),
      icon: stats?.platformProfit && stats.platformProfit >= 0 ? TrendingUp : TrendingDown,
      color: stats?.platformProfit && stats.platformProfit >= 0 ? 'text-profit' : 'text-loss',
      bg: stats?.platformProfit && stats.platformProfit >= 0 ? 'bg-profit/10' : 'bg-loss/10',
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground">Platform overview and quick actions</p>
          </div>
          <Button variant="outline" onClick={() => refetchStats()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {statCards.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className={cn(
                "border-border/50 transition-all hover:shadow-md",
                stat.link && "cursor-pointer hover:border-primary/50"
              )}>
                {stat.link ? (
                  <Link to={stat.link}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">{stat.title}</p>
                          <p className="text-2xl font-bold mt-1">{stat.value}</p>
                          {stat.subtitle && (
                            <p className="text-sm text-muted-foreground">{stat.subtitle}</p>
                          )}
                        </div>
                        <div className={cn(
                          "p-3 rounded-full",
                          stat.bg,
                          stat.pulse && "animate-pulse"
                        )}>
                          <stat.icon className={cn("h-6 w-6", stat.color)} />
                        </div>
                      </div>
                    </CardContent>
                  </Link>
                ) : (
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{stat.title}</p>
                        <p className="text-2xl font-bold mt-1">{stat.value}</p>
                        {stat.subtitle && (
                          <p className="text-sm text-muted-foreground">{stat.subtitle}</p>
                        )}
                      </div>
                      <div className={cn("p-3 rounded-full", stat.bg)}>
                        <stat.icon className={cn("h-6 w-6", stat.color)} />
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Live Active Trades */}
        {stats?.activeTrades && stats.activeTrades.length > 0 && (
          <Card className="border-warning/50 bg-gradient-to-br from-card to-warning/5">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Timer className="h-5 w-5 text-warning animate-pulse" />
                Live Active Trades ({stats.activeTrades.length})
              </CardTitle>
              <Link to="/admin/trades">
                <Button variant="outline" size="sm">
                  View All <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.activeTrades.slice(0, 5).map((trade: any) => {
                  const remaining = countdown[trade.id] || 0;
                  const total = trade.duration_seconds || 30;
                  const progress = ((total - remaining) / total) * 100;
                  
                  return (
                    <motion.div
                      key={trade.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-4 rounded-lg bg-secondary/50 border border-warning/20"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={trade.trade_type === 'buy' ? 'text-profit' : 'text-loss'}>
                            {trade.trade_type === 'buy' ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                            {trade.trade_type.toUpperCase()}
                          </Badge>
                          <span className="font-semibold">{trade.trading_pair}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono">{formatINR(Number(trade.amount))}</span>
                          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 font-mono">
                            {remaining}s
                          </Badge>
                          {trade.expected_result && (
                            <Badge variant="outline" className={trade.expected_result === 'win' ? 'bg-profit/10 text-profit' : 'bg-loss/10 text-loss'}>
                              {trade.expected_result === 'win' ? '🎯' : '❌'}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Progress value={progress} className="h-1.5" />
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Trade Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-profit/50 bg-profit/5">
            <CardContent className="p-4 text-center">
              <Trophy className="h-8 w-8 text-profit mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Users Won</p>
              <p className="text-2xl font-bold text-profit">{stats?.wonCount || 0}</p>
            </CardContent>
          </Card>
          <Card className="border-loss/50 bg-loss/5">
            <CardContent className="p-4 text-center">
              <XCircle className="h-8 w-8 text-loss mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Users Lost</p>
              <p className="text-2xl font-bold text-loss">{stats?.lostCount || 0}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4 text-center">
              <Activity className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Platform Win Rate</p>
              <p className="text-2xl font-bold">{(stats?.winRate || 50).toFixed(1)}%</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Recent Deposits */}
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ArrowDownCircle className="h-5 w-5 text-profit" />
                Recent Deposits
              </CardTitle>
              <Link to="/admin/deposits">
                <Button variant="ghost" size="sm">View All</Button>
              </Link>
            </CardHeader>
            <CardContent>
              {recentDeposits && recentDeposits.length > 0 ? (
                <div className="space-y-3">
                  {recentDeposits.map((deposit: any) => (
                    <div key={deposit.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                      <div>
                        <p className="font-medium text-sm">{deposit.profile?.email || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{new Date(deposit.created_at).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-semibold">{formatINR(Number(deposit.amount))}</p>
                        <Badge variant="outline" className={cn(
                          "text-xs",
                          deposit.status === 'pending' ? 'bg-warning/20 text-warning' :
                          deposit.status === 'approved' ? 'bg-profit/20 text-profit' : 'bg-loss/20 text-loss'
                        )}>
                          {deposit.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No recent deposits</p>
              )}
            </CardContent>
          </Card>

          {/* Recent Withdrawals */}
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ArrowUpCircle className="h-5 w-5 text-loss" />
                Recent Withdrawals
              </CardTitle>
              <Link to="/admin/withdrawals">
                <Button variant="ghost" size="sm">View All</Button>
              </Link>
            </CardHeader>
            <CardContent>
              {recentWithdrawals && recentWithdrawals.length > 0 ? (
                <div className="space-y-3">
                  {recentWithdrawals.map((withdrawal: any) => (
                    <div key={withdrawal.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                      <div>
                        <p className="font-medium text-sm">{withdrawal.profile?.email || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{withdrawal.upi_id}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-semibold">{formatINR(Number(withdrawal.amount))}</p>
                        <Badge variant="outline" className={cn(
                          "text-xs",
                          withdrawal.status === 'pending' ? 'bg-warning/20 text-warning' :
                          withdrawal.status === 'approved' || withdrawal.status === 'paid' ? 'bg-profit/20 text-profit' : 'bg-loss/20 text-loss'
                        )}>
                          {withdrawal.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No recent withdrawals</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}