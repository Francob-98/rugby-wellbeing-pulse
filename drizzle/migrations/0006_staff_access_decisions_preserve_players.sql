CREATE TABLE public.staff_access_decisions (
 user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
 status text NOT NULL CHECK (status IN ('approved','rejected','revoked')),
 decided_by uuid NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.staff_access_decisions TO authenticated;
GRANT ALL ON public.staff_access_decisions TO service_role;
ALTER TABLE public.staff_access_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own or admin read access decision" ON public.staff_access_decisions FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE FUNCTION public.decide_staff_access(_user_id uuid, _status text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501'; END IF;
 IF _status NOT IN ('approved','rejected','revoked') OR _status IS NULL THEN RAISE EXCEPTION 'Invalid access decision'; END IF;
 PERFORM 1 FROM public.profiles WHERE id = _user_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Account not found'; END IF;
 IF public.has_role(_user_id, 'admin') THEN RAISE EXCEPTION 'Admin accounts are protected' USING ERRCODE = '42501'; END IF;
 IF _status = 'approved' THEN
   INSERT INTO public.user_roles(user_id, role) SELECT _user_id, 'staff' WHERE NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'staff');
 ELSE
   DELETE FROM public.user_roles WHERE user_id = _user_id AND role = 'staff';
 END IF;
 INSERT INTO public.staff_access_decisions(user_id,status,decided_by) VALUES(_user_id,_status,auth.uid()) ON CONFLICT(user_id) DO UPDATE SET status = EXCLUDED.status, decided_by = EXCLUDED.decided_by, updated_at = now();
END;
$$;
REVOKE ALL ON FUNCTION public.decide_staff_access(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decide_staff_access(uuid,text) TO authenticated;
REVOKE DELETE ON public.players FROM authenticated, anon;
COMMENT ON COLUMN public.players.position IS 'DEPRECATED: player_line is confirmed by each player in wellness and session entries; staff does not assign positions.';