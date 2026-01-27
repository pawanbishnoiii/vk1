import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { useLenis } from '@/hooks/useLenis';
import { Button } from '@/components/ui/button';
import { formatINR } from '@/lib/formatters';
import { 
  Home, 
  LineChart, 
  Wallet, 
  History, 
  Settings, 
  LogOut,
  Menu,
  X,
  TrendingUp,
  User,
  HelpCircle
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: Home },
  { label: 'Trade', path: '/trade', icon: LineChart },
  { label: 'Wallet', path: '/wallet', icon: Wallet },
  { label: 'History', path: '/history', icon: History },
  { label: 'Help', path: '/help', icon: HelpCircle },
];

interface UserLayoutProps {
  children: React.ReactNode;
}

export default function UserLayout({ children }: UserLayoutProps) {
  const { user, signOut, isAdmin } = useAuth();
  const { balance } = useWallet();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Enable smooth scrolling
  useLenis();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <span className="font-bold text-lg hidden sm:inline">CryptoTrade</span>
          </Link>

          {/* Balance Display - Desktop */}
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary">
              <Wallet className="h-4 w-4 text-primary" />
              <span className="font-mono font-semibold text-primary">
                {formatINR(balance)}
              </span>
            </div>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-2">
            {/* Admin Link */}
            {isAdmin && (
              <Button variant="outline" size="sm" asChild className="hidden sm:flex">
                <Link to="/admin">Admin Panel</Link>
              </Button>
            )}

            {/* User Menu */}
            <div className="hidden md:flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary">
                <User className="h-4 w-4" />
                <span className="text-sm truncate max-w-[120px]">{user?.email}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-background animate-fade-in">
            <div className="container py-4 space-y-4">
              {/* Balance */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                <span className="text-sm text-muted-foreground">Balance</span>
                <span className="font-mono font-semibold text-primary">
                  {formatINR(balance)}
                </span>
              </div>

              {/* Nav Items */}
              <nav className="space-y-1">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                      location.pathname === item.path
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-secondary'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Link>
                ))}
                
                {isAdmin && (
                  <Link
                    to="/admin"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-secondary"
                  >
                    <Settings className="h-5 w-5" />
                    <span>Admin Panel</span>
                  </Link>
                )}
              </nav>

              {/* User Info & Logout */}
              <div className="pt-4 border-t border-border space-y-2">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary">
                  <User className="h-4 w-4" />
                  <span className="text-sm truncate">{user?.email}</span>
                </div>
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="container py-4 pb-20 md:pb-6">
        {children}
      </main>

      {/* Bottom Navigation - Mobile Only */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors',
                location.pathname === item.path
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
