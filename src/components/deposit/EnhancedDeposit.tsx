import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { useSettings } from '@/hooks/useSettings';
import { useOffers } from '@/hooks/useOffers';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { formatINR } from '@/lib/formatters';
import { SOUNDS, soundManager } from '@/lib/sounds';
import { Confetti } from '@/components/ui/lottie-animation';
import { 
  Copy, 
  Loader2, 
  Gift, 
  Sparkles,
  Smartphone,
  ChevronRight,
  CheckCircle,
  Wallet
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function EnhancedDeposit() {
  const { user } = useAuth();
  const { refetch: refetchWallet } = useWallet();
  const { settings } = useSettings();
  const { getFirstDepositOffer, calculateBonus } = useOffers();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [amount, setAmount] = useState('');
  const [txHash, setTxHash] = useState('');
  const [step, setStep] = useState<'amount' | 'payment' | 'confirm'>('amount');
  const [showSuccess, setShowSuccess] = useState(false);

  const firstDepositOffer = getFirstDepositOffer();
  const amountNum = parseFloat(amount) || 0;
  const minDeposit = settings?.min_deposit || 100;
  const maxDeposit = settings?.max_deposit || 100000;
  const upiId = settings?.upi_id || 'merchant@paytm';

  const bonusAmount = firstDepositOffer && amountNum >= firstDepositOffer.min_amount 
    ? calculateBonus(amountNum, firstDepositOffer)
    : 0;

  const paymentApps = [
    { name: 'GPay', color: '#4285F4', icon: '💳' },
    { name: 'PhonePe', color: '#5F259F', icon: '📱' },
    { name: 'Paytm', color: '#00BAF2', icon: '💰' },
  ];

  const createDeposit = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('deposit_requests')
        .insert({
          user_id: user!.id,
          amount: amountNum,
          transaction_hash: txHash || undefined,
          crypto_network: 'UPI',
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      soundManager.play(SOUNDS.success);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setStep('amount');
        setAmount('');
        setTxHash('');
      }, 3000);
      queryClient.invalidateQueries({ queryKey: ['deposits'] });
      refetchWallet();
    },
    onError: (err: any) => {
      toast({
        title: 'Failed to submit deposit',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    soundManager.play(SOUNDS.click);
    toast({ title: 'Copied to clipboard!' });
  };

  const openPaymentApp = (app: string) => {
    const upiLink = `upi://pay?pa=${upiId}&pn=CryptoTrade&am=${amountNum}&cu=INR`;
    window.open(upiLink, '_blank');
    setStep('confirm');
  };

  const quickAmounts = [500, 1000, 2000, 5000, 10000];

  return (
    <>
      <Confetti active={showSuccess} />
      
      <div className="space-y-4">
        {/* First Deposit Bonus Banner */}
        {firstDepositOffer && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-xl p-4 bg-gradient-to-r from-primary/20 via-primary/10 to-accent/20 border border-primary/30"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl" />
            <div className="relative flex items-center gap-3">
              <div className="p-3 rounded-full bg-primary/20 animate-pulse">
                <Gift className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-yellow-500" />
                  {firstDepositOffer.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {firstDepositOffer.bonus_percentage}% bonus up to {formatINR(firstDepositOffer.max_amount || 10000)}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        <Card className="border-border/50 overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Deposit Funds
            </CardTitle>
            <CardDescription>
              Add money to your trading wallet via UPI
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <AnimatePresence mode="wait">
              {step === 'amount' && (
                <motion.div
                  key="amount"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-4"
                >
                  {/* Amount Input */}
                  <div className="space-y-2">
                    <Label>Enter Amount (INR)</Label>
                    <Input
                      type="number"
                      placeholder={`Min ${formatINR(minDeposit)}`}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="font-mono text-xl h-14 text-center"
                    />
                  </div>

                  {/* Quick Amount Buttons */}
                  <div className="grid grid-cols-5 gap-2">
                    {quickAmounts.map((amt) => (
                      <Button
                        key={amt}
                        variant={amountNum === amt ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setAmount(String(amt));
                          soundManager.play(SOUNDS.click);
                        }}
                      >
                        ₹{amt >= 1000 ? `${amt/1000}K` : amt}
                      </Button>
                    ))}
                  </div>

                  {/* Bonus Preview */}
                  {bonusAmount > 0 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-4 rounded-lg bg-profit/10 border border-profit/30"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Deposit Amount:</span>
                        <span className="font-mono">{formatINR(amountNum)}</span>
                      </div>
                      <div className="flex items-center justify-between text-profit">
                        <span className="text-sm flex items-center gap-1">
                          <Gift className="h-4 w-4" />
                          Bonus:
                        </span>
                        <span className="font-mono font-bold">+{formatINR(bonusAmount)}</span>
                      </div>
                      <div className="border-t border-border/50 mt-2 pt-2">
                        <div className="flex items-center justify-between font-bold">
                          <span>Total Credit:</span>
                          <span className="font-mono text-primary">{formatINR(amountNum + bonusAmount)}</span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <Button
                    className="w-full h-12"
                    disabled={amountNum < minDeposit || amountNum > maxDeposit}
                    onClick={() => setStep('payment')}
                  >
                    Continue to Payment
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </motion.div>
              )}

              {step === 'payment' && (
                <motion.div
                  key="payment"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  {/* Amount Summary */}
                  <div className="text-center p-4 rounded-lg bg-secondary/50">
                    <p className="text-sm text-muted-foreground">Amount to Pay</p>
                    <p className="text-3xl font-bold font-mono text-primary">{formatINR(amountNum)}</p>
                  </div>

                  {/* UPI ID */}
                  <div className="space-y-2">
                    <Label>Pay to UPI ID</Label>
                    <div className="flex items-center gap-2">
                      <Input value={upiId} readOnly className="font-mono" />
                      <Button variant="outline" size="icon" onClick={() => copyToClipboard(upiId)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Payment App Buttons */}
                  <div className="space-y-2">
                    <Label>Pay via App</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {paymentApps.map((app) => (
                        <motion.button
                          key={app.name}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => openPaymentApp(app.name)}
                          className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-border hover:border-primary transition-all"
                          style={{ background: `${app.color}15` }}
                        >
                          <div 
                            className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                            style={{ background: app.color }}
                          >
                            {app.icon}
                          </div>
                          <span className="font-medium text-sm">{app.name}</span>
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep('amount')} className="flex-1">
                      Back
                    </Button>
                    <Button onClick={() => setStep('confirm')} className="flex-1">
                      I've Paid
                    </Button>
                  </div>
                </motion.div>
              )}

              {step === 'confirm' && (
                <motion.div
                  key="confirm"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div className="text-center p-4 rounded-lg bg-primary/10">
                    <Smartphone className="h-12 w-12 mx-auto mb-2 text-primary" />
                    <p className="text-lg font-semibold">Confirm Your Payment</p>
                    <p className="text-sm text-muted-foreground">Enter the transaction reference (optional)</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Transaction Reference / UTR (Optional)</Label>
                    <Input
                      placeholder="Enter UTR or Transaction ID"
                      value={txHash}
                      onChange={(e) => setTxHash(e.target.value)}
                    />
                  </div>

                  <Button
                    className="w-full h-12"
                    onClick={() => createDeposit.mutate()}
                    disabled={createDeposit.isPending}
                  >
                    {createDeposit.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Submit Deposit Request
                      </>
                    )}
                  </Button>

                  <Button variant="outline" onClick={() => setStep('payment')} className="w-full">
                    Back
                  </Button>
                </motion.div>
              )}

              {showSuccess && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-8"
                >
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                    className="w-20 h-20 rounded-full bg-profit/20 flex items-center justify-center mx-auto mb-4"
                  >
                    <CheckCircle className="h-10 w-10 text-profit" />
                  </motion.div>
                  <h3 className="text-xl font-bold">Deposit Submitted!</h3>
                  <p className="text-muted-foreground">Your deposit will be reviewed shortly</p>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
