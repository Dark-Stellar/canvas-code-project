
CREATE TABLE public.routine_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  segments jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, day_of_week)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.routine_templates TO authenticated;
GRANT ALL ON public.routine_templates TO service_role;
ALTER TABLE public.routine_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own routine templates" ON public.routine_templates
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER routine_templates_updated_at BEFORE UPDATE ON public.routine_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.routine_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL,
  segments jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.routine_days TO authenticated;
GRANT ALL ON public.routine_days TO service_role;
ALTER TABLE public.routine_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own routine days" ON public.routine_days
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER routine_days_updated_at BEFORE UPDATE ON public.routine_days
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_routine_days_user_date ON public.routine_days(user_id, date);
