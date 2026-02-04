import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import UserLayout from '@/components/layouts/UserLayout';
import AvatarUpload from '@/components/profile/AvatarUpload';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/hooks/useSettings';
import { useSocialChannels } from '@/hooks/useSocialChannels';
import { formatINR } from '@/lib/formatters';
import { motion } from 'framer-motion';
import { 
  User, 
  Edit2, 
  Save, 
  Target, 
  BarChart3, 
  Award, 
  Loader2,
  HelpCircle,
  Search,
  Mail,
  MessageCircle,
  Send,
  TrendingUp,
  Trophy
} from 'lucide-react';

interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  bio: string | null;
  trading_level: string | null;
}

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { balance } = useWallet();
  const { settings } = useSettings();
  const { whatsappChannel, telegramChannel } = useSocialChannels();
  
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    bio: '',
  });

  // Fetch profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (error) throw error;
      return data as Profile;
    },
    enabled: !!user?.id,
  });

  // Fetch trading stats
  const { data: stats } = useQuery({
    queryKey: ['user-trading-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('trades')
        .select('status, profit_loss')
        .eq('user_id', user.id);
      if (error) throw error;
      
      const total = data?.length || 0;
      const wins = data?.filter(t => t.status === 'won').length || 0;
      const totalPnL = data?.reduce((acc, t) => acc + (Number(t.profit_loss) || 0), 0) || 0;
      return { total, wins, winRate: total > 0 ? (wins / total) * 100 : 0, totalPnL };
    },
    enabled: !!user?.id,
  });

  // Fetch help articles
  const { data: articles, isLoading: articlesLoading } = useQuery({
    queryKey: ['help-articles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('help_articles')
        .select('*')
        .eq('is_published', true)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Update form when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        bio: profile.bio || '',
      });
    }
  }, [profile]);

  // Update profile mutation
  const updateProfile = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from('profiles')
        .update(data)
        .eq('user_id', user?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Profile updated!' });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const whatsappLink = (settings as any)?.whatsapp_link || whatsappChannel?.channel_url;
  const telegramLink = (settings as any)?.telegram_link || telegramChannel?.channel_url;

  const filteredArticles = articles?.filter(article =>
    article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const defaultFAQs = [
    { question: 'How do I deposit funds?', answer: 'Go to the Wallet page, click on "Deposit", and follow the instructions.' },
    { question: 'How long does withdrawal take?', answer: 'Withdrawals are processed within 24 hours after admin approval.' },
    { question: 'What is the minimum deposit?', answer: 'Minimum deposit is ₹100.' },
    { question: 'How does trading work?', answer: 'Select a trading pair, enter amount, choose Buy/Sell, wait for timer.' },
  ];

  const getTradingLevelBadge = (level: string | null) => {
    const levels: Record<string, { label: string; color: string }> = {
      beginner: { label: '🌱 Beginner', color: 'bg-blue-500/10 text-blue-500' },
      intermediate: { label: '⚡ Intermediate', color: 'bg-purple-500/10 text-purple-500' },
      advanced: { label: '🔥 Advanced', color: 'bg-orange-500/10 text-orange-500' },
      expert: { label: '💎 Expert', color: 'bg-cyan-500/10 text-cyan-500' },
    };
    const lvl = levels[level || 'beginner'];
    return <Badge className={lvl.color}>{lvl.label}</Badge>;
  };

  const getAvatarFallback = () => {
    if (profile?.full_name) return profile.full_name.charAt(0).toUpperCase();
    if (profile?.email) return profile.email.charAt(0).toUpperCase();
    return 'U';
  };

  return (
    <UserLayout>
      <div className="space-y-6">
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" /> Profile
            </TabsTrigger>
            <TabsTrigger value="help" className="gap-2">
              <HelpCircle className="h-4 w-4" /> Help
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card className="border-border/50 overflow-hidden">
              <div className="h-24 bg-gradient-to-r from-primary/30 via-primary/20 to-secondary" />
              <CardContent className="-mt-16 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                  <AvatarUpload
                    userId={user?.id || ''}
                    currentAvatarUrl={profile?.avatar_url}
                    fallback={getAvatarFallback()}
                    onUploadComplete={() => queryClient.invalidateQueries({ queryKey: ['user-profile'] })}
                    size="lg"
                  />
                  <div className="flex-1 pb-2">
                    <h2 className="text-2xl font-bold">{profile?.full_name || 'Trader'}</h2>
                    <p className="text-muted-foreground">{profile?.email}</p>
                    <div className="mt-2">
                      {getTradingLevelBadge(profile?.trading_level)}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(!isEditing)}
                  >
                    {isEditing ? 'Cancel' : <><Edit2 className="h-4 w-4 mr-1" /> Edit</>}
                  </Button>
                </div>

                {profile?.bio && !isEditing && (
                  <p className="text-muted-foreground">{profile.bio}</p>
                )}

                {isEditing && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-4 pt-4 border-t border-border"
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Full Name</Label>
                        <Input
                          value={formData.full_name}
                          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                          placeholder="Your name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Phone</Label>
                        <Input
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="+91 1234567890"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Bio</Label>
                      <Textarea
                        value={formData.bio}
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                        placeholder="Tell us about yourself..."
                        rows={3}
                      />
                    </div>
                    <Button
                      onClick={() => updateProfile.mutate(formData)}
                      disabled={updateProfile.isPending}
                    >
                      {updateProfile.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Save Changes
                    </Button>
                  </motion.div>
                )}
              </CardContent>
            </Card>

            {/* Stats Cards */}
            <div className="grid gap-4 sm:grid-cols-4">
              <Card className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <BarChart3 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Trades</p>
                      <p className="text-2xl font-bold">{stats?.total || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-profit/10">
                      <Trophy className="h-5 w-5 text-profit" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Wins</p>
                      <p className="text-2xl font-bold text-profit">{stats?.wins || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-info/10">
                      <Target className="h-5 w-5 text-info" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Win Rate</p>
                      <p className="text-2xl font-bold">{(stats?.winRate || 0).toFixed(1)}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-warning/10">
                      <Award className="h-5 w-5 text-warning" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Balance</p>
                      <p className="text-2xl font-bold font-mono">{formatINR(balance)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Help Tab */}
          <TabsContent value="help" className="space-y-6">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search for help..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* FAQ */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-primary" /> FAQ
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible>
                  {(filteredArticles?.length ? filteredArticles : []).map((article) => (
                    <AccordionItem key={article.id} value={article.id}>
                      <AccordionTrigger>{article.title}</AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {article.content}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                  {!filteredArticles?.length && defaultFAQs.map((faq, i) => (
                    <AccordionItem key={i} value={`faq-${i}`}>
                      <AccordionTrigger>{faq.question}</AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>

            {/* Contact */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-primary" /> Contact Support
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">Reach out through any of these channels:</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {settings?.support_email && (
                    <a
                      href={`mailto:${settings.support_email}`}
                      className="flex items-center gap-3 p-4 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Mail className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Email</p>
                        <p className="text-sm text-muted-foreground">{settings.support_email}</p>
                      </div>
                    </a>
                  )}
                  {whatsappLink && (
                    <a
                      href={whatsappLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 rounded-lg bg-profit/10 hover:bg-profit/20 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-profit flex items-center justify-center">
                        <MessageCircle className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium">WhatsApp</p>
                        <p className="text-sm text-muted-foreground">Chat with us</p>
                      </div>
                    </a>
                  )}
                  {telegramLink && (
                    <a
                      href={telegramLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                        <Send className="h-5 w-5 text-primary-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">Telegram</p>
                        <p className="text-sm text-muted-foreground">Join our channel</p>
                      </div>
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </UserLayout>
  );
}
