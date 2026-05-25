-- Initial School of the Ancients v2 learning schema.
-- M0 — Rebuild Foundation
--
-- Design references:
-- - docs/DATA_MODEL.md
-- - docs/ARCHITECTURE.md
-- - docs/PROMPT_REGISTRY.md
--
-- This migration creates the initial learner-owned records for the MVP
-- learning loop and enables row-level security on user-scoped tables.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Shared prompt registry and mentor records
-- -----------------------------------------------------------------------------

create table if not exists public.prompt_definitions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  task text not null,
  description text,
  owner_area text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.prompt_versions (
  id uuid primary key default gen_random_uuid(),
  prompt_definition_id uuid not null references public.prompt_definitions(id) on delete cascade,
  version text not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'canary', 'deprecated', 'rolled_back')),
  template text,
  input_schema jsonb not null default '{}'::jsonb,
  output_schema jsonb not null default '{}'::jsonb,
  evaluation_notes text,
  rollback_notes text,
  created_at timestamptz not null default now(),
  unique (prompt_definition_id, version)
);

create table if not exists public.mentor_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  default_domain_tags jsonb not null default '[]'::jsonb,
  visibility text not null default 'system' check (visibility in ('system', 'private', 'shared', 'marketplace_later')),
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mentor_versions (
  id uuid primary key default gen_random_uuid(),
  mentor_template_id uuid not null references public.mentor_templates(id) on delete cascade,
  version text not null,
  teaching_style text,
  tone text,
  domain_expertise jsonb not null default '[]'::jsonb,
  allowed_behaviors jsonb not null default '[]'::jsonb,
  disallowed_behaviors jsonb not null default '[]'::jsonb,
  source_grounding_policy text,
  language_policy text,
  prompt_version_id uuid references public.prompt_versions(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'active', 'deprecated')),
  created_at timestamptz not null default now(),
  unique (mentor_template_id, version)
);

-- -----------------------------------------------------------------------------
-- Prompt run audit log. This comes before generated product records so those
-- records can preserve the prompt run that created or graded them.
-- -----------------------------------------------------------------------------

create table if not exists public.prompt_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  task text not null,
  prompt_version_id uuid references public.prompt_versions(id) on delete set null,
  prompt_version text,
  provider text,
  model text,
  input_hash text,
  input_summary text,
  output jsonb,
  usage jsonb,
  status text not null default 'started' check (status in ('started', 'success', 'failed', 'validation_failed', 'redacted')),
  error_message text,
  source_ids jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Learner-owned core learning loop
-- -----------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  timezone text,
  locale text,
  accessibility_preferences jsonb not null default '{}'::jsonb,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.learning_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  desired_outcome text,
  current_level text not null default 'unknown' check (current_level in ('beginner', 'intermediate', 'advanced', 'unknown')),
  time_budget_minutes_per_day integer check (time_budget_minutes_per_day is null or time_budget_minutes_per_day >= 0),
  deadline date,
  constraints jsonb not null default '[]'::jsonb,
  success_criteria jsonb not null default '[]'::jsonb,
  status text not null default 'active' check (status in ('draft', 'active', 'paused', 'completed', 'archived')),
  source text not null default 'learner',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.curricula (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null references public.learning_goals(id) on delete cascade,
  title text not null,
  description text,
  duration_days integer check (duration_days is null or duration_days > 0),
  weekly_rhythm text,
  plan jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'completed', 'archived')),
  generated_by_prompt_run_id uuid references public.prompt_runs(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null references public.learning_goals(id) on delete cascade,
  curriculum_id uuid references public.curricula(id) on delete set null,
  title text not null,
  objective text not null,
  focus_points jsonb not null default '[]'::jsonb,
  prerequisite_notes jsonb not null default '[]'::jsonb,
  mentor_version_ids jsonb not null default '[]'::jsonb,
  practice_tasks jsonb not null default '[]'::jsonb,
  mastery_criteria jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'active', 'lesson_in_progress', 'practice_due', 'quiz_ready', 'needs_review', 'completed', 'archived')),
  manual_override_reason text,
  generated_by_prompt_run_id uuid references public.prompt_runs(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lesson_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  quest_id uuid references public.quests(id) on delete set null,
  mentor_version_id uuid references public.mentor_versions(id) on delete set null,
  current_stage text not null default 'not_started' check (current_stage in ('not_started', 'explain', 'example', 'guided_practice', 'socratic_check', 'recap', 'ended')),
  status text not null default 'active' check (status in ('active', 'ended', 'abandoned', 'archived')),
  summary text,
  next_action text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lesson_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.lesson_sessions(id) on delete cascade,
  role text not null check (role in ('system', 'learner', 'mentor', 'tool')),
  content text not null,
  stage text check (stage is null or stage in ('not_started', 'explain', 'example', 'guided_practice', 'socratic_check', 'recap', 'ended')),
  event_type text not null default 'message',
  prompt_run_id uuid references public.prompt_runs(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  quest_id uuid not null references public.quests(id) on delete cascade,
  lesson_session_id uuid references public.lesson_sessions(id) on delete set null,
  type text not null check (type in ('quiz', 'short_answer', 'project', 'oral_check', 'manual_override')),
  questions jsonb not null default '[]'::jsonb,
  rubric jsonb not null default '{}'::jsonb,
  submission jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  score numeric check (score is null or (score >= 0 and score <= 1)),
  passed boolean,
  review_recommendations jsonb not null default '[]'::jsonb,
  generated_by_prompt_run_id uuid references public.prompt_runs(id) on delete set null,
  graded_by_prompt_run_id uuid references public.prompt_runs(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.progress_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  goal_id uuid references public.learning_goals(id) on delete set null,
  curriculum_id uuid references public.curricula(id) on delete set null,
  quest_id uuid references public.quests(id) on delete set null,
  lesson_session_id uuid references public.lesson_sessions(id) on delete set null,
  assessment_id uuid references public.assessments(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.learner_wikis (
  user_id uuid primary key references auth.users(id) on delete cascade,
  summary text,
  current_goals jsonb not null default '[]'::jsonb,
  completed_quests jsonb not null default '[]'::jsonb,
  mastered_concepts jsonb not null default '[]'::jsonb,
  weak_concepts jsonb not null default '[]'::jsonb,
  misconceptions jsonb not null default '[]'::jsonb,
  interests jsonb not null default '[]'::jsonb,
  preferred_learning_style text,
  next_recommendations jsonb not null default '[]'::jsonb,
  raw_state jsonb not null default '{}'::jsonb,
  last_event_id uuid,
  updated_at timestamptz not null default now()
);

create table if not exists public.learner_wiki_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('session_summary', 'assessment_result', 'manual_edit', 'recommendation', 'delete_request')),
  source_type text not null check (source_type in ('lesson_session', 'assessment', 'goal', 'quest', 'upload', 'manual')),
  source_id uuid,
  patch jsonb not null default '{}'::jsonb,
  summary text,
  prompt_run_id uuid references public.prompt_runs(id) on delete set null,
  applied_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.learner_wikis
  drop constraint if exists learner_wikis_last_event_id_fkey;

alter table public.learner_wikis
  add constraint learner_wikis_last_event_id_fkey
  foreign key (last_event_id) references public.learner_wiki_events(id) on delete set null;

create table if not exists public.uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  mime_type text,
  storage_path text not null,
  source_type text not null check (source_type in ('pdf', 'slide_deck', 'transcript', 'screenshot', 'rubric', 'pasted_text', 'url')),
  status text not null default 'uploaded' check (status in ('uploaded', 'parsing', 'parsed', 'indexed', 'failed', 'deleted')),
  title text,
  course_context jsonb not null default '{}'::jsonb,
  extracted_text_path text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.artifacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  quest_id uuid references public.quests(id) on delete set null,
  lesson_session_id uuid references public.lesson_sessions(id) on delete set null,
  upload_id uuid references public.uploads(id) on delete set null,
  type text not null check (type in ('concept_map', 'diagram', 'flashcards', 'worksheet', 'simulation', 'image', 'text_summary')),
  title text not null,
  description text,
  content jsonb not null default '{}'::jsonb,
  storage_path text,
  source_references jsonb not null default '[]'::jsonb,
  generation_prompt_run_id uuid references public.prompt_runs(id) on delete set null,
  factuality_status text not null default 'unchecked' check (factuality_status in ('unchecked', 'checked', 'needs_review', 'not_applicable')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Indexes for common ownership and relationship lookups
-- -----------------------------------------------------------------------------

create index if not exists idx_learning_goals_user_id on public.learning_goals(user_id);
create index if not exists idx_curricula_user_goal on public.curricula(user_id, goal_id);
create index if not exists idx_quests_user_goal on public.quests(user_id, goal_id);
create index if not exists idx_quests_user_status on public.quests(user_id, status);
create index if not exists idx_lesson_sessions_user_quest on public.lesson_sessions(user_id, quest_id);
create index if not exists idx_lesson_messages_session on public.lesson_messages(session_id, created_at);
create index if not exists idx_assessments_user_quest on public.assessments(user_id, quest_id);
create index if not exists idx_progress_events_user_time on public.progress_events(user_id, occurred_at desc);
create index if not exists idx_learner_wiki_events_user_time on public.learner_wiki_events(user_id, created_at desc);
create index if not exists idx_uploads_user_status on public.uploads(user_id, status);
create index if not exists idx_artifacts_user_quest on public.artifacts(user_id, quest_id);
create index if not exists idx_prompt_runs_user_time on public.prompt_runs(user_id, created_at desc);
create index if not exists idx_prompt_versions_definition_status on public.prompt_versions(prompt_definition_id, status);

-- -----------------------------------------------------------------------------
-- updated_at triggers
-- -----------------------------------------------------------------------------

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_learning_goals_updated_at on public.learning_goals;
create trigger set_learning_goals_updated_at before update on public.learning_goals
for each row execute function public.set_updated_at();

drop trigger if exists set_curricula_updated_at on public.curricula;
create trigger set_curricula_updated_at before update on public.curricula
for each row execute function public.set_updated_at();

drop trigger if exists set_quests_updated_at on public.quests;
create trigger set_quests_updated_at before update on public.quests
for each row execute function public.set_updated_at();

drop trigger if exists set_mentor_templates_updated_at on public.mentor_templates;
create trigger set_mentor_templates_updated_at before update on public.mentor_templates
for each row execute function public.set_updated_at();

drop trigger if exists set_lesson_sessions_updated_at on public.lesson_sessions;
create trigger set_lesson_sessions_updated_at before update on public.lesson_sessions
for each row execute function public.set_updated_at();

drop trigger if exists set_assessments_updated_at on public.assessments;
create trigger set_assessments_updated_at before update on public.assessments
for each row execute function public.set_updated_at();

drop trigger if exists set_prompt_runs_updated_at on public.prompt_runs;
create trigger set_prompt_runs_updated_at before update on public.prompt_runs
for each row execute function public.set_updated_at();

drop trigger if exists set_uploads_updated_at on public.uploads;
create trigger set_uploads_updated_at before update on public.uploads
for each row execute function public.set_updated_at();

drop trigger if exists set_artifacts_updated_at on public.artifacts;
create trigger set_artifacts_updated_at before update on public.artifacts
for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Row-level security
-- -----------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.learning_goals enable row level security;
alter table public.curricula enable row level security;
alter table public.quests enable row level security;
alter table public.lesson_sessions enable row level security;
alter table public.lesson_messages enable row level security;
alter table public.assessments enable row level security;
alter table public.progress_events enable row level security;
alter table public.learner_wikis enable row level security;
alter table public.learner_wiki_events enable row level security;
alter table public.uploads enable row level security;
alter table public.artifacts enable row level security;
alter table public.prompt_runs enable row level security;
alter table public.mentor_templates enable row level security;
alter table public.mentor_versions enable row level security;
alter table public.prompt_definitions enable row level security;
alter table public.prompt_versions enable row level security;

-- Profiles use id instead of user_id.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own" on public.profiles for delete using (auth.uid() = id);

-- Shared/system records are readable by authenticated users. Writes should happen
-- through migrations or trusted service-role tooling, not anonymous clients.
drop policy if exists "prompt_definitions_read_authenticated" on public.prompt_definitions;
create policy "prompt_definitions_read_authenticated" on public.prompt_definitions for select to authenticated using (true);
drop policy if exists "prompt_versions_read_authenticated" on public.prompt_versions;
create policy "prompt_versions_read_authenticated" on public.prompt_versions for select to authenticated using (true);

drop policy if exists "mentor_templates_read_visible" on public.mentor_templates;
create policy "mentor_templates_read_visible" on public.mentor_templates for select to authenticated
using (visibility in ('system', 'shared', 'marketplace_later') or created_by_user_id = auth.uid());
drop policy if exists "mentor_templates_insert_own" on public.mentor_templates;
create policy "mentor_templates_insert_own" on public.mentor_templates for insert to authenticated
with check (created_by_user_id = auth.uid() and visibility in ('private', 'shared'));
drop policy if exists "mentor_templates_update_own" on public.mentor_templates;
create policy "mentor_templates_update_own" on public.mentor_templates for update to authenticated
using (created_by_user_id = auth.uid()) with check (created_by_user_id = auth.uid());

drop policy if exists "mentor_versions_read_visible" on public.mentor_versions;
create policy "mentor_versions_read_visible" on public.mentor_versions for select to authenticated
using (
  exists (
    select 1 from public.mentor_templates mt
    where mt.id = mentor_versions.mentor_template_id
      and (mt.visibility in ('system', 'shared', 'marketplace_later') or mt.created_by_user_id = auth.uid())
  )
);

drop policy if exists "mentor_versions_insert_own_template" on public.mentor_versions;
create policy "mentor_versions_insert_own_template" on public.mentor_versions for insert to authenticated
with check (
  exists (
    select 1 from public.mentor_templates mt
    where mt.id = mentor_versions.mentor_template_id
      and mt.created_by_user_id = auth.uid()
  )
);

drop policy if exists "mentor_versions_update_own_template" on public.mentor_versions;
create policy "mentor_versions_update_own_template" on public.mentor_versions for update to authenticated
using (
  exists (
    select 1 from public.mentor_templates mt
    where mt.id = mentor_versions.mentor_template_id
      and mt.created_by_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.mentor_templates mt
    where mt.id = mentor_versions.mentor_template_id
      and mt.created_by_user_id = auth.uid()
  )
);

-- Learner-owned tables with a user_id column.
drop policy if exists "learning_goals_select_own" on public.learning_goals;
create policy "learning_goals_select_own" on public.learning_goals for select using (auth.uid() = user_id);
drop policy if exists "learning_goals_insert_own" on public.learning_goals;
create policy "learning_goals_insert_own" on public.learning_goals for insert with check (auth.uid() = user_id);
drop policy if exists "learning_goals_update_own" on public.learning_goals;
create policy "learning_goals_update_own" on public.learning_goals for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "learning_goals_delete_own" on public.learning_goals;
create policy "learning_goals_delete_own" on public.learning_goals for delete using (auth.uid() = user_id);

drop policy if exists "curricula_select_own" on public.curricula;
create policy "curricula_select_own" on public.curricula for select using (auth.uid() = user_id);
drop policy if exists "curricula_insert_own" on public.curricula;
create policy "curricula_insert_own" on public.curricula for insert with check (auth.uid() = user_id);
drop policy if exists "curricula_update_own" on public.curricula;
create policy "curricula_update_own" on public.curricula for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "curricula_delete_own" on public.curricula;
create policy "curricula_delete_own" on public.curricula for delete using (auth.uid() = user_id);

drop policy if exists "quests_select_own" on public.quests;
create policy "quests_select_own" on public.quests for select using (auth.uid() = user_id);
drop policy if exists "quests_insert_own" on public.quests;
create policy "quests_insert_own" on public.quests for insert with check (auth.uid() = user_id);
drop policy if exists "quests_update_own" on public.quests;
create policy "quests_update_own" on public.quests for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "quests_delete_own" on public.quests;
create policy "quests_delete_own" on public.quests for delete using (auth.uid() = user_id);

drop policy if exists "lesson_sessions_select_own" on public.lesson_sessions;
create policy "lesson_sessions_select_own" on public.lesson_sessions for select using (auth.uid() = user_id);
drop policy if exists "lesson_sessions_insert_own" on public.lesson_sessions;
create policy "lesson_sessions_insert_own" on public.lesson_sessions for insert with check (auth.uid() = user_id);
drop policy if exists "lesson_sessions_update_own" on public.lesson_sessions;
create policy "lesson_sessions_update_own" on public.lesson_sessions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "lesson_sessions_delete_own" on public.lesson_sessions;
create policy "lesson_sessions_delete_own" on public.lesson_sessions for delete using (auth.uid() = user_id);

drop policy if exists "lesson_messages_select_own" on public.lesson_messages;
create policy "lesson_messages_select_own" on public.lesson_messages for select using (auth.uid() = user_id);
drop policy if exists "lesson_messages_insert_own" on public.lesson_messages;
create policy "lesson_messages_insert_own" on public.lesson_messages for insert with check (auth.uid() = user_id);
drop policy if exists "lesson_messages_update_own" on public.lesson_messages;
create policy "lesson_messages_update_own" on public.lesson_messages for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "lesson_messages_delete_own" on public.lesson_messages;
create policy "lesson_messages_delete_own" on public.lesson_messages for delete using (auth.uid() = user_id);

drop policy if exists "assessments_select_own" on public.assessments;
create policy "assessments_select_own" on public.assessments for select using (auth.uid() = user_id);
drop policy if exists "assessments_insert_own" on public.assessments;
create policy "assessments_insert_own" on public.assessments for insert with check (auth.uid() = user_id);
drop policy if exists "assessments_update_own" on public.assessments;
create policy "assessments_update_own" on public.assessments for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "assessments_delete_own" on public.assessments;
create policy "assessments_delete_own" on public.assessments for delete using (auth.uid() = user_id);

drop policy if exists "progress_events_select_own" on public.progress_events;
create policy "progress_events_select_own" on public.progress_events for select using (auth.uid() = user_id);
drop policy if exists "progress_events_insert_own" on public.progress_events;
create policy "progress_events_insert_own" on public.progress_events for insert with check (auth.uid() = user_id);
drop policy if exists "progress_events_delete_own" on public.progress_events;
create policy "progress_events_delete_own" on public.progress_events for delete using (auth.uid() = user_id);

drop policy if exists "learner_wikis_select_own" on public.learner_wikis;
create policy "learner_wikis_select_own" on public.learner_wikis for select using (auth.uid() = user_id);
drop policy if exists "learner_wikis_insert_own" on public.learner_wikis;
create policy "learner_wikis_insert_own" on public.learner_wikis for insert with check (auth.uid() = user_id);
drop policy if exists "learner_wikis_update_own" on public.learner_wikis;
create policy "learner_wikis_update_own" on public.learner_wikis for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "learner_wikis_delete_own" on public.learner_wikis;
create policy "learner_wikis_delete_own" on public.learner_wikis for delete using (auth.uid() = user_id);

drop policy if exists "learner_wiki_events_select_own" on public.learner_wiki_events;
create policy "learner_wiki_events_select_own" on public.learner_wiki_events for select using (auth.uid() = user_id);
drop policy if exists "learner_wiki_events_insert_own" on public.learner_wiki_events;
create policy "learner_wiki_events_insert_own" on public.learner_wiki_events for insert with check (auth.uid() = user_id);
drop policy if exists "learner_wiki_events_delete_own" on public.learner_wiki_events;
create policy "learner_wiki_events_delete_own" on public.learner_wiki_events for delete using (auth.uid() = user_id);

drop policy if exists "uploads_select_own" on public.uploads;
create policy "uploads_select_own" on public.uploads for select using (auth.uid() = user_id);
drop policy if exists "uploads_insert_own" on public.uploads;
create policy "uploads_insert_own" on public.uploads for insert with check (auth.uid() = user_id);
drop policy if exists "uploads_update_own" on public.uploads;
create policy "uploads_update_own" on public.uploads for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "uploads_delete_own" on public.uploads;
create policy "uploads_delete_own" on public.uploads for delete using (auth.uid() = user_id);

drop policy if exists "artifacts_select_own" on public.artifacts;
create policy "artifacts_select_own" on public.artifacts for select using (auth.uid() = user_id);
drop policy if exists "artifacts_insert_own" on public.artifacts;
create policy "artifacts_insert_own" on public.artifacts for insert with check (auth.uid() = user_id);
drop policy if exists "artifacts_update_own" on public.artifacts;
create policy "artifacts_update_own" on public.artifacts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "artifacts_delete_own" on public.artifacts;
create policy "artifacts_delete_own" on public.artifacts for delete using (auth.uid() = user_id);

-- Prompt runs are visible to their learner when scoped to a learner. System rows
-- with null user_id are reserved for service-role/admin tooling.
drop policy if exists "prompt_runs_select_own" on public.prompt_runs;
create policy "prompt_runs_select_own" on public.prompt_runs for select using (auth.uid() = user_id);
drop policy if exists "prompt_runs_insert_own" on public.prompt_runs;
create policy "prompt_runs_insert_own" on public.prompt_runs for insert with check (auth.uid() = user_id);
drop policy if exists "prompt_runs_update_own" on public.prompt_runs;
create policy "prompt_runs_update_own" on public.prompt_runs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
