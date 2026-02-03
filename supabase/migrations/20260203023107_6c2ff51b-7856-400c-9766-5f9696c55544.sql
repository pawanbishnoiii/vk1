-- Add sound settings and social links to platform_settings
INSERT INTO platform_settings (key, value) VALUES
  ('whatsapp_link', '""')
ON CONFLICT (key) DO NOTHING;

INSERT INTO platform_settings (key, value) VALUES
  ('telegram_link', '""')
ON CONFLICT (key) DO NOTHING;

INSERT INTO platform_settings (key, value) VALUES
  ('win_sound_url', '""')
ON CONFLICT (key) DO NOTHING;

INSERT INTO platform_settings (key, value) VALUES
  ('loss_sound_url', '""')
ON CONFLICT (key) DO NOTHING;

INSERT INTO platform_settings (key, value) VALUES
  ('background_sound_url', '""')
ON CONFLICT (key) DO NOTHING;

INSERT INTO platform_settings (key, value) VALUES
  ('sound_loop_enabled', 'false')
ON CONFLICT (key) DO NOTHING;

-- Update user_bonuses to ensure proper tracking
ALTER TABLE user_bonuses ADD COLUMN IF NOT EXISTS transaction_id uuid DEFAULT gen_random_uuid();
ALTER TABLE user_bonuses ADD COLUMN IF NOT EXISTS bonus_credited boolean DEFAULT false;

-- Create function for direct bonus claim with wallet credit
CREATE OR REPLACE FUNCTION public.claim_bonus_direct(
  p_user_id uuid,
  p_offer_id uuid,
  p_bonus_amount numeric,
  p_bonus_type text DEFAULT 'deposit'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_balance numeric;
  v_new_balance numeric;
  v_transaction_id uuid;
  v_bonus_id uuid;
  v_existing_claim uuid;
BEGIN
  -- Check if already claimed (one-time bonuses)
  SELECT id INTO v_existing_claim
  FROM bonus_claims
  WHERE user_id = p_user_id AND offer_id = p_offer_id;
  
  IF v_existing_claim IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'Bonus already claimed');
  END IF;
  
  -- Generate unique IDs
  v_transaction_id := gen_random_uuid();
  v_bonus_id := gen_random_uuid();
  
  -- Get current wallet balance
  SELECT balance INTO v_wallet_balance
  FROM wallets
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Wallet not found');
  END IF;
  
  v_new_balance := v_wallet_balance + p_bonus_amount;
  
  -- Update wallet balance directly
  UPDATE wallets
  SET balance = v_new_balance,
      updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Create transaction record
  INSERT INTO transactions (
    id,
    user_id,
    type,
    amount,
    balance_before,
    balance_after,
    description,
    reference_id
  ) VALUES (
    v_transaction_id,
    p_user_id,
    'bonus',
    p_bonus_amount,
    v_wallet_balance,
    v_new_balance,
    'Bonus: ' || p_bonus_type,
    v_bonus_id
  );
  
  -- Create user_bonus record
  INSERT INTO user_bonuses (
    id,
    user_id,
    offer_id,
    bonus_amount,
    bonus_type,
    status,
    transaction_id,
    bonus_credited,
    wagering_required,
    wagering_completed
  ) VALUES (
    v_bonus_id,
    p_user_id,
    p_offer_id,
    p_bonus_amount,
    p_bonus_type,
    'completed',
    v_transaction_id,
    true,
    0,
    0
  );
  
  -- Record claim for one-time check
  INSERT INTO bonus_claims (user_id, offer_id)
  VALUES (p_user_id, p_offer_id);
  
  -- Create notification
  INSERT INTO notifications (user_id, title, message, type)
  VALUES (
    p_user_id,
    '🎁 Bonus Credited!',
    '₹' || p_bonus_amount::text || ' bonus has been added to your wallet!',
    'bonus'
  );
  
  RETURN json_build_object(
    'success', true,
    'bonus_id', v_bonus_id,
    'transaction_id', v_transaction_id,
    'amount', p_bonus_amount,
    'new_balance', v_new_balance
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.claim_bonus_direct TO authenticated;