import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { formatINR } from '@/lib/formatters';
import { 
  Gift, 
  Plus, 
  Trash2, 
  Edit2, 
  Loader2,
  Calendar,
  Target,
  Percent,
  Users,
  Activity,
  CheckCircle,
  XCircle,
  Sparkles
} from 'lucide-react';
import { motion } from 'framer-motion';

const OFFER_THEMES = [
  { value: 'default', label: '🎁 Default' },
  { value: 'gold', label: '🏆 Gold Premium' },
  { value: 'diamond', label: '💎 Diamond VIP' },
  { value: 'fire', label: '🔥 Hot Deal' },
  { value: 'neon', label: '✨ Neon Glow' },
  { value: 'emerald', label: '💚 Emerald' },
];

const BONUS_TYPES = [
  { value: 'first_deposit', label: '🎁 First Deposit Bonus', icon: Gift },
  { value: 'daily_claim', label: '📅 Daily Claim Bonus', icon: Calendar },
  { value: 'task_bonus', label: '🎯 Task-Based Bonus', icon: Target },
  { value: 'deposit_discount', label: '💰 Deposit Discount', icon: Percent },
  { value: 'daily_spin', label: '🎰 Daily Spin Wheel', icon: Sparkles },
];

export default function AdminBonusManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState('first_deposit');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    offer_type: 'first_deposit',
    bonus_amount: 100,
    bonus_percentage: 0,
    min_amount: 100,
    max_amount: 10000,
    wagering_multiplier: 1,
    one_time_only: true,
    theme: 'default',
    is_active: true,
    // Daily claim specific
    daily_claim_days: 7,
    daily_min_amount: 10,
    daily_max_amount: 100,
    // Task specific
    task_target_count: 5,
    task_type: 'trades',
    // Deposit discount specific
    deposit_target: 1000,
    extra_credit_fixed: 0,
    extra_credit_percent: 10,
    image_url: '',
    // Spin wheel specific
    spin_enabled: true,
    spin_cooldown_hours: 24,
    spin_prizes: JSON.stringify([
      { amount: 0, probability: 25, label: 'Try Again', color: '#6b7280' },
      { amount: 10, probability: 20, label: '₹10', color: '#22c55e' },
      { amount: 25, probability: 18, label: '₹25', color: '#3b82f6' },
      { amount: 50, probability: 15, label: '₹50', color: '#8b5cf6' },
      { amount: 100, probability: 10, label: '₹100', color: '#f59e0b' },
      { amount: 250, probability: 7, label: '₹250', color: '#ef4444' },
      { amount: 500, probability: 4, label: '₹500', color: '#ec4899' },
      { amount: 1000, probability: 1, label: '₹1000', color: '#f97316' },
    ]),
  });

  // Fetch offers
  const { data: offers, isLoading } = useQuery({
    queryKey: ['admin-all-offers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch user bonuses for tracking
  const { data: userBonuses } = useQuery({
    queryKey: ['admin-user-bonuses-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_bonuses')
        .select('*')
        .order('claimed_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      
      // Fetch profile emails separately
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(b => b.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, email, full_name')
          .in('user_id', userIds);
        
        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        return data.map(b => ({ ...b, profile: profileMap.get(b.user_id) || null }));
      }
      return data;
    },
  });

  // Create/Update offer
  const saveOffer = useMutation({
    mutationFn: async (data: typeof formData) => {
      const offerData = {
        title: data.title,
        description: data.description || null,
        offer_type: data.offer_type,
        bonus_amount: data.bonus_amount,
        bonus_percentage: data.bonus_percentage,
        min_amount: data.min_amount,
        max_amount: data.max_amount || null,
        wagering_multiplier: data.wagering_multiplier,
        one_time_only: data.one_time_only,
        theme: data.theme,
        is_active: data.is_active,
        daily_claim_days: data.daily_claim_days,
        daily_min_amount: data.daily_min_amount,
        daily_max_amount: data.daily_max_amount,
        task_target_count: data.task_target_count,
        task_type: data.task_type,
        deposit_target: data.deposit_target,
        extra_credit_fixed: data.extra_credit_fixed,
        extra_credit_percent: data.extra_credit_percent,
        image_url: data.image_url || null,
        spin_enabled: data.spin_enabled,
        spin_cooldown_hours: data.spin_cooldown_hours,
        spin_prizes: typeof data.spin_prizes === 'string' 
          ? JSON.parse(data.spin_prizes) 
          : data.spin_prizes,
      };

      if (editingOffer) {
        const { error } = await supabase
          .from('offers')
          .update(offerData)
          .eq('id', editingOffer.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('offers')
          .insert(offerData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: editingOffer ? 'Offer updated' : 'Offer created' });
      queryClient.invalidateQueries({ queryKey: ['admin-all-offers'] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Delete offer
  const deleteOffer = useMutation({
    mutationFn: async (offerId: string) => {
      const { error } = await supabase.from('offers').delete().eq('id', offerId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Offer deleted' });
      queryClient.invalidateQueries({ queryKey: ['admin-all-offers'] });
    },
  });

  // Toggle status
  const toggleStatus = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('offers').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-offers'] });
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      offer_type: selectedType,
      bonus_amount: 100,
      bonus_percentage: 0,
      min_amount: 100,
      max_amount: 10000,
      wagering_multiplier: 1,
      one_time_only: true,
      theme: 'default',
      is_active: true,
      daily_claim_days: 7,
      daily_min_amount: 10,
      daily_max_amount: 100,
      task_target_count: 5,
      task_type: 'trades',
      deposit_target: 1000,
      extra_credit_fixed: 0,
      extra_credit_percent: 10,
      image_url: '',
        spin_enabled: true,
        spin_cooldown_hours: 24,
        spin_prizes: JSON.stringify([
          { amount: 0, probability: 25, label: 'Try Again', color: '#6b7280' },
          { amount: 10, probability: 20, label: '₹10', color: '#22c55e' },
          { amount: 25, probability: 18, label: '₹25', color: '#3b82f6' },
          { amount: 50, probability: 15, label: '₹50', color: '#8b5cf6' },
          { amount: 100, probability: 10, label: '₹100', color: '#f59e0b' },
          { amount: 250, probability: 7, label: '₹250', color: '#ef4444' },
          { amount: 500, probability: 4, label: '₹500', color: '#ec4899' },
          { amount: 1000, probability: 1, label: '₹1000', color: '#f97316' },
        ]),
    });
    setEditingOffer(null);
  };

  const handleEdit = (offer: any) => {
    setEditingOffer(offer);
    setFormData({
      ...formData,
      ...offer,
      spin_prizes: typeof offer.spin_prizes === 'object' 
        ? JSON.stringify(offer.spin_prizes, null, 2)
        : offer.spin_prizes || '[]',
    });
    setIsDialogOpen(true);
  };

  const filteredOffers = offers?.filter(o => o.offer_type === selectedType) || [];

  const stats = {
    totalOffers: offers?.length || 0,
    activeOffers: offers?.filter(o => o.is_active).length || 0,
    totalClaims: userBonuses?.length || 0,
    activeBonuses: userBonuses?.filter(b => b.status === 'active').length || 0,
  };

  const renderFormFields = () => {
    switch (formData.offer_type) {
      case 'first_deposit':
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Bonus Amount (Fixed ₹)</Label>
                <Input
                  type="number"
                  value={formData.bonus_amount}
                  onChange={(e) => setFormData({ ...formData, bonus_amount: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>OR Bonus Percentage (%)</Label>
                <Input
                  type="number"
                  value={formData.bonus_percentage}
                  onChange={(e) => setFormData({ ...formData, bonus_percentage: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Min Deposit (₹)</Label>
                <Input
                  type="number"
                  value={formData.min_amount}
                  onChange={(e) => setFormData({ ...formData, min_amount: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Max Bonus Cap (₹)</Label>
                <Input
                  type="number"
                  value={formData.max_amount}
                  onChange={(e) => setFormData({ ...formData, max_amount: Number(e.target.value) })}
                />
              </div>
            </div>
          </>
        );
      case 'daily_claim':
        return (
          <>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Days Active</Label>
                <Input
                  type="number"
                  value={formData.daily_claim_days}
                  onChange={(e) => setFormData({ ...formData, daily_claim_days: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Min Amount (₹)</Label>
                <Input
                  type="number"
                  value={formData.daily_min_amount}
                  onChange={(e) => setFormData({ ...formData, daily_min_amount: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Max Amount (₹)</Label>
                <Input
                  type="number"
                  value={formData.daily_max_amount}
                  onChange={(e) => setFormData({ ...formData, daily_max_amount: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Background Image URL</Label>
              <Input
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </>
        );
      case 'task_bonus':
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Target Count</Label>
                <Input
                  type="number"
                  value={formData.task_target_count}
                  onChange={(e) => setFormData({ ...formData, task_target_count: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Task Type</Label>
                <Select 
                  value={formData.task_type} 
                  onValueChange={(v) => setFormData({ ...formData, task_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trades">Complete Trades</SelectItem>
                    <SelectItem value="wins">Winning Trades</SelectItem>
                    <SelectItem value="deposits">Deposits</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Bonus Amount on Completion (₹)</Label>
              <Input
                type="number"
                value={formData.bonus_amount}
                onChange={(e) => setFormData({ ...formData, bonus_amount: Number(e.target.value) })}
              />
            </div>
          </>
        );
      case 'deposit_discount':
        return (
          <>
            <div className="space-y-2">
              <Label>Deposit Target (₹)</Label>
              <Input
                type="number"
                value={formData.deposit_target}
                onChange={(e) => setFormData({ ...formData, deposit_target: Number(e.target.value) })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Extra Credit Fixed (₹)</Label>
                <Input
                  type="number"
                  value={formData.extra_credit_fixed}
                  onChange={(e) => setFormData({ ...formData, extra_credit_fixed: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>OR Extra Credit (%)</Label>
                <Input
                  type="number"
                  value={formData.extra_credit_percent}
                  onChange={(e) => setFormData({ ...formData, extra_credit_percent: Number(e.target.value) })}
                />
              </div>
            </div>
          </>
        );
      case 'daily_spin':
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cooldown Hours</Label>
                <Input
                  type="number"
                  value={formData.spin_cooldown_hours}
                  onChange={(e) => setFormData({ ...formData, spin_cooldown_hours: Number(e.target.value) })}
                  min={1}
                  max={168}
                />
                <p className="text-xs text-muted-foreground">Hours between spins (24 = daily)</p>
              </div>
              <div className="space-y-2">
                <Label>Enabled</Label>
                <div className="flex items-center gap-2 pt-2">
                  <Switch
                    checked={formData.spin_enabled}
                    onCheckedChange={(v) => setFormData({ ...formData, spin_enabled: v })}
                  />
                  <span className="text-sm">{formData.spin_enabled ? 'Active' : 'Inactive'}</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Prize Configuration (JSON)</Label>
              <Textarea
                value={formData.spin_prizes}
                onChange={(e) => setFormData({ ...formData, spin_prizes: e.target.value })}
                rows={10}
                className="font-mono text-xs"
                placeholder='[{"amount": 10, "probability": 20, "label": "₹10", "color": "#22c55e"}]'
              />
              <p className="text-xs text-muted-foreground">
                Each prize: amount, probability (total should = 100), label, color (hex)
              </p>
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Gift className="h-7 w-7 text-primary" />
              Bonus Management
            </h1>
            <p className="text-muted-foreground">Create and manage 4 types of bonuses</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Gift className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Offers</p>
                  <p className="text-2xl font-bold">{stats.totalOffers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-profit" />
                <div>
                  <p className="text-sm text-muted-foreground">Active Offers</p>
                  <p className="text-2xl font-bold">{stats.activeOffers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-info" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Claims</p>
                  <p className="text-2xl font-bold">{stats.totalClaims}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Activity className="h-8 w-8 text-warning" />
                <div>
                  <p className="text-sm text-muted-foreground">Active Bonuses</p>
                  <p className="text-2xl font-bold">{stats.activeBonuses}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bonus Type Tabs */}
        <Tabs value={selectedType} onValueChange={setSelectedType}>
          <div className="flex items-center justify-between mb-4">
            <TabsList className="grid grid-cols-5 w-auto">
              {BONUS_TYPES.map(type => (
                <TabsTrigger key={type.value} value={type.value} className="gap-2">
                  <type.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{type.label.split(' ')[0]}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="gap-2" onClick={() => setFormData({ ...formData, offer_type: selectedType })}>
                  <Plus className="h-4 w-4" />
                  Create {BONUS_TYPES.find(t => t.value === selectedType)?.label.split(' ')[0]}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingOffer ? 'Edit' : 'Create'} {BONUS_TYPES.find(t => t.value === formData.offer_type)?.label}</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Bonus title"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe the bonus..."
                      rows={2}
                    />
                  </div>

                  {renderFormFields()}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Theme</Label>
                      <Select value={formData.theme} onValueChange={(v) => setFormData({ ...formData, theme: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {OFFER_THEMES.map(theme => (
                            <SelectItem key={theme.value} value={theme.value}>{theme.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>One-Time Only</Label>
                      <div className="flex items-center gap-2 pt-2">
                        <Switch
                          checked={formData.one_time_only}
                          onCheckedChange={(v) => setFormData({ ...formData, one_time_only: v })}
                        />
                        <span className="text-sm">{formData.one_time_only ? 'Yes' : 'No'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
                    />
                    <Label>Active</Label>
                  </div>

                  <Button 
                    className="w-full" 
                    onClick={() => saveOffer.mutate(formData)}
                    disabled={saveOffer.isPending || !formData.title}
                  >
                    {saveOffer.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {editingOffer ? 'Update' : 'Create'} Bonus
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Offers Table */}
          <Card className="border-border/50">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Theme</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : filteredOffers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No {BONUS_TYPES.find(t => t.value === selectedType)?.label} offers yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOffers.map((offer) => (
                      <TableRow key={offer.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{offer.title}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {offer.description}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {offer.offer_type === 'first_deposit' && (
                            <span className="text-sm">
                              {offer.bonus_percentage > 0 ? `${offer.bonus_percentage}%` : formatINR(offer.bonus_amount)}
                            </span>
                          )}
                          {offer.offer_type === 'daily_claim' && (
                            <span className="text-sm">
                              {offer.daily_claim_days} days
                            </span>
                          )}
                          {offer.offer_type === 'task_bonus' && (
                            <span className="text-sm">
                              {offer.task_target_count} {offer.task_type}
                            </span>
                          )}
                          {offer.offer_type === 'deposit_discount' && (
                            <span className="text-sm">
                              {offer.extra_credit_percent > 0 ? `${offer.extra_credit_percent}%` : formatINR(offer.extra_credit_fixed)}
                            </span>
                          )}
                          {offer.offer_type === 'daily_spin' && (
                            <span className="text-sm">
                              {offer.spin_cooldown_hours}h cooldown • {Array.isArray(offer.spin_prizes) ? offer.spin_prizes.length : 0} prizes
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {OFFER_THEMES.find(t => t.value === offer.theme)?.label || 'Default'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={offer.is_active}
                            onCheckedChange={(v) => toggleStatus.mutate({ id: offer.id, is_active: v })}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(offer)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-loss"
                              onClick={() => deleteOffer.mutate(offer.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Tabs>

        {/* Recent Claims */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Recent Bonus Claims
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Claimed At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userBonuses?.slice(0, 10).map((bonus) => (
                  <TableRow key={bonus.id}>
                    <TableCell>
                      {(bonus as any).profile?.email || bonus.user_id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="font-mono text-profit">
                      {formatINR(bonus.bonus_amount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={bonus.status === 'active' ? 'default' : 'secondary'}>
                        {bonus.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(bonus.claimed_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
