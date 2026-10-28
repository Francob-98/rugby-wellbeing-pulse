CREATE OR REPLACE FUNCTION public.delete_player_permanently(_player_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'not allowed'; END IF;
  DELETE FROM public.wellness_entries WHERE player_id = _player_id;
  DELETE FROM public.session_entries WHERE player_id = _player_id;
  DELETE FROM public.differentiated_reports WHERE player_id = _player_id;
  UPDATE public.gps_entries SET player_id = NULL WHERE player_id = _player_id;
  DELETE FROM public.players WHERE id = _player_id;
END $$;
REVOKE ALL ON FUNCTION public.delete_player_permanently(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_player_permanently(uuid) TO authenticated;