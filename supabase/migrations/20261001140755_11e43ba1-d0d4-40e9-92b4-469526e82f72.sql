CREATE TYPE public.app_role AS ENUM ('admin','staff');

CREATE TABLE public.profiles (id uuid PRIMARY KEY, email text, full_name text, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.user_roles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, role app_role NOT NULL, UNIQUE(user_id, role));
GRANT SELECT, UPDATE ON public.profiles TO authenticated; GRANT ALL ON public.profiles TO service_role;
GRANT SELECT, INSERT, DELETE ON public.user_roles TO authenticated; GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) $$;
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id) $$;

CREATE POLICY "own or admin read profiles" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "own update profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "read own roles or admin" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles(id,email,full_name) VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  IF NOT EXISTS (SELECT 1 FROM public.user_roles) THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id,'admin');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  team text NOT NULL DEFAULT 'Primera',
  position text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.players TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.players TO authenticated;
GRANT ALL ON public.players TO service_role;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read active players" ON public.players FOR SELECT TO anon, authenticated USING (active OR public.is_staff(auth.uid()));
CREATE POLICY "staff manage players" ON public.players FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.wellness_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  entry_date date NOT NULL DEFAULT current_date,
  sleep_quality smallint NOT NULL CHECK (sleep_quality BETWEEN 1 AND 5),
  sleep_hours numeric(3,1) NOT NULL CHECK (sleep_hours BETWEEN 0 AND 16),
  fatigue smallint NOT NULL CHECK (fatigue BETWEEN 1 AND 5),
  soreness smallint NOT NULL CHECK (soreness BETWEEN 1 AND 5),
  stress smallint NOT NULL CHECK (stress BETWEEN 1 AND 5),
  mood smallint NOT NULL CHECK (mood BETWEEN 1 AND 5),
  pain_zones jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.wellness_entries TO anon;
GRANT SELECT, INSERT, DELETE ON public.wellness_entries TO authenticated;
GRANT ALL ON public.wellness_entries TO service_role;
ALTER TABLE public.wellness_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone submit wellness" ON public.wellness_entries FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "staff read wellness" ON public.wellness_entries FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff delete wellness" ON public.wellness_entries FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

CREATE TABLE public.session_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  entry_date date NOT NULL DEFAULT current_date,
  team text NOT NULL,
  duration_min smallint NOT NULL CHECK (duration_min BETWEEN 1 AND 300),
  rpe smallint NOT NULL CHECK (rpe BETWEEN 1 AND 10),
  fatigue smallint NOT NULL CHECK (fatigue BETWEEN 1 AND 5),
  pain_zones jsonb NOT NULL DEFAULT '{}'::jsonb,
  comments text CHECK (char_length(comments) <= 1000),
  load integer GENERATED ALWAYS AS (rpe * duration_min) STORED,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.session_entries TO anon;
GRANT SELECT, INSERT, DELETE ON public.session_entries TO authenticated;
GRANT ALL ON public.session_entries TO service_role;
ALTER TABLE public.session_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone submit session" ON public.session_entries FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "staff read session" ON public.session_entries FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff delete session" ON public.session_entries FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));