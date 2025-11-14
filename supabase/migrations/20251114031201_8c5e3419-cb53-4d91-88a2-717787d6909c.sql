-- Create default_template table for persistent plans
CREATE TABLE IF NOT EXISTS public.default_template (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tasks JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.default_template ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist
DROP POLICY IF EXISTS "Users can view their own default template" ON public.default_template;
DROP POLICY IF EXISTS "Users can update their own default template" ON public.default_template;
DROP POLICY IF EXISTS "Users can insert their own default template" ON public.default_template;

-- Create policies for default_template
CREATE POLICY "Users can view their own default template" 
ON public.default_template 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own default template" 
ON public.default_template 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own default template" 
ON public.default_template 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);