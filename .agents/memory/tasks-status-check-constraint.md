---
name: tasks status check constraint
description: The Supabase tasks.status CHECK constraint must list every status value the app writes, or PATCH fails with a 23514 violation.
---

# tasks_status_check constraint

The `public.tasks` table in Supabase has a CHECK constraint `tasks_status_check`
restricting `status` to a fixed list of allowed values. `shared/schema.ts` only
types it as `varchar` — the allowed set lives ONLY in the DB constraint, not in
Drizzle.

**Rule:** Any new status value the app writes (frontend/backend) must also be
added to `tasks_status_check`, or the write fails with Postgres error 23514
`new row ... violates check constraint "tasks_status_check"` and the API returns 500.

**Why:** The "Vrati i odbij" (reject task back to reporter) feature writes
`status = 'rejected'`, but that value was missing from the constraint, so every
reject 500'd even though the whole codebase already used `'rejected'` consistently.

**How to apply:**
- The DB is reached via `DATABASE_URL` (Supabase pooler) — same physical DB for
  dev AND prod, so altering the constraint once fixes both. Replit Publish does
  NOT manage this constraint (it is not in the Drizzle schema).
- Read the current def:
  `select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.tasks'::regclass and conname='tasks_status_check'`
- To change: `ALTER TABLE public.tasks DROP CONSTRAINT tasks_status_check;` then
  `ADD CONSTRAINT tasks_status_check CHECK (status = ANY(ARRAY[... ,'newvalue']))`.
- Current allowed set: new, with_operator, assigned_to_radnik, with_sef,
  with_external, returned_to_operator, returned_to_sef, completed, cancelled,
  in_progress, accepted, rejected.
- There are sibling constraints with the same pattern: `tasks_priority_check`
  (normal/urgent/can_wait) and `tasks_assigned_to_type_check` (radnik/serviser).
