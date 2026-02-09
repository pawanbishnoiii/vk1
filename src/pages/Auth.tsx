import { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { lovable } from '@/integrations/lovable/index';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { TrendingUp, Eye, EyeOff, Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

const signInSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signUpSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().min(2, 'Name is required'),
  mobileNumber: z.string().min(10, 'Enter a valid mobile number'),
  gender: z.string().min(1, 'Select gender'),
  age: z.number().min(18, 'Must be 18+').max(100),
});

export default function Auth() {
  const { user, isLoading: authLoading, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '', password: '', fullName: '', mobileNumber: '', gender: '', age: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch auth settings from platform_settings
  const { data: authSettings } = useQuery({
    queryKey: ['auth-settings'],
    queryFn: async () => {
      const { data } = await supabase
        .from('platform_settings')
        .select('key, value')
        .in('key', ['google_auth_enabled', 'apple_auth_enabled']);
      const map: Record<string, any> = {};
      data?.forEach(d => { map[d.key] = typeof d.value === 'string' ? JSON.parse(d.value) : d.value; });
      return map;
    },
  });

  const googleEnabled = authSettings?.google_auth_enabled !== false; // default true
  const appleEnabled = authSettings?.apple_auth_enabled !== false;

  if (user && !authLoading) {
    return <Navigate to="/dashboard" replace />;
  }

  const validateSignIn = () => {
    try {
      signInSchema.parse({ email: formData.email, password: formData.password });
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        err.errors.forEach((e) => { if (e.path[0]) newErrors[e.path[0].toString()] = e.message; });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const validateSignUp = () => {
    try {
      signUpSchema.parse({
        email: formData.email, password: formData.password, fullName: formData.fullName,
        mobileNumber: formData.mobileNumber, gender: formData.gender, age: parseInt(formData.age) || 0,
      });
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        err.errors.forEach((e) => { if (e.path[0]) newErrors[e.path[0].toString()] = e.message; });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateSignIn()) return;
    setIsLoading(true);
    const { error } = await signIn(formData.email, formData.password);
    if (error) {
      toast({ title: 'Sign in failed', description: error.message === 'Invalid login credentials' ? 'Invalid email or password.' : error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Welcome back!', description: 'Signed in successfully.' });
      navigate('/dashboard');
    }
    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateSignUp()) return;
    setIsLoading(true);
    const { error } = await signUp(formData.email, formData.password, formData.fullName);
    if (error) {
      toast({ title: 'Sign up failed', description: error.message.includes('already registered') ? 'This email is already registered.' : error.message, variant: 'destructive' });
    } else {
      setTimeout(async () => {
        try {
          const { data: { user: newUser } } = await supabase.auth.getUser();
          if (newUser) {
            await supabase.from('profiles').update({
              mobile_number: formData.mobileNumber, gender: formData.gender,
              age: parseInt(formData.age) || null, full_name: formData.fullName,
            }).eq('user_id', newUser.id);
          }
        } catch (err) { console.error('Profile update error:', err); }
      }, 1000);
      toast({ title: 'Account created!', description: 'Please check your email to verify your account.' });
      navigate('/dashboard');
    }
    setIsLoading(false);
  };

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    setSocialLoading(provider);
    try {
      const { error } = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      if (error) {
        toast({ title: `${provider} sign in failed`, description: error.message, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSocialLoading(null);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const SocialButtons = () => (
    <>
      {(googleEnabled || appleEnabled) && (
        <div className="space-y-3">
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><Separator /></div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {googleEnabled && (
              <Button variant="outline" className="w-full" onClick={() => handleSocialLogin('google')} disabled={!!socialLoading}>
                {socialLoading === 'google' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : (
                  <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                )}
                Google
              </Button>
            )}
            {appleEnabled && (
              <Button variant="outline" className="w-full" onClick={() => handleSocialLogin('apple')} disabled={!!socialLoading}>
                {socialLoading === 'apple' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : (
                  <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                )}
                Apple
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 gradient-hero relative overflow-hidden">
      <motion.div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl"
        animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }} transition={{ duration: 8, repeat: Infinity }} />
      <motion.div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl"
        animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2] }} transition={{ duration: 10, repeat: Infinity }} />

      <motion.div className="flex items-center gap-2 mb-8 relative z-10" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary/50 shadow-lg shadow-primary/25">
          <TrendingUp className="h-8 w-8 text-primary-foreground" />
        </div>
        <span className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">CryptoTrade</span>
      </motion.div>

      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="relative z-10 w-full max-w-md">
        <Card className="border-border/50 bg-card/80 backdrop-blur-xl shadow-2xl">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl flex items-center justify-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Welcome
            </CardTitle>
            <CardDescription>Trade crypto & win big rewards</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input id="signin-email" type="email" placeholder="you@example.com"
                      value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} disabled={isLoading} />
                    {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <div className="relative">
                      <Input id="signin-password" type={showPassword ? 'text' : 'password'} placeholder="••••••••"
                        value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} disabled={isLoading} />
                      <Button type="button" variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                        onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                  </div>
                  <div className="text-right">
                    <Link to="/forgot-password" className="text-sm text-primary hover:underline">Forgot Password?</Link>
                  </div>
                  <Button type="submit" className="w-full bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/20" disabled={isLoading}>
                    {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in...</> : 'Sign In'}
                  </Button>
                  <SocialButtons />
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input id="signup-name" placeholder="John Doe" value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} disabled={isLoading} />
                    {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input id="signup-email" type="email" placeholder="you@example.com" value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })} disabled={isLoading} />
                    {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-mobile">Mobile Number</Label>
                    <Input id="signup-mobile" type="tel" placeholder="+91 9876543210" value={formData.mobileNumber}
                      onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })} disabled={isLoading} />
                    {errors.mobileNumber && <p className="text-sm text-destructive">{errors.mobileNumber}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Gender</Label>
                      <Select value={formData.gender} onValueChange={(v) => setFormData({ ...formData, gender: v })}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.gender && <p className="text-sm text-destructive">{errors.gender}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-age">Age</Label>
                      <Input id="signup-age" type="number" placeholder="25" min={18} max={100} value={formData.age}
                        onChange={(e) => setFormData({ ...formData, age: e.target.value })} disabled={isLoading} />
                      {errors.age && <p className="text-sm text-destructive">{errors.age}</p>}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Input id="signup-password" type={showPassword ? 'text' : 'password'} placeholder="••••••••"
                        value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} disabled={isLoading} />
                      <Button type="button" variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                        onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                  </div>
                  <Button type="submit" className="w-full bg-gradient-to-r from-profit to-profit/80 shadow-lg shadow-profit/20" disabled={isLoading}>
                    {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating account...</> : 'Create Account'}
                  </Button>
                  <SocialButtons />
                </form>
              </TabsContent>
            </Tabs>

            <div className="mt-4 text-center text-xs text-muted-foreground">
              By continuing, you agree to our Terms of Service
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <p className="mt-6 text-xs text-muted-foreground text-center max-w-md relative z-10">
        ⚠️ Trading cryptocurrencies involves significant risk. Only trade with funds you can afford to lose.
      </p>
    </div>
  );
}
