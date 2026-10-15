ALTER TABLE public.differentiated_reports ADD COLUMN kinesio_note text;
GRANT UPDATE (kinesio_note) ON public.differentiated_reports TO authenticated;
CREATE POLICY "staff update differentiated" ON public.differentiated_reports FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));