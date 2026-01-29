-- Add processing_status to trades for idempotency
ALTER TABLE public.trades 
ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'pending';

-- Add settlement_id for ensuring single settlement per trade
ALTER TABLE public.trades 
ADD COLUMN IF NOT EXISTS settlement_id UUID UNIQUE;

-- Add claimed_by to track one-time bonus claims
CREATE TABLE IF NOT EXISTS public.bonus_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    offer_id UUID NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
    claimed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, offer_id)
);

-- Enable RLS on bonus_claims
ALTER TABLE public.bonus_claims ENABLE ROW LEVEL SECURITY;

-- RLS policies for bonus_claims
CREATE POLICY "Users can view own claims"
ON public.bonus_claims FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own claims"
ON public.bonus_claims FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all claims"
ON public.bonus_claims FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add profile fields for help/profile section
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS trading_level TEXT DEFAULT 'beginner';

-- Create function for atomic wallet update with settlement
CREATE OR REPLACE FUNCTION public.settle_trade(
    p_trade_id UUID,
    p_user_id UUID,
    p_won BOOLEAN,
    p_profit_loss NUMERIC,
    p_exit_price NUMERIC,
    p_settlement_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_trade RECORD;
    v_wallet RECORD;
    v_new_balance NUMERIC;
    v_existing_settlement UUID;
BEGIN
    -- Lock the trade row for update
    SELECT * INTO v_trade 
    FROM public.trades 
    WHERE id = p_trade_id AND user_id = p_user_id
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Trade not found');
    END IF;
    
    -- Check if already settled
    IF v_trade.status != 'pending' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Trade already settled', 'status', v_trade.status);
    END IF;
    
    -- Check for duplicate settlement using settlement_id
    IF v_trade.settlement_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Trade already has settlement ID');
    END IF;
    
    -- Get wallet with lock
    SELECT * INTO v_wallet 
    FROM public.wallets 
    WHERE user_id = p_user_id
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
    END IF;
    
    -- Calculate new balance
    v_new_balance := v_wallet.balance + p_profit_loss;
    
    -- Update trade atomically
    UPDATE public.trades SET
        status = CASE WHEN p_won THEN 'won'::trade_status ELSE 'lost'::trade_status END,
        profit_loss = p_profit_loss,
        exit_price = p_exit_price,
        closed_at = now(),
        processing_status = 'completed',
        settlement_id = p_settlement_id
    WHERE id = p_trade_id;
    
    -- Update wallet atomically
    UPDATE public.wallets SET
        balance = v_new_balance,
        locked_balance = 0,
        updated_at = now()
    WHERE user_id = p_user_id;
    
    -- Create transaction record
    INSERT INTO public.transactions (
        user_id,
        type,
        amount,
        balance_before,
        balance_after,
        reference_id,
        description
    ) VALUES (
        p_user_id,
        CASE WHEN p_won THEN 'trade_win'::transaction_type ELSE 'trade_loss'::transaction_type END,
        p_profit_loss,
        v_wallet.balance,
        v_new_balance,
        p_trade_id,
        'Trade #' || v_trade.display_id || ' - ' || CASE WHEN p_won THEN 'Won' ELSE 'Lost' END
    );
    
    -- Create notification
    INSERT INTO public.notifications (
        user_id,
        title,
        message,
        type,
        metadata
    ) VALUES (
        p_user_id,
        CASE WHEN p_won THEN '🎉 Trade Won!' ELSE '📉 Trade Lost' END,
        CASE WHEN p_won 
            THEN 'You won ₹' || ABS(p_profit_loss)::TEXT || ' on Trade #' || v_trade.display_id
            ELSE 'You lost ₹' || ABS(p_profit_loss)::TEXT || ' on Trade #' || v_trade.display_id
        END,
        'trade_result',
        jsonb_build_object('tradeId', p_trade_id, 'won', p_won, 'profitLoss', p_profit_loss)
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'won', p_won,
        'profitLoss', p_profit_loss,
        'newBalance', v_new_balance,
        'tradeId', p_trade_id,
        'settlementId', p_settlement_id
    );
END;
$$;

-- Grant execute permission to authenticated users (edge functions use service role)
GRANT EXECUTE ON FUNCTION public.settle_trade TO authenticated;
GRANT EXECUTE ON FUNCTION public.settle_trade TO service_role;