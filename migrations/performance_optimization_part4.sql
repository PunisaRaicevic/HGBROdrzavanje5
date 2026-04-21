-- =====================================================================
-- Performance Optimization - Part 4
-- Eliminiše preostala "Multiple Permissive Policies" upozorenja
-- razdvajanjem FOR ALL policy-ja na INSERT/UPDATE/DELETE
-- (jer FOR ALL pokriva i SELECT, što stvara duplikat sa FOR SELECT policy-jima).
-- =====================================================================

BEGIN;

-- ---------- TABLE: users ----------
DROP POLICY IF EXISTS "users_modify_access" ON public.users;
DROP POLICY IF EXISTS "users_select_access" ON public.users;

CREATE POLICY "users_select" ON public.users
  FOR SELECT TO public
  USING (true);

CREATE POLICY "users_insert" ON public.users
  FOR INSERT TO public
  WITH CHECK ((SELECT auth.role()) IN ('service_role', 'authenticated'));

CREATE POLICY "users_update" ON public.users
  FOR UPDATE TO public
  USING ((SELECT auth.role()) IN ('service_role', 'authenticated'))
  WITH CHECK ((SELECT auth.role()) IN ('service_role', 'authenticated'));

CREATE POLICY "users_delete" ON public.users
  FOR DELETE TO public
  USING ((SELECT auth.role()) IN ('service_role', 'authenticated'));

-- ---------- TABLE: notifications ----------
DROP POLICY IF EXISTS "notifications_service_role_all" ON public.notifications;
DROP POLICY IF EXISTS "notifications_owner_select"     ON public.notifications;

CREATE POLICY "notifications_select" ON public.notifications
  FOR SELECT TO public
  USING (
    (SELECT auth.role()) = 'service_role'
    OR (SELECT auth.uid()) = user_id
  );

CREATE POLICY "notifications_insert" ON public.notifications
  FOR INSERT TO public
  WITH CHECK ((SELECT auth.role()) = 'service_role');

CREATE POLICY "notifications_update" ON public.notifications
  FOR UPDATE TO public
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

CREATE POLICY "notifications_delete" ON public.notifications
  FOR DELETE TO public
  USING ((SELECT auth.role()) = 'service_role');

COMMIT;
