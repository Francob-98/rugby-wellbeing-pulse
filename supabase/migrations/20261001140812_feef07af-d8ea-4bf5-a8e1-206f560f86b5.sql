DROP POLICY "public read active players" ON public.players;
CREATE POLICY "anon read active players" ON public.players FOR SELECT TO anon USING (active);
CREATE POLICY "auth read players" ON public.players FOR SELECT TO authenticated USING (active OR public.is_staff(auth.uid()));
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;