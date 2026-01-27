-- Create user_bonuses table for claimed bonuses
CREATE TABLE public.user_bonuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  offer_id UUID REFERENCES public.offers(id) ON DELETE CASCADE,
  bonus_amount NUMERIC NOT NULL DEFAULT 0,
  wagering_required NUMERIC NOT NULL DEFAULT 0,
  wagering_completed NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired', 'cancelled')),
  claimed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on user_bonuses
ALTER TABLE public.user_bonuses ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_bonuses
CREATE POLICY "Users can view their own bonuses" ON public.user_bonuses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can claim bonuses" ON public.user_bonuses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bonuses" ON public.user_bonuses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all bonuses" ON public.user_bonuses
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Add realtime for user_bonuses
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_bonuses;