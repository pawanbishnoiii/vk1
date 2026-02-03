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
  Loader2, 
  Save, 
  Clock, 
  Wallet, 
  Mail, 
  Settings as SettingsIcon,
  Volume2,
  MessageCircle,
  Send,
  Music,
  Trophy,
  XCircle
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
    // Social Links
    whatsapp_link: '',
    telegram_link: '',
    // Sound Settings
    win_sound_url: '',
    loss_sound_url: '',
    background_sound_url: '',
    sound_loop_enabled: false,
  });

  // Update form when settings load
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
      }));
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings(formData);
    toast({
      title: 'Settings saved',
      description: 'Platform settings have been updated',
    });
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Platform Settings</h1>
            <p className="text-muted-foreground">Configure platform behavior, social links, and sounds</p>
          </div>
          <Button onClick={handleSave} disabled={isUpdating}>
            {isUpdating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>

        <Tabs defaultValue="trading" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="trading">Trading</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="social">Social & Support</TabsTrigger>
            <TabsTrigger value="sounds">Sounds</TabsTrigger>
          </TabsList>

          {/* Trading Settings Tab */}
          <TabsContent value="trading">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    Trading Settings
                  </CardTitle>
                  <CardDescription>Configure trade duration and win rates</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Trade Duration (seconds)</Label>
                      <span className="font-mono font-semibold">{formData.trade_duration}s</span>
                    </div>
                    <Slider
                      value={[formData.trade_duration]}
                      onValueChange={([value]) => setFormData({ ...formData, trade_duration: value })}
                      min={10}
                      max={120}
                      step={5}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Global Win Rate (%)</Label>
                      <span className="font-mono font-semibold">{formData.global_win_rate}%</span>
                    </div>
                    <Slider
                      value={[formData.global_win_rate]}
                      onValueChange={([value]) => setFormData({ ...formData, global_win_rate: value })}
                      min={0}
                      max={100}
                      step={5}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-profit" />
                    Profit & Loss
                  </CardTitle>
                  <CardDescription>Configure profit/loss percentages (1-200%)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Win Profit Percentage (%)</Label>
                      <span className="font-mono font-semibold text-profit">{formData.profit_percentage}%</span>
                    </div>
                    <Slider
                      value={[formData.profit_percentage]}
                      onValueChange={([value]) => setFormData({ ...formData, profit_percentage: value })}
                      min={1}
                      max={200}
                      step={1}
                    />
                    <p className="text-xs text-muted-foreground">
                      Profit % user gets on winning trades
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Loss Percentage (%)</Label>
                      <span className="font-mono font-semibold text-loss">{formData.loss_percentage}%</span>
                    </div>
                    <Slider
                      value={[formData.loss_percentage]}
                      onValueChange={([value]) => setFormData({ ...formData, loss_percentage: value })}
                      min={1}
                      max={200}
                      step={1}
                    />
                    <p className="text-xs text-muted-foreground">
                      % of amount lost on losing trades (100% = full amount)
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <SettingsIcon className="h-5 w-5 text-primary" />
                    Platform Info
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="platform_name">Platform Name</Label>
                    <Input
                      id="platform_name"
                      value={formData.platform_name}
                      onChange={(e) => setFormData({ ...formData, platform_name: e.target.value })}
                      placeholder="CryptoTrade Pro"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-primary" />
                    Payment Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="upi_id">UPI ID for Deposits</Label>
                    <Input
                      id="upi_id"
                      value={formData.upi_id}
                      onChange={(e) => setFormData({ ...formData, upi_id: e.target.value })}
                      placeholder="merchant@upi"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Min Deposit (₹)</Label>
                      <Input
                        type="number"
                        value={formData.min_deposit}
                        onChange={(e) => setFormData({ ...formData, min_deposit: Number(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Deposit (₹)</Label>
                      <Input
                        type="number"
                        value={formData.max_deposit}
                        onChange={(e) => setFormData({ ...formData, max_deposit: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Min Withdrawal (₹)</Label>
                      <Input
                        type="number"
                        value={formData.min_withdrawal}
                        onChange={(e) => setFormData({ ...formData, min_withdrawal: Number(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Withdrawal (₹)</Label>
                      <Input
                        type="number"
                        value={formData.max_withdrawal}
                        onChange={(e) => setFormData({ ...formData, max_withdrawal: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-primary" />
                    Email Settings (SMTP)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>SMTP Host</Label>
                      <Input
                        value={formData.smtp_host}
                        onChange={(e) => setFormData({ ...formData, smtp_host: e.target.value })}
                        placeholder="smtp.gmail.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>SMTP Port</Label>
                      <Input
                        value={formData.smtp_port}
                        onChange={(e) => setFormData({ ...formData, smtp_port: e.target.value })}
                        placeholder="587"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>SMTP Username</Label>
                    <Input
                      value={formData.smtp_user}
                      onChange={(e) => setFormData({ ...formData, smtp_user: e.target.value })}
                      placeholder="your-email@gmail.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Support Email</Label>
                    <Input
                      value={formData.support_email}
                      onChange={(e) => setFormData({ ...formData, support_email: e.target.value })}
                      placeholder="support@example.com"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Social & Support Tab */}
          <TabsContent value="social">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-green-500" />
                    WhatsApp Support
                  </CardTitle>
                  <CardDescription>Configure WhatsApp support link for users</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>WhatsApp Link</Label>
                    <Input
                      value={formData.whatsapp_link}
                      onChange={(e) => setFormData({ ...formData, whatsapp_link: e.target.value })}
                      placeholder="https://wa.me/919876543210"
                    />
                    <p className="text-xs text-muted-foreground">
                      Format: https://wa.me/&lt;country_code&gt;&lt;phone_number&gt;
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="h-5 w-5 text-blue-500" />
                    Telegram Support
                  </CardTitle>
                  <CardDescription>Configure Telegram support link for users</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Telegram Link</Label>
                    <Input
                      value={formData.telegram_link}
                      onChange={(e) => setFormData({ ...formData, telegram_link: e.target.value })}
                      placeholder="https://t.me/your_channel"
                    />
                    <p className="text-xs text-muted-foreground">
                      Format: https://t.me/your_username or channel
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Sounds Tab */}
          <TabsContent value="sounds">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-profit" />
                    Win Sound
                  </CardTitle>
                  <CardDescription>Sound that plays when user wins a trade</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Win Sound URL (MP3)</Label>
                    <Input
                      value={formData.win_sound_url}
                      onChange={(e) => setFormData({ ...formData, win_sound_url: e.target.value })}
                      placeholder="https://example.com/win.mp3"
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave empty to use default sound
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-loss" />
                    Loss Sound
                  </CardTitle>
                  <CardDescription>Sound that plays when user loses a trade</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Loss Sound URL (MP3)</Label>
                    <Input
                      value={formData.loss_sound_url}
                      onChange={(e) => setFormData({ ...formData, loss_sound_url: e.target.value })}
                      placeholder="https://example.com/loss.mp3"
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave empty to use default sound
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50 md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Music className="h-5 w-5 text-primary" />
                    Background Music
                  </CardTitle>
                  <CardDescription>Ambient background sound for the trading experience</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Background Sound URL (MP3)</Label>
                    <Input
                      value={formData.background_sound_url}
                      onChange={(e) => setFormData({ ...formData, background_sound_url: e.target.value })}
                      placeholder="https://example.com/background.mp3"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                    <div>
                      <Label>Loop Background Sound</Label>
                      <p className="text-xs text-muted-foreground">Continuously play background music</p>
                    </div>
                    <Switch
                      checked={formData.sound_loop_enabled}
                      onCheckedChange={(checked) => setFormData({ ...formData, sound_loop_enabled: checked })}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}