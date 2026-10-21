CREATE TABLE public.gps_distance_references (
 player_line text NOT NULL CHECK (player_line IN ('Backs','Forwards')),
 session_type text NOT NULL CHECK (session_type IN ('Entrenamiento','Partido')),
 distance_m numeric NOT NULL CHECK (distance_m > 0 AND distance_m < 1000000),
 PRIMARY KEY (player_line, session_type)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gps_distance_references TO authenticated;
GRANT ALL ON public.gps_distance_references TO service_role;
ALTER TABLE public.gps_distance_references ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage GPS distance references" ON public.gps_distance_references FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
ALTER TABLE public.gps_sessions ADD COLUMN backs_target_m numeric CHECK (backs_target_m > 0 AND backs_target_m < 1000000), ADD COLUMN forwards_target_m numeric CHECK (forwards_target_m > 0 AND forwards_target_m < 1000000);
ALTER TABLE public.gps_entries ADD COLUMN player_line text CHECK (player_line IN ('Backs','Forwards'));