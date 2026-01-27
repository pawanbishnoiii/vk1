import { useState } from 'react';
import { motion } from 'framer-motion';
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
import { formatINR } from '@/lib/formatters';
import { formatDate } from '@/lib/constants';
import EnhancedDeposit from '@/components/deposit/EnhancedDeposit';
import FloatingSocialButtons from '@/components/social/FloatingSocialButtons';
import BonusSection from '@/components/bonus/BonusSection';
import { 
  Wallet as WalletIcon, 
  Plus, 
  Minus, 
  Clock, 
  CheckCircle, 
  XCircle,
  Loader2,
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { z } from 'zod';

const withdrawSchema = z.object({
  amount: z.number().min(100, 'Minimum withdrawal is ₹100'),
  upiId: z.string().min(5, 'Please enter a valid UPI ID'),
});

export default function Wallet() {
  const { user } = useAuth();
  const { balance, lockedBalance, availableBalance, refetch: refetchWallet } = useWallet();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  // Create withdrawal mutation
  const createWithdrawal = useMutation({
    mutationFn: async (data: { amount: number; upiId: string }) => {
      if (data.amount > availableBalance) {
        throw new Error('Insufficient available balance');
      }

      const { error } = await supabase
        .from('withdrawal_requests')
        .insert({
          user_id: user!.id,
          amount: data.amount,
          upi_id: data.upiId,
        });
      
      if (error) throw error;

      // Lock the amount
      await supabase
        .from('wallets')
        .update({ locked_balance: lockedBalance + data.amount })
        .eq('user_id', user!.id);
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

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { icon: React.ReactNode; class: string; label: string }> = {
      pending: { icon: <Clock className="h-3 w-3" />, class: 'bg-warning/10 text-warning border-warning/30', label: 'Pending' },
      approved: { icon: <CheckCircle className="h-3 w-3" />, class: 'bg-profit/10 text-profit border-profit/30', label: 'Approved' },
      paid: { icon: <CheckCircle className="h-3 w-3" />, class: 'bg-profit/10 text-profit border-profit/30', label: 'Paid' },
      rejected: { icon: <XCircle className="h-3 w-3" />, class: 'bg-loss/10 text-loss border-loss/30', label: 'Rejected' },
    };
    const variant = variants[status] || variants.pending;
    return (
      <Badge variant="outline" className={variant.class}>
        {variant.icon}
        <span className="ml-1">{variant.label}</span>
      </Badge>
    );
  };

  return (
    <UserLayout>
      <div className="space-y-6">
        {/* Balance Overview */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-border/50 bg-gradient-to-br from-card via-card to-primary/5 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
            <CardContent className="p-6 relative">
              <div className="flex items-center justify-between mb-6">
                <div className="p-3 rounded-xl bg-primary/10">
                  <WalletIcon className="h-8 w-8 text-primary" />
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-profit/20 text-profit text-sm">
                  <TrendingUp className="h-4 w-4" />
                  Active
                </div>
              </div>
              
              <div className="space-y-1 mb-6">
                <p className="text-sm text-muted-foreground">Total Balance</p>
                <motion.p 
                  className="text-4xl font-bold font-mono text-primary"
                  key={balance}
                  initial={{ scale: 1.1 }}
                  animate={{ scale: 1 }}
                >
                  {formatINR(balance)}
                </motion.p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-profit/10">
                    <ArrowDownLeft className="h-5 w-5 text-profit" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Available</p>
                    <p className="font-mono font-semibold text-profit">{formatINR(availableBalance)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-warning/10">
                    <Clock className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Locked</p>
                    <p className="font-mono font-semibold text-warning">{formatINR(lockedBalance)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Deposit/Withdraw Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Tabs defaultValue="deposit">
            <TabsList className="grid w-full grid-cols-3 h-12">
              <TabsTrigger value="deposit" className="gap-2 text-base">
                <Plus className="h-4 w-4" />
                Deposit
              </TabsTrigger>
              <TabsTrigger value="withdraw" className="gap-2 text-base">
                <Minus className="h-4 w-4" />
                Withdraw
              </TabsTrigger>
              <TabsTrigger value="bonus" className="gap-2 text-base">
                🎁 Bonus
              </TabsTrigger>
            </TabsList>

            <TabsContent value="deposit" className="space-y-4 mt-4">
              <EnhancedDeposit />

              {/* Deposit History */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ArrowDownLeft className="h-5 w-5 text-profit" />
                    Deposit History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {depositsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : deposits && deposits.length > 0 ? (
                    <div className="space-y-3">
                      {deposits.map((deposit, index) => (
                        <motion.div 
                          key={deposit.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-center justify-between p-4 rounded-xl bg-secondary/50 hover:bg-secondary/70 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-profit/10">
                              <ArrowDownLeft className="h-4 w-4 text-profit" />
                            </div>
                            <div>
                              <p className="font-mono font-semibold">{formatINR(Number(deposit.amount))}</p>
                              <p className="text-xs text-muted-foreground">{formatDate(deposit.created_at)}</p>
                            </div>
                          </div>
                          {getStatusBadge(deposit.status)}
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No deposit history</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="withdraw" className="space-y-4 mt-4">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ArrowUpRight className="h-5 w-5 text-primary" />
                    Withdraw to UPI
                  </CardTitle>
                  <CardDescription>
                    Enter your UPI ID to receive funds
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Amount (INR)</Label>
                      <span className="text-sm text-muted-foreground">
                        Available: <span className="font-mono text-foreground">{formatINR(availableBalance)}</span>
                      </span>
                    </div>
                    <Input
                      type="number"
                      placeholder="Min ₹100"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="font-mono text-lg h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>UPI ID</Label>
                    <Input
                      placeholder="yourname@paytm"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      className="h-12"
                    />
                  </div>

                  <Button 
                    className="w-full h-12 text-base"
                    onClick={handleWithdraw}
                    disabled={createWithdrawal.isPending || availableBalance < 100}
                  >
                    {createWithdrawal.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <ArrowUpRight className="mr-2 h-4 w-4" />
                        Submit Withdrawal
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Withdrawal History */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ArrowUpRight className="h-5 w-5 text-primary" />
                    Withdrawal History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {withdrawalsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : withdrawals && withdrawals.length > 0 ? (
                    <div className="space-y-3">
                      {withdrawals.map((withdrawal, index) => (
                        <motion.div 
                          key={withdrawal.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-center justify-between p-4 rounded-xl bg-secondary/50"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <ArrowUpRight className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-mono font-semibold">{formatINR(Number(withdrawal.amount))}</p>
                              <p className="text-xs text-muted-foreground">{withdrawal.upi_id}</p>
                            </div>
                          </div>
                          {getStatusBadge(withdrawal.status)}
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No withdrawal history</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="bonus" className="mt-4">
              <BonusSection />
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>

      <FloatingSocialButtons />
    </UserLayout>
  );
}
