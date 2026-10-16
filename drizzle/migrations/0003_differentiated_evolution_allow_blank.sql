ALTER TABLE public.differentiated_reports DROP CONSTRAINT differentiated_reports_evolution_check;
ALTER TABLE public.differentiated_reports ADD CONSTRAINT differentiated_reports_evolution_check CHECK (evolution = ANY (ARRAY['Mejoró'::text, 'Igual'::text, 'Empeoró'::text, ''::text]));
ALTER TABLE public.differentiated_reports ALTER COLUMN restriction SET DEFAULT ''::text;