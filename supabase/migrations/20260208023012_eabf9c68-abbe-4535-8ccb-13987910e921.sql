
-- Add screenshot_url column to deposit_requests for payment proof
ALTER TABLE public.deposit_requests ADD COLUMN IF NOT EXISTS screenshot_url text;

-- Create storage bucket for deposit screenshots
INSERT INTO storage.buckets (id, name, public) VALUES ('deposit-screenshots', 'deposit-screenshots', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: Users can upload their own screenshots
CREATE POLICY "Users can upload own deposit screenshots"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'deposit-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

-- RLS: Users can view own screenshots
CREATE POLICY "Users can view own deposit screenshots"
ON storage.objects FOR SELECT
USING (bucket_id = 'deposit-screenshots' AND (
  auth.uid()::text = (storage.foldername(name))[1] OR
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
));

-- RLS: Admins can view all screenshots
CREATE POLICY "Admins can view all deposit screenshots"
ON storage.objects FOR SELECT
USING (bucket_id = 'deposit-screenshots' AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Fix confirm_deposit_with_bonus: when wagering=0, credit bonus to available balance directly
CREATE OR REPLACE FUNCTION public.confirm_deposit_with_bonus(
  p_deposit_id uuid, 
  p_admin_id uuid, 
  p_offer_id uuid DEFAULT NULL::uuid, 
  p_bonus_amount numeric DEFAULT 0, 
  p_wagering_multiplier numeric DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_deposit RECORD;
    v_wallet RECORD;
    v_new_balance NUMERIC;
    v_transaction_id UUID;
    v_bonus_transaction_id UUID;
    v_user_bonus_id UUID;
    v_wagering_required NUMERIC;
BEGIN
    SELECT * INTO v_deposit FROM public.deposit_requests WHERE id = p_deposit_id FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Deposit not found'); END IF;
    IF v_deposit.status != 'pending' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Deposit already processed', 'status', v_deposit.status);
    END IF;
    
    SELECT * INTO v_wallet FROM public.wallets WHERE user_id = v_deposit.user_id FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Wallet not found'); END IF;
    
    v_new_balance := v_wallet.balance + v_deposit.amount;
    v_transaction_id := gen_random_uuid();
    
    -- Update deposit status
    UPDATE public.deposit_requests SET
        status = 'approved', reviewed_at = now(), reviewed_by = p_admin_id
    WHERE id = p_deposit_id;
    
    -- Update wallet with deposit amount
    UPDATE public.wallets SET balance = v_new_balance, updated_at = now()
    WHERE user_id = v_deposit.user_id;
    
    -- Create deposit transaction
    INSERT INTO public.transactions (id, user_id, type, amount, balance_before, balance_after, reference_id, description)
    VALUES (v_transaction_id, v_deposit.user_id, 'deposit', v_deposit.amount, v_wallet.balance, v_new_balance, p_deposit_id, 'Deposit approved');
    
    -- Update profile total_deposit
    UPDATE public.profiles SET total_deposit = COALESCE(total_deposit, 0) + v_deposit.amount WHERE user_id = v_deposit.user_id;
    
    -- Handle bonus
    IF p_offer_id IS NOT NULL AND p_bonus_amount > 0 THEN
        -- Check if already claimed
        IF EXISTS (SELECT 1 FROM public.bonus_claims WHERE user_id = v_deposit.user_id AND offer_id = p_offer_id) THEN
            NULL; -- Skip bonus
        ELSE
            v_bonus_transaction_id := gen_random_uuid();
            v_user_bonus_id := gen_random_uuid();
            v_wagering_required := p_bonus_amount * p_wagering_multiplier;
            
            IF p_wagering_multiplier > 0 THEN
                -- Wagering required: put bonus in locked_balance
                UPDATE public.wallets SET locked_balance = locked_balance + p_bonus_amount, updated_at = now()
                WHERE user_id = v_deposit.user_id;
                
                INSERT INTO public.transactions (id, user_id, type, amount, balance_before, balance_after, reference_id, description)
                VALUES (v_bonus_transaction_id, v_deposit.user_id, 'bonus', p_bonus_amount, v_new_balance, v_new_balance, p_deposit_id, 'Deposit Bonus (Locked - Wagering Required)');
                
                INSERT INTO public.user_bonuses (id, user_id, offer_id, bonus_amount, locked_amount, wagering_required, wagering_completed, status, bonus_type, source_deposit_id)
                VALUES (v_user_bonus_id, v_deposit.user_id, p_offer_id, p_bonus_amount, p_bonus_amount, v_wagering_required, 0, 'active', 'first_deposit', p_deposit_id);
            ELSE
                -- No wagering: credit bonus directly to available balance
                v_new_balance := v_new_balance + p_bonus_amount;
                UPDATE public.wallets SET balance = v_new_balance, updated_at = now()
                WHERE user_id = v_deposit.user_id;
                
                INSERT INTO public.transactions (id, user_id, type, amount, balance_before, balance_after, reference_id, description)
                VALUES (v_bonus_transaction_id, v_deposit.user_id, 'bonus', p_bonus_amount, v_new_balance - p_bonus_amount, v_new_balance, p_deposit_id, 'Deposit Bonus (Direct Credit)');
                
                INSERT INTO public.user_bonuses (id, user_id, offer_id, bonus_amount, locked_amount, unlocked_amount, wagering_required, wagering_completed, status, bonus_type, bonus_credited, transaction_id, completed_at, source_deposit_id)
                VALUES (v_user_bonus_id, v_deposit.user_id, p_offer_id, p_bonus_amount, 0, p_bonus_amount, 0, 0, 'completed', 'first_deposit', true, v_bonus_transaction_id, now(), p_deposit_id);
            END IF;
            
            -- Record claim
            INSERT INTO public.bonus_claims (user_id, offer_id) VALUES (v_deposit.user_id, p_offer_id);
        END IF;
    END IF;
    
    -- Create notification
    INSERT INTO public.notifications (user_id, title, message, type, metadata)
    VALUES (
        v_deposit.user_id,
        '🎉 Deposit Approved!',
        'Your deposit of ₹' || v_deposit.amount::TEXT || ' has been credited.' ||
        CASE WHEN p_bonus_amount > 0 THEN
            CASE WHEN p_wagering_multiplier > 0 THEN ' Bonus of ₹' || p_bonus_amount::TEXT || ' added to locked balance (wagering required)!'
            ELSE ' Bonus of ₹' || p_bonus_amount::TEXT || ' added to your wallet!'
            END
        ELSE '' END,
        'success',
        jsonb_build_object('depositId', p_deposit_id, 'amount', v_deposit.amount, 'bonusAmount', p_bonus_amount)
    );
    
    RETURN jsonb_build_object('success', true, 'depositId', p_deposit_id, 'amount', v_deposit.amount, 'newBalance', v_new_balance, 'bonusAmount', p_bonus_amount, 'transactionId', v_transaction_id);
END;
$function$;
