import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { formatINR, formatDate } from '@/lib/formatters';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Search, UserX, UserCheck, Edit, Wallet, Loader2, Eye, Crown,
  TrendingUp, TrendingDown, ArrowDownCircle, ArrowUpCircle,
} from 'lucide-react';

const VIP_LABELS: Record<number, { name: string; icon: string }> = {
  0: { name: 'Bronze', icon: '🥉' },
  1: { name: 'Silver', icon: '🥈' },
  2: { name: 'Gold', icon: '🥇' },
  3: { name: 'Platinum', icon: '💎' },
  4: { name: 'Diamond', icon: '👑' },
};

export default function AdminUsers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [editBalance, setEditBalance] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailUser, setDetailUser] = useState<any>(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users', searchQuery],
    queryFn: async () => {
      let profileQuery = supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (searchQuery) {
        profileQuery = profileQuery.or(`email.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`);
      }
      const { data: profiles, error } = await profileQuery;
      if (error) throw error;
      
      const userIds = profiles?.map(p => p.user_id) || [];
      const { data: wallets } = await supabase.from('wallets').select('user_id, balance, locked_balance').in('user_id', userIds);
      
      return profiles?.map(profile => ({
        ...profile,
        wallet: wallets?.find(w => w.user_id === profile.user_id) || { balance: 0, locked_balance: 0 }
      }));
    },
  });

  // Fetch detailed user data when viewing a user
  const { data: userDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['admin-user-detail', detailUser?.user_id],
    queryFn: async () => {
      if (!detailUser?.user_id) return null;
      const userId = detailUser.user_id;

      const [tradesRes, depositsRes, withdrawalsRes, transactionsRes, bonusesRes] = await Promise.all([
        supabase.from('trades').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
        supabase.from('deposit_requests').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
        supabase.from('withdrawal_requests').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
        supabase.from('transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(30),
        supabase.from('user_bonuses').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      ]);

      const trades = tradesRes.data || [];
      const totalTradesCount = trades.length;
      const wins = trades.filter(t => t.status === 'won').length;
      const totalPnL = trades.reduce((s, t) => s + (Number(t.profit_loss) || 0), 0);
      const totalDeposits = (depositsRes.data || []).filter(d => d.status === 'approved').reduce((s, d) => s + Number(d.amount), 0);

      return {
        trades: tradesRes.data || [],
        deposits: depositsRes.data || [],
        withdrawals: withdrawalsRes.data || [],
        transactions: transactionsRes.data || [],
        bonuses: bonusesRes.data || [],
        stats: { totalTradesCount, wins, totalPnL, totalDeposits },
      };
    },
    enabled: !!detailUser?.user_id,
  });

  const toggleBlockUser = useMutation({
    mutationFn: async ({ userId, isBlocked }: { userId: string; isBlocked: boolean }) => {
      const { error } = await supabase.from('profiles').update({ is_blocked: isBlocked }).eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast({ title: variables.isBlocked ? 'User blocked' : 'User unblocked' });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  const updateBalance = useMutation({
    mutationFn: async ({ userId, newBalance }: { userId: string; newBalance: number }) => {
      const { error } = await supabase.from('wallets').update({ balance: newBalance }).eq('user_id', userId);
      if (error) throw error;
      await supabase.from('admin_logs').insert({ action: 'balance_update', target_type: 'user', target_id: userId, details: { new_balance: newBalance } });
    },
    onSuccess: () => {
      toast({ title: 'Balance updated' });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setIsEditDialogOpen(false);
    },
  });

  const handleEditBalance = (user: any) => {
    setSelectedUser(user);
    setEditBalance(user.wallet?.balance?.toString() || '0');
    setIsEditDialogOpen(true);
  };

  const handleViewDetail = (user: any) => {
    setDetailUser(user);
    setIsDetailOpen(true);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Manage users, view complete history & analytics</p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by email or name..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>

        <Card className="border-border/50">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>VIP</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Locked</TableHead>
                    <TableHead>Total Deposit</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.map((user) => {
                    const vip = VIP_LABELS[user.vip_level || 0] || VIP_LABELS[0];
                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={user.avatar_url || ''} />
                              <AvatarFallback>{(user.full_name || user.email || '?')[0].toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{user.full_name || 'No name'}</p>
                              <p className="text-xs text-muted-foreground">{user.email}</p>
                              {user.mobile_number && <p className="text-xs text-muted-foreground">{user.mobile_number}</p>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{vip.icon} {vip.name}</Badge>
                        </TableCell>
                        <TableCell className="font-mono">{formatINR(Number(user.wallet?.balance || 0))}</TableCell>
                        <TableCell className="font-mono text-warning">{formatINR(Number(user.wallet?.locked_balance || 0))}</TableCell>
                        <TableCell className="font-mono">{formatINR(user.total_deposit || 0)}</TableCell>
                        <TableCell>
                          {user.is_blocked ? (
                            <Badge variant="destructive">Blocked</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-profit/10 text-profit border-profit/30">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(user.created_at)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleViewDetail(user)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleEditBalance(user)}>
                              <Wallet className="h-4 w-4" />
                            </Button>
                            <Button variant={user.is_blocked ? 'default' : 'destructive'} size="sm"
                              onClick={() => toggleBlockUser.mutate({ userId: user.user_id, isBlocked: !user.is_blocked })}>
                              {user.is_blocked ? <UserCheck className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Edit Balance Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit User Balance</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div><p className="text-sm text-muted-foreground">User</p><p className="font-medium">{selectedUser?.email}</p></div>
              <div className="space-y-2">
                <Label htmlFor="balance">New Balance (₹)</Label>
                <Input id="balance" type="number" value={editBalance} onChange={(e) => setEditBalance(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => { if (selectedUser) updateBalance.mutate({ userId: selectedUser.user_id, newBalance: parseFloat(editBalance) || 0 }); }} disabled={updateBalance.isPending}>
                {updateBalance.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* User Detail Dialog */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={detailUser?.avatar_url || ''} />
                  <AvatarFallback>{(detailUser?.full_name || '?')[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p>{detailUser?.full_name || 'User'}</p>
                  <p className="text-sm text-muted-foreground font-normal">{detailUser?.email}</p>
                </div>
              </DialogTitle>
            </DialogHeader>

            {detailLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : userDetail ? (
              <div className="space-y-4">
                {/* Profile Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg bg-secondary/50">
                    <p className="text-xs text-muted-foreground">Mobile</p>
                    <p className="font-medium">{detailUser?.mobile_number || '-'}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/50">
                    <p className="text-xs text-muted-foreground">Gender / Age</p>
                    <p className="font-medium">{detailUser?.gender || '-'} / {detailUser?.age || '-'}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/50">
                    <p className="text-xs text-muted-foreground">VIP Level</p>
                    <p className="font-medium">{VIP_LABELS[detailUser?.vip_level || 0]?.icon} {VIP_LABELS[detailUser?.vip_level || 0]?.name}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/50">
                    <p className="text-xs text-muted-foreground">Joined</p>
                    <p className="font-medium text-sm">{formatDate(detailUser?.created_at)}</p>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg bg-primary/10 text-center">
                    <p className="text-xs text-muted-foreground">Total Trades</p>
                    <p className="text-xl font-bold">{userDetail.stats.totalTradesCount}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-profit/10 text-center">
                    <p className="text-xs text-muted-foreground">Wins</p>
                    <p className="text-xl font-bold text-profit">{userDetail.stats.wins}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-info/10 text-center">
                    <p className="text-xs text-muted-foreground">Total P&L</p>
                    <p className={`text-xl font-bold font-mono ${userDetail.stats.totalPnL >= 0 ? 'text-profit' : 'text-loss'}`}>{formatINR(userDetail.stats.totalPnL)}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-warning/10 text-center">
                    <p className="text-xs text-muted-foreground">Total Deposits</p>
                    <p className="text-xl font-bold font-mono">{formatINR(userDetail.stats.totalDeposits)}</p>
                  </div>
                </div>

                <Tabs defaultValue="trades" className="space-y-3">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="trades">Trades</TabsTrigger>
                    <TabsTrigger value="deposits">Deposits</TabsTrigger>
                    <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
                    <TabsTrigger value="bonuses">Bonuses</TabsTrigger>
                  </TabsList>

                  <TabsContent value="trades">
                    <div className="max-h-60 overflow-y-auto space-y-1">
                      {userDetail.trades.map((t: any) => (
                        <div key={t.id} className="flex items-center justify-between p-2 rounded bg-secondary/30 text-sm">
                          <div className="flex items-center gap-2">
                            {t.trade_type === 'buy' ? <TrendingUp className="h-3 w-3 text-profit" /> : <TrendingDown className="h-3 w-3 text-loss" />}
                            <span>{t.trading_pair}</span>
                            <Badge variant="secondary" className="text-xs">{t.status}</Badge>
                          </div>
                          <div className="text-right">
                            <span className="font-mono">{formatINR(Number(t.amount))}</span>
                            <span className={`ml-2 font-mono ${Number(t.profit_loss) >= 0 ? 'text-profit' : 'text-loss'}`}>
                              {formatINR(Number(t.profit_loss || 0))}
                            </span>
                          </div>
                        </div>
                      ))}
                      {userDetail.trades.length === 0 && <p className="text-center text-muted-foreground py-4">No trades</p>}
                    </div>
                  </TabsContent>

                  <TabsContent value="deposits">
                    <div className="max-h-60 overflow-y-auto space-y-1">
                      {userDetail.deposits.map((d: any) => (
                        <div key={d.id} className="flex items-center justify-between p-2 rounded bg-secondary/30 text-sm">
                          <div className="flex items-center gap-2">
                            <ArrowDownCircle className="h-3 w-3 text-profit" />
                            <span className="font-mono">{formatINR(Number(d.amount))}</span>
                            <Badge variant={d.status === 'approved' ? 'default' : d.status === 'rejected' ? 'destructive' : 'secondary'}>{d.status}</Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">{formatDate(d.created_at)}</span>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="withdrawals">
                    <div className="max-h-60 overflow-y-auto space-y-1">
                      {userDetail.withdrawals.map((w: any) => (
                        <div key={w.id} className="flex items-center justify-between p-2 rounded bg-secondary/30 text-sm">
                          <div className="flex items-center gap-2">
                            <ArrowUpCircle className="h-3 w-3 text-warning" />
                            <span className="font-mono">{formatINR(Number(w.amount))}</span>
                            <Badge variant={w.status === 'approved' ? 'default' : w.status === 'rejected' ? 'destructive' : 'secondary'}>{w.status}</Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">{formatDate(w.created_at)}</span>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="bonuses">
                    <div className="max-h-60 overflow-y-auto space-y-1">
                      {userDetail.bonuses.map((b: any) => (
                        <div key={b.id} className="flex items-center justify-between p-2 rounded bg-secondary/30 text-sm">
                          <div className="flex items-center gap-2">
                            <Crown className="h-3 w-3 text-warning" />
                            <span>{b.bonus_type || 'Bonus'}</span>
                            <Badge variant="secondary">{b.status}</Badge>
                          </div>
                          <span className="font-mono">{formatINR(Number(b.bonus_amount))}</span>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
