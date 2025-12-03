-- Create missions table for custom trackable goals
CREATE TABLE public.missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  progress_percent numeric NOT NULL DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  category text DEFAULT 'personal',
  target_date date,
  is_completed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own missions"
ON public.missions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own missions"
ON public.missions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own missions"
ON public.missions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own missions"
ON public.missions FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_missions_user_id ON public.missions(user_id);

-- Add daily goal type to productivity_goals if not exists (modify existing goal_type to allow 'daily')
-- Note: The existing goal_type column already accepts any text, so we just need to update the UI