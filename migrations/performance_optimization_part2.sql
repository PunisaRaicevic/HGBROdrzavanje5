-- =====================================================================
-- Performance Optimization - Part 2
-- Vraća FK indekse koji su u prvoj migraciji obrisani kao "nekorišteni",
-- ali su zapravo bili indeksi nad foreign key kolonama. Performance Advisor
-- ih sada ponovo prijavljuje kao "Unindexed foreign keys".
--
-- FK indeksi su važni za brisanje redova (cascade), JOIN-ove, i postaju
-- aktivno korišćeni kako baza raste. Ostavljamo ih.
-- =====================================================================

BEGIN;

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_item_id ON public.inventory_transactions (item_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id          ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_service_ratings_rated_user_id  ON public.service_ratings (rated_user_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_from_user_id  ON public.task_assignments (from_user_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_to_user_id    ON public.task_assignments (to_user_id);
CREATE INDEX IF NOT EXISTS idx_task_history_user_id           ON public.task_history (user_id);
CREATE INDEX IF NOT EXISTS idx_task_messages_user_id          ON public.task_messages (user_id);
CREATE INDEX IF NOT EXISTS idx_task_photos_uploaded_by        ON public.task_photos (uploaded_by);
CREATE INDEX IF NOT EXISTS idx_tasks_operator_id              ON public.tasks (operator_id);
CREATE INDEX IF NOT EXISTS idx_tasks_sef_id                   ON public.tasks (sef_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_user_id      ON public.user_activity_log (user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id          ON public.user_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_work_sessions_user_id          ON public.work_sessions (user_id);

COMMIT;
