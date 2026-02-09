import { useState, useEffect } from 'react';
import { useSettings } from '@/hooks/useSettings';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, Save, Clock, Wallet, Mail, Settings as SettingsIcon,
  Volume2, MessageCircle, Send, Music, Trophy, XCircle, Shield, Crown
} from 'lucide-react';

export default function AdminSettings() {
  const { settings, isLoading, updateSettings, isUpdating } = useSettings();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    trade_duration: 30,
    upi_id: '',
    min_deposit: 100,
    max_deposit: 100000,
    min_withdrawal: 100,
    max_withdrawal: 50000,
    global_win_rate: 50,
    profit_percentage: 80,
    loss_percentage: 100,
    platform_name: 'CryptoTrade Pro',
    support_email: '',
    smtp_host: '',
    smtp_port: '587',
    smtp_user: '',
    smtp_from_email: '',
    whatsapp_link: '',
    telegram_link: '',
    win_sound_url: '',
    loss_sound_url: '',
    background_sound_url: '',
    sound_loop_enabled: false,
    // Auth settings
    google_auth_enabled: true,
    apple_auth_enabled: true,
    email_verify_enabled: true,
    // VIP settings
    vip_bronze_min: 0,
    vip_silver_min: 5000,
    vip_gold_min: 25000,
    vip_platinum_min: 100000,
    vip_diamond_min: 500000,
    // Trading pairs
    trading_pairs_enabled: 'BTC/USDT,ETH/USDT,BNB/USDT,SOL/USDT,XRP/USDT,DOGE/USDT,TRX/USDT',
    min_trade_amount: 10,
    max_trade_amount: 50000,
  });

  useEffect(() => {
    if (settings) {
      setFormData(prev => ({
        ...prev,
        trade_duration: settings.trade_duration || 30,
        upi_id: settings.upi_id || '',
        min_deposit: settings.min_deposit || 100,
        max_deposit: settings.max_deposit || 100000,
        min_withdrawal: settings.min_withdrawal || 100,
        max_withdrawal: settings.max_withdrawal || 50000,
        global_win_rate: settings.global_win_rate || 50,
        profit_percentage: settings.profit_percentage || 80,
        loss_percentage: settings.loss_percentage || 100,
        platform_name: settings.platform_name || 'CryptoTrade Pro',
        support_email: settings.support_email || '',
        smtp_host: settings.smtp_host || '',
        smtp_port: settings.smtp_port || '587',
        smtp_user: settings.smtp_user || '',
        smtp_from_email: settings.smtp_from_email || '',
        whatsapp_link: (settings as any).whatsapp_link || '',
        telegram_link: (settings as any).telegram_link || '',
        win_sound_url: (settings as any).win_sound_url || '',
        loss_sound_url: (settings as any).loss_sound_url || '',
        background_sound_url: (settings as any).background_sound_url || '',
        sound_loop_enabled: (settings as any).sound_loop_enabled || false,
        google_auth_enabled: (settings as any).google_auth_enabled !== false,
        apple_auth_enabled: (settings as any).apple_auth_enabled !== false,
        email_verify_enabled: (settings as any).email_verify_enabled !== false,
        vip_bronze_min: (settings as any).vip_bronze_min || 0,
        vip_silver_min: (settings as any).vip_silver_min || 5000,
        vip_gold_min: (settings as any).vip_gold_min || 25000,
        vip_platinum_min: (settings as any).vip_platinum_min || 100000,
        vip_diamond_min: (settings as any).vip_diamond_min || 500000,
        trading_pairs_enabled: (settings as any).trading_pairs_enabled || 'BTC/USDT,ETH/USDT,BNB/USDT,SOL/USDT,XRP/USDT,DOGE/USDT,TRX/USDT',
        min_trade_amount: (settings as any).min_trade_amount || 10,
        max_trade_amount: (settings as any).max_trade_amount || 50000,
      }));
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings(formData);
    toast({ title: 'Settings saved', description: 'Platform settings have been updated' });
  };

  if (isLoading) {
    return <AdminLayout><div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></AdminLayout>;
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Platform Settings</h1>
            <p className="text-muted-foreground">Configure platform behavior, auth, social links, and sounds</p>
          </div>
          <Button onClick={handleSave} disabled={isUpdating}>
            {isUpdating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Changes
          </Button>
        </div>

        <Tabs defaultValue="trading" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="trading">Trading</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="auth">Auth</TabsTrigger>
            <TabsTrigger value="vip">VIP</TabsTrigger>
            <TabsTrigger value="social">Social</TabsTrigger>
            <TabsTrigger value="sounds">Sounds</TabsTrigger>
            <TabsTrigger value="email">Email</TabsTrigger>
          </TabsList>

          {/* Trading Settings */}
          <TabsContent value="trading">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5 text-primary" /> Trading Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Trade Duration (seconds)</Label>
                      <span className="font-mono font-semibold">{formData.trade_duration}s</span>
                    </div>
                    <Slider value={[formData.trade_duration]} onValueChange={([v]) => setFormData({ ...formData, trade_duration: v })} min={10} max={120} step={5} />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Global Win Rate (%)</Label>
                      <span className="font-mono font-semibold">{formData.global_win_rate}%</span>
                    </div>
                    <Slider value={[formData.global_win_rate]} onValueChange={([v]) => setFormData({ ...formData, global_win_rate: v })} min={0} max={100} step={5} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Min Trade Amount (₹)</Label>
                      <Input type="number" value={formData.min_trade_amount} onChange={(e) => setFormData({ ...formData, min_trade_amount: Number(e.target.value) })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Trade Amount (₹)</Label>
                      <Input type="number" value={formData.max_trade_amount} onChange={(e) => setFormData({ ...formData, max_trade_amount: Number(e.target.value) })} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-profit" /> Profit & Loss</CardTitle>
                  <CardDescription>Configure profit/loss percentages (1-200%)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Win Profit %</Label>
                      <span className="font-mono font-semibold text-profit">{formData.profit_percentage}%</span>
                    </div>
                    <Slider value={[formData.profit_percentage]} onValueChange={([v]) => setFormData({ ...formData, profit_percentage: v })} min={1} max={200} step={1} />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Loss %</Label>
                      <span className="font-mono font-semibold text-loss">{formData.loss_percentage}%</span>
                    </div>
                    <Slider value={[formData.loss_percentage]} onValueChange={([v]) => setFormData({ ...formData, loss_percentage: v })} min={1} max={200} step={1} />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><SettingsIcon className="h-5 w-5 text-primary" /> Platform Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Platform Name</Label>
                    <Input value={formData.platform_name} onChange={(e) => setFormData({ ...formData, platform_name: e.target.value })} placeholder="CryptoTrade Pro" />
                  </div>
                  <div className="space-y-2">
                    <Label>Active Trading Pairs</Label>
                    <Input value={formData.trading_pairs_enabled} onChange={(e) => setFormData({ ...formData, trading_pairs_enabled: e.target.value })} placeholder="BTC/USDT,ETH/USDT,..." />
                    <p className="text-xs text-muted-foreground">Comma-separated list of enabled pairs</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Payments */}
          <TabsContent value="payments">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5 text-primary" /> Payment Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>UPI ID for Deposits</Label>
                    <Input value={formData.upi_id} onChange={(e) => setFormData({ ...formData, upi_id: e.target.value })} placeholder="merchant@upi" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Min Deposit (₹)</Label>
                      <Input type="number" value={formData.min_deposit} onChange={(e) => setFormData({ ...formData, min_deposit: Number(e.target.value) })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Deposit (₹)</Label>
                      <Input type="number" value={formData.max_deposit} onChange={(e) => setFormData({ ...formData, max_deposit: Number(e.target.value) })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Min Withdrawal (₹)</Label>
                      <Input type="number" value={formData.min_withdrawal} onChange={(e) => setFormData({ ...formData, min_withdrawal: Number(e.target.value) })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Withdrawal (₹)</Label>
                      <Input type="number" value={formData.max_withdrawal} onChange={(e) => setFormData({ ...formData, max_withdrawal: Number(e.target.value) })} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Auth Settings */}
          <TabsContent value="auth">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /> Authentication Methods</CardTitle>
                  <CardDescription>Enable/disable login methods for users</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                    <div>
                      <Label className="text-base">Google Sign In</Label>
                      <p className="text-xs text-muted-foreground">Allow users to sign in with Google</p>
                    </div>
                    <Switch checked={formData.google_auth_enabled} onCheckedChange={(v) => setFormData({ ...formData, google_auth_enabled: v })} />
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                    <div>
                      <Label className="text-base">Apple Sign In</Label>
                      <p className="text-xs text-muted-foreground">Allow users to sign in with Apple</p>
                    </div>
                    <Switch checked={formData.apple_auth_enabled} onCheckedChange={(v) => setFormData({ ...formData, apple_auth_enabled: v })} />
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                    <div>
                      <Label className="text-base">Email Verification</Label>
                      <p className="text-xs text-muted-foreground">Require email verification on signup</p>
                    </div>
                    <Switch checked={formData.email_verify_enabled} onCheckedChange={(v) => setFormData({ ...formData, email_verify_enabled: v })} />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* VIP Settings */}
          <TabsContent value="vip">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Crown className="h-5 w-5 text-warning" /> VIP Level Thresholds</CardTitle>
                <CardDescription>Set minimum total deposit amounts for each VIP level</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { key: 'vip_bronze_min', label: '🥉 Bronze', level: 0 },
                  { key: 'vip_silver_min', label: '🥈 Silver', level: 1 },
                  { key: 'vip_gold_min', label: '🥇 Gold', level: 2 },
                  { key: 'vip_platinum_min', label: '💎 Platinum', level: 3 },
                  { key: 'vip_diamond_min', label: '👑 Diamond', level: 4 },
                ].map(vip => (
                  <div key={vip.key} className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30">
                    <span className="text-lg w-32">{vip.label}</span>
                    <div className="flex-1 space-y-1">
                      <Label>Min Total Deposit (₹)</Label>
                      <Input type="number" value={(formData as any)[vip.key]}
                        onChange={(e) => setFormData({ ...formData, [vip.key]: Number(e.target.value) })} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Social */}
          <TabsContent value="social">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-green-500" /> WhatsApp</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>WhatsApp Link</Label>
                    <Input value={formData.whatsapp_link} onChange={(e) => setFormData({ ...formData, whatsapp_link: e.target.value })} placeholder="https://wa.me/919876543210" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Send className="h-5 w-5 text-blue-500" /> Telegram</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Telegram Link</Label>
                    <Input value={formData.telegram_link} onChange={(e) => setFormData({ ...formData, telegram_link: e.target.value })} placeholder="https://t.me/your_channel" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Sounds */}
          <TabsContent value="sounds">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-profit" /> Win Sound</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Win Sound URL (MP3)</Label>
                    <Input value={formData.win_sound_url} onChange={(e) => setFormData({ ...formData, win_sound_url: e.target.value })} placeholder="https://example.com/win.mp3" />
                    <p className="text-xs text-muted-foreground">Leave empty for default</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><XCircle className="h-5 w-5 text-loss" /> Loss Sound</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Loss Sound URL (MP3)</Label>
                    <Input value={formData.loss_sound_url} onChange={(e) => setFormData({ ...formData, loss_sound_url: e.target.value })} placeholder="https://example.com/loss.mp3" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border/50 md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Music className="h-5 w-5 text-primary" /> Background Music</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Background Sound URL (MP3)</Label>
                    <Input value={formData.background_sound_url} onChange={(e) => setFormData({ ...formData, background_sound_url: e.target.value })} placeholder="https://example.com/bg.mp3" />
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                    <div>
                      <Label>Loop Background Sound</Label>
                      <p className="text-xs text-muted-foreground">Continuously play background music</p>
                    </div>
                    <Switch checked={formData.sound_loop_enabled} onCheckedChange={(v) => setFormData({ ...formData, sound_loop_enabled: v })} />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Email / SMTP */}
          <TabsContent value="email">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5 text-primary" /> SMTP Settings</CardTitle>
                <CardDescription>Configure email delivery for verification and notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>SMTP Host</Label>
                    <Input value={formData.smtp_host} onChange={(e) => setFormData({ ...formData, smtp_host: e.target.value })} placeholder="smtp.gmail.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>SMTP Port</Label>
                    <Input value={formData.smtp_port} onChange={(e) => setFormData({ ...formData, smtp_port: e.target.value })} placeholder="587" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>SMTP Username</Label>
                  <Input value={formData.smtp_user} onChange={(e) => setFormData({ ...formData, smtp_user: e.target.value })} placeholder="your-email@gmail.com" />
                </div>
                <div className="space-y-2">
                  <Label>From Email</Label>
                  <Input value={formData.smtp_from_email} onChange={(e) => setFormData({ ...formData, smtp_from_email: e.target.value })} placeholder="noreply@yourdomain.com" />
                </div>
                <div className="space-y-2">
                  <Label>Support Email</Label>
                  <Input value={formData.support_email} onChange={(e) => setFormData({ ...formData, support_email: e.target.value })} placeholder="support@example.com" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
