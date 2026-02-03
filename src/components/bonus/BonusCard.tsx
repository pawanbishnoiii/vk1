import { motion } from 'framer-motion';
import { formatINR } from '@/lib/formatters';
import { BONUS_THEMES, BONUS_ANIMATIONS, BONUS_TYPES, BonusTheme, BonusAnimation, BonusType } from '@/lib/bonusConfig';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  Gift, 
  Clock, 
  CheckCircle, 
  Loader2, 
  Sparkles,
  RefreshCw,
  Undo2,
  PartyPopper,
  Users,
  Crown,
  Zap,
  Wallet,
  Hash
} from 'lucide-react';

interface Offer {
  id: string;
  title: string;
  description: string | null;
  offer_type: string;
  bonus_amount: number;
  bonus_percentage: number;
  min_amount: number;
  max_amount: number | null;
  wagering_multiplier: number;
  theme: string | null;
  icon: string | null;
  animation: string | null;
  valid_until: string | null;
}

interface BonusCardProps {
  offer: Offer;
  isClaimed: boolean;
  isClaimingThis: boolean;
  onClaim: () => void;
  disabled?: boolean;
}

const getIconComponent = (iconName: string | null, offerType: string) => {
  const iconClass = "h-5 w-5";
  
  switch (offerType) {
    case 'first_deposit':
      return <Gift className={iconClass} />;
    case 'reload':
      return <RefreshCw className={iconClass} />;
    case 'lossback':
      return <Undo2 className={iconClass} />;
    case 'festival':
      return <PartyPopper className={iconClass} />;
    case 'referral':
      return <Users className={iconClass} />;
    case 'vip_loyalty':
      return <Crown className={iconClass} />;
    default:
      return <Gift className={iconClass} />;
  }
};

const getTimeRemaining = (validUntil: string | null) => {
  if (!validUntil) return null;
  
  const now = new Date().getTime();
  const end = new Date(validUntil).getTime();
  const diff = end - now;
  
  if (diff <= 0) return 'Expired';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h left`;
  return 'Expiring soon';
};

export function BonusCard({ offer, isClaimed, isClaimingThis, onClaim, disabled }: BonusCardProps) {
  const theme = (offer.theme as BonusTheme) || 'default';
  const animation = (offer.animation as BonusAnimation) || 'fade';
  const themeConfig = BONUS_THEMES[theme] || BONUS_THEMES.default;
  const animationConfig = BONUS_ANIMATIONS[animation] || BONUS_ANIMATIONS.fade;
  const timeRemaining = getTimeRemaining(offer.valid_until);
  const bonusTypeConfig = BONUS_TYPES[offer.offer_type as BonusType];

  // Calculate display bonus
  const displayBonus = offer.bonus_amount > 0 
    ? formatINR(offer.bonus_amount)
    : `${offer.bonus_percentage}%`;

  return (
    <motion.div
      {...animationConfig}
      className={cn(
        "relative p-4 rounded-xl border-2 transition-all overflow-hidden",
        isClaimed 
          ? "border-profit/30 bg-profit/5" 
          : cn(themeConfig.bgClass, themeConfig.borderClass, "hover:border-opacity-70")
      )}
    >
      {/* Animated background for special offers */}
      {offer.offer_type === 'festival' && !isClaimed && (
        <motion.div
          className="absolute inset-0 opacity-10"
          animate={{
            background: [
              'linear-gradient(45deg, #ff00ff, #00ffff)',
              'linear-gradient(45deg, #00ffff, #ffff00)',
              'linear-gradient(45deg, #ffff00, #ff00ff)',
            ],
          }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      )}
      
      {/* VIP Glow effect */}
      {offer.offer_type === 'vip_loyalty' && !isClaimed && (
        <motion.div
          className="absolute inset-0 rounded-xl"
          animate={{
            boxShadow: [
              '0 0 10px rgba(255, 215, 0, 0.2)',
              '0 0 25px rgba(255, 215, 0, 0.4)',
              '0 0 10px rgba(255, 215, 0, 0.2)',
            ],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
      
      {/* Badge */}
      {bonusTypeConfig && !isClaimed && (
        <div className="absolute -top-2 -right-2 z-10">
          <Badge className={cn("bg-gradient-to-r", bonusTypeConfig.defaultColor)}>
            <Sparkles className="h-3 w-3 mr-1" />
            {bonusTypeConfig.label.split(' ')[0]}
          </Badge>
        </div>
      )}

      <div className="relative flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className={cn("p-2 rounded-lg", themeConfig.bgClass, themeConfig.textClass)}>
              {getIconComponent(offer.icon, offer.offer_type)}
            </div>
            <h3 className="font-semibold text-lg">{offer.title}</h3>
          </div>
          
          {offer.description && (
            <p className="text-sm text-muted-foreground mb-3">{offer.description}</p>
          )}
          
          <div className="flex flex-wrap gap-2">
            {/* Bonus amount badge - prominent display */}
            <Badge className={cn("bg-gradient-to-r text-white font-bold", themeConfig.gradient)}>
              <Wallet className="h-3 w-3 mr-1" />
              Get {displayBonus}
            </Badge>
            
            {offer.min_amount > 0 && (
              <Badge variant="outline">
                Min: {formatINR(offer.min_amount)}
              </Badge>
            )}
            
            {timeRemaining && (
              <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                <Clock className="h-3 w-3 mr-1" />
                {timeRemaining}
              </Badge>
            )}
          </div>
          
          {/* Direct wallet credit notice */}
          <p className="text-xs text-profit mt-2 flex items-center gap-1">
            <Zap className="h-3 w-3" />
            Credits directly to your wallet!
          </p>
        </div>
        
        <div className="flex-shrink-0">
          {isClaimed ? (
            <Badge variant="outline" className="bg-profit/10 text-profit border-profit/30">
              <CheckCircle className="h-3 w-3 mr-1" />
              Claimed
            </Badge>
          ) : (
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={onClaim}
                disabled={disabled || isClaimingThis}
                className={cn("bg-gradient-to-r", themeConfig.gradient)}
              >
                {isClaimingThis ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Gift className="h-4 w-4 mr-2" />
                    Claim Now
                  </>
                )}
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

interface CompletedBonusCardProps {
  bonus: {
    id: string;
    bonus_amount: number;
    bonus_type: string;
    transaction_id: string | null;
    claimed_at: string;
    offer?: {
      title: string;
      theme: string | null;
      offer_type: string;
    };
  };
}

export function CompletedBonusCard({ bonus }: CompletedBonusCardProps) {
  const theme = (bonus.offer?.theme as BonusTheme) || 'default';
  const themeConfig = BONUS_THEMES[theme] || BONUS_THEMES.default;
  const claimedDate = new Date(bonus.claimed_at).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "p-4 rounded-xl space-y-2 border bg-profit/5 border-profit/30"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-profit/20">
            <CheckCircle className="h-5 w-5 text-profit" />
          </div>
          <div>
            <p className="font-semibold">{bonus.offer?.title || bonus.bonus_type}</p>
            <p className="text-xs text-muted-foreground">Claimed on {claimedDate}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-bold font-mono text-profit">+{formatINR(bonus.bonus_amount)}</p>
          {bonus.transaction_id && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Hash className="h-3 w-3" />
              {bonus.transaction_id.slice(0, 8)}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Keep ActiveBonusCard for backwards compatibility
interface ActiveBonusCardProps {
  bonus: {
    id: string;
    bonus_amount: number;
    locked_amount: number;
    wagering_required: number;
    wagering_completed: number;
    expires_at: string | null;
    offer?: {
      title: string;
      theme: string | null;
      offer_type: string;
    };
  };
}

export function ActiveBonusCard({ bonus }: ActiveBonusCardProps) {
  return <CompletedBonusCard bonus={bonus as any} />;
}
