# Migration 023 — Collision Note

Two migration files share the `023_` prefix. This is a known state and must not be resolved
by renaming either file, as D1 tracks applied migrations by exact filename.

## Files

| Filename | Created | Purpose |
|---|---|---|
| `023_ai_generations.sql` | Jan 17 | Creates `ai_generations` table |
| `023_scheduling_reconciliation.sql` | Mar 20 | Renames `schedules` → `delivery_jobs`, drops old `delivery_attempts` |

## Why this happened

`023_ai_generations.sql` was written first. During a later reconciliation phase,
`023_scheduling_reconciliation.sql` was created with the same prefix to slot into the
same position in the sequence before `024_delivery_engine_phase_3.sql`. Both files
were committed and may have been applied to the production D1 database.

## What to verify before running migrations

Run the following command to see which migrations D1 has already applied:

```sh
wrangler d1 migrations list mypilotpost --remote
```

Both filenames should appear in the applied list if the database is in its current state.
If only one appears, the other is safe to apply — but review its DDL carefully first,
as `023_scheduling_reconciliation.sql` contains `DROP TABLE IF EXISTS delivery_attempts`
and `ALTER TABLE schedules RENAME TO delivery_jobs`, which are destructive if run twice.

## Rule

Do NOT rename either file. Do NOT renumber either file. Add future migrations starting
at `086_` to preserve the existing applied sequence.

## Missing numbers

029, 039, 040 are gaps in the sequence — not errors. D1 does not require sequential
numbering. Those numbers were either skipped intentionally or reserved.
