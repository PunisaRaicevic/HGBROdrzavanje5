---
name: Recurring task generation anchor
description: Why recurring child-task generation must anchor to recurrence_start_date, not "now", to avoid near-duplicate tasks.
---

# Recurring task generation must anchor to the original start, not "now"

The cron tops up each recurring template so ~8 future child tasks always exist
(`ensureChildTasksExist` in `server/services/recurringTaskProcessor.ts`). It dedups
against already-created occurrences by **calendar date** (YYYY-MM-DD).

**The rule:** date generation for interval patterns must be anchored to the template's
original `recurrence_start_date` (preserving its day-of-week and time), then rolled
forward to the first occurrence after now. Never anchor the series to the cron run
moment (`now` / `max(now, start)`).

**Why:** when generation anchored to `now`, each weekly cron run produced a series on a
different weekday/time than the original. A new occurrence could land one day off the
canonical series (e.g. canonical Saturday 09:00 vs a generated Sunday 06:29). The
date-only dedup compares whole calendar days, so it cannot catch a near-duplicate that
falls on an adjacent day — result: two near-identical recurring tasks ~1 day apart.

**How to apply:** keep `calculateScheduledDates` deterministic for a given
(recurrence_start, pattern). The simple interval fallback branches use
`rollAnchorForward(startDate, ...)` to advance the real anchor (not `baseDate =
max(start, now)`) to the first future occurrence while preserving phase. Day-specific
branches (recurrence_week_days / month_days / year_dates) already snap to fixed days,
so they keep using `baseDate`. `rollAnchorForward` must break when the pattern does not
advance (e.g. `once`) instead of spinning to its iteration guard. Deterministic series
+ date dedup = no duplicates.
