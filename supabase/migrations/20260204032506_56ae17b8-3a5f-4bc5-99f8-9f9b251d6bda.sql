-- Add avatar upload support and enhance profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Avatar storage policies
CREATE POLICY "Avatar images are publicly accessible" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Enhanced bonus system with 4 types
-- 1. First Deposit Bonus
-- 2. Daily Claim Bonus  
-- 3. Task-Based Trade Bonus
-- 4. Deposit Discount/Extra Credit

-- Add new bonus type fields to offers
ALTER TABLE public.offers 
ADD COLUMN IF NOT EXISTS bonus_mode TEXT DEFAULT 'get_then_claim',
ADD COLUMN IF NOT EXISTS daily_claim_days INTEGER DEFAULT 7,
ADD COLUMN IF NOT EXISTS daily_min_amount NUMERIC DEFAULT 10,
ADD COLUMN IF NOT EXISTS daily_max_amount NUMERIC DEFAULT 100,
ADD COLUMN IF NOT EXISTS task_target_count INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS task_type TEXT DEFAULT 'trades',
ADD COLUMN IF NOT EXISTS deposit_target NUMERIC DEFAULT 1000,
ADD COLUMN IF NOT EXISTS extra_credit_fixed NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS extra_credit_percent NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS background_image TEXT,
ADD COLUMN IF NOT EXISTS is_instant_credit BOOLEAN DEFAULT false;

-- Daily bonus claims tracking  
CREATE TABLE IF NOT EXISTS public.daily_claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  offer_id UUID REFERENCES public.offers(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL DEFAULT 1,
  amount NUMERIC NOT NULL DEFAULT 0,
  claimed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  transaction_id UUID REFERENCES public.transactions(id),
  UNIQUE(user_id, offer_id, day_number)
);

-- RLS for daily claims
ALTER TABLE public.daily_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own daily claims"
ON public.daily_claims FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily claims"
ON public.daily_claims FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Task progress tracking
CREATE TABLE IF NOT EXISTS public.bonus_task_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  offer_id UUID REFERENCES public.offers(id) ON DELETE CASCADE,
  current_progress INTEGER NOT NULL DEFAULT 0,
  target_progress INTEGER NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  is_claimed BOOLEAN DEFAULT false,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  claimed_at TIMESTAMP WITH TIME ZONE,
  bonus_amount NUMERIC DEFAULT 0,
  transaction_id UUID REFERENCES public.transactions(id),
  UNIQUE(user_id, offer_id)
);

-- RLS for task progress
ALTER TABLE public.bonus_task_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own task progress"
ON public.bonus_task_progress FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own task progress"
ON public.bonus_task_progress FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own task progress"
ON public.bonus_task_progress FOR UPDATE
USING (auth.uid() = user_id);

-- User activity tracking for admin
CREATE TABLE IF NOT EXISTS public.user_activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  activity_data JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS for activity logs (admin only can view all)
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own activity"
ON public.user_activity_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activity"
ON public.user_activity_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Function to claim daily bonus
CREATE OR REPLACE FUNCTION public.claim_daily_bonus(
  p_user_id UUID,
  p_offer_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offer RECORD;
  v_last_claim RECORD;
  v_next_day INTEGER;
  v_amount NUMERIC;
  v_wallet RECORD;
  v_transaction_id UUID;
BEGIN
  -- Get offer details
  SELECT * INTO v_offer FROM offers WHERE id = p_offer_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Offer not found or inactive');
  END IF;
  
  -- Check if offer type is daily
  IF v_offer.offer_type != 'daily_claim' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not a daily claim offer');
  END IF;
  
  -- Get last claim for this offer
  SELECT * INTO v_last_claim FROM daily_claims 
  WHERE user_id = p_user_id AND offer_id = p_offer_id
  ORDER BY day_number DESC LIMIT 1;
  
  IF FOUND THEN
    -- Check if already claimed today
    IF DATE(v_last_claim.claimed_at) = CURRENT_DATE THEN
      RETURN jsonb_build_object('success', false, 'error', 'Already claimed today');
    END IF;
    
    -- Check if max days reached
    IF v_last_claim.day_number >= COALESCE(v_offer.daily_claim_days, 7) THEN
      RETURN jsonb_build_object('success', false, 'error', 'All daily bonuses claimed');
    END IF;
    
    v_next_day := v_last_claim.day_number + 1;
  ELSE
    v_next_day := 1;
  END IF;
  
  -- Calculate amount (random between min and max)
  v_amount := COALESCE(v_offer.daily_min_amount, 10) + 
    (random() * (COALESCE(v_offer.daily_max_amount, 100) - COALESCE(v_offer.daily_min_amount, 10)));
  v_amount := ROUND(v_amount, 2);
  
  -- Get wallet
  SELECT * INTO v_wallet FROM wallets WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
  END IF;
  
  -- Create transaction
  INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, description)
  VALUES (
    p_user_id,
    'bonus',
    v_amount,
    v_wallet.balance,
    v_wallet.balance + v_amount,
    'Daily bonus day ' || v_next_day
  )
  RETURNING id INTO v_transaction_id;
  
  -- Update wallet
  UPDATE wallets SET 
    balance = balance + v_amount,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Record claim
  INSERT INTO daily_claims (user_id, offer_id, day_number, amount, transaction_id)
  VALUES (p_user_id, p_offer_id, v_next_day, v_amount, v_transaction_id);
  
  RETURN jsonb_build_object(
    'success', true, 
    'amount', v_amount, 
    'day', v_next_day,
    'remaining_days', COALESCE(v_offer.daily_claim_days, 7) - v_next_day
  );
END;
$$;

-- Function to update task progress
CREATE OR REPLACE FUNCTION public.update_task_bonus_progress(
  p_user_id UUID,
  p_task_type TEXT DEFAULT 'trades'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_progress RECORD;
  v_offer RECORD;
BEGIN
  -- Find active task-based offers
  FOR v_offer IN 
    SELECT * FROM offers 
    WHERE offer_type = 'task_bonus' 
    AND is_active = true 
    AND (task_type = p_task_type OR task_type IS NULL)
  LOOP
    -- Get or create progress record
    INSERT INTO bonus_task_progress (user_id, offer_id, target_progress, current_progress)
    VALUES (p_user_id, v_offer.id, COALESCE(v_offer.task_target_count, 5), 0)
    ON CONFLICT (user_id, offer_id) DO NOTHING;
    
    -- Update progress
    UPDATE bonus_task_progress
    SET current_progress = current_progress + 1,
        is_completed = (current_progress + 1 >= target_progress),
        completed_at = CASE 
          WHEN current_progress + 1 >= target_progress AND completed_at IS NULL 
          THEN now() 
          ELSE completed_at 
        END
    WHERE user_id = p_user_id 
    AND offer_id = v_offer.id 
    AND is_claimed = false;
  END LOOP;
END;
$$;

-- Function to claim task bonus
CREATE OR REPLACE FUNCTION public.claim_task_bonus(
  p_user_id UUID,
  p_offer_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_progress RECORD;
  v_offer RECORD;
  v_wallet RECORD;
  v_bonus_amount NUMERIC;
  v_transaction_id UUID;
BEGIN
  -- Get progress
  SELECT * INTO v_progress FROM bonus_task_progress 
  WHERE user_id = p_user_id AND offer_id = p_offer_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No progress found');
  END IF;
  
  IF NOT v_progress.is_completed THEN
    RETURN jsonb_build_object('success', false, 'error', 'Task not completed yet');
  END IF;
  
  IF v_progress.is_claimed THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already claimed');
  END IF;
  
  -- Get offer
  SELECT * INTO v_offer FROM offers WHERE id = p_offer_id;
  v_bonus_amount := COALESCE(v_offer.bonus_amount, 100);
  
  -- Get wallet
  SELECT * INTO v_wallet FROM wallets WHERE user_id = p_user_id FOR UPDATE;
  
  -- Create transaction
  INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, description)
  VALUES (
    p_user_id,
    'bonus',
    v_bonus_amount,
    v_wallet.balance,
    v_wallet.balance + v_bonus_amount,
    'Task bonus: ' || v_offer.title
  )
  RETURNING id INTO v_transaction_id;
  
  -- Update wallet
  UPDATE wallets SET 
    balance = balance + v_bonus_amount,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Mark as claimed
  UPDATE bonus_task_progress
  SET is_claimed = true, claimed_at = now(), bonus_amount = v_bonus_amount, transaction_id = v_transaction_id
  WHERE id = v_progress.id;
  
  RETURN jsonb_build_object('success', true, 'amount', v_bonus_amount);
END;
$$;