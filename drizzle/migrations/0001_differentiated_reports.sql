CREATE TABLE public.differentiated_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  source text NOT NULL CHECK (source IN ('Pre-entreno','Post-entreno')),
  player_line text,
  reason text NOT NULL,
  zones jsonb NOT NULL DEFAULT '{}'::jsonb,
  restriction text NOT NULL,
  evolution text NOT NULL CHECK (evolution IN ('Mejoró','Igual','Empeoró')),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.differentiated_reports TO anon;
GRANT SELECT, INSERT, DELETE ON public.differentiated_reports TO authenticated;
GRANT ALL ON public.differentiated_reports TO service_role;
ALTER TABLE public.differentiated_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone submit differentiated" ON public.differentiated_reports FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "staff read differentiated" ON public.differentiated_reports FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff delete differentiated" ON public.differentiated_reports FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));
CREATE INDEX differentiated_reports_date_idx ON public.differentiated_reports(entry_date);