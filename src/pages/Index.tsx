import { useNavigate, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { usePrices } from '@/hooks/usePrices';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatPercent, TRADING_PAIRS } from '@/lib/constants';
import { 
  TrendingUp, 
  Shield, 
  Zap, 
  BarChart3,
  ArrowRight,
  ChevronRight,
  Users,
  Clock,
  Trophy,
  Gift,
  Wallet,
  Lock,
  Star,
  CheckCircle,
  Play
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Index() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const { prices } = usePrices();

  // Redirect logged-in users to dashboard
  if (user && !isLoading) {
    return <Navigate to="/dashboard" replace />;
  }

  const features = [
    {
      icon: Zap,
      title: 'Instant Execution',
      description: 'Lightning-fast trade execution with real-time price updates',
      gradient: 'from-yellow-500 to-orange-500',
    },
    {
      icon: BarChart3,
      title: 'Live Charts',
      description: 'Professional TradingView charts with multiple timeframes',
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      icon: Shield,
      title: 'Secure Trading',
      description: 'Your funds are protected with industry-standard security',
      gradient: 'from-green-500 to-emerald-500',
    },
    {
      icon: Gift,
      title: 'Huge Bonuses',
      description: 'Get up to 100% bonus on your first deposit',
      gradient: 'from-purple-500 to-pink-500',
    },
    {
      icon: Wallet,
      title: 'Easy Payments',
      description: 'Deposit instantly via UPI - GPay, PhonePe, Paytm',
      gradient: 'from-indigo-500 to-purple-500',
    },
    {
      icon: Clock,
      title: '24/7 Support',
      description: 'Round the clock customer support via WhatsApp & Telegram',
      gradient: 'from-pink-500 to-rose-500',
    },
  ];

  const stats = [
    { value: '50K+', label: 'Active Traders', icon: Users },
    { value: '₹10Cr+', label: 'Daily Volume', icon: BarChart3 },
    { value: '98%', label: 'Payout Rate', icon: Trophy },
    { value: '30s', label: 'Fast Trades', icon: Clock },
  ];

  const testimonials = [
    {
      name: 'Rahul S.',
      text: 'Best trading platform! Made ₹50,000 in my first week. The interface is so simple to use.',
      rating: 5,
    },
    {
      name: 'Priya M.',
      text: 'Instant withdrawals and great bonuses. Customer support is very helpful!',
      rating: 5,
    },
    {
      name: 'Amit K.',
      text: 'I\'ve tried many platforms but this one has the best charts and fastest execution.',
      rating: 5,
    },
  ];

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 gradient-hero" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
        
        {/* Floating Elements */}
        <motion.div 
          className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl"
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div 
          className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"
          animate={{ 
            scale: [1.2, 1, 1.2],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 10, repeat: Infinity }}
        />
        
        <nav className="relative z-10 container flex items-center justify-between h-20">
          <motion.div 
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary/50 shadow-lg shadow-primary/25">
              <TrendingUp className="h-7 w-7 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              CryptoTrade
            </span>
          </motion.div>
          
          <motion.div 
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Button variant="ghost" onClick={() => navigate('/auth')} className="hidden sm:flex">
              Sign In
            </Button>
            <Button 
              onClick={() => navigate('/auth')}
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25"
            >
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </motion.div>
        </nav>

        <div className="relative z-10 container py-20 md:py-32">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Badge className="mb-6 px-4 py-2 text-sm bg-primary/10 text-primary border-primary/20">
                <Gift className="h-4 w-4 mr-2" />
                🎁 100% Welcome Bonus on First Deposit!
              </Badge>
            </motion.div>
            
            <motion.h1 
              className="text-5xl md:text-7xl font-bold tracking-tight mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              Trade Crypto
              <br />
              <span className="bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
                Win Big
              </span>
            </motion.h1>
            
            <motion.p 
              className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              India's #1 crypto trading platform. Predict price movements, 
              trade in 30 seconds, and win up to <span className="text-profit font-semibold">200% profit!</span>
            </motion.p>
            
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Button 
                size="lg" 
                className="text-lg h-14 px-10 bg-gradient-to-r from-profit to-profit/80 hover:from-profit/90 hover:to-profit/70 shadow-xl shadow-profit/25" 
                onClick={() => navigate('/auth')}
              >
                <Play className="mr-2 h-5 w-5" />
                Start Trading Now
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="text-lg h-14 px-10 border-2" 
                onClick={() => navigate('/auth')}
              >
                View Live Markets
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>

            {/* Trust badges */}
            <motion.div 
              className="flex flex-wrap items-center justify-center gap-6 mt-12 text-sm text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-profit" />
                <span>100% Secure</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-warning" />
                <span>Instant Payouts</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <span>Verified Platform</span>
              </div>
            </motion.div>
          </div>
        </div>
      </header>

      {/* Live Prices Ticker */}
      <section className="border-y border-border bg-card/50 backdrop-blur-sm sticky top-0 z-20">
        <div className="container py-4">
          <div className="flex items-center gap-3 mb-3">
            <motion.span 
              className="h-2.5 w-2.5 rounded-full bg-profit"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
            <span className="text-sm font-medium text-muted-foreground">Live Prices</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {TRADING_PAIRS.map((pair, index) => {
              const priceData = prices[pair.symbol];
              const change = priceData?.change24h || 0;
              const isPositive = change >= 0;

              return (
                <motion.div 
                  key={pair.symbol} 
                  className="p-3 rounded-xl bg-secondary/50 hover:bg-secondary/80 transition-all cursor-pointer border border-transparent hover:border-primary/20"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => navigate('/auth')}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{pair.icon}</span>
                    <span className="font-semibold">{pair.base}</span>
                  </div>
                  <p className="font-mono font-semibold text-lg">
                    {priceData ? formatCurrency(priceData.price, pair.decimals) : '--'}
                  </p>
                  <p className={cn(
                    "text-sm font-mono font-medium",
                    isPositive ? "text-profit" : "text-loss"
                  )}>
                    {priceData ? formatPercent(change) : '--'}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gradient-to-b from-card/50 to-background">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                className="text-center p-6 rounded-2xl bg-secondary/30 border border-border/50"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <stat.icon className="h-8 w-8 mx-auto mb-3 text-primary" />
                <p className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  {stat.value}
                </p>
                <p className="text-muted-foreground text-sm mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container py-20">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Badge className="mb-4 px-4 py-2">Why Choose Us</Badge>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Everything You Need to
            <span className="text-primary"> Trade & Win</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            We provide the most advanced trading platform with features designed for maximum profits
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <Card className="h-full border-border/50 bg-card/50 hover:bg-card transition-all hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 group">
                <CardContent className="p-6">
                  <div className={cn(
                    "p-3 rounded-xl w-fit mb-4 bg-gradient-to-br transition-transform group-hover:scale-110",
                    feature.gradient
                  )}>
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gradient-to-b from-background to-card/50">
        <div className="container">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge className="mb-4 px-4 py-2">Simple Process</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Start Trading in
              <span className="text-primary"> 3 Easy Steps</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Create Account', desc: 'Sign up in seconds with just your email', icon: Users },
              { step: '02', title: 'Deposit Funds', desc: 'Add money instantly via UPI & get bonus', icon: Wallet },
              { step: '03', title: 'Start Trading', desc: 'Predict price, wait 30s, and win big!', icon: TrendingUp },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                className="relative text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.2 }}
                viewport={{ once: true }}
              >
                <div className="relative inline-block mb-6">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center shadow-xl shadow-primary/25">
                    <item.icon className="h-10 w-10 text-primary-foreground" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-8 h-8 bg-profit text-profit-foreground rounded-full flex items-center justify-center text-sm font-bold">
                    {item.step}
                  </span>
                </div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="container">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge className="mb-4 px-4 py-2">Testimonials</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Loved by <span className="text-primary">Thousands</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="h-full border-border/50 bg-card/50">
                  <CardContent className="p-6">
                    <div className="flex mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-5 w-5 text-warning fill-warning" />
                      ))}
                    </div>
                    <p className="text-muted-foreground mb-4">"{testimonial.text}"</p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-primary-foreground font-bold">
                        {testimonial.name[0]}
                      </div>
                      <div>
                        <p className="font-semibold">{testimonial.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-profit" />
                          Verified Trader
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Card className="bg-gradient-to-br from-primary/20 via-purple-500/10 to-pink-500/10 border-primary/30 overflow-hidden relative">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
            <CardContent className="relative p-8 md:p-16">
              <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="text-center md:text-left">
                  <Badge className="mb-4 bg-profit/20 text-profit border-profit/30">
                    <Gift className="h-4 w-4 mr-2" />
                    Limited Time Offer
                  </Badge>
                  <h3 className="text-3xl md:text-4xl font-bold mb-3">
                    Get <span className="text-profit">₹500 FREE</span> on Sign Up!
                  </h3>
                  <p className="text-muted-foreground text-lg max-w-lg">
                    Create your account now and receive instant bonus credits. Start trading risk-free!
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  <Button 
                    size="lg" 
                    className="h-14 px-10 text-lg bg-gradient-to-r from-profit to-profit/80 hover:from-profit/90 hover:to-profit/70 shadow-xl shadow-profit/25" 
                    onClick={() => navigate('/auth')}
                  >
                    Claim Bonus Now
                    <ChevronRight className="ml-2 h-5 w-5" />
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    No credit card required • Instant access
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 bg-card/50">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-primary/50">
                <TrendingUp className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg">CryptoTrade</span>
            </div>
            <p className="text-sm text-muted-foreground text-center max-w-lg">
              ⚠️ Trading cryptocurrencies involves significant risk. Only trade with funds you can afford to lose.
            </p>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/help')}>
                Help
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/auth')}>
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}