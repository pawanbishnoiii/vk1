import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
} from 'lucide-react';

export default function AdminTrades() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'pending' | 'won' | 'lost'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrade, setSelectedTrade] = useState<any>(null);
  const [newResult, setNewResult] = useState<'won' | 'lost'>('won');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: trades, isLoading } = useQuery({
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
  });

  const updateTrade = useMutation({
    mutationFn: async ({ tradeId, result }: { tradeId: string; result: 'won' | 'lost' }) => {
      const trade = trades?.find(t => t.id === tradeId);
      if (!trade) throw new Error('Trade not found');

      const amount = Number(trade.amount);
      const profitLoss = result === 'won' ? amount * 0.8 : -amount; // 80% profit on win

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
        .select('balance')
        .eq('user_id', trade.user_id)
        .single();
      
      const currentBalance = Number(wallet?.balance || 0);
      const newBalance = currentBalance + profitLoss;

      await supabase
        .from('wallets')
        .update({ balance: newBalance })
        .eq('user_id', trade.user_id);

      // Create transaction record
      await supabase.from('transactions').insert({
        user_id: trade.user_id,
        type: result === 'won' ? 'trade_win' : 'trade_loss',
        amount: profitLoss,
        balance_before: currentBalance,
        balance_after: newBalance,
        reference_id: tradeId,
        description: `${trade.trade_type.toUpperCase()} ${trade.trading_pair} - ${result === 'won' ? 'Won' : 'Lost'}`,
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
        action: 'trade_override',
        target_type: 'trade',
        target_id: tradeId,
        details: { original_status: trade.status, new_status: result, profit_loss: profitLoss },
      });
    },
    onSuccess: () => {
      toast({
        title: 'Trade updated',
        description: 'Trade result has been set',
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
    setNewResult(trade.expected_result || 'won');
    setIsDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
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

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Trade Management</h1>
          <p className="text-muted-foreground">View and control trade outcomes</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="w-full sm:w-auto">
            <TabsList>
              <TabsTrigger value="pending">Pending</TabsTrigger>
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
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trades?.map((trade) => (
                    <TableRow key={trade.id}>
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
                      <TableCell>{getStatusBadge(trade.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(trade.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDialog(trade)}
                          >
                            {trade.status === 'pending' ? (
                              <><Edit className="h-4 w-4 mr-1" /> Set Result</>
                            ) : (
                              <><Eye className="h-4 w-4 mr-1" /> View</>
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Trade Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedTrade?.status === 'pending' ? 'Set Trade Result' : 'Trade Details'}
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
                    <p className="text-sm text-muted-foreground">Entry Price</p>
                    <p className="font-mono">${Number(selectedTrade.entry_price).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    {getStatusBadge(selectedTrade.status)}
                  </div>
                </div>
                
                {selectedTrade.status === 'pending' && (
                  <div className="space-y-3 pt-4 border-t border-border">
                    <Label>Set Trade Result</Label>
                    <Select value={newResult} onValueChange={(v) => setNewResult(v as 'won' | 'lost')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="won">
                          <div className="flex items-center gap-2">
                            <Trophy className="h-4 w-4 text-profit" />
                            Win (+{formatINR(Number(selectedTrade.amount) * 0.8)})
                          </div>
                        </SelectItem>
                        <SelectItem value="lost">
                          <div className="flex items-center gap-2">
                            <XCircle className="h-4 w-4 text-loss" />
                            Loss (-{formatINR(Number(selectedTrade.amount))})
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
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
              {selectedTrade?.status === 'pending' && (
                <Button
                  onClick={() => updateTrade.mutate({ tradeId: selectedTrade.id, result: newResult })}
                  disabled={updateTrade.isPending}
                >
                  {updateTrade.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Set Result
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
