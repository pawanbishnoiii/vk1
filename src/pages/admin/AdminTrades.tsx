import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { formatINR, formatDate } from '@/lib/formatters';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Search,
  Loader2,
  Eye,
  Edit,
  TrendingUp,
  TrendingDown,
  Clock,
  Trophy,
  XCircle,
  Zap,
  Timer,
  Activity,
  RefreshCw,
  AlertTriangle,
  Play,
  Pause
} from 'lucide-react';

export default function AdminTrades() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'pending' | 'won' | 'lost'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrade, setSelectedTrade] = useState<any>(null);
  const [newResult, setNewResult] = useState<'win' | 'loss'>('win');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [countdown, setCountdown] = useState<{ [key: string]: number }>({});

  // Fetch trades with realtime updates
  const { data: trades, isLoading, refetch } = useQuery({
    queryKey: ['admin-trades', filter, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('trades')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (filter !== 'all') {
        query = query.eq('status', filter);
      }
      
      const { data: tradeData, error: tradeError } = await query;
      if (tradeError) throw tradeError;
      
      // Get profiles separately
      const userIds = [...new Set(tradeData?.map(t => t.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, email, full_name')
        .in('user_id', userIds);
      
      // Combine data
      return tradeData?.map(trade => ({
        ...trade,
        profile: profiles?.find(p => p.user_id === trade.user_id)
      }));
    },
    refetchInterval: filter === 'pending' ? 3000 : 10000, // Refresh pending trades more frequently
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

  // Set expected result mutation (pre-set before timer ends)
  const setExpectedResult = useMutation({
    mutationFn: async ({ tradeId, result }: { tradeId: string; result: 'win' | 'loss' }) => {
      const { error } = await supabase
        .from('trades')
        .update({ 
          expected_result: result,
          admin_override: true 
        })
        .eq('id', tradeId);
      
      if (error) throw error;

      // Log admin action
      await supabase.from('admin_logs').insert({
        admin_id: user?.id,
        action: 'set_expected_result',
        target_type: 'trade',
        target_id: tradeId,
        details: { expected_result: result },
      });
    },
    onSuccess: () => {
      toast({
        title: 'Result preset',
        description: 'Trade result has been preset. It will be applied when timer ends.',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-trades'] });
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Force complete trade mutation (immediate resolution)
  const forceCompleteTrade = useMutation({
    mutationFn: async ({ tradeId, result }: { tradeId: string; result: 'won' | 'lost' }) => {
      const trade = trades?.find(t => t.id === tradeId);
      if (!trade) throw new Error('Trade not found');

      const amount = Number(trade.amount);
      const profitLoss = result === 'won' ? amount * 0.8 : -amount;

      // Update trade
      const { error: updateError } = await supabase
        .from('trades')
        .update({
          status: result,
          profit_loss: profitLoss,
          exit_price: Number(trade.entry_price) * (result === 'won' ? 1.01 : 0.99),
          closed_at: new Date().toISOString(),
          admin_override: true,
        })
        .eq('id', tradeId);
      
      if (updateError) throw updateError;

      // Update user's wallet balance
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance, locked_balance')
        .eq('user_id', trade.user_id)
        .single();
      
      const currentBalance = Number(wallet?.balance || 0);
      const newBalance = result === 'won' ? currentBalance + profitLoss : currentBalance - amount;

      await supabase
        .from('wallets')
        .update({ 
          balance: newBalance,
          locked_balance: 0 
        })
        .eq('user_id', trade.user_id);

      // Create transaction record
      await supabase.from('transactions').insert({
        user_id: trade.user_id,
        type: result === 'won' ? 'trade_win' : 'trade_loss',
        amount: profitLoss,
        balance_before: currentBalance,
        balance_after: newBalance,
        reference_id: tradeId,
        description: `${trade.trade_type.toUpperCase()} ${trade.trading_pair} - ${result === 'won' ? 'Won' : 'Lost'} (Admin)`,
      });

      // Create notification
      await supabase.from('notifications').insert({
        user_id: trade.user_id,
        title: result === 'won' ? '🎉 Trade Won!' : '📉 Trade Lost',
        message: result === 'won' 
          ? `Your ${trade.trade_type} trade on ${trade.trading_pair} won ${formatINR(Math.abs(profitLoss))}!`
          : `Your ${trade.trade_type} trade on ${trade.trading_pair} lost ${formatINR(Math.abs(profitLoss))}`,
        type: 'trade_result',
        metadata: { trade_id: tradeId, result, profit_loss: profitLoss },
      });

      // Log admin action
      await supabase.from('admin_logs').insert({
        admin_id: user?.id,
        action: 'force_complete_trade',
        target_type: 'trade',
        target_id: tradeId,
        details: { original_status: trade.status, new_status: result, profit_loss: profitLoss },
      });
    },
    onSuccess: () => {
      toast({
        title: 'Trade completed',
        description: 'Trade has been forcefully completed',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-trades'] });
      setIsDialogOpen(false);
      setSelectedTrade(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const openDialog = (trade: any) => {
    setSelectedTrade(trade);
    setNewResult(trade.expected_result || 'win');
    setIsDialogOpen(true);
  };

  const getStatusBadge = (status: string, tradeId: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
            <Timer className="h-3 w-3 mr-1 animate-pulse" />
            {countdown[tradeId] !== undefined ? `${countdown[tradeId]}s` : 'Active'}
          </Badge>
        );
      case 'won':
        return <Badge variant="outline" className="bg-profit/10 text-profit border-profit/30"><Trophy className="h-3 w-3 mr-1" /> Won</Badge>;
      case 'lost':
        return <Badge variant="outline" className="bg-loss/10 text-loss border-loss/30"><XCircle className="h-3 w-3 mr-1" /> Lost</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    return type === 'buy' 
      ? <Badge className="bg-profit/20 text-profit border-0"><TrendingUp className="h-3 w-3 mr-1" /> Buy</Badge>
      : <Badge className="bg-loss/20 text-loss border-0"><TrendingDown className="h-3 w-3 mr-1" /> Sell</Badge>;
  };

  // Stats
  const pendingCount = trades?.filter(t => t.status === 'pending').length || 0;
  const wonCount = trades?.filter(t => t.status === 'won').length || 0;
  const lostCount = trades?.filter(t => t.status === 'lost').length || 0;
  const totalVolume = trades?.reduce((acc, t) => acc + Number(t.amount), 0) || 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Activity className="h-6 w-6 text-primary" />
              Trade Management
            </h1>
            <p className="text-muted-foreground">View and control trade outcomes in real-time</p>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="border-warning/50 bg-warning/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Trades</p>
                  <p className="text-2xl font-bold text-warning">{pendingCount}</p>
                </div>
                <Timer className="h-8 w-8 text-warning animate-pulse" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-profit/50 bg-profit/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Won</p>
                  <p className="text-2xl font-bold text-profit">{wonCount}</p>
                </div>
                <Trophy className="h-8 w-8 text-profit" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-loss/50 bg-loss/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Lost</p>
                  <p className="text-2xl font-bold text-loss">{lostCount}</p>
                </div>
                <XCircle className="h-8 w-8 text-loss" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Volume</p>
                  <p className="text-2xl font-bold">{formatINR(totalVolume)}</p>
                </div>
                <Zap className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="w-full sm:w-auto">
            <TabsList>
              <TabsTrigger value="pending" className="relative">
                Active
                {pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-warning text-[10px] rounded-full flex items-center justify-center">
                    {pendingCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="won">Won</TabsTrigger>
              <TabsTrigger value="lost">Lost</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by user or pair..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Trades Table */}
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
                    <TableHead>Pair</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Entry Price</TableHead>
                    <TableHead>P&L</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Preset</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {trades?.map((trade) => (
                      <motion.tr
                        key={trade.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={trade.status === 'pending' ? 'bg-warning/5' : ''}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium">{trade.profile?.full_name || 'No name'}</p>
                            <p className="text-sm text-muted-foreground">{trade.profile?.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{trade.trading_pair}</TableCell>
                        <TableCell>{getTypeBadge(trade.trade_type)}</TableCell>
                        <TableCell className="font-mono">{formatINR(Number(trade.amount))}</TableCell>
                        <TableCell className="font-mono text-sm">${Number(trade.entry_price).toFixed(2)}</TableCell>
                        <TableCell className={`font-mono font-semibold ${Number(trade.profit_loss) >= 0 ? 'text-profit' : 'text-loss'}`}>
                          {trade.profit_loss ? formatINR(Number(trade.profit_loss)) : '-'}
                        </TableCell>
                        <TableCell>{getStatusBadge(trade.status, trade.id)}</TableCell>
                        <TableCell>
                          {trade.expected_result && (
                            <Badge variant="outline" className={trade.expected_result === 'win' ? 'bg-profit/10 text-profit' : 'bg-loss/10 text-loss'}>
                              {trade.expected_result === 'win' ? '🎯 Win' : '❌ Loss'}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant={trade.status === 'pending' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => openDialog(trade)}
                          >
                            {trade.status === 'pending' ? (
                              <><Zap className="h-4 w-4 mr-1" /> Control</>
                            ) : (
                              <><Eye className="h-4 w-4 mr-1" /> View</>
                            )}
                          </Button>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Trade Control Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedTrade?.status === 'pending' ? (
                  <>
                    <Zap className="h-5 w-5 text-warning" />
                    Trade Control
                  </>
                ) : (
                  <>
                    <Eye className="h-5 w-5" />
                    Trade Details
                  </>
                )}
              </DialogTitle>
            </DialogHeader>
            {selectedTrade && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">User</p>
                    <p className="font-medium">{selectedTrade.profile?.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pair</p>
                    <p className="font-medium">{selectedTrade.trading_pair}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Type</p>
                    {getTypeBadge(selectedTrade.trade_type)}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Amount</p>
                    <p className="font-mono font-semibold">{formatINR(Number(selectedTrade.amount))}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    {getStatusBadge(selectedTrade.status, selectedTrade.id)}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Preset Result</p>
                    {selectedTrade.expected_result ? (
                      <Badge variant="outline" className={selectedTrade.expected_result === 'win' ? 'bg-profit/10 text-profit' : 'bg-loss/10 text-loss'}>
                        {selectedTrade.expected_result === 'win' ? '🎯 Win' : '❌ Loss'}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">Auto</span>
                    )}
                  </div>
                </div>
                
                {selectedTrade.status === 'pending' && (
                  <div className="space-y-4 pt-4 border-t border-border">
                    <div className="space-y-3">
                      <Label>Preset Result (applies when timer ends)</Label>
                      <Select value={newResult} onValueChange={(v) => setNewResult(v as 'win' | 'loss')}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="win">
                            <div className="flex items-center gap-2">
                              <Trophy className="h-4 w-4 text-profit" />
                              Win (+{formatINR(Number(selectedTrade.amount) * 0.8)})
                            </div>
                          </SelectItem>
                          <SelectItem value="loss">
                            <div className="flex items-center gap-2">
                              <XCircle className="h-4 w-4 text-loss" />
                              Loss (-{formatINR(Number(selectedTrade.amount))})
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <Button 
                        className="w-full"
                        onClick={() => setExpectedResult.mutate({ tradeId: selectedTrade.id, result: newResult })}
                        disabled={setExpectedResult.isPending}
                      >
                        {setExpectedResult.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Set Expected Result
                      </Button>
                    </div>

                    <div className="pt-4 border-t border-border space-y-3">
                      <Label className="flex items-center gap-2 text-warning">
                        <AlertTriangle className="h-4 w-4" />
                        Force Complete (Immediate)
                      </Label>
                      <div className="grid grid-cols-2 gap-3">
                        <Button 
                          variant="outline" 
                          className="border-profit text-profit hover:bg-profit/10"
                          onClick={() => forceCompleteTrade.mutate({ tradeId: selectedTrade.id, result: 'won' })}
                          disabled={forceCompleteTrade.isPending}
                        >
                          <Trophy className="h-4 w-4 mr-2" />
                          Force Win
                        </Button>
                        <Button 
                          variant="outline"
                          className="border-loss text-loss hover:bg-loss/10"
                          onClick={() => forceCompleteTrade.mutate({ tradeId: selectedTrade.id, result: 'lost' })}
                          disabled={forceCompleteTrade.isPending}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Force Loss
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                
                {selectedTrade.profit_loss && (
                  <div className="pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground">Profit/Loss</p>
                    <p className={`text-2xl font-mono font-bold ${Number(selectedTrade.profit_loss) >= 0 ? 'text-profit' : 'text-loss'}`}>
                      {Number(selectedTrade.profit_loss) >= 0 ? '+' : ''}{formatINR(Number(selectedTrade.profit_loss))}
                    </p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}