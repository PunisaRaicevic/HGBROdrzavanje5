---
name: Recurring task occurrence dedup
description: Why the recurring-task cron must dedup against ALL children, not just active ones.
---

# Recurring task duplicate-occurrence bug

The cron (`server/services/recurringTaskProcessor.ts` → `ensureChildTasksExist`) pre-generates
future occurrences of a recurring template and guards against creating two tasks for the same
scheduled day via an `existingDates` set.

**Rule:** build `existingDates` from ALL existing children (including `completed`/`cancelled`),
never only the active ones.

**Why:** the processor's `startDate` is `max(now, recurrence_start_date)`, so it always
considers *today*. If the dedup set is built only from active children, then once a worker
**completes** today's occurrence it drops out of the set, and every subsequent cron run that day
(every 15 min) recreates the same already-completed date — producing 4-5 duplicate tasks for one
scheduled day. Confirmed in prod: a monthly task had 5 completed copies for the same date created
at 06:44/06:59/07:44/09:59.

**How to apply:** the count of how many to maintain (`TASKS_TO_MAINTAIN - activeCount`) can use
active children, but the date-collision guard must use the full child list.
