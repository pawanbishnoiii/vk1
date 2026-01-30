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
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  Gift,
  AlertCircle,
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
  const [applyBonus, setApplyBonus] = useState(true);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);

  // Fetch deposits
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
      
      const userIds = [...new Set(depositData?.map(d => d.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, email, full_name')
        .in('user_id', userIds);
      
      // Check which users have claimed first deposit bonus
      const { data: bonusClaims } = await supabase
        .from('bonus_claims')
        .select('user_id, offer_id')
        .in('user_id', userIds);
      
      return depositData?.map(deposit => ({
        ...deposit,
        profile: profiles?.find(p => p.user_id === deposit.user_id),
        hasBonusClaim: bonusClaims?.some(c => c.user_id === deposit.user_id),
      }));
    },
  });

  // Fetch available first deposit offers
  const { data: firstDepositOffers } = useQuery({
    queryKey: ['first-deposit-offers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .eq('is_active', true)
        .eq('offer_type', 'first_deposit');
      if (error) throw error;
      return data;
    },
  });

  // Handle deposit with atomic function
  const handleDeposit = useMutation({
    mutationFn: async ({ 
      depositId, 
      action, 
      notes, 
      offerId,
      bonusAmount,
      wageringMultiplier,
    }: { 
      depositId: string; 
      action: 'approve' | 'reject'; 
      notes?: string;
      offerId?: string | null;
      bonusAmount?: number;
      wageringMultiplier?: number;
    }) => {
      const deposit = deposits?.find(d => d.id === depositId);
      if (!deposit) throw new Error('Deposit not found');

      if (action === 'reject') {
        // Simple rejection
        const { error: updateError } = await supabase
          .from('deposit_requests')
          .update({
            status: 'rejected',
            reviewed_at: new Date().toISOString(),
            reviewed_by: user?.id,
            admin_notes: notes,
          })
          .eq('id', depositId);
        
        if (updateError) throw updateError;

        await supabase.from('notifications').insert({
          user_id: deposit.user_id,
          title: 'Deposit Rejected',
          message: `Your deposit request of ${formatINR(Number(deposit.amount))} has been rejected. ${notes ? `Reason: ${notes}` : ''}`,
          type: 'error',
        });
      } else {
        // Use atomic function for approval with bonus
        const { data: result, error } = await supabase.rpc('confirm_deposit_with_bonus', {
          p_deposit_id: depositId,
          p_admin_id: user?.id,
          p_offer_id: offerId || null,
          p_bonus_amount: bonusAmount || 0,
          p_wagering_multiplier: wageringMultiplier || 0,
        });

        if (error) throw error;
        const resultObj = result as { success?: boolean; error?: string } | null;
        if (!resultObj?.success) throw new Error(resultObj?.error || 'Deposit confirmation failed');
      }

      // Log admin action
      await supabase.from('admin_logs').insert({
        admin_id: user?.id,
        action: `deposit_${action}`,
        target_type: 'deposit',
        target_id: depositId,
        details: { 
          amount: deposit.amount, 
          user_id: deposit.user_id, 
          notes,
          bonusApplied: action === 'approve' && offerId ? true : false,
          bonusAmount,
        },
      });
    },
    onSuccess: (_, variables) => {
      toast({
        title: variables.action === 'approve' ? 'Deposit approved' : 'Deposit rejected',
        description: variables.action === 'approve' && variables.bonusAmount 
          ? `Deposit approved with ₹${variables.bonusAmount} bonus`
          : 'The deposit request has been processed',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-deposits'] });
      setIsDialogOpen(false);
      setSelectedDeposit(null);
      setAdminNotes('');
      setApplyBonus(true);
      setSelectedOfferId(null);
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
    setApplyBonus(!deposit.hasBonusClaim);
    setSelectedOfferId(firstDepositOffers?.[0]?.id || null);
    setIsDialogOpen(true);
  };

  const handleApproveWithBonus = () => {
    if (!selectedDeposit) return;
    
    const offer = firstDepositOffers?.find(o => o.id === selectedOfferId);
    let bonusAmount = 0;
    
    if (applyBonus && offer && !selectedDeposit.hasBonusClaim) {
      const depositAmount = Number(selectedDeposit.amount);
      if (depositAmount >= offer.min_amount) {
        bonusAmount = (depositAmount * offer.bonus_percentage / 100);
        if (offer.bonus_amount > 0) bonusAmount += offer.bonus_amount;
        if (offer.max_amount && bonusAmount > offer.max_amount) {
          bonusAmount = offer.max_amount;
        }
      }
    }

    handleDeposit.mutate({
      depositId: selectedDeposit.id,
      action: 'approve',
      offerId: applyBonus && bonusAmount > 0 ? selectedOfferId : null,
      bonusAmount,
      wageringMultiplier: offer?.wagering_multiplier || 0,
    });
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

  // Calculate bonus preview
  const getBonusPreview = () => {
    if (!selectedDeposit || !applyBonus || selectedDeposit.hasBonusClaim) return null;
    
    const offer = firstDepositOffers?.find(o => o.id === selectedOfferId);
    if (!offer) return null;
    
    const depositAmount = Number(selectedDeposit.amount);
    if (depositAmount < offer.min_amount) return null;
    
    let bonusAmount = (depositAmount * offer.bonus_percentage / 100);
    if (offer.bonus_amount > 0) bonusAmount += offer.bonus_amount;
    if (offer.max_amount && bonusAmount > offer.max_amount) {
      bonusAmount = offer.max_amount;
    }
    
    return {
      bonus: bonusAmount,
      total: depositAmount + bonusAmount,
      wagering: bonusAmount * (offer.wagering_multiplier || 0),
    };
  };

  const bonusPreview = getBonusPreview();

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Deposit Requests</h1>
          <p className="text-muted-foreground">Manage deposit requests with bonus application</p>
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
                    <TableHead>Bonus Eligible</TableHead>
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
                      <TableCell>
                        {!deposit.hasBonusClaim ? (
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                            <Gift className="h-3 w-3 mr-1" />
                            Eligible
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">Already claimed</span>
                        )}
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
                                onClick={() => openDialog(deposit)}
                                disabled={handleDeposit.isPending}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  setSelectedDeposit(deposit);
                                  handleDeposit.mutate({ 
                                    depositId: deposit.id, 
                                    action: 'reject',
                                    notes: 'Rejected by admin',
                                  });
                                }}
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

        {/* Approval Dialog with Bonus Options */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Approve Deposit</DialogTitle>
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
                </div>

                {/* Bonus Options */}
                {!selectedDeposit.hasBonusClaim && firstDepositOffers && firstDepositOffers.length > 0 && (
                  <div className="space-y-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Gift className="h-5 w-5 text-primary" />
                        <Label>Apply First Deposit Bonus</Label>
                      </div>
                      <Switch
                        checked={applyBonus}
                        onCheckedChange={setApplyBonus}
                      />
                    </div>

                    {applyBonus && (
                      <>
                        <Select value={selectedOfferId || ''} onValueChange={setSelectedOfferId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select bonus offer" />
                          </SelectTrigger>
                          <SelectContent>
                            {firstDepositOffers.map(offer => (
                              <SelectItem key={offer.id} value={offer.id}>
                                {offer.title} ({offer.bonus_percentage}%)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {bonusPreview && (
                          <div className="space-y-2 p-3 rounded-lg bg-card border">
                            <div className="flex justify-between text-sm">
                              <span>Deposit Amount:</span>
                              <span className="font-mono">{formatINR(Number(selectedDeposit.amount))}</span>
                            </div>
                            <div className="flex justify-between text-sm text-primary">
                              <span>Bonus (Locked):</span>
                              <span className="font-mono">+{formatINR(bonusPreview.bonus)}</span>
                            </div>
                            <div className="flex justify-between font-semibold border-t pt-2">
                              <span>Total Credit:</span>
                              <span className="font-mono text-profit">{formatINR(bonusPreview.total)}</span>
                            </div>
                            {bonusPreview.wagering > 0 && (
                              <div className="flex items-center gap-1 text-xs text-warning">
                                <AlertCircle className="h-3 w-3" />
                                Wagering required: {formatINR(bonusPreview.wagering)}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {selectedDeposit.hasBonusClaim && (
                  <div className="p-3 rounded-lg bg-muted text-muted-foreground text-sm">
                    This user has already claimed their first deposit bonus.
                  </div>
                )}

                {selectedDeposit.status === 'pending' && (
                  <div className="space-y-2">
                    <Label>Admin Notes (optional)</Label>
                    <Textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Optional notes..."
                    />
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
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
                    onClick={handleApproveWithBonus}
                    disabled={handleDeposit.isPending}
                  >
                    {handleDeposit.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Approve{bonusPreview ? ` + ₹${Math.round(bonusPreview.bonus)} Bonus` : ''}
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
