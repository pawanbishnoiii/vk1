import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  locked_balance: number;
  created_at: string;
  updated_at: string;
}

export function useWallet() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: wallet, isLoading, error } = useQuery({
    queryKey: ['wallet', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as Wallet | null;
    },
    enabled: !!user?.id,
    staleTime: 10000, // 10 seconds
  });

  const availableBalance = wallet ? Number(wallet.balance) - Number(wallet.locked_balance) : 0;

  return {
    wallet,
    balance: wallet ? Number(wallet.balance) : 0,
    lockedBalance: wallet ? Number(wallet.locked_balance) : 0,
    availableBalance,
    isLoading,
    error,
    refetch: () => queryClient.invalidateQueries({ queryKey: ['wallet', user?.id] }),
  };
}
