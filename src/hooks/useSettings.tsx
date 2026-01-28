import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PlatformSettings {
  trade_duration: number;
  upi_id: string;
  min_deposit: number;
  max_deposit: number;
  min_withdrawal: number;
  max_withdrawal: number;
  global_win_rate: number;
  profit_percentage: number;
  loss_percentage: number;
  platform_name: string;
  support_email: string;
  currency_symbol: string;
  smtp_host: string;
  smtp_port: string;
  smtp_user: string;
  smtp_from_email: string;
}

export function useSettings() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['platform-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('key, value');
      
      if (error) throw error;
      
      const settingsMap: Partial<PlatformSettings> = {};
      data?.forEach((item) => {
        const key = item.key as keyof PlatformSettings;
        // Parse JSON value
        try {
          const parsedValue = typeof item.value === 'string' 
            ? JSON.parse(item.value) 
            : item.value;
          (settingsMap as any)[key] = parsedValue;
        } catch {
          (settingsMap as any)[key] = item.value;
        }
      });
      
      return settingsMap as PlatformSettings;
    },
    staleTime: 30000, // 30 seconds
  });

  const updateSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const { error } = await supabase
        .from('platform_settings')
        .update({ value: JSON.stringify(value), updated_at: new Date().toISOString() })
        .eq('key', key);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
    },
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<PlatformSettings>) => {
      const promises = Object.entries(updates).map(([key, value]) =>
        supabase
          .from('platform_settings')
          .upsert({ key, value: JSON.stringify(value), updated_at: new Date().toISOString() }, { onConflict: 'key' })
      );
      
      const results = await Promise.all(promises);
      const errorResult = results.find(r => r.error);
      if (errorResult?.error) throw errorResult.error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
    },
  });

  return {
    settings,
    isLoading,
    error,
    updateSetting: updateSetting.mutate,
    updateSettings: updateSettings.mutate,
    isUpdating: updateSetting.isPending || updateSettings.isPending,
  };
}
