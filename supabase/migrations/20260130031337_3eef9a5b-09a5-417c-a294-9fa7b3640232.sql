-- Add new columns to offers table for 6 bonus types
ALTER TABLE public.offers 
ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT 'gift',
ADD COLUMN IF NOT EXISTS animation TEXT DEFAULT 'fade',
ADD COLUMN IF NOT EXISTS color_scheme TEXT DEFAULT 'primary',
ADD COLUMN IF NOT EXISTS lossback_percentage NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS referral_reward NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS vip_level INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS auto_apply BOOLEAN DEFAULT false;

-- Update offer_type to support all 6 types
COMMENT ON COLUMN public.offers.offer_type IS 'Types: first_deposit, reload, lossback, festival, referral, vip_loyalty';

-- Add bonus_type column to user_bonuses to track type
ALTER TABLE public.user_bonuses 
ADD COLUMN IF NOT EXISTS bonus_type TEXT DEFAULT 'deposit',
ADD COLUMN IF NOT EXISTS locked_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS unlocked_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS animation_shown BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS source_deposit_id UUID,
ADD COLUMN IF NOT EXISTS source_trade_id UUID;

-- Create referral_codes table for referral bonus system
CREATE TABLE IF NOT EXISTS public.referral_codes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    code TEXT NOT NULL UNIQUE,
    uses_count INTEGER DEFAULT 0,
    max_uses INTEGER DEFAULT 100,
    reward_per_referral NUMERIC DEFAULT 100,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on referral_codes
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

-- RLS policies for referral_codes
CREATE POLICY "Users can view own referral codes" ON public.referral_codes
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own referral codes" ON public.referral_codes
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own referral codes" ON public.referral_codes
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all referral codes" ON public.referral_codes
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Create referrals table to track referral relationships
CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    referrer_id UUID NOT NULL,
    referee_id UUID NOT NULL,
    referral_code_id UUID REFERENCES public.referral_codes(id),
    status TEXT DEFAULT 'pending',
    bonus_credited BOOLEAN DEFAULT false,
    bonus_amount NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on referrals
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- RLS policies for referrals
CREATE POLICY "Users can view referrals they are part of" ON public.referrals
FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referee_id);

CREATE POLICY "Admins can manage all referrals" ON public.referrals
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Create atomic function for deposit confirmation with bonus
CREATE OR REPLACE FUNCTION public.confirm_deposit_with_bonus(
    p_deposit_id UUID,
    p_admin_id UUID,
    p_offer_id UUID DEFAULT NULL,
    p_bonus_amount NUMERIC DEFAULT 0,
    p_wagering_multiplier NUMERIC DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_deposit RECORD;
    v_wallet RECORD;
    v_new_balance NUMERIC;
    v_transaction_id UUID;
    v_bonus_transaction_id UUID;
    v_user_bonus_id UUID;
BEGIN
    -- Lock the deposit row for update
    SELECT * INTO v_deposit 
    FROM public.deposit_requests 
    WHERE id = p_deposit_id
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Deposit not found');
    END IF;
    
    -- Check if already processed
    IF v_deposit.status != 'pending' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Deposit already processed', 'status', v_deposit.status);
    END IF;
    
    -- Get wallet with lock
    SELECT * INTO v_wallet 
    FROM public.wallets 
    WHERE user_id = v_deposit.user_id
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
    END IF;
    
    -- Calculate new balance (deposit goes to available)
    v_new_balance := v_wallet.balance + v_deposit.amount;
    v_transaction_id := gen_random_uuid();
    
    -- Update deposit status
    UPDATE public.deposit_requests SET
        status = 'approved',
        reviewed_at = now(),
        reviewed_by = p_admin_id
    WHERE id = p_deposit_id;
    
    -- Update wallet with deposit amount
    UPDATE public.wallets SET
        balance = v_new_balance,
        updated_at = now()
    WHERE user_id = v_deposit.user_id;
    
    -- Create deposit transaction record
    INSERT INTO public.transactions (
        id, user_id, type, amount, balance_before, balance_after, 
        reference_id, description
    ) VALUES (
        v_transaction_id, v_deposit.user_id, 'deposit', v_deposit.amount,
        v_wallet.balance, v_new_balance, p_deposit_id,
        'Deposit #' || (SELECT display_id FROM transactions WHERE id = v_transaction_id)
    );
    
    -- If bonus applies, add bonus to locked_balance
    IF p_offer_id IS NOT NULL AND p_bonus_amount > 0 THEN
        v_bonus_transaction_id := gen_random_uuid();
        v_user_bonus_id := gen_random_uuid();
        
        -- Check if user already claimed this one-time offer
        IF EXISTS (
            SELECT 1 FROM public.bonus_claims 
            WHERE user_id = v_deposit.user_id AND offer_id = p_offer_id
        ) THEN
            -- Skip bonus, already claimed
            NULL;
        ELSE
            -- Add bonus to locked_balance
            UPDATE public.wallets SET
                locked_balance = locked_balance + p_bonus_amount,
                updated_at = now()
            WHERE user_id = v_deposit.user_id;
            
            -- Create bonus transaction
            INSERT INTO public.transactions (
                id, user_id, type, amount, balance_before, balance_after,
                reference_id, description
            ) VALUES (
                v_bonus_transaction_id, v_deposit.user_id, 'bonus', p_bonus_amount,
                v_new_balance, v_new_balance, p_deposit_id,
                'Deposit Bonus (Locked)'
            );
            
            -- Create user_bonus record for wagering tracking
            INSERT INTO public.user_bonuses (
                id, user_id, offer_id, bonus_amount, locked_amount,
                wagering_required, wagering_completed, status, bonus_type,
                source_deposit_id
            ) VALUES (
                v_user_bonus_id, v_deposit.user_id, p_offer_id, p_bonus_amount,
                p_bonus_amount, p_bonus_amount * p_wagering_multiplier, 0,
                CASE WHEN p_wagering_multiplier > 0 THEN 'active' ELSE 'completed' END,
                'first_deposit', p_deposit_id
            );
            
            -- Record bonus claim for one-time offers
            INSERT INTO public.bonus_claims (user_id, offer_id)
            VALUES (v_deposit.user_id, p_offer_id);
        END IF;
    END IF;
    
    -- Create notification
    INSERT INTO public.notifications (
        user_id, title, message, type, metadata
    ) VALUES (
        v_deposit.user_id,
        '🎉 Deposit Approved!',
        'Your deposit of ₹' || v_deposit.amount::TEXT || ' has been credited.' ||
        CASE WHEN p_bonus_amount > 0 THEN ' Bonus of ₹' || p_bonus_amount::TEXT || ' added to locked balance!' ELSE '' END,
        'success',
        jsonb_build_object('depositId', p_deposit_id, 'amount', v_deposit.amount, 'bonusAmount', p_bonus_amount)
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'depositId', p_deposit_id,
        'amount', v_deposit.amount,
        'newBalance', v_new_balance,
        'bonusAmount', p_bonus_amount,
        'transactionId', v_transaction_id
    );
END;
$$;

-- Create function to unlock bonus after wagering complete
CREATE OR REPLACE FUNCTION public.unlock_bonus(
    p_user_bonus_id UUID,
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_bonus RECORD;
    v_wallet RECORD;
    v_new_balance NUMERIC;
BEGIN
    -- Lock the bonus record
    SELECT * INTO v_bonus 
    FROM public.user_bonuses 
    WHERE id = p_user_bonus_id AND user_id = p_user_id
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Bonus not found');
    END IF;
    
    -- Check if already unlocked
    IF v_bonus.status = 'completed' AND v_bonus.unlocked_amount > 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Bonus already unlocked');
    END IF;
    
    -- Check if wagering complete
    IF v_bonus.wagering_completed < v_bonus.wagering_required THEN
        RETURN jsonb_build_object('success', false, 'error', 'Wagering not complete');
    END IF;
    
    -- Get wallet with lock
    SELECT * INTO v_wallet 
    FROM public.wallets 
    WHERE user_id = p_user_id
    FOR UPDATE;
    
    -- Move bonus from locked to available
    v_new_balance := v_wallet.balance + v_bonus.locked_amount;
    
    UPDATE public.wallets SET
        balance = v_new_balance,
        locked_balance = locked_balance - v_bonus.locked_amount,
        updated_at = now()
    WHERE user_id = p_user_id;
    
    -- Update bonus record
    UPDATE public.user_bonuses SET
        status = 'completed',
        unlocked_amount = locked_amount,
        locked_amount = 0,
        completed_at = now()
    WHERE id = p_user_bonus_id;
    
    -- Create transaction
    INSERT INTO public.transactions (
        user_id, type, amount, balance_before, balance_after,
        reference_id, description
    ) VALUES (
        p_user_id, 'bonus', v_bonus.bonus_amount,
        v_wallet.balance, v_new_balance, p_user_bonus_id,
        'Bonus Unlocked'
    );
    
    -- Notification
    INSERT INTO public.notifications (
        user_id, title, message, type
    ) VALUES (
        p_user_id,
        '🎊 Bonus Unlocked!',
        'Your bonus of ₹' || v_bonus.bonus_amount::TEXT || ' has been unlocked and added to your available balance!',
        'success'
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'unlockedAmount', v_bonus.bonus_amount,
        'newBalance', v_new_balance
    );
END;
$$;

-- Create function to update wagering progress on trade
CREATE OR REPLACE FUNCTION public.update_wagering_progress(
    p_user_id UUID,
    p_trade_amount NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_bonus RECORD;
BEGIN
    -- Update all active bonuses with wagering requirements
    FOR v_bonus IN 
        SELECT * FROM public.user_bonuses 
        WHERE user_id = p_user_id 
        AND status = 'active' 
        AND wagering_required > 0
    LOOP
        UPDATE public.user_bonuses SET
            wagering_completed = LEAST(wagering_completed + p_trade_amount, wagering_required)
        WHERE id = v_bonus.id;
        
        -- Check if wagering is now complete
        IF (v_bonus.wagering_completed + p_trade_amount) >= v_bonus.wagering_required THEN
            -- Auto-unlock if wagering complete
            PERFORM public.unlock_bonus(v_bonus.id, p_user_id);
        END IF;
    END LOOP;
END;
$$;