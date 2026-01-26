import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatINR } from '@/lib/formatters';
import {
  Users,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  LineChart,
  TrendingUp,
  TrendingDown,
  Clock,
} from 'lucide-react';

export default function AdminDashboard() {
  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [
        { count: totalUsers },
        { data: pendingDeposits },
        { data: pendingWithdrawals },
        { data: activeTrades },
        { data: wallets },
        { data: allDeposits },
        { data: allWithdrawals },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('deposit_requests').select('amount').eq('status', 'pending'),
        supabase.from('withdrawal_requests').select('amount').eq('status', 'pending'),
        supabase.from('trades').select('*').eq('status', 'pending'),
        supabase.from('wallets').select('balance'),
        supabase.from('deposit_requests').select('amount').eq('status', 'approved'),
        supabase.from('withdrawal_requests').select('amount').in('status', ['approved', 'paid']),
      ]);

      const totalBalance = wallets?.reduce((sum, w) => sum + Number(w.balance), 0) || 0;
      const pendingDepositAmount = pendingDeposits?.reduce((sum, d) => sum + Number(d.amount), 0) || 0;
      const pendingWithdrawalAmount = pendingWithdrawals?.reduce((sum, w) => sum + Number(w.amount), 0) || 0;
      const totalDeposited = allDeposits?.reduce((sum, d) => sum + Number(d.amount), 0) || 0;
      const totalWithdrawn = allWithdrawals?.reduce((sum, w) => sum + Number(w.amount), 0) || 0;

      return {
        totalUsers: totalUsers || 0,
        totalBalance,
        pendingDeposits: pendingDeposits?.length || 0,
        pendingDepositAmount,
        pendingWithdrawals: pendingWithdrawals?.length || 0,
        pendingWithdrawalAmount,
        activeTrades: activeTrades?.length || 0,
        totalDeposited,
        totalWithdrawn,
        platformProfit: totalDeposited - totalWithdrawn - totalBalance,
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch recent activity
  const { data: recentDeposits } = useQuery({
    queryKey: ['admin-recent-deposits'],
    queryFn: async () => {
      const { data } = await supabase
        .from('deposit_requests')
        .select('*, profiles!deposit_requests_user_id_fkey(email)')
        .order('created_at', { ascending: false })
        .limit(5);
      return data;
    },
  });

  const { data: recentWithdrawals } = useQuery({
    queryKey: ['admin-recent-withdrawals'],
    queryFn: async () => {
      const { data } = await supabase
        .from('withdrawal_requests')
        .select('*, profiles!withdrawal_requests_user_id_fkey(email)')
        .order('created_at', { ascending: false })
        .limit(5);
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
      value: `${stats?.pendingDeposits || 0} (${formatINR(stats?.pendingDepositAmount || 0)})`,
      icon: ArrowDownCircle,
      color: 'text-warning',
      bg: 'bg-warning/10',
    },
    {
      title: 'Pending Withdrawals',
      value: `${stats?.pendingWithdrawals || 0} (${formatINR(stats?.pendingWithdrawalAmount || 0)})`,
      icon: ArrowUpCircle,
      color: 'text-orange-500',
      bg: 'bg-orange-500/10',
    },
    {
      title: 'Active Trades',
      value: stats?.activeTrades || 0,
      icon: LineChart,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
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
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Platform overview and quick actions</p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {statCards.map((stat, index) => (
            <Card key={index} className="border-border/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-full ${stat.bg}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Recent Deposits */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowDownCircle className="h-5 w-5 text-profit" />
                Recent Deposits
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentDeposits && recentDeposits.length > 0 ? (
                <div className="space-y-3">
                  {recentDeposits.map((deposit: any) => (
                    <div key={deposit.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                      <div>
                        <p className="font-medium text-sm">{deposit.profiles?.email || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{new Date(deposit.created_at).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-semibold">{formatINR(Number(deposit.amount))}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          deposit.status === 'pending' ? 'bg-warning/20 text-warning' :
                          deposit.status === 'approved' ? 'bg-profit/20 text-profit' : 'bg-loss/20 text-loss'
                        }`}>
                          {deposit.status}
                        </span>
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
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowUpCircle className="h-5 w-5 text-loss" />
                Recent Withdrawals
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentWithdrawals && recentWithdrawals.length > 0 ? (
                <div className="space-y-3">
                  {recentWithdrawals.map((withdrawal: any) => (
                    <div key={withdrawal.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                      <div>
                        <p className="font-medium text-sm">{withdrawal.profiles?.email || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{withdrawal.upi_id}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-semibold">{formatINR(Number(withdrawal.amount))}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          withdrawal.status === 'pending' ? 'bg-warning/20 text-warning' :
                          withdrawal.status === 'approved' || withdrawal.status === 'paid' ? 'bg-profit/20 text-profit' : 'bg-loss/20 text-loss'
                        }`}>
                          {withdrawal.status}
                        </span>
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
