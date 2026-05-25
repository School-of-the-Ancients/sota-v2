-- Document the intended recompute-from-records progress surface.
-- This view intentionally derives progress from canonical records instead of
-- requiring fragile mutable counters on profile or goal rows.

create or replace view public.learner_progress_summary as
select
  user_id,
  count(*) filter (where status = 'active') as active_quests,
  count(*) filter (where status = 'completed') as completed_quests,
  count(*) filter (where status = 'needs_review') as quests_needing_review,
  count(*) filter (where status = 'practice_due') as practice_due_quests,
  max(updated_at) as last_quest_update_at
from public.quests
group by user_id;
