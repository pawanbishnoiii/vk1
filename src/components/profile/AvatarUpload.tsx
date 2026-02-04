import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Camera, Loader2, Check, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AvatarUploadProps {
  userId: string;
  currentAvatarUrl?: string | null;
  fallback?: string;
  onUploadComplete?: (url: string) => void;
  size?: 'sm' | 'md' | 'lg';
}

const PRESET_AVATARS = [
  '🚀', '💎', '🔥', '⚡', '🎯', '🏆', '💰', '📈',
  '🦁', '🐺', '🦅', '🐉', '🌟', '👑', '🎪', '🎨'
];

export default function AvatarUpload({
  userId,
  currentAvatarUrl,
  fallback = 'U',
  onUploadComplete,
  size = 'lg',
}: AvatarUploadProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showPresets, setShowPresets] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);

  const sizeClasses = {
    sm: 'h-16 w-16',
    md: 'h-24 w-24',
    lg: 'h-32 w-32',
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please select an image file', variant: 'destructive' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Maximum file size is 5MB', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    setSelectedEmoji(null);

    try {
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => setPreviewUrl(e.target?.result as string);
      reader.readAsDataURL(file);

      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      toast({ title: 'Avatar updated!', description: 'Your profile picture has been changed' });
      onUploadComplete?.(publicUrl);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleEmojiSelect = async (emoji: string) => {
    setIsUploading(true);
    setSelectedEmoji(emoji);
    setPreviewUrl(null);

    try {
      // Store emoji as avatar_url with special prefix
      const emojiUrl = `emoji:${emoji}`;
      
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: emojiUrl })
        .eq('user_id', userId);

      if (error) throw error;

      toast({ title: 'Avatar updated!' });
      onUploadComplete?.(emojiUrl);
      setShowPresets(false);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const displayUrl = previewUrl || currentAvatarUrl;
  const isEmoji = currentAvatarUrl?.startsWith('emoji:');
  const emojiChar = isEmoji ? currentAvatarUrl?.replace('emoji:', '') : null;

  return (
    <div className="space-y-4">
      <div className="relative inline-block">
        <Avatar className={cn(sizeClasses[size], "border-4 border-background shadow-xl")}>
          {emojiChar && !previewUrl ? (
            <AvatarFallback className="text-4xl bg-gradient-to-br from-primary/20 to-primary/5">
              {emojiChar}
            </AvatarFallback>
          ) : (
            <>
              <AvatarImage src={displayUrl || ''} className="object-cover" />
              <AvatarFallback className="text-2xl bg-gradient-to-br from-primary/20 to-primary/5">
                {selectedEmoji || fallback}
              </AvatarFallback>
            </>
          )}
        </Avatar>

        {/* Upload button overlay */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className={cn(
            "absolute -bottom-2 -right-2 p-2 rounded-full",
            "bg-primary text-primary-foreground shadow-lg",
            "hover:bg-primary/90 transition-colors",
            isUploading && "opacity-50 cursor-not-allowed"
          )}
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Camera className="h-4 w-4" />
          )}
        </motion.button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Preset avatars toggle */}
      <div className="space-y-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowPresets(!showPresets)}
          className="text-xs"
        >
          {showPresets ? 'Hide' : 'Choose'} Avatar
        </Button>

        {showPresets && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="grid grid-cols-8 gap-2 p-3 rounded-lg bg-secondary/50"
          >
            {PRESET_AVATARS.map((emoji) => (
              <motion.button
                key={emoji}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleEmojiSelect(emoji)}
                disabled={isUploading}
                className={cn(
                  "p-2 text-2xl rounded-lg hover:bg-primary/20 transition-colors",
                  selectedEmoji === emoji && "bg-primary/20 ring-2 ring-primary"
                )}
              >
                {emoji}
              </motion.button>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
