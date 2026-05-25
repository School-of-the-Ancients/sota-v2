# School of the Ancients v2 Architecture

**Status:** Draft v0.1

**Milestone:** M0 — Rebuild Foundation

**Principle:** Text-first learning engine, optional presentation layers.

School of the Ancients v2 is organized around a core learning engine that owns educational state and exposes a small set of services to clients. Web, voice, artifact, VR, and operator interfaces are presentation/adaptation layers over that engine. They may render, collect input, and request actions, but they must not become separate sources of truth for learning state.

```text
Learner
  │
  ├── Web UI
  ├── Voice UI                optional interface
  ├── Artifact UI             optional visualization/output interface
  └── VR / Operator UI         future immersive/operator interface
        │
        ▼
App / Backend Boundary
  │
  ├── Core Learning Engine
  │     ├── goals
  │     ├── curricula
  │     ├── quests
  │     ├── mentors
  │     ├── lessons
  │     ├── assessments
  │     ├── progress
  │     ├── learner wiki
  │     ├── uploads
  │     ├── artifacts
  │     └── prompt logs
  │
  ├── Server-side AI Gateway
  │     ├── prompt registry
  │     ├── schema validation
  │     ├── provider adapters
  │     └── prompt/version/audit logs
  │
  └── Persistence Layer
        ├── Supabase Postgres + RLS
        ├── object storage for uploads/artifacts
        └── recomputed progress views/counters
```

## Goals

- Make the text-first learning loop reliable before adding voice, VR, marketplace, or richer artifact generation.
- Keep learning state in app/backend-owned records, not in model transcripts or client-local runtime state.
- Route all model calls through a server-side gateway so prompts, provider choices, schemas, logs, and safety checks are controlled.
- Preserve privacy and learner agency: learner memory must be inspectable, editable, exportable, and deletable.
- Define module boundaries early so future feature work has obvious homes and does not recreate a scattered prototype.

## Non-goals for M0

- No full voice runtime.
- No VR classroom implementation.
- No marketplace publishing.
- No direct browser-to-provider calls.
- No separate learning state owned by voice, artifact, or VR clients.

## Core Learning Engine

The Core Learning Engine is the product's source of truth. It coordinates the canonical loop:

```text
Find Goal → Create Curriculum/Quest → Summon Mentor → Learn → Practice → Assess → Reflect → Update Learner Wiki → Next Quest
```

It owns these domains:

| Domain | Responsibility | Canonical records |
| --- | --- | --- |
| Goals | Capture and refine what the learner wants or needs to learn. | `learning_goals` |
| Curricula | Turn goals into multi-day or multi-quest plans. | `curricula` |
| Quests | Track focused learning objectives, tasks, state, and mastery requirements. | `quests` |
| Mentors | Define teaching strategy, persona constraints, subject fit, and prompt behavior. | `mentors` / prompt registry |
| Lessons | Run the 3-2-1 teaching flow and save session events/messages. | `lesson_sessions`, `messages` |
| Assessments | Generate and grade quizzes/rubrics and decide whether mastery was shown. | `assessments` |
| Progress | Present status by recomputing from goals, quests, sessions, assessments, and wiki events. | records + derived views |
| Learner Wiki | Maintain durable learner memory: strengths, weaknesses, completed quests, current goals, misconceptions, next steps. | `learner_wikis`, wiki events |
| Uploads | Store course materials and source metadata for later study-oracle work. | `uploads`, storage |
| Artifacts | Attach generated diagrams, flashcards, concept maps, or simulations to sessions/quests. | `artifacts`, storage |
| Prompt Logs | Preserve task, prompt version, provider, schema, and relevant audit metadata for AI calls. | `prompt_logs` |

The engine should expose use-case-oriented services rather than letting UI components mutate persistence directly. Example service boundaries:

- `goalService`: create/refine goals and success criteria.
- `curriculumService`: generate, review, regenerate, and activate curricula.
- `questService`: create quests and enforce quest state transitions.
- `lessonService`: run lesson stage transitions and persist messages/summaries.
- `assessmentService`: create quizzes, grade submissions, and apply mastery gates.
- `wikiService`: apply learner-memory updates from canonical source events.
- `progressService`: derive progress from records instead of storing fragile counters.

## Client and Adapter Layers

Clients are replaceable interfaces over the Core Learning Engine.

### Web UI

The web app is the primary M0/M1 client. It should:

- collect learner input;
- display goals, quests, lessons, progress, and wiki state;
- call app/backend actions for learning operations;
- display model-generated content only after server-side schema validation where structured output is expected.

The web app should not:

- store canonical learning state only in component state or local storage;
- call OpenAI, Anthropic, Google, local model, image, speech, or embedding providers directly;
- embed provider API keys or provider-specific prompts in browser code.

### Voice UI

Voice is an optional interface over the same lesson runtime. It may provide:

- speech-to-text input;
- text-to-speech output;
- voice controls for the current stage;
- transcript correction and confirmation flows.

Voice must not own a separate lesson/session/progress model. Corrected transcripts and stage events should be saved through the same lesson service used by the web UI.

### Artifact UI

Artifact features display or request diagrams, concept maps, flashcards, worksheets, and simulations. Artifacts are attached to learning objectives, sessions, quests, or uploads. They should support learning, not act as decorative one-off generation.

### VR / Operator UI

VR and operator clients are future presentation layers. They may load environments, spawn mentors, or issue commands, but they must consume the same goal, curriculum, quest, lesson, assessment, and learner-wiki services. VR/operator clients do not own learning progress or learner memory.

## Server-side AI Gateway

All model-provider traffic goes through the server-side AI gateway.

Forbidden:

```text
Browser → model provider
```

Required:

```text
Browser/client → app/backend action or edge function → AI gateway → provider adapter → model provider
```

The gateway is responsible for:

- selecting providers and models;
- loading prompt versions from the prompt registry;
- validating request inputs;
- enforcing structured-output schemas;
- recording task, prompt version, provider, model, token usage, and result metadata;
- applying redaction and privacy rules before provider calls;
- normalizing provider responses;
- supporting retries/fallbacks without leaking provider details into product features.

Initial text-generation contract:

```ts
type AITask =
  | 'goal_refinement'
  | 'curriculum_generation'
  | 'quest_generation'
  | 'lesson_response'
  | 'assessment_generation'
  | 'assessment_grading'
  | 'wiki_update'
  | 'study_oracle_analysis';

type TextGenerationRequest = {
  task: AITask;
  promptVersion: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  jsonSchema?: unknown;
  temperature?: number;
  userId: string;
  sourceIds?: string[];
  metadata?: Record<string, unknown>;
};

type TextGenerationResponse<T> = {
  data: T;
  provider: string;
  model: string;
  promptVersion: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
  warnings?: string[];
};
```

Provider-specific adapters should implement a stable interface, for example:

```ts
type TextProvider = {
  name: string;
  generate<T>(request: TextGenerationRequest): Promise<TextGenerationResponse<T>>;
};
```

Future adapter families can follow the same pattern:

- `EmbeddingProvider`
- `ArtifactProvider`
- `SpeechToTextProvider`
- `TextToSpeechProvider`

## Persistence Boundaries

Persistence is learner-owned and backend-controlled. Supabase Postgres is the initial persistence layer, with row-level security for learner-owned records.

### Canonical records

Canonical records are the only source of truth for product state:

- goals;
- curricula;
- quests;
- lesson sessions;
- messages;
- assessments;
- learner wiki snapshots/events;
- uploads and source metadata;
- artifacts;
- prompt logs.

### Derived state

Progress counters, dashboard cards, completion percentages, and next-action summaries should be derived from canonical records whenever possible. If cached for performance, caches must be invalidatable and recomputable.

Examples:

- Quest completion is derived from quest status plus assessment/manual-override records.
- Learner strengths/weaknesses are derived from wiki state and assessment/session events.
- Active next action is derived from current goal, active quest, latest lesson session, pending practice, and assessment readiness.

### Storage boundaries

- Database tables store structured records and metadata.
- Object storage stores large uploads and generated artifact files.
- Prompt logs store prompt version, task, provider/model metadata, schema IDs, and audit metadata; they should not become the only copy of learner-facing educational state.
- Client storage may cache UI preferences and draft input, but not canonical learning progress.

## State Ownership Rules

1. The app/backend owns educational state.
2. Clients own presentation state only.
3. Voice, VR, artifact, and operator layers are adapters over the core engine.
4. Model providers produce proposed content, not canonical state mutations.
5. Structured AI outputs must be validated before persistence.
6. Prompt logs are audit records, not product-state records.
7. Learner memory must be inspectable, editable, exportable, and deletable.
8. Progress must be recomputable from canonical records.
9. Browser code must never call model providers directly.
10. Provider API keys and model routing stay server-side.

## Initial Module Boundaries

The first clean app structure should give every M0/M1 feature an obvious home:

```text
src/
  app/
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
    curriculum/
    quests/
    mentors/
    lessons/
    assessment/
    learner-wiki/
    study-oracle/
    artifacts/
    voice/

  lib/
    ai/
      aiGateway.ts
      promptRunner.ts
      schemas.ts
      providers/
    db/
      supabaseClient.ts
      repositories/
    validation/
    telemetry/
    security/

components/
  ui/

prompts/
  goals/
  curriculum/
  quests/
  mentors/
  lessons/
  assessment/
  learner-wiki/
  study-oracle/

supabase/
  migrations/
  functions/

tests/
  e2e/
  fixtures/
```

Boundary rules:

- `features/*` contains product-domain UI and feature services.
- `lib/ai` owns provider abstraction, prompt execution, and structured-output validation.
- `lib/db/repositories` owns database access and hides table details from UI components.
- `lib/security` owns redaction, permissions, and learner-data privacy helpers.
- `lib/telemetry` owns analytics and error reporting boundaries.
- `prompts/*` owns versioned prompt definitions and schema references.
- `supabase/migrations` owns database schema changes.
- `supabase/functions` owns server/edge runtime entry points.
- `tests` owns state-machine, schema, service, integration, and end-to-end coverage.

## Request Flow Examples

### Goal refinement

```text
GoalRoute
  → goalService.refineGoal(draft)
  → backend action / edge function
  → aiGateway.generate({ task: 'goal_refinement', promptVersion, jsonSchema })
  → schema validation
  → goals repository saves refined goal
  → GoalRoute renders saved goal
```

### Lesson response

```text
LessonRoute
  → lessonService.sendMessage(sessionId, learnerMessage)
  → lesson runtime determines current stage
  → aiGateway.generate({ task: 'lesson_response', promptVersion, stage metadata })
  → schema validation for stage action / next prompt
  → messages repository saves learner + mentor messages
  → lesson session summary/stage updated as needed
  → LessonRoute renders persisted transcript and stage
```

### Learner wiki update

```text
Lesson ended or assessment graded
  → source event recorded
  → wikiService.proposeUpdate(sourceEventIds)
  → aiGateway.generate({ task: 'wiki_update', promptVersion, jsonSchema })
  → schema validation
  → wiki repository stores update with source event references
  → learner can inspect/edit/export/delete wiki data
```

## Privacy, Safety, and Auditability

- Store the minimum learner-personal data required for the product to work.
- Keep learner memory user-visible and user-controllable.
- Redact secrets and sensitive fields before logging or sending data to providers.
- Keep prompt logs useful for debugging without turning them into hidden learner profiles.
- Source-grounded educational answers should cite uploaded course material or trusted references where appropriate.
- Assessment and mastery decisions should preserve enough rubric/result detail for learner review.

## Evolution Path

M0 establishes the architecture, data model, prompt registry, folder structure, AI gateway, database/RLS, and tests. M1 implements the text-first core learning loop. Later milestones add assessment depth, learner wiki maturity, Study Oracle, artifacts, voice, marketplace, and VR/operator clients without moving the source of truth out of the core engine.
