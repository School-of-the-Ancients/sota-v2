# GitHub Issue Backlog

These are the issues to create in GitHub once an account/token with issue-management permission is available for `School-of-the-Ancients/sota-v2`.

Recommended labels:

- `type: docs`
- `type: infra`
- `type: feature`
- `type: test`
- `epic: foundation`
- `epic: core-loop`
- `epic: assessment`
- `epic: learner-wiki`
- `epic: study-oracle`
- `epic: artifacts`
- `epic: voice`
- `epic: marketplace`
- `epic: vr`
- `priority: high`

## M0 — Rebuild Foundation

### docs: add architecture overview

Labels: `type: docs`, `epic: foundation`, `priority: high`

Create `docs/ARCHITECTURE.md` explaining the Core Learning Engine, client/adapters, server-side AI gateway, persistence boundaries, and state ownership rules.

Acceptance criteria:

- Core learning state is explicitly owned by the app/backend, not voice or VR clients.
- Browser-to-provider direct model calls are documented as forbidden.
- Initial module boundaries are described.

### docs: add data model draft

Labels: `type: docs`, `epic: foundation`, `priority: high`

Create `docs/DATA_MODEL.md` for goals, curricula, quests, mentors, lessons, assessments, progress records, learner wiki, uploads, artifacts, and prompt logs.

Acceptance criteria:

- Every core entity has fields and relationships.
- Recompute-from-records principle is documented for progress counters.
- Privacy/export/delete expectations are captured.

### docs: add prompt registry and versioning policy

Labels: `type: docs`, `epic: foundation`

Create `docs/PROMPT_REGISTRY.md` and define prompt naming, versions, inputs, outputs, schemas, evaluation notes, and rollback expectations.

### chore: create clean app feature structure

Labels: `type: infra`, `epic: foundation`, `priority: high`

Create the initial app folder structure for goals, curriculum, quests, mentors, lessons, assessment, learner wiki, study oracle, artifacts, voice, AI gateway, database repositories, validation, telemetry, security, tests, and prompts.

Acceptance criteria:

- Empty feature modules or README placeholders exist.
- Structure matches the implementation plan.
- Future work has obvious homes.

### infra: add server-side AI gateway/provider adapter

Labels: `type: infra`, `epic: foundation`, `priority: high`

Implement the first server-side AI gateway abstraction so browser code never calls model providers directly.

Acceptance criteria:

- Text generation request/response types exist.
- Provider adapter interface exists.
- Prompt version and task are logged/preserved.
- Structured outputs can be schema-validated.

### infra: add initial Supabase schema and RLS policies

Labels: `type: infra`, `epic: foundation`, `priority: high`

Create initial database migrations and row-level security policies for core learner-owned records.

Acceptance criteria:

- Tables cover the MVP learning loop.
- RLS is enabled for learner-owned data.
- Migrations are repeatable.

### test: add state machine and schema validation tests

Labels: `type: test`, `epic: foundation`

Add tests for quest state transitions, lesson runtime stages, schema validation, and progress recomputation guardrails.

## M1 — Text-First Core Learning Loop

### feature: build goal intake route

Labels: `type: feature`, `epic: core-loop`, `priority: high`

Build the route/UI where a learner enters a learning goal, class need, curiosity, or exam target.

Acceptance criteria:

- Learner can enter a goal.
- Goal is saved.
- Goal can be refined by the AI gateway.

### feature: generate one-week curriculum from goal

Labels: `type: feature`, `epic: core-loop`, `priority: high`

Generate a practical one-week curriculum from a saved/refined goal.

Acceptance criteria:

- Output is structured and saved.
- Lessons/quests can be derived from it.
- Learner can review or regenerate.

### feature: generate quest from goal or curriculum

Labels: `type: feature`, `epic: core-loop`

Create quest generation for a focused learning objective with prerequisite notes, lesson plan, practice tasks, and mastery criteria.

### feature: create mentor registry

Labels: `type: feature`, `epic: core-loop`

Create a mentor registry that separates teaching strategy from persona. Mentors should define instructional style, constraints, and subject fit.

### feature: implement 3-2-1 lesson runtime

Labels: `type: feature`, `epic: core-loop`, `priority: high`

Implement the lesson state machine: explain → example → guided practice → socratic check → recap → ended.

Acceptance criteria:

- Stage is visible to the learner.
- Learner can ask for more explanation/examples.
- Socratic checking happens after explanation and practice.

### feature: persist lesson messages and summaries

Labels: `type: feature`, `epic: core-loop`

Save lesson messages, lesson summary, mentor used, prompt versions, and learner-visible recap after each session.

### feature: show active quest and next action

Labels: `type: feature`, `epic: core-loop`

Add a home/progress surface showing the active quest, current state, and recommended next action.

## M2 — Assessment and Mastery

### feature: generate quiz from quest objective

Labels: `type: feature`, `epic: assessment`, `priority: high`

Generate a mastery quiz from a quest objective and lesson history.

Acceptance criteria:

- Quiz aligns with objective.
- Questions are saved.
- Rubric or answer key is captured.

### feature: grade short answers with rubric

Labels: `type: feature`, `epic: assessment`

Support short-answer grading with rubric feedback, learner-visible explanation, and review recommendations.

### feature: gate quest completion on mastery

Labels: `type: feature`, `epic: assessment`, `priority: high`

Require a passing assessment or explicit manual override before a quest can move to complete.

### feature: generate targeted review after failed quiz

Labels: `type: feature`, `epic: assessment`

When a quiz fails, create a targeted review path and move the quest to `needs_review`.

## M3 — Learner Wiki

### feature: create learner wiki data model and view

Labels: `type: feature`, `epic: learner-wiki`, `priority: high`

Create learner wiki storage and a learner-facing wiki view for strengths, weaknesses, current goals, completed quests, and next steps.

### feature: update learner wiki after sessions and assessments

Labels: `type: feature`, `epic: learner-wiki`, `priority: high`

Update the learner wiki after lessons and assessments while preserving user edits and recording source events.

### feature: recommend next quests from learner wiki

Labels: `type: feature`, `epic: learner-wiki`

Use the learner wiki and progress state to recommend the next quest or review activity.

### feature: export and delete learner memory

Labels: `type: feature`, `epic: learner-wiki`

Allow the learner to export and delete wiki/memory data with clear privacy behavior.

## M4 — Study Oracle

### feature: add upload/paste route for course materials

Labels: `type: feature`, `epic: study-oracle`, `priority: high`

Allow learners to upload or paste course materials for study planning.

### feature: generate high-yield topic map from course materials

Labels: `type: feature`, `epic: study-oracle`

Analyze provided course materials and generate a high-yield topic map with citations back to source material.

### feature: generate practice exam and cheat sheet

Labels: `type: feature`, `epic: study-oracle`

Generate a practice exam and concise cheat sheet tied to uploaded or pasted course material.

## M5 — Artifacts

### feature: create artifact model and attach artifacts to sessions

Labels: `type: feature`, `epic: artifacts`

Create the artifact data model and attach concept maps, diagrams, flashcards, and simulations to learning sessions.

### feature: generate concept maps and diagrams

Labels: `type: feature`, `epic: artifacts`

Generate useful visual aids from learning objectives, with factuality/source checks where needed.

## M6 — Voice Layer

### feature: add optional voice interface over lesson runtime

Labels: `type: feature`, `epic: voice`

Add STT/TTS as an optional interface over the existing text lesson runtime without creating separate learning state.

## M7 — Creator Marketplace

### feature: define creator templates for quests and mentors

Labels: `type: feature`, `epic: marketplace`

Define reusable templates for quests, mentors, curricula, and prompt versions before marketplace publishing.

## M8 — VR / Operator Layer

### feature: document VR/operator client contract

Labels: `type: docs`, `epic: vr`

Document how future VR/operator clients interact with the core engine without owning learning state.
