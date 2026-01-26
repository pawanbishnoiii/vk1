import { motion } from 'framer-motion';
import { Gift, Sparkles, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OfferBannerProps {
  title: string;
  description?: string | null;
  bonusPercentage: number;
  minAmount: number;
  className?: string;
}

export default function OfferBanner({
  title,
  description,
  bonusPercentage,
  minAmount,
  className,
}: OfferBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative overflow-hidden rounded-xl p-4 bg-gradient-to-r from-primary/20 via-primary/10 to-accent/20 border border-primary/30",
        className
      )}
    >
      {/* Animated sparkles */}
      <div className="absolute top-2 right-2">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        >
          <Sparkles className="h-5 w-5 text-primary/60" />
        </motion.div>
      </div>
      
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/20">
          <Gift className="h-5 w-5 text-primary" />
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-primary">{title}</h3>
            <span className="px-2 py-0.5 rounded-full bg-primary/20 text-xs font-bold text-primary">
              +{bonusPercentage}%
            </span>
          </div>
          
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
          
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <span>Min deposit: ₹{minAmount.toLocaleString('en-IN')}</span>
            <ArrowRight className="h-3 w-3" />
            <span className="text-primary font-medium">
              Get ₹{Math.round(minAmount * bonusPercentage / 100).toLocaleString('en-IN')} bonus
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
