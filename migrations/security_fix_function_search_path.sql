-- =====================================================================
-- Security Fix: Function Search Path Mutable
-- Postavlja fiksiran search_path za funkciju update_updated_at_column
-- da spriječi potencijalnu zloupotrebu kroz manipulaciju schema putanje.
-- =====================================================================

ALTER FUNCTION public.update_updated_at_column() SET search_path = '';

-- Alternativno (ako prvi reda padne), redefinisi funkciju sa eksplicitnim search_path:
-- CREATE OR REPLACE FUNCTION public.update_updated_at_column()
--   RETURNS trigger
--   LANGUAGE plpgsql
--   SET search_path = ''
-- AS $function$
-- BEGIN
--     NEW.updated_at = NOW();
--     RETURN NEW;
-- END;
-- $function$;
