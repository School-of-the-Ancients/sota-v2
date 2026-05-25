# School of the Ancients — Fresh Rebuild Implementation Plan

**Status:** Living implementation plan; M0/M1 complete
**Date:** May 25, 2026  
**Goal:** Start from a clean, text-first architecture and add improvements in staged epics.

---

## 1. Architectural Decision

The rebuild should be a **text-first learning engine** with optional presentation layers.

```text
Core Learning Engine
  ├── Web UI
  ├── Voice UI
  ├── Artifact UI
  └── VR / Operator UI
```

The core engine owns:

- goals
- curricula
- quests
- mentors
- lesson sessions
- assessments
- progress
- learner wiki
- uploaded course materials
- prompt/version logs

Voice and VR should not own learning state. They are clients.

---

## 2. Repository Strategy

Decision after M0/M1: `School-of-the-Ancients/sota-v2` is the canonical app repo. The older `sota-beta` repository remains a reference, not the active implementation target.

Archive or mark the old repos clearly:

- `sota-alpha` — archive / historical prototype
- `sota-beta` — current beta reference
- `sota-v2-feature-creeped` — private salvage/reference only
- `research` — curated research/source material
- `school-of-the-ancients-vr` — VR client prototype
- `matrix-loading-operator` — operator concept/reference
- `School-of-the-Ancients.github.io` — landing/site

**Current decision:** Build in `sota-v2` and treat previous repos as references unless a specific design or implementation pattern is intentionally ported.

---

## 3. Proposed Codebase Structure

A clean single-repo structure:

```text
sota-v2/
  docs/
    SOTA_FRESH_REBUILD_PRD.md
    SOTA_FRESH_REBUILD_IMPLEMENTATION_PLAN.md
    ARCHITECTURE.md
    DATA_MODEL.md
    PROMPT_REGISTRY.md
    ROADMAP.md
    decisions/
      ADR-001-text-first-core.md
      ADR-002-ai-provider-adapter.md
      ADR-003-learner-wiki.md
    reference/
      vr-vision.md
      ancient-education-framework.md

  src/
    app/
      App.tsx
      router.tsx
      routes/
        HomeRoute.tsx
        GoalRoute.tsx
        CurriculumRoute.tsx
        QuestRoute.tsx
        LessonRoute.tsx
        ProgressRoute.tsx
        WikiRoute.tsx
        StudyOracleRoute.tsx
        SettingsRoute.tsx

    features/
      goals/
        GoalIntake.tsx
        goalService.ts
        goalTypes.ts
        goalPrompts.ts

      curriculum/
        CurriculumView.tsx
        curriculumService.ts
        curriculumTypes.ts
        curriculumPrompts.ts

      quests/
        QuestBoard.tsx
        QuestDetail.tsx
        questStateMachine.ts
        questService.ts
        questTypes.ts

      mentors/
        MentorCard.tsx
        mentorRegistry.ts
        mentorService.ts
        mentorTypes.ts

      lessons/
        LessonRuntime.tsx
        LessonStageIndicator.tsx
        lessonStateMachine.ts
        lessonService.ts
        lessonTypes.ts

      assessment/
        QuizView.tsx
        RubricResult.tsx
        assessmentService.ts
        assessmentTypes.ts
        assessmentPrompts.ts

      learner-wiki/
        LearnerWikiView.tsx
        wikiService.ts
        wikiTypes.ts
        wikiPrompts.ts

      study-oracle/
        StudyOracleUpload.tsx
        StudyOracleDashboard.tsx
        studyOracleService.ts
        studyOracleTypes.ts
        studyOraclePrompts.ts

      artifacts/
        ArtifactLibrary.tsx
        artifactService.ts
        artifactTypes.ts

      voice/
        VoiceControls.tsx
        useSpeechToText.ts
        useTextToSpeech.ts

    lib/
      ai/
        aiGateway.ts
        providers/
          textProvider.ts
          artifactProvider.ts
          speechProvider.ts
          embeddingsProvider.ts
        schemas.ts
        promptRunner.ts

      db/
        supabaseClient.ts
        repositories/
          goalsRepo.ts
          questsRepo.ts
          sessionsRepo.ts
          wikiRepo.ts
          uploadsRepo.ts

      validation/
        schemas.ts

      telemetry/
        analytics.ts
        errors.ts

      security/
        permissions.ts
        redaction.ts

    components/
      ui/
        Button.tsx
        Card.tsx
        Modal.tsx
        Tabs.tsx
        ProgressBar.tsx

  supabase/
    migrations/
    functions/
      ai-chat/
      generate-curriculum/
      update-learner-wiki/
      study-oracle/
      artifact-generate/
      speech-to-text/
      text-to-speech/

  prompts/
    mentors/
    quests/
    lessons/
    assessment/
    learner-wiki/
    study-oracle/

  tests/
    e2e/
    fixtures/
```

---

## 4. Implementation Principle: No Raw AI Calls From the Browser

The browser should call your API gateway or Supabase Edge Functions.

Bad:

```text
Browser → model provider directly
```

Good:

```text
Browser → Supabase/Vercel function → provider adapter → model
```

Reasons:

- Protect API keys
- Add logging
- Validate JSON
- Enforce rate limits
- Version prompts
- Swap providers
- Add source grounding and safety filters

---

## 5. Provider Adapter Pattern

Create a provider-agnostic AI gateway:

```ts
type TextGenerationRequest = {
  task:
    | 'goal_refinement'
    | 'curriculum_generation'
    | 'quest_generation'
    | 'lesson_response'
    | 'assessment_generation'
    | 'wiki_update'
    | 'study_oracle_analysis';
  promptVersion: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  jsonSchema?: unknown;
  temperature?: number;
  userId: string;
};

type TextGenerationResponse<T> = {
  data: T;
  model: string;
  provider: string;
  promptVersion: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
};
```

Then implement adapters:

```text
providers/
  openaiTextProvider.ts
  googleTextProvider.ts
  anthropicTextProvider.ts
  localTextProvider.ts
```

Do the same for:

- embeddings
- artifacts
- STT
- TTS

---

## 6. Core State Machines

## 6.1 Quest State Machine

```text
draft
  → active
  → lesson_in_progress
  → practice_due
  → quiz_ready
  → complete
  → archived

Any active state
  → needs_review
  → active
```

Rules:

- A quest cannot complete without an assessment or explicit manual override.
- Failing quiz moves to `needs_review`.
- Completing review moves back to `quiz_ready`.
- Deleting a quest should not corrupt progress counters.

## 6.2 Lesson Runtime State Machine

```text
not_started
  → explain
  → example
  → guided_practice
  → socratic_check
  → recap
  → ended
```

Rules:

- The learner can request “more explanation,” moving back to `explain`.
- Poor performance during Socratic check moves back to `guided_practice`.
- Each stage produces a structured event.

## 6.3 Study Oracle State Machine

```text
uploaded
  → parsed
  → indexed
  → analyzed
  → study_plan_ready
  → practice_ready
  → review_in_progress
  → completed
```

Rules:

- No predictions without at least one source document.
- All outputs reference the uploaded material.
- Outputs are clearly marked as study aids, not guaranteed exam predictions.

---

## 7. Database Schema

Use Supabase Postgres for v0.1. Add vector support after document uploads and Study Oracle need it.

### 7.1 `profiles`

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  timezone text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### 7.2 `learning_goals`

```sql
create table learning_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  desired_outcome text,
  current_level text,
  time_budget_minutes_per_day integer,
  deadline date,
  constraints jsonb default '[]'::jsonb,
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### 7.3 `curricula`

```sql
create table curricula (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid references learning_goals(id) on delete cascade,
  title text not null,
  plan jsonb not null,
  status text default 'draft',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### 7.4 `quests`

```sql
create table quests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  curriculum_id uuid references curricula(id) on delete set null,
  goal_id uuid references learning_goals(id) on delete cascade,
  title text not null,
  objective text not null,
  focus_points jsonb default '[]'::jsonb,
  mentor_ids jsonb default '[]'::jsonb,
  status text not null default 'draft',
  mastery_tags jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### 7.5 `lesson_sessions`

```sql
create table lesson_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  quest_id uuid references quests(id) on delete set null,
  mentor_id text,
  current_stage text,
  summary text,
  next_action text,
  started_at timestamptz default now(),
  ended_at timestamptz
);
```

### 7.6 `messages`

```sql
create table messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references lesson_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  content text not null,
  stage text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
```

### 7.7 `assessments`

```sql
create table assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  quest_id uuid references quests(id) on delete cascade,
  type text not null,
  rubric jsonb,
  questions jsonb,
  result jsonb,
  score numeric,
  passed boolean,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### 7.8 `learner_wikis`

```sql
create table learner_wikis (
  user_id uuid primary key references auth.users(id) on delete cascade,
  summary text,
  interests jsonb default '[]'::jsonb,
  mastered_concepts jsonb default '[]'::jsonb,
  weak_concepts jsonb default '[]'::jsonb,
  misconceptions jsonb default '[]'::jsonb,
  preferred_learning_style text,
  next_recommendations jsonb default '[]'::jsonb,
  raw_state jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);
```

### 7.9 `uploads`

```sql
create table uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  mime_type text,
  storage_path text not null,
  source_type text,
  status text default 'uploaded',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
```

### 7.10 `prompt_runs`

```sql
create table prompt_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  task text not null,
  prompt_version text not null,
  provider text,
  model text,
  input_hash text,
  output jsonb,
  usage jsonb,
  created_at timestamptz default now()
);
```

---

## 8. Supabase Row-Level Security

Every user-owned table needs RLS:

```sql
alter table learning_goals enable row level security;

create policy "Users can read their own learning goals"
on learning_goals for select
using (auth.uid() = user_id);

create policy "Users can insert their own learning goals"
on learning_goals for insert
with check (auth.uid() = user_id);

create policy "Users can update their own learning goals"
on learning_goals for update
using (auth.uid() = user_id);

create policy "Users can delete their own learning goals"
on learning_goals for delete
using (auth.uid() = user_id);
```

Repeat for:

- curricula
- quests
- lesson_sessions
- messages
- assessments
- learner_wikis
- uploads
- artifacts

---

## 9. Edge Functions / API Routes

### 9.1 `goal-refine`

Input:

```json
{
  "rawGoal": "I want to learn calculus",
  "context": {
    "currentLevel": "unknown",
    "deadline": null
  }
}
```

Output:

```json
{
  "title": "Learn Differential Calculus",
  "clarifyingQuestions": [],
  "desiredOutcome": "Solve and explain derivative problems",
  "currentLevel": "beginner",
  "successCriteria": [
    "Can explain limits intuitively",
    "Can compute basic derivatives",
    "Can solve applied rate-of-change problems"
  ]
}
```

### 9.2 `curriculum-generate`

Creates a plan from a goal.

### 9.3 `quest-generate`

Creates quest objects from a curriculum.

### 9.4 `lesson-respond`

Runs the current lesson state and returns a structured response.

### 9.5 `assessment-generate`

Generates quiz/homework questions and rubrics.

### 9.6 `assessment-grade`

Grades short answer or project-style responses.

### 9.7 `wiki-update`

Updates the learner wiki after a session or assessment.

### 9.8 `study-oracle-analyze`

Analyzes uploaded course materials.

### 9.9 `artifact-generate`

Creates diagrams, concept maps, flashcards, or later images/video.

### 9.10 `speech-to-text` and `text-to-speech`

Wrap the text-first runtime in audio.

---

## 10. Prompt Registry

Prompts should live as versioned files, not hidden inside components.

```text
prompts/
  lessons/
    lesson-runtime.v1.md
    lesson-runtime.v2.md
  quests/
    quest-generator.v1.md
  assessment/
    quiz-generator.v1.md
    short-answer-grader.v1.md
  learner-wiki/
    update-wiki.v1.md
  study-oracle/
    analyze-course-materials.v1.md
```

Every prompt file should define:

- purpose
- inputs
- output schema
- model constraints
- safety rules
- examples
- version

---

## 11. JSON Validation

Every AI response that becomes app state should be schema validated.

Use Zod or equivalent:

```ts
const QuestSchema = z.object({
  title: z.string(),
  objective: z.string(),
  focusPoints: z.array(z.string()).min(1),
  estimatedMinutes: z.number().int().positive(),
  mentorIds: z.array(z.string()),
  assessmentCriteria: z.array(z.string())
});
```

If the model output fails validation:

1. Retry once with a repair prompt.
2. If still invalid, save a prompt run error.
3. Show a user-friendly retry state.

---

## 12. UI Routes

### `/`

Home dashboard.

Cards:

- Start a new goal
- Continue current quest
- Learner Wiki
- Study Oracle
- Progress
- Mentor library

### `/goals/new`

Goal intake and clarification.

### `/curriculum/:id`

Generated curriculum overview.

### `/quests/:id`

Quest details, stage, homework, assessment.

### `/learn/:sessionId`

3-2-1 lesson runtime.

### `/progress`

Mastery map, completed quests, badges, streaks.

### `/wiki`

Learner Wiki.

### `/study`

Study Oracle.

### `/settings`

Privacy, data export, voice settings, provider settings.

---

## 13. First Build Sequence

### Phase 0 — Cleanup and Specs

**Status:** Complete.

**Done when:**

- PRD is in `/docs/SOTA_FRESH_REBUILD_PRD.md`
- Implementation plan is in `/docs/SOTA_FRESH_REBUILD_IMPLEMENTATION_PLAN.md`
- Repo roles documented
- Feature-creeped ideas moved to backlog
- Project board/milestones/labels created
- `docs/ROADMAP.md` tracks the living milestone sequence

### Phase 1 — Foundation

**Status:** Complete for M0 repository/app seams. Production Supabase auth/migrations remain a later hardening pass behind the repository boundaries.

**Build:**

- Clean app shell
- Auth
- Supabase client
- DB migrations
- RLS policies
- AI gateway function
- Prompt registry
- Basic test setup

**Done when:**

- User can sign in
- User can create a goal
- Goal persists
- AI gateway returns validated JSON
- No API key exposed in browser

### Phase 2 — Core Loop v0

**Status:** Complete for M1 text-first service/runtime seams and static app shell.

**Build:**

- Goal refinement
- Curriculum generation
- Quest generation
- Mentor assignment
- Lesson runtime state machine
- Chat messages
- Session summary

**Done when:**

- User enters goal
- System creates first quest
- User completes a full 3-2-1 text session
- Transcript and summary persist

### Phase 3 — Assessment and Progress

**Build:**

- Homework tasks
- Quiz generation
- Quiz grading
- Quest completion logic
- Progress dashboard
- Badges v0

**Done when:**

- Quest can move to `complete` only after passing
- Failing quiz creates review path
- Progress counters cannot drift

### Phase 4 — Learner Wiki

**Build:**

- Wiki update prompt
- Structured learner state
- Wiki view
- Export/delete controls
- Next quest recommendations

**Done when:**

- Wiki updates after a completed session
- Learner can see strengths, weaknesses, next steps
- Learner can delete memory

### Phase 5 — Study Oracle Lite

**Build:**

- Upload/paste course material
- Parse text
- Generate study plan
- Generate practice quiz
- Generate high-yield topic map

**Done when:**

- User uploads or pastes material
- System produces study plan and practice quiz
- Output references provided materials

### Phase 6 — Voice and Artifacts

**Build:**

- STT adapter
- TTS adapter
- Text/voice toggle
- Transcript correction
- Diagram/concept map artifacts

**Done when:**

- User can switch between text and voice
- Voice transcript can be corrected
- Generated artifacts attach to sessions

### Phase 7 — VR / Operator Client

**Build:**

- Operator command parser
- Environment selection API
- VR client proof of concept
- Mentor/session bridge

**Done when:**

- VR scene can load a quest/mentor from core state
- Progress saves back to the same learner wiki

---

## 14. Testing Strategy

### Unit tests

- State machines
- Zod schemas
- Prompt response parsers
- DB repositories
- Progress recompute logic

### Integration tests

- Goal → curriculum → quest
- Quest → lesson → summary
- Quiz pass/fail → quest state
- Session → learner wiki update

### Manual tests

- Auth flow
- Upload flow
- Lesson stage transitions
- Voice transcript correction
- Source-grounded Study Oracle outputs

### Regression tests from known issues

- STT transcript mismatch should not break summaries.
- Mentor language should stay in learner-selected language.
- Historical artifacts should not be accepted without factual check.
- Suggestions should not spam the user.
- Progress counters should never drift.

---

## 15. Risk Register

| Risk | Mitigation |
|---|---|
| Feature creep | Strict milestones; everything maps to core loop |
| Voice bugs breaking learning | Text-first runtime; voice is adapter only |
| AI hallucinated curricula | Schema validation + source grounding + user editing |
| Historical inaccuracies | Curated references, citations, generated artifact checks |
| API key leakage | Edge functions only |
| Prompt drift | Versioned prompt registry |
| Learner privacy concerns | Export/delete controls; explicit memory settings |
| Progress counter drift | Compute from canonical DB records, not UI state |

---

## 16. Current Next Actions

M0 and M1 are complete. The next milestone is M2 — Assessment and Mastery.

1. Build quiz generation from quest objectives.
2. Add short-answer rubric grading.
3. Persist assessment results through the repository seam.
4. Gate quest completion on mastery evidence.
5. Generate targeted review after failed checks.
6. Keep progress recomputable from canonical records rather than mutable UI counters.
