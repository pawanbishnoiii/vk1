import { motion } from 'framer-motion';
import { formatINR } from '@/lib/formatters';
import { BONUS_THEMES, BONUS_ANIMATIONS, BONUS_TYPES, BonusTheme, BonusAnimation, BonusType } from '@/lib/bonusConfig';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
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
  Lock,
  Unlock
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
            {offer.bonus_percentage > 0 && (
              <Badge variant="secondary" className={cn("border", themeConfig.borderClass)}>
                <Zap className="h-3 w-3 mr-1" />
                {offer.bonus_percentage}% Bonus
              </Badge>
            )}
            {offer.bonus_amount > 0 && (
              <Badge variant="secondary" className={cn("border", themeConfig.borderClass)}>
                +{formatINR(offer.bonus_amount)}
              </Badge>
            )}
            {offer.min_amount > 0 && (
              <Badge variant="outline">
                Min: {formatINR(offer.min_amount)}
              </Badge>
            )}
            {offer.wagering_multiplier > 0 && (
              <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                <Lock className="h-3 w-3 mr-1" />
                {offer.wagering_multiplier}x Wagering
              </Badge>
            )}
            {timeRemaining && (
              <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                <Clock className="h-3 w-3 mr-1" />
                {timeRemaining}
              </Badge>
            )}
          </div>
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
                    Claim
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
  const theme = (bonus.offer?.theme as BonusTheme) || 'default';
  const themeConfig = BONUS_THEMES[theme] || BONUS_THEMES.default;
  const progress = bonus.wagering_required > 0 
    ? (bonus.wagering_completed / bonus.wagering_required) * 100 
    : 100;
  const timeRemaining = getTimeRemaining(bonus.expires_at);
  const isComplete = progress >= 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "p-4 rounded-xl space-y-3 border",
        themeConfig.bgClass,
        themeConfig.borderClass
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isComplete ? (
            <Unlock className={cn("h-5 w-5", themeConfig.textClass)} />
          ) : (
            <Lock className={cn("h-5 w-5", themeConfig.textClass)} />
          )}
          <div>
            <p className="font-semibold">{bonus.offer?.title || 'Bonus'}</p>
            <p className="text-sm text-muted-foreground">
              Locked: <span className={cn("font-mono", themeConfig.textClass)}>{formatINR(bonus.locked_amount)}</span>
            </p>
          </div>
        </div>
        {timeRemaining && (
          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
            <Clock className="h-3 w-3 mr-1" />
            {timeRemaining}
          </Badge>
        )}
      </div>
      
      {bonus.wagering_required > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Wagering Progress</span>
            <span className="font-mono">
              {formatINR(bonus.wagering_completed)} / {formatINR(bonus.wagering_required)}
            </span>
          </div>
          <Progress 
            value={progress} 
            className={cn("h-2", isComplete && "bg-profit/20")} 
          />
          {isComplete ? (
            <p className="text-xs text-profit flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Wagering complete! Bonus will be unlocked.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Trade {formatINR(bonus.wagering_required - bonus.wagering_completed)} more to unlock
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
}
