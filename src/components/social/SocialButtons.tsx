import { useSocialChannels } from '@/hooks/useSocialChannels';
import { Button } from '@/components/ui/button';
import { MessageCircle, Send } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SocialButtons() {
  const { whatsappChannel, telegramChannel, isLoading } = useSocialChannels();

  if (isLoading || (!whatsappChannel && !telegramChannel)) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-20 md:bottom-4 right-4 z-40 flex flex-col gap-2"
    >
      {whatsappChannel && (
        <Button
          size="icon"
          className="h-12 w-12 rounded-full bg-[#25D366] hover:bg-[#25D366]/90 shadow-lg"
          onClick={() => window.open(whatsappChannel.channel_url, '_blank')}
        >
          <MessageCircle className="h-6 w-6 text-white" />
        </Button>
      )}
      
      {telegramChannel && (
        <Button
          size="icon"
          className="h-12 w-12 rounded-full bg-[#0088cc] hover:bg-[#0088cc]/90 shadow-lg"
          onClick={() => window.open(telegramChannel.channel_url, '_blank')}
        >
          <Send className="h-6 w-6 text-white" />
        </Button>
      )}
    </motion.div>
  );
}
