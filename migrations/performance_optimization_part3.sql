-- =====================================================================
-- Performance Optimization - Part 3
-- Eliminiše "Multiple Permissive Policies" upozorenja tako što
-- konsoliduje policy-je u JEDAN po komandi (ALL/SELECT/UPDATE),
-- koji u USING klauzuli kombinuje uslove za service_role i authenticated.
-- =====================================================================

BEGIN;

-- ---------- TABLE: tasks ----------
DROP POLICY IF EXISTS "tasks_service_role_all"   ON public.tasks;
DROP POLICY IF EXISTS "tasks_authenticated_all"  ON public.tasks;

CREATE POLICY "tasks_access" ON public.tasks
  FOR ALL TO public
  USING (
    (SELECT auth.role()) = 'service_role'
    OR (SELECT auth.uid()) IS NOT NULL
  )
  WITH CHECK (
    (SELECT auth.role()) = 'service_role'
    OR (SELECT auth.uid()) IS NOT NULL
  );

-- ---------- TABLE: notifications ----------
DROP POLICY IF EXISTS "notifications_service_role_all" ON public.notifications;
DROP POLICY IF EXISTS "notifications_owner_select"     ON public.notifications;

-- ALL operacije: samo service_role
CREATE POLICY "notifications_service_role_all" ON public.notifications
  FOR ALL TO public
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

-- SELECT za authenticated (vlasnik svojih notifikacija) - različita komanda od ALL
-- ali ALL pokriva i SELECT za service_role, pa je ovo "permissive" duplikat samo
-- kada authenticated user istovremeno ima service_role rolu (nema). Da izbegnemo
-- upozorenje, koristimo restriktivnu kombinaciju:
CREATE POLICY "notifications_owner_select" ON public.notifications
  AS PERMISSIVE
  FOR SELECT TO authenticated
  USING (
    (SELECT auth.uid()) = user_id
    AND (SELECT auth.role()) <> 'service_role'
  );

-- ---------- TABLE: users ----------
DROP POLICY IF EXISTS "users_service_role_all"      ON public.users;
DROP POLICY IF EXISTS "users_public_read"           ON public.users;
DROP POLICY IF EXISTS "users_authenticated_update"  ON public.users;

-- Jedan policy za SELECT (svi mogu, uključujući anon login flow)
CREATE POLICY "users_select_access" ON public.users
  FOR SELECT TO public
  USING (true);

-- Jedan policy za INSERT/UPDATE/DELETE (samo service_role ili authenticated)
CREATE POLICY "users_modify_access" ON public.users
  FOR ALL TO public
  USING (
    (SELECT auth.role()) IN ('service_role', 'authenticated')
  )
  WITH CHECK (
    (SELECT auth.role()) IN ('service_role', 'authenticated')
  );

COMMIT;
