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
  UserX,
  UserCheck,
  Edit,
  Wallet,
  Loader2,
} from 'lucide-react';

export default function AdminUsers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [editBalance, setEditBalance] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users', searchQuery],
    queryFn: async () => {
      // First get profiles
      let profileQuery = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (searchQuery) {
        profileQuery = profileQuery.or(`email.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`);
      }
      
      const { data: profiles, error: profileError } = await profileQuery;
      if (profileError) throw profileError;
      
      // Then get wallets for each user
      const userIds = profiles?.map(p => p.user_id) || [];
      const { data: wallets } = await supabase
        .from('wallets')
        .select('user_id, balance, locked_balance')
        .in('user_id', userIds);
      
      // Combine data
      return profiles?.map(profile => ({
        ...profile,
        wallet: wallets?.find(w => w.user_id === profile.user_id) || { balance: 0, locked_balance: 0 }
      }));
    },
  });

  const toggleBlockUser = useMutation({
    mutationFn: async ({ userId, isBlocked }: { userId: string; isBlocked: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_blocked: isBlocked })
        .eq('user_id', userId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast({
        title: variables.isBlocked ? 'User blocked' : 'User unblocked',
        description: 'User status updated successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateBalance = useMutation({
    mutationFn: async ({ userId, newBalance }: { userId: string; newBalance: number }) => {
      const { error } = await supabase
        .from('wallets')
        .update({ balance: newBalance })
        .eq('user_id', userId);
      
      if (error) throw error;

      // Log admin action
      await supabase.from('admin_logs').insert({
        action: 'balance_update',
        target_type: 'user',
        target_id: userId,
        details: { new_balance: newBalance },
      });
    },
    onSuccess: () => {
      toast({
        title: 'Balance updated',
        description: 'User balance has been updated successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setIsEditDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleEditBalance = (user: any) => {
    setSelectedUser(user);
    setEditBalance(user.wallet?.balance?.toString() || '0');
    setIsEditDialogOpen(true);
  };

  const handleSaveBalance = () => {
    if (!selectedUser) return;
    const newBalance = parseFloat(editBalance);
    if (isNaN(newBalance) || newBalance < 0) {
      toast({
        title: 'Invalid balance',
        description: 'Please enter a valid balance amount',
        variant: 'destructive',
      });
      return;
    }
    updateBalance.mutate({ userId: selectedUser.user_id, newBalance });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Manage platform users</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by email or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Users Table */}
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
                    <TableHead>Balance</TableHead>
                    <TableHead>Locked</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{user.full_name || 'No name'}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">
                        {formatINR(Number(user.wallet?.balance || 0))}
                      </TableCell>
                      <TableCell className="font-mono text-warning">
                        {formatINR(Number(user.wallet?.locked_balance || 0))}
                      </TableCell>
                      <TableCell>
                        {user.is_blocked ? (
                          <Badge variant="destructive">Blocked</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-profit/10 text-profit border-profit/30">
                            Active
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(user.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditBalance(user)}
                          >
                            <Wallet className="h-4 w-4 mr-1" />
                            Edit Balance
                          </Button>
                          <Button
                            variant={user.is_blocked ? 'default' : 'destructive'}
                            size="sm"
                            onClick={() => toggleBlockUser.mutate({
                              userId: user.user_id,
                              isBlocked: !user.is_blocked,
                            })}
                          >
                            {user.is_blocked ? (
                              <>
                                <UserCheck className="h-4 w-4 mr-1" />
                                Unblock
                              </>
                            ) : (
                              <>
                                <UserX className="h-4 w-4 mr-1" />
                                Block
                              </>
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

        {/* Edit Balance Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User Balance</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <p className="text-sm text-muted-foreground">User</p>
                <p className="font-medium">{selectedUser?.email}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="balance">New Balance (₹)</Label>
                <Input
                  id="balance"
                  type="number"
                  value={editBalance}
                  onChange={(e) => setEditBalance(e.target.value)}
                  placeholder="Enter new balance"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveBalance} disabled={updateBalance.isPending}>
                {updateBalance.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Balance
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
