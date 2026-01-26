import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatTimer } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { Clock, TrendingUp, TrendingDown, Trophy, XCircle } from 'lucide-react';

interface TradeTimerProps {
  duration: number;
  tradeType: 'buy' | 'sell';
  amount: number;
  onComplete: () => void;
  result?: 'won' | 'lost' | null;
  profitLoss?: number;
  isActive: boolean;
}

export default function TradeTimer({
  duration,
  tradeType,
  amount,
  onComplete,
  result,
  profitLoss,
  isActive,
}: TradeTimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!isActive || result) return;

    setTimeLeft(duration);
    setProgress(100);

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [duration, isActive, result, onComplete]);

  useEffect(() => {
    if (duration > 0) {
      setProgress((timeLeft / duration) * 100);
    }
  }, [timeLeft, duration]);

  if (!isActive && !result) return null;

  return (
    <AnimatePresence mode="wait">
      {result ? (
        <motion.div
          key="result"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          className={cn(
            "fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm"
          )}
        >
          <motion.div
            initial={{ y: 20 }}
            animate={{ y: 0 }}
            className={cn(
              "relative p-8 rounded-2xl text-center",
              result === 'won' 
                ? "bg-gradient-to-br from-profit/20 to-profit/5 border-2 border-profit/50" 
                : "bg-gradient-to-br from-loss/20 to-loss/5 border-2 border-loss/50"
            )}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className={cn(
                "w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center",
                result === 'won' ? "bg-profit/20" : "bg-loss/20"
              )}
            >
              {result === 'won' ? (
                <Trophy className="w-10 h-10 text-profit" />
              ) : (
                <XCircle className="w-10 h-10 text-loss" />
              )}
            </motion.div>
            
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className={cn(
                "text-3xl font-bold mb-2",
                result === 'won' ? "text-profit" : "text-loss"
              )}
            >
              {result === 'won' ? '🎉 You Won!' : '📉 You Lost'}
            </motion.h2>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className={cn(
                "text-4xl font-bold font-mono",
                result === 'won' ? "text-profit" : "text-loss"
              )}
            >
              {result === 'won' ? '+' : ''}₹{Math.abs(profitLoss || 0).toLocaleString('en-IN')}
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-4 text-sm text-muted-foreground"
            >
              Trade Amount: ₹{amount.toLocaleString('en-IN')}
            </motion.div>
          </motion.div>
        </motion.div>
      ) : (
        <motion.div
          key="timer"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-20 md:bottom-4 left-4 right-4 z-40 mx-auto max-w-md"
        >
          <div className={cn(
            "p-4 rounded-2xl border-2 backdrop-blur-lg",
            tradeType === 'buy' 
              ? "bg-profit/10 border-profit/50" 
              : "bg-loss/10 border-loss/50"
          )}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {tradeType === 'buy' ? (
                  <TrendingUp className="h-5 w-5 text-profit" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-loss" />
                )}
                <span className="font-semibold">
                  {tradeType === 'buy' ? 'Buy' : 'Sell'} Order Active
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className={cn(
                  "font-mono text-xl font-bold",
                  timeLeft <= 5 ? "text-loss animate-pulse" : ""
                )}>
                  {formatTimer(timeLeft)}
                </span>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <motion.div
                className={cn(
                  "h-full rounded-full",
                  tradeType === 'buy' ? "bg-profit" : "bg-loss"
                )}
                initial={{ width: '100%' }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            
            <div className="mt-2 text-sm text-center text-muted-foreground">
              Amount: <span className="font-mono font-semibold">₹{amount.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
