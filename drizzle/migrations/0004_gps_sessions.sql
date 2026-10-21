CREATE TABLE public.gps_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  team text NOT NULL DEFAULT 'Primera',
  session_type text NOT NULL DEFAULT 'Entrenamiento',
  description text,
  source_file text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gps_sessions TO authenticated;
GRANT ALL ON public.gps_sessions TO service_role;
ALTER TABLE public.gps_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage gps sessions" ON public.gps_sessions FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.gps_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.gps_sessions(id) ON DELETE CASCADE,
  player_id uuid REFERENCES public.players(id) ON DELETE SET NULL,
  gps_name text NOT NULL,
  position text,
  distance_m numeric,
  m_per_min numeric,
  hsd_m numeric,
  hsd_per_min numeric,
  sprint_per_min numeric,
  accel_decel integer,
  accel_decel_per_min numeric,
  max_speed numeric,
  max_accel numeric,
  max_decel numeric,
  duration_min numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX gps_entries_session_idx ON public.gps_entries(session_id);
CREATE INDEX gps_entries_player_idx ON public.gps_entries(player_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gps_entries TO authenticated;
GRANT ALL ON public.gps_entries TO service_role;
ALTER TABLE public.gps_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage gps entries" ON public.gps_entries FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));