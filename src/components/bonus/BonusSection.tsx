import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOffers } from '@/hooks/useOffers';
import { useBonuses } from '@/hooks/useBonuses';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatINR } from '@/lib/formatters';
import { 
  Gift, 
  Clock, 
  CheckCircle, 
  Loader2, 
  Sparkles,
  Trophy,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Confetti } from '@/components/ui/lottie-animation';

export default function BonusSection() {
  const { offers, isLoading: offersLoading, calculateBonus } = useOffers();
  const { 
    userBonuses, 
    activeBonuses, 
    hasClaimedOffer, 
    claimBonus, 
    isClaiming 
  } = useBonuses();
  
  const [showClaimAnimation, setShowClaimAnimation] = useState(false);
  const [claimingOfferId, setClaimingOfferId] = useState<string | null>(null);

  const handleClaimBonus = async (offer: any) => {
    setClaimingOfferId(offer.id);
    
    // Calculate bonus amount
    const bonusAmount = offer.bonus_amount > 0 
      ? offer.bonus_amount 
      : (offer.min_amount * (offer.bonus_percentage / 100));

    claimBonus({
      offerId: offer.id,
      bonusAmount,
      wageringMultiplier: offer.wagering_multiplier || 0,
      expiresAt: offer.valid_until,
    }, {
      onSuccess: () => {
        setShowClaimAnimation(true);
        setTimeout(() => {
          setShowClaimAnimation(false);
          setClaimingOfferId(null);
        }, 3000);
      },
      onError: () => {
        setClaimingOfferId(null);
      },
    });
  };

  // Calculate time remaining for expiring offers
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

  if (offersLoading) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Confetti active={showClaimAnimation} />
      
      <div className="space-y-6">
        {/* Active Bonuses with Progress */}
        {activeBonuses.length > 0 && (
          <Card className="border-primary/50 bg-gradient-to-br from-card to-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                Active Bonuses
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeBonuses.map((bonus) => {
                const progress = bonus.wagering_required > 0 
                  ? (bonus.wagering_completed / bonus.wagering_required) * 100 
                  : 100;
                
                return (
                  <motion.div
                    key={bonus.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-lg bg-secondary/50 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{bonus.offer?.title || 'Bonus'}</p>
                        <p className="text-sm text-muted-foreground">
                          Amount: <span className="text-primary font-mono">{formatINR(bonus.bonus_amount)}</span>
                        </p>
                      </div>
                      {bonus.expires_at && (
                        <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                          <Clock className="h-3 w-3 mr-1" />
                          {getTimeRemaining(bonus.expires_at)}
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
                        <Progress value={progress} className="h-2" />
                        <p className="text-xs text-muted-foreground">
                          Complete wagering requirements to unlock your bonus
                        </p>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Available Offers */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              Available Bonuses
            </CardTitle>
          </CardHeader>
          <CardContent>
            {offers.length === 0 ? (
              <div className="text-center py-8">
                <Gift className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No active offers at the moment</p>
                <p className="text-sm text-muted-foreground">Check back later for exciting bonuses!</p>
              </div>
            ) : (
              <div className="grid gap-4">
                <AnimatePresence>
                  {offers.map((offer, index) => {
                    const isClaimed = hasClaimedOffer(offer.id);
                    const isClaimingThis = claimingOfferId === offer.id;
                    const timeRemaining = getTimeRemaining(offer.valid_until);
                    
                    return (
                      <motion.div
                        key={offer.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={cn(
                          "relative p-4 rounded-xl border-2 transition-all",
                          isClaimed 
                            ? "border-profit/30 bg-profit/5" 
                            : "border-primary/30 bg-gradient-to-br from-card to-primary/5 hover:border-primary/50"
                        )}
                      >
                        {/* Offer badge */}
                        {offer.offer_type === 'first_deposit' && !isClaimed && (
                          <div className="absolute -top-2 -right-2">
                            <Badge className="bg-gradient-to-r from-primary to-primary/80">
                              <Sparkles className="h-3 w-3 mr-1" />
                              First Deposit
                            </Badge>
                          </div>
                        )}

                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{offer.title}</h3>
                            {offer.description && (
                              <p className="text-sm text-muted-foreground mt-1">{offer.description}</p>
                            )}
                            
                            <div className="flex flex-wrap gap-2 mt-3">
                              {offer.bonus_percentage > 0 && (
                                <Badge variant="secondary">
                                  <Zap className="h-3 w-3 mr-1" />
                                  {offer.bonus_percentage}% Bonus
                                </Badge>
                              )}
                              {offer.bonus_amount > 0 && (
                                <Badge variant="secondary">
                                  +{formatINR(offer.bonus_amount)}
                                </Badge>
                              )}
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
                                  onClick={() => handleClaimBonus(offer)}
                                  disabled={isClaiming}
                                  className="bg-gradient-to-r from-primary to-primary/80"
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
                  })}
                </AnimatePresence>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}