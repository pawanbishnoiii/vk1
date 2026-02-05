-- =====================================================
-- Advanced Production Upgrade Migration
-- Daily Spin Wheel + Bonus System Enhancements
-- =====================================================

-- 1. Add spin wheel columns to offers table
ALTER TABLE offers ADD COLUMN IF NOT EXISTS spin_prizes jsonb DEFAULT '[]'::jsonb;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS spin_enabled boolean DEFAULT false;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS spin_cooldown_hours integer DEFAULT 24;

-- 2. Create daily_spins table
CREATE TABLE IF NOT EXISTS public.daily_spins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  offer_id uuid REFERENCES public.offers(id) ON DELETE SET NULL,
  prize_amount numeric NOT NULL DEFAULT 0,
  prize_index integer NOT NULL DEFAULT 0,
  prize_label text,
  spun_at timestamptz DEFAULT now(),
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL
);

-- Enable RLS for daily_spins
ALTER TABLE public.daily_spins ENABLE ROW LEVEL SECURITY;

-- RLS Policies for daily_spins
CREATE POLICY "Users can view their own spins" ON public.daily_spins
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own spins" ON public.daily_spins
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin can view all spins
CREATE POLICY "Admins can view all spins" ON public.daily_spins
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- 3. Create atomic spin claim function
CREATE OR REPLACE FUNCTION public.claim_spin_prize(
  p_user_id uuid,
  p_offer_id uuid,
  p_prize_amount numeric,
  p_prize_index integer,
  p_prize_label text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_wallet RECORD;
  v_transaction_id UUID;
  v_spin_id UUID;
  v_cooldown_hours INTEGER;
  v_last_spin TIMESTAMPTZ;
BEGIN
  -- Get offer cooldown
  SELECT spin_cooldown_hours INTO v_cooldown_hours 
  FROM offers WHERE id = p_offer_id;
  
  v_cooldown_hours := COALESCE(v_cooldown_hours, 24);
  
  -- Check last spin time
  SELECT spun_at INTO v_last_spin 
  FROM daily_spins 
  WHERE user_id = p_user_id AND offer_id = p_offer_id
  ORDER BY spun_at DESC LIMIT 1;
  
  IF v_last_spin IS NOT NULL AND 
     v_last_spin > now() - (v_cooldown_hours || ' hours')::interval THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Please wait before spinning again',
      'next_spin_at', v_last_spin + (v_cooldown_hours || ' hours')::interval
    );
  END IF;
  
  -- Get wallet with lock
  SELECT * INTO v_wallet FROM wallets WHERE user_id = p_user_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
  END IF;
  
  v_transaction_id := gen_random_uuid();
  v_spin_id := gen_random_uuid();
  
  -- Only credit if prize > 0
  IF p_prize_amount > 0 THEN
    -- Update wallet
    UPDATE wallets SET
      balance = balance + p_prize_amount,
      updated_at = now()
    WHERE user_id = p_user_id;
    
    -- Create transaction
    INSERT INTO transactions (
      id, user_id, type, amount, balance_before, balance_after, description
    ) VALUES (
      v_transaction_id,
      p_user_id,
      'bonus',
      p_prize_amount,
      v_wallet.balance,
      v_wallet.balance + p_prize_amount,
      'Daily Spin Prize: ' || COALESCE(p_prize_label, '₹' || p_prize_amount::text)
    );
  END IF;
  
  -- Record spin
  INSERT INTO daily_spins (id, user_id, offer_id, prize_amount, prize_index, prize_label, transaction_id)
  VALUES (v_spin_id, p_user_id, p_offer_id, p_prize_amount, p_prize_index, p_prize_label, 
          CASE WHEN p_prize_amount > 0 THEN v_transaction_id ELSE NULL END);
  
  -- Create notification
  INSERT INTO notifications (user_id, title, message, type)
  VALUES (
    p_user_id,
    '🎰 Spin Result!',
    CASE WHEN p_prize_amount > 0 
         THEN 'You won ₹' || p_prize_amount::text || '!'
         ELSE 'Better luck next time!'
    END,
    CASE WHEN p_prize_amount > 0 THEN 'bonus' ELSE 'info' END
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'spin_id', v_spin_id,
    'prize_amount', p_prize_amount,
    'prize_index', p_prize_index,
    'prize_label', p_prize_label,
    'new_balance', v_wallet.balance + p_prize_amount
  );
END;
$$;

-- 4. Add unique constraint to bonus_task_progress for upsert
ALTER TABLE public.bonus_task_progress 
  DROP CONSTRAINT IF EXISTS bonus_task_progress_user_offer_unique;
  
ALTER TABLE public.bonus_task_progress 
  ADD CONSTRAINT bonus_task_progress_user_offer_unique 
  UNIQUE (user_id, offer_id);

-- 5. Create index on daily_spins for faster lookups
CREATE INDEX IF NOT EXISTS idx_daily_spins_user_offer ON daily_spins(user_id, offer_id, spun_at DESC);

-- 6. Enable realtime for daily_spins
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_spins;