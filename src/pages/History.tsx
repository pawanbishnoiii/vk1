import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import UserLayout from '@/components/layouts/UserLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/constants';
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
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function History() {
  const { user } = useAuth();

  // Fetch trades
  const { data: trades, isLoading: tradesLoading } = useQuery({
    queryKey: ['trades-history', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
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

  const getTradeStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30"><Clock className="h-3 w-3 mr-1" /> Active</Badge>;
      case 'won':
        return <Badge variant="outline" className="bg-profit/10 text-profit border-profit/30"><CheckCircle className="h-3 w-3 mr-1" /> Won</Badge>;
      case 'lost':
        return <Badge variant="outline" className="bg-loss/10 text-loss border-loss/30"><XCircle className="h-3 w-3 mr-1" /> Lost</Badge>;
      case 'cancelled':
        return <Badge variant="outline"><RefreshCw className="h-3 w-3 mr-1" /> Cancelled</Badge>;
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

  return (
    <UserLayout>
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-2xl font-bold">History</h1>

        <Tabs defaultValue="trades">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="trades">Trades</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
          </TabsList>

          <TabsContent value="trades">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base">Trade History</CardTitle>
              </CardHeader>
              <CardContent>
                {tradesLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : trades && trades.length > 0 ? (
                  <div className="space-y-3">
                    {trades.map((trade) => (
                      <div key={trade.id} className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
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
                              Amount: {formatCurrency(Number(trade.amount))}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(trade.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {getTradeStatusBadge(trade.status)}
                          {trade.profit_loss !== null && (
                            <p className={cn(
                              "font-mono font-semibold mt-1",
                              Number(trade.profit_loss) >= 0 ? "text-profit" : "text-loss"
                            )}>
                              {Number(trade.profit_loss) >= 0 ? '+' : ''}
                              {formatCurrency(Number(trade.profit_loss))}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No trades yet. Start trading!</p>
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
                    {transactions.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-secondary">
                            {getTransactionIcon(tx.type)}
                          </div>
                          <div>
                            <p className="font-medium capitalize">{tx.type.replace('_', ' ')}</p>
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
                            {formatCurrency(Number(tx.amount))}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">
                            Bal: {formatCurrency(Number(tx.balance_after))}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No transactions yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </UserLayout>
  );
}
