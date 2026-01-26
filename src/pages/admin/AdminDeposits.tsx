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
} from 'lucide-react';

export default function AdminDeposits() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeposit, setSelectedDeposit] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: deposits, isLoading } = useQuery({
    queryKey: ['admin-deposits', filter, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('deposit_requests')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (filter !== 'all') {
        query = query.eq('status', filter);
      }
      
      const { data: depositData, error: depositError } = await query;
      if (depositError) throw depositError;
      
      // Get profiles separately
      const userIds = [...new Set(depositData?.map(d => d.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, email, full_name')
        .in('user_id', userIds);
      
      // Combine data
      return depositData?.map(deposit => ({
        ...deposit,
        profile: profiles?.find(p => p.user_id === deposit.user_id)
      }));
    },
  });

  const handleDeposit = useMutation({
    mutationFn: async ({ depositId, action, notes }: { depositId: string; action: 'approve' | 'reject'; notes?: string }) => {
      const deposit = deposits?.find(d => d.id === depositId);
      if (!deposit) throw new Error('Deposit not found');

      const newStatus = action === 'approve' ? 'approved' : 'rejected';
      
      // Update deposit status
      const { error: updateError } = await supabase
        .from('deposit_requests')
        .update({
          status: newStatus,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
          admin_notes: notes,
        })
        .eq('id', depositId);
      
      if (updateError) throw updateError;

      // If approved, add balance to user's wallet
      if (action === 'approve') {
        const { data: wallet } = await supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', deposit.user_id)
          .single();
        
        const currentBalance = Number(wallet?.balance || 0);
        const newBalance = currentBalance + Number(deposit.amount);

        await supabase
          .from('wallets')
          .update({ balance: newBalance })
          .eq('user_id', deposit.user_id);

        // Create transaction record
        await supabase.from('transactions').insert({
          user_id: deposit.user_id,
          type: 'deposit',
          amount: Number(deposit.amount),
          balance_before: currentBalance,
          balance_after: newBalance,
          reference_id: depositId,
          description: 'Deposit approved',
        });

        // Create notification
        await supabase.from('notifications').insert({
          user_id: deposit.user_id,
          title: 'Deposit Approved! 🎉',
          message: `Your deposit of ${formatINR(Number(deposit.amount))} has been approved and added to your wallet.`,
          type: 'success',
        });
      } else {
        // Send rejection notification
        await supabase.from('notifications').insert({
          user_id: deposit.user_id,
          title: 'Deposit Rejected',
          message: `Your deposit request of ${formatINR(Number(deposit.amount))} has been rejected. ${notes ? `Reason: ${notes}` : ''}`,
          type: 'error',
        });
      }

      // Log admin action
      await supabase.from('admin_logs').insert({
        admin_id: user?.id,
        action: `deposit_${action}`,
        target_type: 'deposit',
        target_id: depositId,
        details: { amount: deposit.amount, user_id: deposit.user_id, notes },
      });
    },
    onSuccess: (_, variables) => {
      toast({
        title: variables.action === 'approve' ? 'Deposit approved' : 'Deposit rejected',
        description: 'The deposit request has been processed',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-deposits'] });
      setIsDialogOpen(false);
      setSelectedDeposit(null);
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

  const openDialog = (deposit: any) => {
    setSelectedDeposit(deposit);
    setAdminNotes(deposit.admin_notes || '');
    setIsDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-profit/10 text-profit border-profit/30">Approved</Badge>;
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
          <h1 className="text-2xl font-bold">Deposit Requests</h1>
          <p className="text-muted-foreground">Manage deposit requests</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="w-full sm:w-auto">
            <TabsList>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
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

        {/* Deposits Table */}
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
                    <TableHead>Network</TableHead>
                    <TableHead>TX Hash</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deposits?.map((deposit) => (
                    <TableRow key={deposit.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{deposit.profile?.full_name || 'No name'}</p>
                          <p className="text-sm text-muted-foreground">{deposit.profile?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono font-semibold text-profit">
                        {formatINR(Number(deposit.amount))}
                      </TableCell>
                      <TableCell>{deposit.crypto_network}</TableCell>
                      <TableCell className="font-mono text-xs max-w-[120px] truncate">
                        {deposit.transaction_hash || '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(deposit.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(deposit.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDialog(deposit)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {deposit.status === 'pending' && (
                            <>
                              <Button
                                variant="default"
                                size="sm"
                                className="bg-profit hover:bg-profit/90"
                                onClick={() => handleDeposit.mutate({ depositId: deposit.id, action: 'approve' })}
                                disabled={handleDeposit.isPending}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => openDialog(deposit)}
                                disabled={handleDeposit.isPending}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
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

        {/* Detail/Reject Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Deposit Details</DialogTitle>
            </DialogHeader>
            {selectedDeposit && (
              <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">User</p>
                    <p className="font-medium">{selectedDeposit.profile?.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Amount</p>
                    <p className="font-mono font-semibold text-profit">
                      {formatINR(Number(selectedDeposit.amount))}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Network</p>
                    <p className="font-medium">{selectedDeposit.crypto_network}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    {getStatusBadge(selectedDeposit.status)}
                  </div>
                </div>
                {selectedDeposit.transaction_hash && (
                  <div>
                    <p className="text-sm text-muted-foreground">Transaction Hash</p>
                    <p className="font-mono text-xs break-all">{selectedDeposit.transaction_hash}</p>
                  </div>
                )}
                {selectedDeposit.status === 'pending' && (
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
              {selectedDeposit?.status === 'pending' && (
                <>
                  <Button
                    variant="destructive"
                    onClick={() => handleDeposit.mutate({
                      depositId: selectedDeposit.id,
                      action: 'reject',
                      notes: adminNotes,
                    })}
                    disabled={handleDeposit.isPending}
                  >
                    {handleDeposit.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Reject
                  </Button>
                  <Button
                    className="bg-profit hover:bg-profit/90"
                    onClick={() => handleDeposit.mutate({
                      depositId: selectedDeposit.id,
                      action: 'approve',
                    })}
                    disabled={handleDeposit.isPending}
                  >
                    {handleDeposit.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
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
