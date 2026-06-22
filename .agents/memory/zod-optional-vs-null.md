---
name: Zod optional() rejects null on user-update routes
description: Why empty optional form fields (phone, job_title) broke admin user/password updates with a 400
---

# Zod `.optional()` rejects `null`

On the user-update route, optional string columns that are nullable in the DB
(phone, job_title, department) must be declared `z.string().nullable().optional()`,
not just `z.string().optional()`.

**Why:** Edit dialogs send empty optional fields as `null` (e.g. `phone: data.phone || null`).
`z.string().optional()` accepts `undefined` but REJECTS `null`, so the whole
`safeParse` fails with "Expected string, received null" and returns 400 — the
update (including a password change in the same payload) never reaches the DB.
This presented as "admin password change silently does nothing / old password
still works" because the admin had no phone set, so the dialog sent `phone: null`.

**How to apply:** When a PATCH/POST payload may include `null` for empty optional
fields, mirror that with `.nullable().optional()` in the Zod schema (or strip nulls
client-side before sending). Testing the route with a minimal `{password}`-only
body will NOT reproduce it — you must send the full dialog payload including the
null fields.
