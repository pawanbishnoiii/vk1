import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { Label } from '@/components/ui/label';
import {
  Search,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  Banknote,
} from 'lucide-react';

export default function AdminWithdrawals() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'paid' | 'rejected'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: withdrawals, isLoading } = useQuery({
    queryKey: ['admin-withdrawals', filter, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('withdrawal_requests')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (filter !== 'all') {
        query = query.eq('status', filter);
      }
      
      const { data: withdrawalData, error: withdrawalError } = await query;
      if (withdrawalError) throw withdrawalError;
      
      // Get profiles separately
      const userIds = [...new Set(withdrawalData?.map(w => w.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, email, full_name')
        .in('user_id', userIds);
      
      // Combine data
      return withdrawalData?.map(withdrawal => ({
        ...withdrawal,
        profile: profiles?.find(p => p.user_id === withdrawal.user_id)
      }));
    },
  });

  const handleWithdrawal = useMutation({
    mutationFn: async ({ withdrawalId, action, notes }: { withdrawalId: string; action: 'approve' | 'reject' | 'paid'; notes?: string }) => {
      const withdrawal = withdrawals?.find(w => w.id === withdrawalId);
      if (!withdrawal) throw new Error('Withdrawal not found');

      const newStatus = action === 'approve' ? 'approved' : action === 'paid' ? 'paid' : 'rejected';
      
      // Update withdrawal status
      const { error: updateError } = await supabase
        .from('withdrawal_requests')
        .update({
          status: newStatus,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
          admin_notes: notes,
        })
        .eq('id', withdrawalId);
      
      if (updateError) throw updateError;

      if (action === 'reject') {
        // Unlock the amount back to user's wallet
        const { data: wallet } = await supabase
          .from('wallets')
          .select('locked_balance')
          .eq('user_id', withdrawal.user_id)
          .single();
        
        const currentLocked = Number(wallet?.locked_balance || 0);
        const newLocked = Math.max(0, currentLocked - Number(withdrawal.amount));

        await supabase
          .from('wallets')
          .update({ locked_balance: newLocked })
          .eq('user_id', withdrawal.user_id);

        // Send rejection notification
        await supabase.from('notifications').insert({
          user_id: withdrawal.user_id,
          title: 'Withdrawal Rejected',
          message: `Your withdrawal request of ${formatINR(Number(withdrawal.amount))} has been rejected. The amount has been unlocked. ${notes ? `Reason: ${notes}` : ''}`,
          type: 'error',
        });
      } else if (action === 'paid') {
        // Deduct from user's balance (locked_balance already holds it)
        const { data: wallet } = await supabase
          .from('wallets')
          .select('balance, locked_balance')
          .eq('user_id', withdrawal.user_id)
          .single();
        
        const currentBalance = Number(wallet?.balance || 0);
        const currentLocked = Number(wallet?.locked_balance || 0);
        const newBalance = currentBalance - Number(withdrawal.amount);
        const newLocked = currentLocked - Number(withdrawal.amount);

        await supabase
          .from('wallets')
          .update({ 
            balance: newBalance,
            locked_balance: Math.max(0, newLocked),
          })
          .eq('user_id', withdrawal.user_id);

        // Create transaction record
        await supabase.from('transactions').insert({
          user_id: withdrawal.user_id,
          type: 'withdrawal',
          amount: -Number(withdrawal.amount),
          balance_before: currentBalance,
          balance_after: newBalance,
          reference_id: withdrawalId,
          description: `Withdrawal to ${withdrawal.upi_id}`,
        });

        // Send paid notification
        await supabase.from('notifications').insert({
          user_id: withdrawal.user_id,
          title: 'Withdrawal Paid! 💰',
          message: `Your withdrawal of ${formatINR(Number(withdrawal.amount))} has been sent to ${withdrawal.upi_id}.`,
          type: 'success',
        });
      } else if (action === 'approve') {
        // Send approval notification
        await supabase.from('notifications').insert({
          user_id: withdrawal.user_id,
          title: 'Withdrawal Approved',
          message: `Your withdrawal request of ${formatINR(Number(withdrawal.amount))} has been approved. Payment will be processed shortly.`,
          type: 'success',
        });
      }

      // Log admin action
      await supabase.from('admin_logs').insert({
        admin_id: user?.id,
        action: `withdrawal_${action}`,
        target_type: 'withdrawal',
        target_id: withdrawalId,
        details: { amount: withdrawal.amount, user_id: withdrawal.user_id, upi_id: withdrawal.upi_id, notes },
      });
    },
    onSuccess: (_, variables) => {
      toast({
        title: `Withdrawal ${variables.action === 'approve' ? 'approved' : variables.action === 'paid' ? 'marked as paid' : 'rejected'}`,
        description: 'The withdrawal request has been processed',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-withdrawals'] });
      setIsDialogOpen(false);
      setSelectedWithdrawal(null);
      setAdminNotes('');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const openDialog = (withdrawal: any) => {
    setSelectedWithdrawal(withdrawal);
    setAdminNotes(withdrawal.admin_notes || '');
    setIsDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30">Approved</Badge>;
      case 'paid':
        return <Badge variant="outline" className="bg-profit/10 text-profit border-profit/30">Paid</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-loss/10 text-loss border-loss/30">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Withdrawal Requests</h1>
          <p className="text-muted-foreground">Manage withdrawal requests</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="w-full sm:w-auto">
            <TabsList>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="paid">Paid</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Withdrawals Table */}
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
                    <TableHead>Amount</TableHead>
                    <TableHead>UPI ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdrawals?.map((withdrawal) => (
                    <TableRow key={withdrawal.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{withdrawal.profile?.full_name || 'No name'}</p>
                          <p className="text-sm text-muted-foreground">{withdrawal.profile?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono font-semibold text-loss">
                        {formatINR(Number(withdrawal.amount))}
                      </TableCell>
                      <TableCell className="font-mono">{withdrawal.upi_id}</TableCell>
                      <TableCell>{getStatusBadge(withdrawal.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(withdrawal.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDialog(withdrawal)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {withdrawal.status === 'pending' && (
                            <>
                              <Button
                                variant="default"
                                size="sm"
                                className="bg-profit hover:bg-profit/90"
                                onClick={() => handleWithdrawal.mutate({ withdrawalId: withdrawal.id, action: 'approve' })}
                                disabled={handleWithdrawal.isPending}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => openDialog(withdrawal)}
                                disabled={handleWithdrawal.isPending}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {withdrawal.status === 'approved' && (
                            <Button
                              size="sm"
                              onClick={() => handleWithdrawal.mutate({ withdrawalId: withdrawal.id, action: 'paid' })}
                              disabled={handleWithdrawal.isPending}
                            >
                              <Banknote className="h-4 w-4 mr-1" />
                              Mark Paid
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Detail Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Withdrawal Details</DialogTitle>
            </DialogHeader>
            {selectedWithdrawal && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">User</p>
                    <p className="font-medium">{selectedWithdrawal.profile?.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Amount</p>
                    <p className="font-mono font-semibold text-loss">
                      {formatINR(Number(selectedWithdrawal.amount))}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">UPI ID</p>
                    <p className="font-mono">{selectedWithdrawal.upi_id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    {getStatusBadge(selectedWithdrawal.status)}
                  </div>
                </div>
                {selectedWithdrawal.status === 'pending' && (
                  <div className="space-y-2">
                    <Label>Admin Notes (for rejection)</Label>
                    <Textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Enter reason for rejection..."
                    />
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Close
              </Button>
              {selectedWithdrawal?.status === 'pending' && (
                <>
                  <Button
                    variant="destructive"
                    onClick={() => handleWithdrawal.mutate({
                      withdrawalId: selectedWithdrawal.id,
                      action: 'reject',
                      notes: adminNotes,
                    })}
                    disabled={handleWithdrawal.isPending}
                  >
                    {handleWithdrawal.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Reject
                  </Button>
                  <Button
                    className="bg-profit hover:bg-profit/90"
                    onClick={() => handleWithdrawal.mutate({
                      withdrawalId: selectedWithdrawal.id,
                      action: 'approve',
                    })}
                    disabled={handleWithdrawal.isPending}
                  >
                    {handleWithdrawal.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Approve
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
