# School of the Ancients v2 Roadmap

This roadmap tracks the canonical app rebuild sequence for a text-first AI learning operating system that improves and supplements education with AI.

## M0 — Rebuild Foundation

Purpose: create a clean canonical app structure and prevent future feature creep.

Issues:

- `docs: add architecture overview`
- `docs: add data model draft`
- `docs: add prompt registry and versioning policy`
- `chore: create clean app feature structure`
- `infra: add server-side AI gateway/provider adapter`
- `infra: add initial Supabase schema and RLS policies`
- `test: add state machine and schema validation tests`

Acceptance criteria:

- Documentation lives in `/docs`.
- Model keys are not exposed in browser code.
- Prompt versions are tracked.
- Core DB schema has RLS where applicable.
- State-machine and schema tests exist.

## M1 — Text-First Core Learning Loop

Purpose: make the product work without voice.

Issues:

- `feature: build goal intake route`
- `feature: generate one-week curriculum from goal`
- `feature: generate quest from goal or curriculum`
- `feature: create mentor registry`
- `feature: implement 3-2-1 lesson runtime`
- `feature: persist lesson messages and summaries`
- `feature: show active quest and next action`

Acceptance criteria:

- Learner can go from goal to lesson in one flow.
- Lesson has visible stages: explain, example, guided practice, Socratic check, recap.
- Session is saved.
- Quest state updates correctly.

## M2 — Assessment and Mastery

Purpose: make learning measurable.

Issues:

- `feature: generate quiz from quest objective`
- `feature: grade short answers with rubric`
- `feature: gate quest completion on mastery`
- `feature: generate targeted review after failed quiz`

Acceptance criteria:

- Passing quiz completes a quest.
- Failing quiz creates a review path.
- Progress counters recompute from canonical records.

## M3 — Learner Wiki

Purpose: give each learner a durable learning history and profile.

Issues:

- `feature: create learner wiki data model and view`
- `feature: update learner wiki after sessions and assessments`
- `feature: recommend next quests from learner wiki`
- `feature: export and delete learner memory`

Acceptance criteria:

- Wiki grows after sessions and assessments.
- Learner can see strengths, weaknesses, and next steps.
- Learner can export and delete memory.

## M4 — Study Oracle

Purpose: turn course materials into study strategy.

Issues:

- `feature: add upload/paste route for course materials`
- `feature: generate high-yield topic map from course materials`
- `feature: generate practice exam and cheat sheet`

Acceptance criteria:

- Learner can provide course material.
- System generates a study plan and practice questions.
- Outputs cite uploaded material where appropriate.

## M5 — Artifacts

Purpose: make visual learning aids useful and grounded.

Issues:

- `feature: create artifact model and attach artifacts to sessions`
- `feature: generate concept maps and diagrams`

Acceptance criteria:

- Artifacts are generated from learning objectives.
- Artifacts are saved to sessions.
- Artifacts support learning rather than decoration.

## M6 — Voice Layer

Purpose: add optional speech interfaces over the stable text-first engine.

Issues:

- `feature: add optional voice interface over lesson runtime`

Acceptance criteria:

- STT/TTS works as a client layer.
- Voice does not own separate learning state.

## M7 — Creator Marketplace

Purpose: support reusable quests, mentors, curricula, and templates.

Issues:

- `feature: define creator templates for quests and mentors`

Acceptance criteria:

- Creator objects have versioned templates.
- Publishing controls are defined before public marketplace work begins.

## M8 — VR / Operator Layer

Purpose: define immersive clients once the core engine is stable.

Issues:

- `feature: document VR/operator client contract`

Acceptance criteria:

- VR/operator clients consume the core engine.
- VR/operator clients do not own learning state.
