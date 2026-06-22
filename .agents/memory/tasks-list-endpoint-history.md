---
name: /api/tasks list endpoint must not bulk-load history
description: Why GET /api/tasks must only fetch task_history for returned tasks, not all tasks
---

# GET /api/tasks: scope history fetch to returned tasks only

The list endpoint attaches `assignment_path` to every task. Computing it needs
`task_history`, but history must be fetched ONLY for tasks whose status is
`returned_to_sef` or `returned_to_operator`. All other tasks get
`assignment_path = ""`.

**Why:** `assignment_path` is displayed in list UI in exactly one place — the
Supervisor "Vratio" badge, which only renders for `returned_to_sef`. The task
detail dialog computes its own path from a per-task history endpoint, so it does
not depend on the list payload's `assignment_path`. Fetching history for all
tasks meant `getTaskHistoriesForTasks` ran ~75 sequential chunked Supabase
queries over ~16k rows on every list refetch (the client refetches the whole
list after every mutation), making `GET /api/tasks` take ~13s. That latency was
felt as 1-2 min "forwarding" delays because the operator UI only updates after
the post-mutation refetch completes. Scoping to returned tasks dropped the
endpoint to ~1.2s.

**How to apply:** Never reintroduce a full-history fetch on the list endpoint.
If a future UI needs `assignment_path` for non-returned statuses, broaden the
status filter narrowly or add a dedicated on-demand per-task path endpoint —
do not load all history for all tasks. The deeper architectural smell remains:
the client reloads ALL ~3700 tasks after every mutation; consider pagination /
optimistic updates if list size keeps growing.
