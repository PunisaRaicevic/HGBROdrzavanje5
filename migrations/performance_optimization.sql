-- =====================================================================
-- Performance Optimization Migration
-- Adresira sve probleme prijavljene od strane Supabase Performance Advisor:
--   1. Unindexed foreign keys (10 indeksa)
--   2. Unused indexes (uklanjanje 38 nekorištenih indeksa, čuvaju se UNIQUE constraint indeksi)
--   3. Multiple Permissive Policies (konsolidacija RLS policy-a na tasks, notifications, users)
--   4. Auth RLS Initialization Plan (umotavanje auth.uid() / auth.role() u SELECT)
--
-- Sigurno za pokretanje više puta (idempotent gdje je moguće).
-- Pokreni iz Supabase Dashboard -> SQL Editor.
-- =====================================================================

BEGIN;

-- =====================================================================
-- 1. UNINDEXED FOREIGN KEYS - dodaj indekse
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_guest_reports_task_id              ON public.guest_reports (task_id);
CREATE INDEX IF NOT EXISTS idx_inventory_requests_approved_by     ON public.inventory_requests (approved_by);
CREATE INDEX IF NOT EXISTS idx_inventory_requests_requested_by    ON public.inventory_requests (requested_by);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_user_id     ON public.inventory_transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_plans_assigned_to      ON public.maintenance_plans (assigned_to);
CREATE INDEX IF NOT EXISTS idx_service_ratings_rated_by_user_id   ON public.service_ratings (rated_by_user_id);
CREATE INDEX IF NOT EXISTS idx_task_costs_added_by                ON public.task_costs (added_by);
CREATE INDEX IF NOT EXISTS idx_task_photos_task_history_id        ON public.task_photos (task_history_id);
CREATE INDEX IF NOT EXISTS idx_task_templates_auto_assign_to      ON public.task_templates (auto_assign_to);
CREATE INDEX IF NOT EXISTS idx_tasks_external_company_id          ON public.tasks (external_company_id);

-- =====================================================================
-- 2. UNUSED INDEXES - ukloni
-- NAPOMENA: Čuvamo *_key UNIQUE constraint indekse jer drop bi narušio data integritet.
-- Ovi indeksi se mogu kasnije ponovo dodati ako Index Advisor preporuči.
-- =====================================================================
DROP INDEX IF EXISTS public.idx_daily_stats_date;
DROP INDEX IF EXISTS public.idx_external_companies_service_type;
DROP INDEX IF EXISTS public.idx_guest_reports_room_number;
DROP INDEX IF EXISTS public.idx_guest_reports_status;
DROP INDEX IF EXISTS public.idx_inventory_items_category;
DROP INDEX IF EXISTS public.idx_inventory_requests_status;
DROP INDEX IF EXISTS public.idx_inventory_transactions_item_id;
DROP INDEX IF EXISTS public.idx_inventory_transactions_timestamp;
DROP INDEX IF EXISTS public.idx_maintenance_plans_next_service;
DROP INDEX IF EXISTS public.idx_notifications_created_at;
DROP INDEX IF EXISTS public.idx_notifications_is_read;
DROP INDEX IF EXISTS public.idx_notifications_user_id;
DROP INDEX IF EXISTS public.idx_service_ratings_rated_user_id;
DROP INDEX IF EXISTS public.idx_task_assignments_from_user;
DROP INDEX IF EXISTS public.idx_task_assignments_to_user;
DROP INDEX IF EXISTS public.idx_task_costs_cost_type;
DROP INDEX IF EXISTS public.idx_task_history_user_id;
DROP INDEX IF EXISTS public.idx_task_messages_timestamp;
DROP INDEX IF EXISTS public.idx_task_messages_user_id;
DROP INDEX IF EXISTS public.idx_task_photos_uploaded_by;
DROP INDEX IF EXISTS public.idx_task_timeline_timestamp;
DROP INDEX IF EXISTS public.idx_tasks_assigned_to;
DROP INDEX IF EXISTS public.idx_tasks_deadline;
DROP INDEX IF EXISTS public.idx_tasks_operator_id;
DROP INDEX IF EXISTS public.idx_tasks_parent;
DROP INDEX IF EXISTS public.idx_tasks_priority;
DROP INDEX IF EXISTS public.idx_tasks_sef_id;
DROP INDEX IF EXISTS public.idx_tasks_status;
DROP INDEX IF EXISTS public.idx_user_activity_log_timestamp;
DROP INDEX IF EXISTS public.idx_user_activity_log_user_id;
DROP INDEX IF EXISTS public.idx_user_sessions_expires_at;
DROP INDEX IF EXISTS public.idx_user_sessions_token;
DROP INDEX IF EXISTS public.idx_user_sessions_user_id;
DROP INDEX IF EXISTS public.idx_users_department;
DROP INDEX IF EXISTS public.idx_users_email;
DROP INDEX IF EXISTS public.idx_users_shift;
DROP INDEX IF EXISTS public.idx_work_sessions_check_in;
DROP INDEX IF EXISTS public.idx_work_sessions_user_id;

-- =====================================================================
-- 3. MULTIPLE PERMISSIVE POLICIES + 4. AUTH RLS INITIALIZATION PLAN
-- Brišemo sve postojeće policy-je na zahvaćenim tabelama i kreiramo
-- konsolidovane verzije sa (select auth.uid()) / (select auth.role())
-- za optimizaciju (Postgres evaluira jednom, ne za svaki red).
-- =====================================================================

-- ---------- TABLE: tasks ----------
DROP POLICY IF EXISTS "Allow all for authenticated users"      ON public.tasks;
DROP POLICY IF EXISTS "temp_allow_all"                          ON public.tasks;
DROP POLICY IF EXISTS "Enable update for authenticated users"   ON public.tasks;

CREATE POLICY "tasks_service_role_all" ON public.tasks
  FOR ALL TO public
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

CREATE POLICY "tasks_authenticated_all" ON public.tasks
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- ---------- TABLE: notifications ----------
DROP POLICY IF EXISTS "Block unauthenticated access to notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view own notifications"               ON public.notifications;

CREATE POLICY "notifications_service_role_all" ON public.notifications
  FOR ALL TO public
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

CREATE POLICY "notifications_owner_select" ON public.notifications
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ---------- TABLE: users ----------
DROP POLICY IF EXISTS "Enable read access for authentication"             ON public.users;
DROP POLICY IF EXISTS "Enable fcm token update for authenticated users"   ON public.users;
DROP POLICY IF EXISTS "Enable update for authenticated users"             ON public.users;
DROP POLICY IF EXISTS "Enable update for password reset"                  ON public.users;

CREATE POLICY "users_service_role_all" ON public.users
  FOR ALL TO public
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

CREATE POLICY "users_public_read" ON public.users
  FOR SELECT TO public
  USING (true);

CREATE POLICY "users_authenticated_update" ON public.users
  FOR UPDATE TO authenticated
  USING ((SELECT auth.role()) = 'authenticated')
  WITH CHECK ((SELECT auth.role()) = 'authenticated');

-- ---------- TABLE: user_device_tokens ----------
DROP POLICY IF EXISTS "Block authenticated user direct access"        ON public.user_device_tokens;
DROP POLICY IF EXISTS "Service role can manage all device tokens"     ON public.user_device_tokens;

CREATE POLICY "user_device_tokens_service_role_all" ON public.user_device_tokens
  FOR ALL TO public
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

-- ---------- TABLE: task_history ----------
DROP POLICY IF EXISTS "Block unauthenticated access to task_history"  ON public.task_history;

CREATE POLICY "task_history_service_role_all" ON public.task_history
  FOR ALL TO public
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

COMMIT;

-- =====================================================================
-- VERIFIKACIJA - pokreni nakon migracije da provjeriš stanje
-- =====================================================================
-- SELECT tablename, policyname, cmd, qual FROM pg_policies WHERE schemaname='public' ORDER BY tablename, cmd;
-- SELECT indexname FROM pg_indexes WHERE schemaname='public' ORDER BY indexname;
