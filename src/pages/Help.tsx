import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { TrendingUp, Search, Mail, ArrowLeft, HelpCircle, Loader2, MessageCircle, Phone } from 'lucide-react';
import { useSocialChannels } from '@/hooks/useSocialChannels';
import { useSettings } from '@/hooks/useSettings';
import { motion } from 'framer-motion';

interface HelpArticle {
  id: string;
  title: string;
  content: string;
  category: string;
}

export default function Help() {
  const [searchQuery, setSearchQuery] = useState('');
  const { whatsappChannel, telegramChannel, channels } = useSocialChannels();
  const { settings } = useSettings();

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
    {
      question: 'How do I deposit funds?',
      answer: 'Go to the Wallet page, click on "Deposit", and follow the instructions to transfer USDT via UPI or crypto. Once sent, enter the transaction hash and wait for admin approval.',
    },
    {
      question: 'How long does withdrawal take?',
      answer: 'Withdrawals are processed within 24 hours. Your funds will be sent to your UPI ID after admin approval.',
    },
    {
      question: 'What is the minimum deposit/withdrawal?',
      answer: 'The minimum deposit is ₹100 and minimum withdrawal is ₹100. Check the Wallet page for current limits.',
    },
    {
      question: 'How does trading work?',
      answer: 'Select a trading pair, enter your trade amount, and choose Buy (Long) or Sell (Short). After placing the trade, wait for the timer to complete to see your result.',
    },
    {
      question: 'Is my money safe?',
      answer: 'Yes, all funds are secured in our platform. We use industry-standard security measures to protect your account and funds.',
    },
    {
      question: 'What is the profit percentage?',
      answer: 'When you win a trade, you earn a profit percentage set by the platform (usually 80%). For example, if you trade ₹1000 and win, you get ₹1800 back.',
    },
    {
      question: 'How are trade results determined?',
      answer: 'Trade results are automatically determined when the timer completes. The outcome is based on market conditions and platform settings.',
    },
    {
      question: 'Can I cancel an active trade?',
      answer: 'No, once a trade is placed, it cannot be cancelled. The result will be determined when the timer expires.',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50">
        <div className="container flex items-center h-16">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex items-center gap-2 ml-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <span className="font-bold">Help Center</span>
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-6">
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

        {/* FAQ Section */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              Frequently Asked Questions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredArticles && filteredArticles.length > 0 ? (
              <div className="space-y-6">
                {categories.map(category => (
                  <div key={category}>
                    <h3 className="font-semibold mb-3 capitalize">{category}</h3>
                    <Accordion type="single" collapsible>
                      {filteredArticles
                        .filter(a => a.category === category)
                        .map(article => (
                          <AccordionItem key={article.id} value={article.id}>
                            <AccordionTrigger>{article.title}</AccordionTrigger>
                            <AccordionContent className="text-muted-foreground whitespace-pre-wrap">
                              {article.content}
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                    </Accordion>
                  </div>
                ))}
              </div>
            ) : (
              <Accordion type="single" collapsible>
                {defaultFAQs.map((faq, index) => (
                  <AccordionItem key={index} value={`faq-${index}`}>
                    <AccordionTrigger>{faq.question}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </CardContent>
        </Card>

        {/* Contact Section */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              Contact Support
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Can't find what you're looking for? Reach out to us through one of these channels:
            </p>
            
            <div className="grid gap-3 sm:grid-cols-2">
              {settings?.support_email && (
                <motion.a
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  href={`mailto:${settings.support_email}`}
                  className="flex items-center gap-3 p-4 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Email Support</p>
                    <p className="text-sm text-muted-foreground">{settings.support_email}</p>
                  </div>
                </motion.a>
              )}
              
              {whatsappChannel && (
                <motion.a
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  href={whatsappChannel.channel_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 rounded-lg bg-[#25D366]/10 hover:bg-[#25D366]/20 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium">WhatsApp</p>
                    <p className="text-sm text-muted-foreground">{whatsappChannel.channel_name}</p>
                  </div>
                </motion.a>
              )}
              
              {telegramChannel && (
                <motion.a
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  href={telegramChannel.channel_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 rounded-lg bg-[#0088cc]/10 hover:bg-[#0088cc]/20 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-[#0088cc] flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11.944 0A12 12 0 1 0 24 12 12.013 12.013 0 0 0 11.944 0Zm5.858 7.987-1.9 8.987c-.143.638-.539.792-1.093.493l-3-2.21-1.45 1.4a.756.756 0 0 1-.6.295l.213-3.054 5.56-5.022c.242-.213-.054-.334-.373-.121l-6.869 4.326-2.962-.924c-.643-.2-.656-.643.135-.954l11.573-4.46c.538-.196 1.006.128.832.944h-.066Z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium">Telegram</p>
                    <p className="text-sm text-muted-foreground">{telegramChannel.channel_name}</p>
                  </div>
                </motion.a>
              )}
            </div>

            {/* Social Channels List */}
            {channels && channels.length > 0 && (
              <div className="pt-4 border-t border-border/50">
                <p className="text-sm font-medium mb-3">Follow us on social media:</p>
                <div className="flex flex-wrap gap-2">
                  {channels.map((channel) => (
                    <motion.a
                      key={channel.id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      href={channel.channel_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-full bg-secondary text-sm font-medium hover:bg-secondary/80 transition-colors"
                    >
                      {channel.channel_name}
                    </motion.a>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Links */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-primary" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3">
              <Button variant="outline" className="h-auto py-4" asChild>
                <Link to="/wallet">
                  <div className="text-center">
                    <span className="text-2xl block mb-1">💰</span>
                    <span>Deposit Funds</span>
                  </div>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto py-4" asChild>
                <Link to="/trade">
                  <div className="text-center">
                    <span className="text-2xl block mb-1">📈</span>
                    <span>Start Trading</span>
                  </div>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto py-4" asChild>
                <Link to="/history">
                  <div className="text-center">
                    <span className="text-2xl block mb-1">📊</span>
                    <span>View History</span>
                  </div>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
