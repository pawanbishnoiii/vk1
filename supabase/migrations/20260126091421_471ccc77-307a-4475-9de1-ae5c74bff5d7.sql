-- Add trade_duration column to platform_settings for timer control
-- First, let's add better platform settings for trade duration, UPI, offers, etc.

-- Create notifications table for user notifications
CREATE TABLE public.notifications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info', -- info, success, warning, error, trade_result
    is_read BOOLEAN NOT NULL DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create offers table for first deposit bonus and other offers
CREATE TABLE public.offers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    offer_type TEXT NOT NULL, -- first_deposit, deposit_bonus, trade_bonus
    bonus_percentage NUMERIC NOT NULL DEFAULT 0,
    bonus_amount NUMERIC NOT NULL DEFAULT 0,
    min_amount NUMERIC NOT NULL DEFAULT 0,
    max_amount NUMERIC,
    is_active BOOLEAN NOT NULL DEFAULT true,
    valid_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    valid_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create social_channels table for WhatsApp/Telegram links
CREATE TABLE public.social_channels (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    channel_type TEXT NOT NULL, -- whatsapp, telegram
    channel_name TEXT NOT NULL,
    channel_url TEXT NOT NULL,
    is_visible BOOLEAN NOT NULL DEFAULT true,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create help_articles table for help section
CREATE TABLE public.help_articles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL, -- deposit, withdrawal, trading, account, general
    display_order INTEGER NOT NULL DEFAULT 0,
    is_published BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create email_logs table for tracking sent emails
CREATE TABLE public.email_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    email_to TEXT NOT NULL,
    email_type TEXT NOT NULL, -- welcome, deposit_approved, withdrawal_approved, trade_result, password_reset
    subject TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, failed
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create password_reset_tokens table
CREATE TABLE public.password_reset_tokens (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add trade_duration column to trades table (in seconds)
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS duration_seconds INTEGER DEFAULT 30;

-- Add expected_result column to trades for admin to see/set outcome before timer ends
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS expected_result TEXT; -- win, loss

-- Add timer_started_at for tracking when trade timer started
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS timer_started_at TIMESTAMP WITH TIME ZONE;

-- Enable RLS on all new tables
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all notifications" ON public.notifications
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Offers policies (public read, admin manage)
CREATE POLICY "Anyone can view active offers" ON public.offers
    FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage offers" ON public.offers
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Social channels policies (public read, admin manage)
CREATE POLICY "Anyone can view visible channels" ON public.social_channels
    FOR SELECT USING (is_visible = true);
CREATE POLICY "Admins can manage channels" ON public.social_channels
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Help articles policies (public read, admin manage)
CREATE POLICY "Anyone can view published articles" ON public.help_articles
    FOR SELECT USING (is_published = true);
CREATE POLICY "Admins can manage articles" ON public.help_articles
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Email logs policies (admin only)
CREATE POLICY "Admins can manage email logs" ON public.email_logs
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Password reset tokens policies
CREATE POLICY "Users can view own tokens" ON public.password_reset_tokens
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage tokens" ON public.password_reset_tokens
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default platform settings
INSERT INTO public.platform_settings (key, value) VALUES 
    ('trade_duration', '30'),
    ('upi_id', '"admin@upi"'),
    ('min_deposit', '100'),
    ('max_deposit', '100000'),
    ('min_withdrawal', '100'),
    ('max_withdrawal', '50000'),
    ('global_win_rate', '50'),
    ('platform_name', '"CryptoTrade Pro"'),
    ('support_email', '"support@example.com"'),
    ('currency_symbol', '"₹"'),
    ('smtp_host', '""'),
    ('smtp_port', '"587"'),
    ('smtp_user', '""'),
    ('smtp_from_email', '""')
ON CONFLICT (key) DO NOTHING;

-- Insert default first deposit offer
INSERT INTO public.offers (title, description, offer_type, bonus_percentage, min_amount, is_active) VALUES
    ('First Deposit Bonus', 'Get 10% extra on your first deposit!', 'first_deposit', 10, 500, true);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trades;