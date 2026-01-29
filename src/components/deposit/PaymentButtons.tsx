import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Copy } from 'lucide-react';

interface PaymentButtonsProps {
  upiId: string;
  amount?: number;
}

export default function PaymentButtons({ upiId, amount }: PaymentButtonsProps) {
  const { toast } = useToast();

  const copyUpiId = () => {
    navigator.clipboard.writeText(upiId);
    toast({
      title: 'UPI ID Copied!',
      description: upiId,
    });
  };

  const generateUpiLink = (app: 'gpay' | 'phonepe' | 'paytm') => {
    const baseUrls = {
      gpay: 'tez://upi/pay',
      phonepe: 'phonepe://pay',
      paytm: 'paytmmp://pay',
    };
    
    const params = new URLSearchParams({
      pa: upiId,
      pn: 'CryptoTrade',
      cu: 'INR',
      ...(amount ? { am: amount.toString() } : {}),
    });
    
    return `${baseUrls[app]}?${params.toString()}`;
  };

  const openPaymentApp = (app: 'gpay' | 'phonepe' | 'paytm') => {
    const link = generateUpiLink(app);
    window.location.href = link;
  };

  return (
    <div className="space-y-4">
      {/* UPI ID Display with Copy */}
      <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50 border border-border">
        <div className="flex-1 font-mono text-sm truncate">{upiId}</div>
        <Button variant="ghost" size="icon" onClick={copyUpiId}>
          <Copy className="h-4 w-4" />
        </Button>
      </div>

      {/* Payment App Buttons with HD SVG Icons */}
      <div className="grid grid-cols-3 gap-3">
        {/* Google Pay */}
        <Button
          variant="outline"
          className="flex flex-col items-center gap-2 h-auto py-4 hover:bg-[#4285F4]/10 hover:border-[#4285F4]/50 transition-all"
          onClick={() => openPaymentApp('gpay')}
        >
          <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm">
            <svg viewBox="0 0 48 48" className="w-8 h-8">
              <path fill="#4285F4" d="M23.54 24.5v7.27h-3.5V16.5h9.27c2.23 0 4.13.74 5.67 2.22a7.18 7.18 0 0 1 2.31 5.33c0 2.13-.77 3.96-2.31 5.5-1.5 1.5-3.4 2.25-5.67 2.25h-5.77v-7.3h5.77c1.09 0 2-.36 2.73-1.09a3.58 3.58 0 0 0 1.09-2.64c0-1.05-.36-1.91-1.09-2.59-.73-.68-1.64-1.02-2.73-1.02h-5.77V24.5z"/>
              <path fill="#34A853" d="M23.54 24.5h5.77v7.27h-5.77z"/>
              <path fill="#FBBC05" d="M14.27 31.77V16.5h3.5v15.27z"/>
              <path fill="#EA4335" d="M14.27 16.5h9.27v3.45h-9.27z"/>
            </svg>
          </div>
          <span className="text-xs font-medium">Google Pay</span>
        </Button>

        {/* PhonePe */}
        <Button
          variant="outline"
          className="flex flex-col items-center gap-2 h-auto py-4 hover:bg-[#5F259F]/10 hover:border-[#5F259F]/50 transition-all"
          onClick={() => openPaymentApp('phonepe')}
        >
          <div className="w-12 h-12 rounded-full bg-[#5F259F] flex items-center justify-center shadow-sm">
            <svg viewBox="0 0 24 24" className="w-7 h-7" fill="white">
              <path d="M5.5 3A2.5 2.5 0 0 0 3 5.5v13A2.5 2.5 0 0 0 5.5 21h13a2.5 2.5 0 0 0 2.5-2.5v-13A2.5 2.5 0 0 0 18.5 3h-13zm7.188 3.5h2.562c1.105 0 2 .895 2 2v1.75l-4.375 5.25h4.375V17h-4.563c-1.104 0-2-.895-2-2v-1.75l4.376-5.25h-2.375V6.5z"/>
            </svg>
          </div>
          <span className="text-xs font-medium">PhonePe</span>
        </Button>

        {/* Paytm */}
        <Button
          variant="outline"
          className="flex flex-col items-center gap-2 h-auto py-4 hover:bg-[#00BAF2]/10 hover:border-[#00BAF2]/50 transition-all"
          onClick={() => openPaymentApp('paytm')}
        >
          <div className="w-12 h-12 rounded-full bg-[#00BAF2] flex items-center justify-center shadow-sm">
            <svg viewBox="0 0 24 24" className="w-7 h-7" fill="white">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2.5 14.5h-2v-9h2v9zm7 0h-2v-5.5c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v5.5h-2v-5.5c0-1.93 1.57-3.5 3.5-3.5s3.5 1.57 3.5 3.5v5.5z"/>
            </svg>
          </div>
          <span className="text-xs font-medium">Paytm</span>
        </Button>
      </div>

      <p className="text-xs text-center text-muted-foreground">
        Tap to open payment app • Amount will be pre-filled
      </p>
    </div>
  );
}
