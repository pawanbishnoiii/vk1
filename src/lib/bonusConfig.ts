// Bonus Types Configuration
export const BONUS_TYPES = {
  first_deposit: {
    id: 'first_deposit',
    label: '🎁 First Deposit Bonus',
    description: 'Percentage bonus on your first deposit',
    icon: 'gift',
    animation: 'bounce',
    defaultColor: 'from-emerald-500 to-green-600',
  },
  reload: {
    id: 'reload',
    label: '🔄 Reload Bonus',
    description: 'Bonus on selected deposits',
    icon: 'refresh-cw',
    animation: 'spin',
    defaultColor: 'from-blue-500 to-cyan-600',
  },
  lossback: {
    id: 'lossback',
    label: '💰 Lossback Bonus',
    description: 'Cashback on net losses',
    icon: 'undo-2',
    animation: 'pulse',
    defaultColor: 'from-amber-500 to-orange-600',
  },
  festival: {
    id: 'festival',
    label: '🎉 Festival Bonus',
    description: 'Limited-time special offer',
    icon: 'party-popper',
    animation: 'confetti',
    defaultColor: 'from-purple-500 to-pink-600',
  },
  referral: {
    id: 'referral',
    label: '👥 Referral Bonus',
    description: 'Earn when friends complete wagering',
    icon: 'users',
    animation: 'slide',
    defaultColor: 'from-indigo-500 to-violet-600',
  },
  vip_loyalty: {
    id: 'vip_loyalty',
    label: '👑 VIP Loyalty Bonus',
    description: 'Exclusive rewards for loyal traders',
    icon: 'crown',
    animation: 'glow',
    defaultColor: 'from-yellow-500 to-amber-600',
  },
} as const;

export type BonusType = keyof typeof BONUS_TYPES;

// Theme configurations
export const BONUS_THEMES = {
  default: {
    value: 'default',
    label: '🎁 Default',
    gradient: 'from-primary to-primary/80',
    bgClass: 'bg-gradient-to-br from-primary/20 to-primary/5',
    borderClass: 'border-primary/30',
    textClass: 'text-primary',
  },
  gold: {
    value: 'gold',
    label: '🏆 Gold Premium',
    gradient: 'from-yellow-500 to-amber-600',
    bgClass: 'bg-gradient-to-br from-yellow-500/20 to-amber-600/5',
    borderClass: 'border-yellow-500/30',
    textClass: 'text-yellow-500',
  },
  diamond: {
    value: 'diamond',
    label: '💎 Diamond VIP',
    gradient: 'from-cyan-400 to-blue-600',
    bgClass: 'bg-gradient-to-br from-cyan-400/20 to-blue-600/5',
    borderClass: 'border-cyan-400/30',
    textClass: 'text-cyan-400',
  },
  fire: {
    value: 'fire',
    label: '🔥 Hot Deal',
    gradient: 'from-orange-500 to-red-600',
    bgClass: 'bg-gradient-to-br from-orange-500/20 to-red-600/5',
    borderClass: 'border-orange-500/30',
    textClass: 'text-orange-500',
  },
  neon: {
    value: 'neon',
    label: '✨ Neon Glow',
    gradient: 'from-purple-500 to-pink-500',
    bgClass: 'bg-gradient-to-br from-purple-500/20 to-pink-500/5',
    borderClass: 'border-purple-500/30',
    textClass: 'text-purple-500',
  },
  emerald: {
    value: 'emerald',
    label: '💚 Emerald',
    gradient: 'from-emerald-500 to-teal-600',
    bgClass: 'bg-gradient-to-br from-emerald-500/20 to-teal-600/5',
    borderClass: 'border-emerald-500/30',
    textClass: 'text-emerald-500',
  },
} as const;

export type BonusTheme = keyof typeof BONUS_THEMES;

// Animation variants for Framer Motion
export const BONUS_ANIMATIONS = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  bounce: {
    initial: { opacity: 0, scale: 0.5, y: 20 },
    animate: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', bounce: 0.5 } },
    exit: { opacity: 0, scale: 0.5, y: -20 },
  },
  slide: {
    initial: { opacity: 0, x: -50 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 50 },
  },
  spin: {
    initial: { opacity: 0, rotate: -180 },
    animate: { opacity: 1, rotate: 0 },
    exit: { opacity: 0, rotate: 180 },
  },
  pulse: {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: [1, 1.05, 1] },
    exit: { opacity: 0, scale: 0.8 },
  },
  glow: {
    initial: { opacity: 0, boxShadow: '0 0 0px rgba(255,215,0,0)' },
    animate: { 
      opacity: 1, 
      boxShadow: ['0 0 10px rgba(255,215,0,0.3)', '0 0 20px rgba(255,215,0,0.5)', '0 0 10px rgba(255,215,0,0.3)'],
      transition: { boxShadow: { repeat: Infinity, duration: 2 } }
    },
    exit: { opacity: 0 },
  },
  confetti: {
    initial: { opacity: 0, y: -20, rotate: -10 },
    animate: { 
      opacity: 1, 
      y: 0, 
      rotate: [0, 5, -5, 0],
      transition: { rotate: { repeat: 2, duration: 0.3 } }
    },
    exit: { opacity: 0, y: 20 },
  },
} as const;

export type BonusAnimation = keyof typeof BONUS_ANIMATIONS;

// VIP Levels
export const VIP_LEVELS = [
  { level: 1, name: 'Bronze', minWager: 0, color: 'from-amber-700 to-amber-900', icon: '🥉' },
  { level: 2, name: 'Silver', minWager: 50000, color: 'from-gray-400 to-gray-600', icon: '🥈' },
  { level: 3, name: 'Gold', minWager: 200000, color: 'from-yellow-500 to-amber-600', icon: '🥇' },
  { level: 4, name: 'Platinum', minWager: 500000, color: 'from-cyan-400 to-blue-500', icon: '💎' },
  { level: 5, name: 'Diamond', minWager: 1000000, color: 'from-purple-500 to-pink-600', icon: '👑' },
] as const;

export const getVIPLevel = (totalWager: number) => {
  return VIP_LEVELS.reduce((acc, level) => {
    if (totalWager >= level.minWager) return level;
    return acc;
  }, VIP_LEVELS[0]);
};
