# Supabase

Supabase migrations, edge functions, and storage policy notes live here.

## Migrations

- `migrations/20260525180000_initial_learning_schema.sql` creates the initial M0 learning schema from `docs/DATA_MODEL.md`.
- `migrations/20260525180100_progress_summary_view.sql` adds a derived progress summary view so progress can be recomputed from canonical quest records instead of stored as fragile counters.

The initial schema covers learner profiles, goals, curricula, quests, mentor records, lesson sessions/messages, assessments, progress events, learner wiki state/events, uploads, artifacts, and prompt governance/audit records.

Row-level security is enabled for learner-owned data. Learner tables use policies equivalent to:

- select only records where `auth.uid()` owns the row;
- insert only rows owned by `auth.uid()`;
- update only owned rows, with service-layer validation for state transitions;
- delete owned rows where product policy allows deletion.

Shared prompt and system mentor records are readable to authenticated users; writes are intended to go through migrations or trusted service-role tooling.
