import Lottie from 'lottie-react';
import { cn } from '@/lib/utils';

// Pre-defined animations as JSON data (inline for reliability)
const celebrationAnimation = {
  v: "5.7.4",
  fr: 30,
  ip: 0,
  op: 60,
  w: 200,
  h: 200,
  nm: "celebration",
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: "confetti",
      sr: 1,
      ks: {
        o: { a: 1, k: [{ t: 0, s: [100] }, { t: 60, s: [0] }] },
        r: { a: 1, k: [{ t: 0, s: [0] }, { t: 60, s: [360] }] },
        p: { a: 1, k: [{ t: 0, s: [100, 20, 0] }, { t: 60, s: [100, 180, 0] }] },
        s: { a: 0, k: [100, 100, 100] }
      },
      shapes: [
        {
          ty: "rc",
          d: 1,
          s: { a: 0, k: [10, 10] },
          p: { a: 0, k: [0, 0] },
          r: { a: 0, k: 2 }
        },
        {
          ty: "fl",
          c: { a: 0, k: [0.133, 0.773, 0.369, 1] }
        }
      ]
    }
  ]
};

const loadingAnimation = {
  v: "5.7.4",
  fr: 30,
  ip: 0,
  op: 60,
  w: 100,
  h: 100,
  nm: "loading",
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: "circle",
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 1, k: [{ t: 0, s: [0] }, { t: 60, s: [360] }] },
        p: { a: 0, k: [50, 50, 0] },
        s: { a: 0, k: [100, 100, 100] }
      },
      shapes: [
        {
          ty: "el",
          d: 1,
          s: { a: 0, k: [40, 40] },
          p: { a: 0, k: [0, 0] }
        },
        {
          ty: "st",
          c: { a: 0, k: [0.133, 0.773, 0.369, 1] },
          w: { a: 0, k: 4 },
          lc: 2,
          d: [{ n: "d", v: { a: 0, k: 15 } }]
        }
      ]
    }
  ]
};

interface LottieAnimationProps {
  type: 'celebration' | 'loading' | 'success' | 'money';
  loop?: boolean;
  autoplay?: boolean;
  className?: string;
  size?: number;
}

export function LottieAnimation({ 
  type, 
  loop = true, 
  autoplay = true, 
  className,
  size = 100 
}: LottieAnimationProps) {
  const animations: Record<string, any> = {
    celebration: celebrationAnimation,
    loading: loadingAnimation,
    success: celebrationAnimation,
    money: celebrationAnimation,
  };

  return (
    <div className={cn('flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <Lottie
        animationData={animations[type]}
        loop={loop}
        autoplay={autoplay}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}

// Confetti effect component
export function Confetti({ active }: { active: boolean }) {
  if (!active) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {Array.from({ length: 50 }).map((_, i) => (
        <div
          key={i}
          className="absolute animate-confetti"
          style={{
            left: `${Math.random() * 100}%`,
            top: '-20px',
            width: '10px',
            height: '10px',
            backgroundColor: ['#22c55e', '#eab308', '#3b82f6', '#ef4444', '#a855f7'][Math.floor(Math.random() * 5)],
            borderRadius: Math.random() > 0.5 ? '50%' : '0',
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${3 + Math.random() * 2}s`,
          }}
        />
      ))}
    </div>
  );
}
