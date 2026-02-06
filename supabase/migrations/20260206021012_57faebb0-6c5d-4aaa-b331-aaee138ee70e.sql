
-- Add signup fields to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS age integer;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mobile_number text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS vip_level integer DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_deposit numeric DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_trades integer DEFAULT 0;
