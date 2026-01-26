import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SocialChannel {
  id: string;
  channel_type: 'whatsapp' | 'telegram';
  channel_name: string;
  channel_url: string;
  is_visible: boolean;
  display_order: number;
}

export function useSocialChannels() {
  const { data: channels, isLoading, error } = useQuery({
    queryKey: ['social-channels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('social_channels')
        .select('*')
        .eq('is_visible', true)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as SocialChannel[];
    },
    staleTime: 60000, // 1 minute
  });

  return {
    channels: channels || [],
    whatsappChannel: channels?.find(c => c.channel_type === 'whatsapp'),
    telegramChannel: channels?.find(c => c.channel_type === 'telegram'),
    isLoading,
    error,
  };
}
