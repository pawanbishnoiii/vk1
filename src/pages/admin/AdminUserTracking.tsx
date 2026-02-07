import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatINR } from '@/lib/formatters';
import { 
  Activity, 
  Users, 
  Search,
  Loader2,
  TrendingUp,
  TrendingDown,
  Clock,
  BarChart3,
  Wallet,
  UserCheck
} from 'lucide-react';

export default function AdminUserTracking() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activityFilter, setActivityFilter] = useState('all');

  // Fetch users with stats
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users-tracking'],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      
      // Fetch wallets separately
      const { data: wallets } = await supabase.from('wallets').select('*');
      const walletsMap = new Map(wallets?.map(w => [w.user_id, w]));
      
      return profiles.map(p => ({
        ...p,
        wallet: walletsMap.get(p.user_id) || null
      }));
    },
  });

  // Fetch user activity logs
  const { data: activities, isLoading: activitiesLoading } = useQuery({
    queryKey: ['admin-activity-logs', activityFilter],
    queryFn: async () => {
      // Fetch activity logs
      let query = supabase
        .from('user_activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (activityFilter !== 'all') {
        query = query.eq('activity_type', activityFilter);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      // Fetch profiles separately to avoid FK join issues
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(a => a.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, email, full_name')
          .in('user_id', userIds);
        
        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        return data.map(a => ({ ...a, profile: profileMap.get(a.user_id) || null }));
      }
      return data;
    },
  });

  // Fetch trade stats per user
  const { data: tradeStats } = useQuery({
    queryKey: ['admin-trade-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trades')
        .select('user_id, status, profit_loss');
      if (error) throw error;
      
      // Aggregate by user
      const stats: Record<string, { total: number; wins: number; pnl: number }> = {};
      data?.forEach(trade => {
        if (!stats[trade.user_id]) {
          stats[trade.user_id] = { total: 0, wins: 0, pnl: 0 };
        }
        stats[trade.user_id].total++;
        if (trade.status === 'won') stats[trade.user_id].wins++;
        stats[trade.user_id].pnl += Number(trade.profit_loss) || 0;
      });
      return stats;
    },
  });

  const filteredUsers = users?.filter(user =>
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalUsers = users?.length || 0;
  const activeUsers = users?.filter(u => u.wallet && u.wallet.balance > 0).length || 0;
  const totalBalance = users?.reduce((sum, u) => sum + (u.wallet?.balance || 0), 0) || 0;

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'login': return <UserCheck className="h-4 w-4 text-profit" />;
      case 'trade': return <TrendingUp className="h-4 w-4 text-primary" />;
      case 'deposit': return <Wallet className="h-4 w-4 text-info" />;
      case 'withdrawal': return <TrendingDown className="h-4 w-4 text-warning" />;
      default: return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-7 w-7 text-primary" />
            User Tracking
          </h1>
          <p className="text-muted-foreground">Monitor user activity and trading behavior</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold">{totalUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <UserCheck className="h-8 w-8 text-profit" />
                <div>
                  <p className="text-sm text-muted-foreground">Active Users</p>
                  <p className="text-2xl font-bold">{activeUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Wallet className="h-8 w-8 text-info" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Balance</p>
                  <p className="text-2xl font-bold font-mono">{formatINR(totalBalance)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-warning" />
                <div>
                  <p className="text-sm text-muted-foreground">Today's Activities</p>
                  <p className="text-2xl font-bold">{activities?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                All Users
              </CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Trades</TableHead>
                  <TableHead>Win Rate</TableHead>
                  <TableHead>P&L</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers?.map((user) => {
                    const stats = tradeStats?.[user.user_id];
                    const winRate = stats && stats.total > 0 
                      ? ((stats.wins / stats.total) * 100).toFixed(1) 
                      : '0.0';
                    
                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{user.full_name || 'Unnamed'}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">
                          {formatINR(user.wallet?.balance || 0)}
                          {user.wallet?.locked_balance > 0 && (
                            <span className="text-xs text-muted-foreground ml-1">
                              (+{formatINR(user.wallet.locked_balance)} locked)
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{stats?.total || 0}</TableCell>
                        <TableCell>
                          <Badge variant={Number(winRate) >= 50 ? 'default' : 'secondary'}>
                            {winRate}%
                          </Badge>
                        </TableCell>
                        <TableCell className={stats?.pnl >= 0 ? 'text-profit' : 'text-loss'}>
                          {formatINR(stats?.pnl || 0)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.is_blocked ? 'destructive' : 'default'}>
                            {user.is_blocked ? 'Blocked' : 'Active'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Activity Log */}
        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Activity Log
              </CardTitle>
              <Select value={activityFilter} onValueChange={setActivityFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Activities</SelectItem>
                  <SelectItem value="login">Logins</SelectItem>
                  <SelectItem value="trade">Trades</SelectItem>
                  <SelectItem value="deposit">Deposits</SelectItem>
                  <SelectItem value="withdrawal">Withdrawals</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {activitiesLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </div>
              ) : activities?.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No activity logs yet</p>
              ) : (
                activities?.map((activity) => (
                  <div 
                    key={activity.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    {getActivityIcon(activity.activity_type)}
                    <div className="flex-1">
                      <p className="text-sm">
                        <span className="font-medium">
                          {(activity as any).profile?.email || 'Unknown'}
                        </span>
                        {' '}
                        <span className="text-muted-foreground">{activity.activity_type}</span>
                      </p>
                      {activity.activity_data && (
                        <p className="text-xs text-muted-foreground">
                          {JSON.stringify(activity.activity_data)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(activity.created_at).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
