import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Copy, ExternalLink } from 'lucide-react';

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

      {/* Payment App Buttons */}
      <div className="grid grid-cols-3 gap-3">
        <Button
          variant="outline"
          className="flex flex-col items-center gap-2 h-auto py-4 hover:bg-[#4285F4]/10 hover:border-[#4285F4]/50"
          onClick={() => openPaymentApp('gpay')}
        >
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-6 h-6">
              <path fill="#4285F4" d="M12 24c6.627 0 12-5.373 12-12S18.627 0 12 0 0 5.373 0 12s5.373 12 12 12z"/>
              <path fill="#fff" d="M12 5.5c1.624 0 2.919.554 3.938 1.447l2.942-2.942C17.068 2.299 14.751 1.5 12 1.5 7.893 1.5 4.348 3.945 2.709 7.43l3.42 2.655C7.044 7.547 9.325 5.5 12 5.5z"/>
              <path fill="#34A853" d="M22.5 12c0-.918-.082-1.8-.234-2.652H12v5.017h5.895c-.255 1.374-1.031 2.538-2.198 3.319l3.404 2.643c1.984-1.832 3.399-4.533 3.399-8.327z"/>
              <path fill="#FBBC05" d="M6.129 14.249A6.477 6.477 0 0 1 5.5 12c0-.787.135-1.544.377-2.249L2.458 7.096A10.497 10.497 0 0 0 1.5 12c0 1.688.407 3.281 1.124 4.689l3.505-2.44z"/>
              <path fill="#EA4335" d="M12 22.5c2.751 0 5.056-.911 6.739-2.47l-3.404-2.643c-.925.62-2.108.988-3.335.988-2.675 0-4.956-2.047-5.871-4.585l-3.42 2.655C4.348 20.055 7.893 22.5 12 22.5z"/>
            </svg>
          </div>
          <span className="text-xs font-medium">GPay</span>
        </Button>

        <Button
          variant="outline"
          className="flex flex-col items-center gap-2 h-auto py-4 hover:bg-[#5F259F]/10 hover:border-[#5F259F]/50"
          onClick={() => openPaymentApp('phonepe')}
        >
          <div className="w-10 h-10 rounded-full bg-[#5F259F] flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="white">
              <path d="M7.5 3h9c2.5 0 4.5 2 4.5 4.5v9c0 2.5-2 4.5-4.5 4.5h-9C5 21 3 19 3 16.5v-9C3 5 5 3 7.5 3zm5.25 4.5L9 12l3.75 4.5V14h3v-4h-3V7.5z"/>
            </svg>
          </div>
          <span className="text-xs font-medium">PhonePe</span>
        </Button>

        <Button
          variant="outline"
          className="flex flex-col items-center gap-2 h-auto py-4 hover:bg-[#00BAF2]/10 hover:border-[#00BAF2]/50"
          onClick={() => openPaymentApp('paytm')}
        >
          <div className="w-10 h-10 rounded-full bg-[#00BAF2] flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="white">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-6h2v6zm4 0h-2V7h2v10z"/>
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
