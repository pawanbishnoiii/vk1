import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Gift, Calendar, Target, Percent } from 'lucide-react';
import FirstDepositBonus from './FirstDepositBonus';
import DailyClaimBonus from './DailyClaimBonus';
import TaskBonus from './TaskBonus';
import DepositDiscountBonus from './DepositDiscountBonus';

export default function EnhancedBonusSection() {
  const { user } = useAuth();

  // Fetch all active offers by type
  const { data: offers, isLoading } = useQuery({
    queryKey: ['active-offers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Group offers by type
  const firstDepositOffers = offers?.filter(o => o.offer_type === 'first_deposit') || [];
  const dailyClaimOffers = offers?.filter(o => o.offer_type === 'daily_claim') || [];
  const taskBonusOffers = offers?.filter(o => o.offer_type === 'task_bonus') || [];
  const depositDiscountOffers = offers?.filter(o => o.offer_type === 'deposit_discount') || [];

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const hasOffers = (firstDepositOffers.length + dailyClaimOffers.length + 
                    taskBonusOffers.length + depositDiscountOffers.length) > 0;

  if (!hasOffers) {
    return (
      <Card className="border-border/50 bg-gradient-to-br from-primary/5 to-secondary/5">
        <CardContent className="text-center py-12">
          <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Active Bonuses</h3>
          <p className="text-muted-foreground">Check back later for new offers!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <Card className="border-border/50 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10">
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-6 w-6 text-primary" />
            Bonuses & Rewards
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs defaultValue="first-deposit" className="w-full">
            <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-auto p-0 overflow-x-auto">
              {firstDepositOffers.length > 0 && (
                <TabsTrigger 
                  value="first-deposit" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
                >
                  <Gift className="h-4 w-4 mr-2" />
                  First Deposit
                </TabsTrigger>
              )}
              {dailyClaimOffers.length > 0 && (
                <TabsTrigger 
                  value="daily" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Daily Bonus
                </TabsTrigger>
              )}
              {taskBonusOffers.length > 0 && (
                <TabsTrigger 
                  value="tasks" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
                >
                  <Target className="h-4 w-4 mr-2" />
                  Task Bonus
                </TabsTrigger>
              )}
              {depositDiscountOffers.length > 0 && (
                <TabsTrigger 
                  value="deposit-discount" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
                >
                  <Percent className="h-4 w-4 mr-2" />
                  Extra Credit
                </TabsTrigger>
              )}
            </TabsList>

            <div className="p-4">
              {firstDepositOffers.length > 0 && (
                <TabsContent value="first-deposit" className="mt-0 space-y-4">
                  {firstDepositOffers.map(offer => (
                    <FirstDepositBonus key={offer.id} offer={offer} />
                  ))}
                </TabsContent>
              )}

              {dailyClaimOffers.length > 0 && (
                <TabsContent value="daily" className="mt-0 space-y-4">
                  {dailyClaimOffers.map(offer => (
                    <DailyClaimBonus key={offer.id} offer={offer as any} />
                  ))}
                </TabsContent>
              )}

              {taskBonusOffers.length > 0 && (
                <TabsContent value="tasks" className="mt-0 space-y-4">
                  {taskBonusOffers.map(offer => (
                    <TaskBonus key={offer.id} offer={offer as any} />
                  ))}
                </TabsContent>
              )}

              {depositDiscountOffers.length > 0 && (
                <TabsContent value="deposit-discount" className="mt-0 space-y-4">
                  {depositDiscountOffers.map(offer => (
                    <DepositDiscountBonus key={offer.id} offer={offer as any} />
                  ))}
                </TabsContent>
              )}
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  );
}
