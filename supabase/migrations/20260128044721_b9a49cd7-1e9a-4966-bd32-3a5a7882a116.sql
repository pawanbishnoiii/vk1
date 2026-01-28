-- Add profit_percentage and loss_percentage settings
INSERT INTO public.platform_settings (key, value) 
VALUES 
  ('profit_percentage', '80'),
  ('loss_percentage', '100')
ON CONFLICT (key) DO NOTHING;

-- Add wagering_multiplier column to offers table
ALTER TABLE public.offers 
ADD COLUMN IF NOT EXISTS wagering_multiplier numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS one_time_only boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS theme text DEFAULT 'default';

-- Add display_id column to trades table for unique human-readable IDs
ALTER TABLE public.trades
ADD COLUMN IF NOT EXISTS display_id serial;

-- Create unique index for display_id
CREATE UNIQUE INDEX IF NOT EXISTS trades_display_id_unique ON public.trades(display_id);

-- Add display_id to transactions table
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS display_id serial;

-- Create unique index for transactions display_id  
CREATE UNIQUE INDEX IF NOT EXISTS transactions_display_id_unique ON public.transactions(display_id);

-- Allow users to insert transactions (needed for trade win/loss logging)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'transactions' AND policyname = 'Users can create own transactions'
  ) THEN
    CREATE POLICY "Users can create own transactions" 
    ON public.transactions 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Ensure users can update their own wallet (for trade results)
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can update own wallet" ON public.wallets;
  CREATE POLICY "Users can update own wallet"
  ON public.wallets
  FOR UPDATE
  USING (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;