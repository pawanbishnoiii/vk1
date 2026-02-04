import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { formatINR } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { Trophy, XCircle, X, SkipForward } from 'lucide-react';

interface TradeResultModalProps {
  isOpen: boolean;
  result: 'won' | 'lost' | null;
  amount: number;
  profitLoss: number;
  onClose: () => void;
  displayTime?: number; // seconds to display before auto-close
}

export default function TradeResultModal({
  isOpen,
  result,
  amount,
  profitLoss,
  onClose,
  displayTime = 10,
}: TradeResultModalProps) {
  const [timeLeft, setTimeLeft] = useState(displayTime);

  useEffect(() => {
    if (!isOpen || !result) {
      setTimeLeft(displayTime);
      return;
    }

    setTimeLeft(displayTime);
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, result, displayTime, onClose]);

  if (!isOpen || !result) return null;

  const isWon = result === 'won';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-md p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.5, opacity: 0, y: 50 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className={cn(
            "relative w-full max-w-sm p-8 rounded-3xl text-center shadow-2xl border-2",
            isWon 
              ? "bg-gradient-to-br from-profit/20 via-profit/10 to-background border-profit/50 shadow-profit/20" 
              : "bg-gradient-to-br from-loss/20 via-loss/10 to-background border-loss/50 shadow-loss/20"
          )}
        >
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-3 right-3"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>

          {/* Timer badge */}
          <div className="absolute top-3 left-3">
            <div className={cn(
              "px-3 py-1 rounded-full text-xs font-mono font-semibold",
              isWon ? "bg-profit/20 text-profit" : "bg-loss/20 text-loss"
            )}>
              {timeLeft}s
            </div>
          </div>

          {/* Result icon with animation */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className={cn(
              "w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center",
              isWon 
                ? "bg-gradient-to-br from-profit to-profit/50 shadow-lg shadow-profit/30" 
                : "bg-gradient-to-br from-loss to-loss/50 shadow-lg shadow-loss/30"
            )}
          >
            {isWon ? (
              <Trophy className="w-12 h-12 text-profit-foreground" />
            ) : (
              <XCircle className="w-12 h-12 text-loss-foreground" />
            )}
          </motion.div>

          {/* Result text */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className={cn(
              "text-4xl font-bold mb-2",
              isWon ? "text-profit" : "text-loss"
            )}>
              {isWon ? '🎉 You Won!' : '📉 You Lost'}
            </h2>
            
            <motion.p
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4, type: 'spring' }}
              className={cn(
                "text-5xl font-bold font-mono mb-4",
                isWon ? "text-profit" : "text-loss"
              )}
            >
              {isWon ? '+' : '-'}₹{Math.abs(profitLoss).toLocaleString('en-IN')}
            </motion.p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="space-y-4"
          >
            <div className="text-sm text-muted-foreground">
              Trade Amount: <span className="font-mono font-semibold text-foreground">₹{amount.toLocaleString('en-IN')}</span>
            </div>

            {/* Skip button */}
            <Button
              variant="outline"
              className="w-full"
              onClick={onClose}
            >
              <SkipForward className="h-4 w-4 mr-2" />
              Continue Trading
            </Button>
          </motion.div>

          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted/30 rounded-b-3xl overflow-hidden">
            <motion.div
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: displayTime, ease: 'linear' }}
              className={cn(
                "h-full",
                isWon ? "bg-profit" : "bg-loss"
              )}
            />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
