import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBonusSystem } from '@/hooks/useBonusSystem';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BonusCard, ActiveBonusCard } from './BonusCard';
import { formatINR } from '@/lib/formatters';
import { BONUS_TYPES, BONUS_ANIMATIONS, BonusType } from '@/lib/bonusConfig';
import { 
  Gift, 
  Trophy,
  Loader2,
  Lock,
  RefreshCw,
  Undo2,
  PartyPopper,
  Users,
  Crown
} from 'lucide-react';
import { Confetti } from '@/components/ui/lottie-animation';

export default function BonusSection() {
  const { 
    offers, 
    offersLoading, 
    activeBonuses,
    totalLockedBonus,
    pendingAnimations,
    hasClaimedOffer, 
    claimBonus, 
    isClaiming,
    markAnimationShown,
  } = useBonusSystem();
  
  const [showClaimAnimation, setShowClaimAnimation] = useState(false);
  const [claimingOfferId, setClaimingOfferId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  // Show animation for new bonuses
  useEffect(() => {
    if (pendingAnimations.length > 0) {
      setShowClaimAnimation(true);
      const timer = setTimeout(() => {
        setShowClaimAnimation(false);
        pendingAnimations.forEach(b => markAnimationShown(b.id));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [pendingAnimations.length]);

  const handleClaimBonus = async (offer: any) => {
    setClaimingOfferId(offer.id);
    
    const bonusAmount = offer.bonus_amount > 0 
      ? offer.bonus_amount 
      : (offer.min_amount * (offer.bonus_percentage / 100));

    claimBonus({
      offerId: offer.id,
      bonusAmount,
      wageringMultiplier: offer.wagering_multiplier || 0,
      bonusType: offer.offer_type,
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

  // Group offers by type
  const offersByType = {
    all: offers,
    first_deposit: offers.filter(o => o.offer_type === 'first_deposit'),
    reload: offers.filter(o => o.offer_type === 'reload'),
    lossback: offers.filter(o => o.offer_type === 'lossback'),
    festival: offers.filter(o => o.offer_type === 'festival'),
    referral: offers.filter(o => o.offer_type === 'referral'),
    vip_loyalty: offers.filter(o => o.offer_type === 'vip_loyalty'),
  };

  const tabs = [
    { id: 'all', label: 'All', icon: Gift, count: offers.length },
    { id: 'first_deposit', label: 'First Deposit', icon: Gift, count: offersByType.first_deposit.length },
    { id: 'reload', label: 'Reload', icon: RefreshCw, count: offersByType.reload.length },
    { id: 'lossback', label: 'Lossback', icon: Undo2, count: offersByType.lossback.length },
    { id: 'festival', label: 'Festival', icon: PartyPopper, count: offersByType.festival.length },
    { id: 'referral', label: 'Referral', icon: Users, count: offersByType.referral.length },
    { id: 'vip_loyalty', label: 'VIP', icon: Crown, count: offersByType.vip_loyalty.length },
  ].filter(tab => tab.id === 'all' || tab.count > 0);

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
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" />
                  Active Bonuses
                </span>
                {totalLockedBonus > 0 && (
                  <span className="flex items-center gap-1 text-sm font-normal text-muted-foreground">
                    <Lock className="h-4 w-4" />
                    Total Locked: <span className="text-primary font-mono">{formatINR(totalLockedBonus)}</span>
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <AnimatePresence>
                {activeBonuses.map((bonus) => (
                  <ActiveBonusCard key={bonus.id} bonus={bonus} />
                ))}
              </AnimatePresence>
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
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full flex-wrap h-auto gap-1 mb-4">
                  {tabs.map(tab => (
                    <TabsTrigger 
                      key={tab.id} 
                      value={tab.id}
                      className="gap-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      <tab.icon className="h-3.5 w-3.5" />
                      {tab.label}
                      {tab.count > 0 && (
                        <span className="ml-1 text-xs opacity-70">({tab.count})</span>
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value={activeTab} className="mt-0">
                  <div className="grid gap-4">
                    <AnimatePresence mode="popLayout">
                      {(offersByType[activeTab as keyof typeof offersByType] || []).map((offer, index) => {
                        const isClaimed = hasClaimedOffer(offer.id);
                        const isClaimingThis = claimingOfferId === offer.id;
                        
                        return (
                          <motion.div
                            key={offer.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ delay: index * 0.05 }}
                          >
                            <BonusCard
                              offer={offer}
                              isClaimed={isClaimed}
                              isClaimingThis={isClaimingThis}
                              onClaim={() => handleClaimBonus(offer)}
                              disabled={isClaiming}
                            />
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
