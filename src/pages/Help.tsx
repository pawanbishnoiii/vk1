import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { TrendingUp, Search, Mail, ArrowLeft, HelpCircle, Loader2, MessageCircle, Phone, User, Edit2, Save, Target, BarChart3, Award } from 'lucide-react';
import { useSocialChannels } from '@/hooks/useSocialChannels';
import { useSettings } from '@/hooks/useSettings';
import { useWallet } from '@/hooks/useWallet';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { formatINR } from '@/lib/formatters';

interface HelpArticle {
  id: string;
  title: string;
  content: string;
  category: string;
}

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

export default function Help() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const { whatsappChannel, telegramChannel, channels } = useSocialChannels();
  const { settings } = useSettings();
  const { balance } = useWallet();

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

  // Profile form state
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    bio: '',
  });

  // Update form when profile loads
  useState(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        bio: profile.bio || '',
      });
    }
  });

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

  const { data: articles, isLoading } = useQuery({
    queryKey: ['help-articles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('help_articles')
        .select('*')
        .eq('is_published', true)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as HelpArticle[];
    },
  });

  const filteredArticles = articles?.filter(article =>
    article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categories = [...new Set(filteredArticles?.map(a => a.category) || [])];

  const defaultFAQs = [
    { question: 'How do I deposit funds?', answer: 'Go to the Wallet page, click on "Deposit", and follow the instructions to transfer via UPI or crypto.' },
    { question: 'How long does withdrawal take?', answer: 'Withdrawals are processed within 24 hours after admin approval.' },
    { question: 'What is the minimum deposit/withdrawal?', answer: 'Minimum deposit is ₹100 and minimum withdrawal is ₹100.' },
    { question: 'How does trading work?', answer: 'Select a trading pair, enter amount, choose Buy/Sell, wait for timer to complete.' },
    { question: 'What is the profit percentage?', answer: 'When you win, you earn a profit percentage (usually 80%).' },
    { question: 'Can I cancel an active trade?', answer: 'No, once placed, trades cannot be cancelled.' },
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50">
        <div className="container flex items-center h-16">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/dashboard"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div className="flex items-center gap-2 ml-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <span className="font-bold">Help & Profile</span>
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="profile" className="gap-2"><User className="h-4 w-4" /> Profile</TabsTrigger>
            <TabsTrigger value="help" className="gap-2"><HelpCircle className="h-4 w-4" /> Help</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            {/* Profile Card */}
            <Card className="border-border/50 overflow-hidden">
              <div className="h-20 bg-gradient-to-r from-primary/20 via-primary/10 to-secondary" />
              <CardContent className="-mt-10 space-y-4">
                <div className="flex items-end gap-4">
                  <Avatar className="h-20 w-20 border-4 border-background">
                    <AvatarImage src={profile?.avatar_url || ''} />
                    <AvatarFallback className="text-2xl bg-primary/10">
                      {profile?.full_name?.charAt(0) || profile?.email?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 pb-2">
                    <h2 className="text-xl font-bold">{profile?.full_name || 'Trader'}</h2>
                    <p className="text-sm text-muted-foreground">{profile?.email}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)}>
                    {isEditing ? 'Cancel' : <><Edit2 className="h-4 w-4 mr-1" /> Edit</>}
                  </Button>
                </div>

                {getTradingLevelBadge(profile?.trading_level)}
                
                {profile?.bio && !isEditing && (
                  <p className="text-muted-foreground text-sm">{profile.bio}</p>
                )}

                {isEditing && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4 pt-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Full Name</Label>
                        <Input value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} placeholder="Your name" />
                      </div>
                      <div className="space-y-2">
                        <Label>Phone</Label>
                        <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+91 1234567890" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Bio</Label>
                      <Textarea value={formData.bio} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} placeholder="Tell us about yourself..." rows={3} />
                    </div>
                    <Button onClick={() => updateProfile.mutate(formData)} disabled={updateProfile.isPending}>
                      {updateProfile.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                      Save Changes
                    </Button>
                  </motion.div>
                )}
              </CardContent>
            </Card>

            {/* Stats Cards */}
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10"><BarChart3 className="h-5 w-5 text-primary" /></div>
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
                    <div className="p-2 rounded-lg bg-profit/10"><Target className="h-5 w-5 text-profit" /></div>
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
                    <div className="p-2 rounded-lg bg-info/10"><Award className="h-5 w-5 text-info" /></div>
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
              <Input placeholder="Search for help..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>

            {/* FAQ */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><HelpCircle className="h-5 w-5 text-primary" /> FAQ</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : (
                  <Accordion type="single" collapsible>
                    {(filteredArticles?.length ? filteredArticles : []).map((article) => (
                      <AccordionItem key={article.id} value={article.id}>
                        <AccordionTrigger>{article.title}</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">{article.content}</AccordionContent>
                      </AccordionItem>
                    ))}
                    {!filteredArticles?.length && defaultFAQs.map((faq, i) => (
                      <AccordionItem key={i} value={`faq-${i}`}>
                        <AccordionTrigger>{faq.question}</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">{faq.answer}</AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </CardContent>
            </Card>

            {/* Contact */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-primary" /> Contact Support</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">Reach out through any of these channels:</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {settings?.support_email && (
                    <motion.a whileHover={{ scale: 1.02 }} href={`mailto:${settings.support_email}`} className="flex items-center gap-3 p-4 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><Mail className="h-5 w-5 text-primary" /></div>
                      <div><p className="font-medium">Email</p><p className="text-sm text-muted-foreground">{settings.support_email}</p></div>
                    </motion.a>
                  )}
                  {whatsappChannel && (
                    <motion.a whileHover={{ scale: 1.02 }} href={whatsappChannel.channel_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 rounded-lg bg-[#25D366]/10 hover:bg-[#25D366]/20 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      </div>
                      <div><p className="font-medium">WhatsApp</p><p className="text-sm text-muted-foreground">{whatsappChannel.channel_name}</p></div>
                    </motion.a>
                  )}
                  {telegramChannel && (
                    <motion.a whileHover={{ scale: 1.02 }} href={telegramChannel.channel_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 rounded-lg bg-[#0088cc]/10 hover:bg-[#0088cc]/20 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-[#0088cc] flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 1 0 24 12 12.013 12.013 0 0 0 11.944 0Zm5.858 7.987-1.9 8.987c-.143.638-.539.792-1.093.493l-3-2.21-1.45 1.4a.756.756 0 0 1-.6.295l.213-3.054 5.56-5.022c.242-.213-.054-.334-.373-.121l-6.869 4.326-2.962-.924c-.643-.2-.656-.643.135-.954l11.573-4.46c.538-.196 1.006.128.832.944h-.066Z"/></svg>
                      </div>
                      <div><p className="font-medium">Telegram</p><p className="text-sm text-muted-foreground">{telegramChannel.channel_name}</p></div>
                    </motion.a>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
