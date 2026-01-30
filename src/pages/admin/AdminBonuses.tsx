import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
import { formatDate } from '@/lib/constants';
import { 
  Gift, 
  Plus, 
  Trash2, 
  Edit2, 
  Loader2,
  Sparkles,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  Percent
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Offer {
  id: string;
  title: string;
  description: string | null;
  offer_type: string;
  bonus_amount: number;
  bonus_percentage: number;
  min_amount: number;
  max_amount: number | null;
  wagering_multiplier: number;
  one_time_only: boolean;
  theme: string | null;
  is_active: boolean;
  valid_from: string;
  valid_until: string | null;
  created_at: string;
}

interface UserBonus {
  id: string;
  user_id: string;
  offer_id: string;
  bonus_amount: number;
  wagering_required: number;
  wagering_completed: number;
  status: string;
  claimed_at: string;
  expires_at: string | null;
}

const OFFER_THEMES = [
  { value: 'default', label: '🎁 Default', color: 'from-primary to-primary/80' },
  { value: 'gold', label: '🏆 Gold Premium', color: 'from-yellow-500 to-amber-600' },
  { value: 'diamond', label: '💎 Diamond VIP', color: 'from-cyan-400 to-blue-600' },
  { value: 'fire', label: '🔥 Hot Deal', color: 'from-orange-500 to-red-600' },
  { value: 'neon', label: '✨ Neon Glow', color: 'from-purple-500 to-pink-500' },
  { value: 'emerald', label: '💚 Emerald', color: 'from-emerald-500 to-teal-600' },
];

const OFFER_TYPES = [
  { value: 'first_deposit', label: '🎁 First Deposit Bonus', description: 'Percentage bonus on first deposit' },
  { value: 'reload', label: '🔄 Reload Bonus', description: 'Bonus on selected deposits' },
  { value: 'lossback', label: '💰 Lossback Bonus', description: 'Cashback on net losses' },
  { value: 'festival', label: '🎉 Festival Bonus', description: 'Time-limited special offer' },
  { value: 'referral', label: '👥 Referral Bonus', description: 'Earn when friends complete wagering' },
  { value: 'vip_loyalty', label: '👑 VIP Loyalty Bonus', description: 'Exclusive rewards for loyal traders' },
];

const OFFER_ANIMATIONS = [
  { value: 'fade', label: 'Fade In' },
  { value: 'bounce', label: 'Bounce' },
  { value: 'slide', label: 'Slide' },
  { value: 'spin', label: 'Spin' },
  { value: 'pulse', label: 'Pulse' },
  { value: 'glow', label: 'Glow' },
  { value: 'confetti', label: 'Confetti' },
];

export default function AdminBonuses() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    offer_type: 'first_deposit',
    bonus_amount: 0,
    bonus_percentage: 0,
    min_amount: 100,
    max_amount: 10000,
    wagering_multiplier: 1,
    one_time_only: true,
    theme: 'default',
    animation: 'bounce',
    icon: 'gift',
    color_scheme: 'primary',
    lossback_percentage: 0,
    referral_reward: 0,
    vip_level: 0,
    auto_apply: false,
    is_active: true,
    valid_until: '',
  });

  // Fetch offers
  const { data: offers, isLoading: offersLoading } = useQuery({
    queryKey: ['admin-offers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Offer[];
    },
  });

  // Fetch claimed bonuses
  const { data: userBonuses, isLoading: bonusesLoading } = useQuery({
    queryKey: ['admin-user-bonuses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_bonuses')
        .select('*')
        .order('claimed_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as UserBonus[];
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
        animation: data.animation,
        icon: data.icon,
        color_scheme: data.color_scheme,
        lossback_percentage: data.lossback_percentage,
        referral_reward: data.referral_reward,
        vip_level: data.vip_level,
        auto_apply: data.auto_apply,
        is_active: data.is_active,
        valid_until: data.valid_until || null,
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
      toast({
        title: editingOffer ? 'Offer updated' : 'Offer created',
        description: 'The offer has been saved successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-offers'] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to save offer',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete offer
  const deleteOffer = useMutation({
    mutationFn: async (offerId: string) => {
      const { error } = await supabase
        .from('offers')
        .delete()
        .eq('id', offerId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Offer deleted',
        description: 'The offer has been removed',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-offers'] });
    },
  });

  // Toggle offer status
  const toggleOfferStatus = useMutation({
    mutationFn: async ({ offerId, isActive }: { offerId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('offers')
        .update({ is_active: isActive })
        .eq('id', offerId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-offers'] });
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      offer_type: 'first_deposit',
      bonus_amount: 0,
      bonus_percentage: 0,
      min_amount: 100,
      max_amount: 10000,
      wagering_multiplier: 1,
      one_time_only: true,
      theme: 'default',
      animation: 'bounce',
      icon: 'gift',
      color_scheme: 'primary',
      lossback_percentage: 0,
      referral_reward: 0,
      vip_level: 0,
      auto_apply: false,
      is_active: true,
      valid_until: '',
    });
    setEditingOffer(null);
  };

  const handleEdit = (offer: Offer) => {
    setEditingOffer(offer);
    setFormData({
      title: offer.title,
      description: offer.description || '',
      offer_type: offer.offer_type,
      bonus_amount: offer.bonus_amount,
      bonus_percentage: offer.bonus_percentage,
      min_amount: offer.min_amount,
      max_amount: offer.max_amount || 10000,
      wagering_multiplier: offer.wagering_multiplier || 0,
      one_time_only: offer.one_time_only,
      theme: offer.theme || 'default',
      animation: (offer as any).animation || 'bounce',
      icon: (offer as any).icon || 'gift',
      color_scheme: (offer as any).color_scheme || 'primary',
      lossback_percentage: (offer as any).lossback_percentage || 0,
      referral_reward: (offer as any).referral_reward || 0,
      vip_level: (offer as any).vip_level || 0,
      auto_apply: (offer as any).auto_apply || false,
      is_active: offer.is_active,
      valid_until: offer.valid_until ? offer.valid_until.split('T')[0] : '',
    });
    setIsDialogOpen(true);
  };

  const getThemeGradient = (theme: string | null) => {
    return OFFER_THEMES.find(t => t.value === theme)?.color || OFFER_THEMES[0].color;
  };

  // Stats
  const activeOffers = offers?.filter(o => o.is_active).length || 0;
  const totalClaimed = userBonuses?.length || 0;
  const activeUserBonuses = userBonuses?.filter(b => b.status === 'active').length || 0;

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
            <p className="text-muted-foreground">Create and manage bonuses, offers, and promotions</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Offer
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingOffer ? 'Edit Offer' : 'Create New Offer'}</DialogTitle>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Welcome Bonus"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Offer Type</Label>
                    <Select value={formData.offer_type} onValueChange={(v) => setFormData({ ...formData, offer_type: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {OFFER_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Get 100% bonus on your first deposit!"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Bonus Amount (Fixed)</Label>
                    <Input
                      type="number"
                      value={formData.bonus_amount}
                      onChange={(e) => setFormData({ ...formData, bonus_amount: Number(e.target.value) })}
                      placeholder="0"
                    />
                    <p className="text-xs text-muted-foreground">Fixed bonus amount in ₹</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Bonus Percentage (%)</Label>
                    <Input
                      type="number"
                      value={formData.bonus_percentage}
                      onChange={(e) => setFormData({ ...formData, bonus_percentage: Number(e.target.value) })}
                      placeholder="0"
                    />
                    <p className="text-xs text-muted-foreground">Percentage of deposit</p>
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
                    <Label>Max Deposit (₹)</Label>
                    <Input
                      type="number"
                      value={formData.max_amount}
                      onChange={(e) => setFormData({ ...formData, max_amount: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Wagering Multiplier</Label>
                    <span className="text-sm font-mono font-semibold">{formData.wagering_multiplier}x</span>
                  </div>
                  <Slider
                    value={[formData.wagering_multiplier]}
                    onValueChange={([v]) => setFormData({ ...formData, wagering_multiplier: v })}
                    min={0}
                    max={20}
                    step={1}
                  />
                  <p className="text-xs text-muted-foreground">
                    Users must wager bonus × {formData.wagering_multiplier} before withdrawal
                  </p>
                </div>

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
                    <Label>Animation</Label>
                    <Select value={formData.animation} onValueChange={(v) => setFormData({ ...formData, animation: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {OFFER_ANIMATIONS.map(anim => (
                          <SelectItem key={anim.value} value={anim.value}>{anim.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Expiry Date</Label>
                    <Input
                      type="date"
                      value={formData.valid_until}
                      onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                    />
                  </div>
                  {formData.offer_type === 'lossback' && (
                    <div className="space-y-2">
                      <Label>Lossback Percentage (%)</Label>
                      <Input
                        type="number"
                        value={formData.lossback_percentage}
                        onChange={(e) => setFormData({ ...formData, lossback_percentage: Number(e.target.value) })}
                        placeholder="e.g. 10"
                      />
                    </div>
                  )}
                  {formData.offer_type === 'vip_loyalty' && (
                    <div className="space-y-2">
                      <Label>VIP Level Required</Label>
                      <Input
                        type="number"
                        value={formData.vip_level}
                        onChange={(e) => setFormData({ ...formData, vip_level: Number(e.target.value) })}
                        min={0}
                        max={5}
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div>
                    <Label>Auto-Apply</Label>
                    <p className="text-xs text-muted-foreground">Automatically apply to eligible users</p>
                  </div>
                  <Switch
                    checked={formData.auto_apply}
                    onCheckedChange={(checked) => setFormData({ ...formData, auto_apply: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div>
                    <Label>One-time Claim Only</Label>
                    <p className="text-xs text-muted-foreground">Users can only claim this once</p>
                  </div>
                  <Switch
                    checked={formData.one_time_only}
                    onCheckedChange={(checked) => setFormData({ ...formData, one_time_only: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div>
                    <Label>Active</Label>
                    <p className="text-xs text-muted-foreground">Offer is visible to users</p>
                  </div>
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button onClick={() => saveOffer.mutate(formData)} disabled={saveOffer.isPending}>
                  {saveOffer.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {editingOffer ? 'Update Offer' : 'Create Offer'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          <Card className="border-border/50 bg-gradient-to-br from-card to-primary/5">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Gift className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Offers</p>
                  <p className="text-2xl font-bold">{activeOffers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-gradient-to-br from-card to-profit/5">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-profit/10">
                  <Users className="h-6 w-6 text-profit" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Claimed</p>
                  <p className="text-2xl font-bold">{totalClaimed}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-gradient-to-br from-card to-warning/5">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-warning/10">
                  <Clock className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Bonuses</p>
                  <p className="text-2xl font-bold">{activeUserBonuses}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Offers Table */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>All Offers</CardTitle>
            <CardDescription>Manage your bonus offers and promotions</CardDescription>
          </CardHeader>
          <CardContent>
            {offersLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : offers && offers.length > 0 ? (
              <div className="space-y-3">
                <AnimatePresence>
                  {offers.map((offer, index) => (
                    <motion.div
                      key={offer.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`p-4 rounded-xl border bg-gradient-to-r ${getThemeGradient(offer.theme)} bg-opacity-10 relative overflow-hidden`}
                    >
                      <div className="absolute inset-0 bg-card/90" />
                      <div className="relative flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{offer.title}</h3>
                            <Badge variant={offer.is_active ? 'default' : 'secondary'}>
                              {offer.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                            {offer.one_time_only && (
                              <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                                One-time
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{offer.description || 'No description'}</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {offer.bonus_percentage > 0 && (
                              <Badge variant="secondary">
                                <Percent className="h-3 w-3 mr-1" />
                                {offer.bonus_percentage}%
                              </Badge>
                            )}
                            {offer.bonus_amount > 0 && (
                              <Badge variant="secondary">+{formatINR(offer.bonus_amount)}</Badge>
                            )}
                            <Badge variant="outline">Min: {formatINR(offer.min_amount)}</Badge>
                            {offer.wagering_multiplier > 0 && (
                              <Badge variant="outline">{offer.wagering_multiplier}x wagering</Badge>
                            )}
                            {offer.valid_until && (
                              <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                                <Clock className="h-3 w-3 mr-1" />
                                Expires: {formatDate(offer.valid_until)}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={offer.is_active}
                            onCheckedChange={(checked) => toggleOfferStatus.mutate({ offerId: offer.id, isActive: checked })}
                          />
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(offer)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive hover:text-destructive"
                            onClick={() => deleteOffer.mutate(offer.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="text-center py-12">
                <Gift className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No offers created yet</p>
                <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Offer
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Claims Table */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Recent Bonus Claims</CardTitle>
            <CardDescription>Track user bonus activity</CardDescription>
          </CardHeader>
          <CardContent>
            {bonusesLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : userBonuses && userBonuses.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Wagering</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Claimed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userBonuses.map((bonus) => {
                    const progress = bonus.wagering_required > 0 
                      ? Math.min((bonus.wagering_completed / bonus.wagering_required) * 100, 100)
                      : 100;
                    return (
                      <TableRow key={bonus.id}>
                        <TableCell className="font-mono text-xs">{bonus.user_id.slice(0, 8)}...</TableCell>
                        <TableCell className="font-mono">{formatINR(bonus.bonus_amount)}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {bonus.wagering_required > 0 ? formatINR(bonus.wagering_required) : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="w-20 h-2 bg-secondary rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary transition-all" 
                              style={{ width: `${progress}%` }} 
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            bonus.status === 'completed' ? 'default' : 
                            bonus.status === 'active' ? 'secondary' : 'outline'
                          }>
                            {bonus.status === 'completed' ? <CheckCircle className="h-3 w-3 mr-1" /> : null}
                            {bonus.status === 'expired' ? <XCircle className="h-3 w-3 mr-1" /> : null}
                            {bonus.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(bonus.claimed_at)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center py-8 text-muted-foreground">No bonus claims yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
