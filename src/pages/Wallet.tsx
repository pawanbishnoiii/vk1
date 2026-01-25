import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import UserLayout from '@/components/layouts/UserLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatDate } from '@/lib/constants';
import { 
  Wallet as WalletIcon, 
  Plus, 
  Minus, 
  Clock, 
  CheckCircle, 
  XCircle,
  Copy,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { z } from 'zod';

const depositSchema = z.object({
  amount: z.number().min(10, 'Minimum deposit is $10'),
  transactionHash: z.string().optional(),
});

const withdrawSchema = z.object({
  amount: z.number().min(50, 'Minimum withdrawal is $50'),
  upiId: z.string().min(5, 'Please enter a valid UPI ID'),
});

export default function Wallet() {
  const { user } = useAuth();
  const { balance, lockedBalance, availableBalance, refetch: refetchWallet } = useWallet();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [depositAmount, setDepositAmount] = useState('');
  const [txHash, setTxHash] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [upiId, setUpiId] = useState('');

  // Fetch deposit requests
  const { data: deposits, isLoading: depositsLoading } = useQuery({
    queryKey: ['deposits', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deposit_requests')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch withdrawal requests
  const { data: withdrawals, isLoading: withdrawalsLoading } = useQuery({
    queryKey: ['withdrawals', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch platform wallet address
  const { data: platformSettings } = useQuery({
    queryKey: ['platform-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*')
        .eq('key', 'platform_wallet')
        .maybeSingle();
      
      if (error) throw error;
      return data?.value as { trc20: string; bep20: string } | null;
    },
  });

  // Create deposit mutation
  const createDeposit = useMutation({
    mutationFn: async (data: { amount: number; transactionHash?: string }) => {
      const { error } = await supabase
        .from('deposit_requests')
        .insert({
          user_id: user!.id,
          amount: data.amount,
          transaction_hash: data.transactionHash,
          crypto_network: 'TRC20',
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Deposit request submitted',
        description: 'Your deposit will be reviewed shortly.',
      });
      setDepositAmount('');
      setTxHash('');
      queryClient.invalidateQueries({ queryKey: ['deposits'] });
    },
    onError: (err: any) => {
      toast({
        title: 'Failed to submit deposit',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  // Create withdrawal mutation
  const createWithdrawal = useMutation({
    mutationFn: async (data: { amount: number; upiId: string }) => {
      // Check available balance
      if (data.amount > availableBalance) {
        throw new Error('Insufficient available balance');
      }

      // Create withdrawal request
      const { error } = await supabase
        .from('withdrawal_requests')
        .insert({
          user_id: user!.id,
          amount: data.amount,
          upi_id: data.upiId,
        });
      
      if (error) throw error;

      // Lock the amount
      const { error: walletError } = await supabase
        .from('wallets')
        .update({ locked_balance: lockedBalance + data.amount })
        .eq('user_id', user!.id);
      
      if (walletError) throw walletError;
    },
    onSuccess: () => {
      toast({
        title: 'Withdrawal request submitted',
        description: 'Your withdrawal will be processed within 24 hours.',
      });
      setWithdrawAmount('');
      setUpiId('');
      queryClient.invalidateQueries({ queryKey: ['withdrawals'] });
      refetchWallet();
    },
    onError: (err: any) => {
      toast({
        title: 'Failed to submit withdrawal',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  const handleDeposit = () => {
    const amount = parseFloat(depositAmount);
    const result = depositSchema.safeParse({ amount, transactionHash: txHash });
    
    if (!result.success) {
      toast({
        title: 'Invalid input',
        description: result.error.errors[0].message,
        variant: 'destructive',
      });
      return;
    }

    createDeposit.mutate({ amount, transactionHash: txHash || undefined });
  };

  const handleWithdraw = () => {
    const amount = parseFloat(withdrawAmount);
    const result = withdrawSchema.safeParse({ amount, upiId });
    
    if (!result.success) {
      toast({
        title: 'Invalid input',
        description: result.error.errors[0].message,
        variant: 'destructive',
      });
      return;
    }

    createWithdrawal.mutate({ amount, upiId });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard!' });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
      case 'approved':
      case 'paid':
        return <Badge variant="outline" className="bg-profit/10 text-profit border-profit/30"><CheckCircle className="h-3 w-3 mr-1" /> {status === 'paid' ? 'Paid' : 'Approved'}</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-loss/10 text-loss border-loss/30"><XCircle className="h-3 w-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <UserLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Balance Overview */}
        <Card className="gradient-card border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-full bg-primary/10">
                <WalletIcon className="h-6 w-6 text-primary" />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total Balance</p>
              <p className="text-3xl font-bold font-mono text-primary">
                {formatCurrency(balance)}
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-border/50 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Available</p>
                <p className="font-mono font-semibold text-profit">{formatCurrency(availableBalance)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Locked</p>
                <p className="font-mono font-semibold text-warning">{formatCurrency(lockedBalance)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Deposit/Withdraw Tabs */}
        <Tabs defaultValue="deposit">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="deposit">
              <Plus className="h-4 w-4 mr-2" />
              Deposit
            </TabsTrigger>
            <TabsTrigger value="withdraw">
              <Minus className="h-4 w-4 mr-2" />
              Withdraw
            </TabsTrigger>
          </TabsList>

          <TabsContent value="deposit" className="space-y-4">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Deposit USDT</CardTitle>
                <CardDescription>
                  Send USDT (TRC20) to the address below and submit your transaction hash
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Platform Wallet Address */}
                <div className="space-y-2">
                  <Label>Platform Wallet (TRC20)</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      value={platformSettings?.trc20 || 'Loading...'} 
                      readOnly 
                      className="font-mono text-sm"
                    />
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => copyToClipboard(platformSettings?.trc20 || '')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Amount */}
                <div className="space-y-2">
                  <Label htmlFor="deposit-amount">Amount (USDT)</Label>
                  <Input
                    id="deposit-amount"
                    type="number"
                    placeholder="100.00"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Minimum: $10</p>
                </div>

                {/* Transaction Hash */}
                <div className="space-y-2">
                  <Label htmlFor="tx-hash">Transaction Hash (Optional)</Label>
                  <Input
                    id="tx-hash"
                    placeholder="0x..."
                    value={txHash}
                    onChange={(e) => setTxHash(e.target.value)}
                  />
                </div>

                <Button 
                  className="w-full" 
                  onClick={handleDeposit}
                  disabled={createDeposit.isPending}
                >
                  {createDeposit.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Deposit Request'
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Deposit History */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base">Deposit History</CardTitle>
              </CardHeader>
              <CardContent>
                {depositsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : deposits && deposits.length > 0 ? (
                  <div className="space-y-3">
                    {deposits.map((deposit) => (
                      <div key={deposit.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                        <div>
                          <p className="font-mono font-semibold">{formatCurrency(Number(deposit.amount))}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(deposit.created_at)}</p>
                        </div>
                        {getStatusBadge(deposit.status)}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No deposit history</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="withdraw" className="space-y-4">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Withdraw to UPI</CardTitle>
                <CardDescription>
                  Enter your UPI ID to receive funds
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Amount */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="withdraw-amount">Amount (USDT)</Label>
                    <span className="text-sm text-muted-foreground">
                      Available: <span className="text-foreground font-mono">{formatCurrency(availableBalance)}</span>
                    </span>
                  </div>
                  <Input
                    id="withdraw-amount"
                    type="number"
                    placeholder="100.00"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Minimum: $50</p>
                </div>

                {/* UPI ID */}
                <div className="space-y-2">
                  <Label htmlFor="upi-id">UPI ID</Label>
                  <Input
                    id="upi-id"
                    placeholder="yourname@paytm"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                  />
                </div>

                <Button 
                  className="w-full" 
                  onClick={handleWithdraw}
                  disabled={createWithdrawal.isPending || availableBalance < 50}
                >
                  {createWithdrawal.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Withdrawal Request'
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Withdrawal History */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base">Withdrawal History</CardTitle>
              </CardHeader>
              <CardContent>
                {withdrawalsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : withdrawals && withdrawals.length > 0 ? (
                  <div className="space-y-3">
                    {withdrawals.map((withdrawal) => (
                      <div key={withdrawal.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                        <div>
                          <p className="font-mono font-semibold">{formatCurrency(Number(withdrawal.amount))}</p>
                          <p className="text-xs text-muted-foreground">{withdrawal.upi_id}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(withdrawal.created_at)}</p>
                        </div>
                        {getStatusBadge(withdrawal.status)}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No withdrawal history</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </UserLayout>
  );
}
