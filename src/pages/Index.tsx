import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePrices } from '@/hooks/usePrices';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency, formatPercent, TRADING_PAIRS } from '@/lib/constants';
import { 
  TrendingUp, 
  Shield, 
  Zap, 
  BarChart3,
  ArrowRight,
  ChevronRight
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
    },
    {
      icon: BarChart3,
      title: 'Live Charts',
      description: 'Professional TradingView charts with multiple timeframes',
    },
    {
      icon: Shield,
      title: 'Secure Trading',
      description: 'Your funds are protected with industry-standard security',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
        
        <nav className="relative z-10 container flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <span className="text-xl font-bold">CryptoTrade</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate('/auth')}>
              Sign In
            </Button>
            <Button onClick={() => navigate('/auth')}>
              Get Started
            </Button>
          </div>
        </nav>

        <div className="relative z-10 container py-20 md:py-32">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Trade Crypto with
              <span className="text-primary"> Confidence</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Professional trading platform with real-time charts, instant execution, and secure wallet management. Start trading top cryptocurrencies today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="text-lg h-12 px-8" onClick={() => navigate('/auth')}>
                Start Trading <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" className="text-lg h-12 px-8" onClick={() => navigate('/auth')}>
                View Markets
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Live Prices Ticker */}
      <section className="border-y border-border bg-card/50">
        <div className="container py-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="h-2 w-2 rounded-full bg-profit pulse-live" />
            <span className="text-sm font-medium text-muted-foreground">Live Prices</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {TRADING_PAIRS.map((pair) => {
              const priceData = prices[pair.symbol];
              const change = priceData?.change24h || 0;
              const isPositive = change >= 0;

              return (
                <div 
                  key={pair.symbol} 
                  className="p-4 rounded-lg bg-secondary/50 hover:bg-secondary/80 transition-colors cursor-pointer"
                  onClick={() => navigate('/auth')}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{pair.icon}</span>
                    <span className="font-semibold">{pair.base}</span>
                  </div>
                  <p className="font-mono font-semibold">
                    {priceData ? formatCurrency(priceData.price, pair.decimals) : '--'}
                  </p>
                  <p className={cn(
                    "text-sm font-mono",
                    isPositive ? "text-profit" : "text-loss"
                  )}>
                    {priceData ? formatPercent(change) : '--'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Why Trade With Us?
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            We provide everything you need to trade cryptocurrencies like a pro
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="border-border/50 bg-card/50 hover:bg-card transition-colors">
              <CardContent className="p-6">
                <div className="p-3 rounded-lg bg-primary/10 w-fit mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container pb-20">
        <Card className="gradient-card border-border/50 overflow-hidden">
          <CardContent className="p-8 md:p-12">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h3 className="text-2xl md:text-3xl font-bold mb-2">
                  Ready to Start Trading?
                </h3>
                <p className="text-muted-foreground">
                  Create your account in seconds and start trading today
                </p>
              </div>
              <Button size="lg" className="h-12 px-8 whitespace-nowrap" onClick={() => navigate('/auth')}>
                Create Account <ChevronRight className="ml-1 h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <span className="font-semibold">CryptoTrade</span>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              ⚠️ Trading cryptocurrencies involves significant risk. Only trade with funds you can afford to lose.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
