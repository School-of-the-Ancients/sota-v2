# School of the Ancients v2 Prompt Registry and Versioning Policy

**Status:** Living policy; M0/M1 gateway seams implemented on `main`

**Milestone:** M0 — Rebuild Foundation through M1 — Text-First Core Learning Loop

**Principle:** Prompts are versioned product artifacts. Every model call should declare its task, prompt version, inputs, output schema, evaluation notes, and rollback path.

This document defines how School of the Ancients v2 names, stores, versions, evaluates, activates, logs, and rolls back prompts. It pairs with `docs/ARCHITECTURE.md` and `docs/DATA_MODEL.md`: the AI gateway loads prompt versions, validates structured outputs, records prompt runs, and returns normalized results to product services.

## Goals

- Make AI behavior inspectable and repeatable.
- Prevent important prompt changes from being invisible code edits.
- Keep browser code from embedding provider-specific prompts or API keys.
- Support provider swaps without rewriting product features.
- Validate structured outputs before persistence.
- Make rollback possible when a prompt breaks pedagogy, schema validity, safety, or source-grounding quality.

## Non-goals for M0

- No full prompt experimentation platform.
- No marketplace publishing workflow.
- No automatic online evaluation service.
- No browser-owned prompt registry.
- No direct browser-to-provider prompt execution.

## Runtime rule

Forbidden:

```text
Browser → model provider with hardcoded prompt
```

Required:

```text
Product service → AI gateway → prompt registry → provider adapter → schema validation → product service persistence
```

The gateway call must include:

- `task`;
- `promptVersion` or a request to resolve the active version for a task;
- typed/validated inputs;
- expected output schema when structured output is required;
- learner/user context only when necessary and privacy-safe;
- source IDs when the answer must be grounded in uploaded or trusted material.

## Registry storage

Prompts should be represented in two layers:

1. Files in the repository for reviewable source control.
2. Database records for runtime activation, auditability, and future admin tooling.

Initial file layout:

```text
prompts/
  goals/
    goal-refinement.v1.md
    goal-refinement.schema.json
  curriculum/
    one-week-curriculum.v1.md
    one-week-curriculum.schema.json
  quests/
    quest-generation.v1.md
    quest-generation.schema.json
  mentors/
    mentor-selection.v1.md
    mentor-response-policy.v1.md
  lessons/
    lesson-response-3-2-1.v1.md
    lesson-response-3-2-1.schema.json
    lesson-summary.v1.md
    lesson-summary.schema.json
  assessment/
    quiz-generation.v1.md
    quiz-generation.schema.json
    short-answer-grading.v1.md
    short-answer-grading.schema.json
  learner-wiki/
    wiki-update.v1.md
    wiki-update.schema.json
  study-oracle/
    course-material-topic-map.v1.md
    course-material-topic-map.schema.json
  artifacts/
    artifact-spec.v1.md
    artifact-spec.schema.json
```

Runtime metadata can be stored in the `prompt_definitions`, `prompt_versions`, and `prompt_runs` tables described in `docs/DATA_MODEL.md`.

## Naming policy

Prompt names should be stable, lowercase, and task-oriented.

Format:

```text
<domain>/<prompt-slug>.v<major>[.<minor>[.<patch>]].md
<domain>/<prompt-slug>.schema.json
```

Examples:

- `goals/goal-refinement.v1.md`
- `curriculum/one-week-curriculum.v1.md`
- `lessons/lesson-response-3-2-1.v1.md`
- `assessment/short-answer-grading.v1.md`
- `learner-wiki/wiki-update.v1.md`

Prompt definition slug:

```text
<domain>.<prompt-slug>
```

Examples:

- `goals.goal-refinement`
- `curriculum.one-week-curriculum`
- `lessons.lesson-response-3-2-1`
- `assessment.short-answer-grading`

Gateway task names should use stable snake_case values:

```ts
type AITask =
  | 'goal_refinement'
  | 'curriculum_generation'
  | 'quest_generation'
  | 'mentor_selection'
  | 'lesson_response'
  | 'lesson_summary'
  | 'assessment_generation'
  | 'assessment_grading'
  | 'wiki_update'
  | 'study_oracle_analysis'
  | 'artifact_generation';
```

## Versioning policy

Prompt versions should use semantic-ish versioning with explicit activation status.

| Change type | Version bump | Examples |
| --- | --- | --- |
| Patch | `v1.0.1` or internal metadata only | typo, wording clarity, no expected output change |
| Minor | `v1.1` | improves rubric wording, adds non-breaking optional field |
| Major | `v2` | changes output schema, pedagogy, safety policy, or task objective |

M0 can start with simple `v1`, `v2` filenames. As prompts mature, use `v1.1` and `v1.1.1` where useful.

Allowed statuses:

- `draft`: not used by default runtime.
- `active`: default for a task/environment.
- `canary`: limited traffic or manual testing.
- `deprecated`: no longer used for new runs but retained for audit.
- `rolled_back`: retired because of quality/safety/schema problems.

Activation rules:

- Exactly one active prompt version per task/environment unless a controlled experiment is running.
- Product code should request either an explicit version or the active version for a task.
- Prompt activation changes should be reviewed like code changes.
- Old versions must remain available for reading old prompt runs.

## Required prompt frontmatter

Every prompt markdown file should start with YAML frontmatter:

```yaml
---
slug: lessons.lesson-response-3-2-1
version: v1
status: draft
task: lesson_response
owner_area: lessons
input_schema: lessons/lesson-response-3-2-1.input.schema.json
output_schema: lessons/lesson-response-3-2-1.schema.json
model_family: text
source_grounding: optional
privacy_level: learner_scoped
created: 2026-05-25
---
```

Required fields:

| Field | Purpose |
| --- | --- |
| `slug` | Stable prompt definition identifier. |
| `version` | Prompt version string. |
| `status` | Draft/active/canary/deprecated/rolled_back. |
| `task` | Gateway task value. |
| `owner_area` | Product area that owns the prompt. |
| `input_schema` | Schema or documented input contract. |
| `output_schema` | Schema for structured output, or `none` for unstructured text. |
| `model_family` | `text`, `embedding`, `artifact`, `speech_to_text`, `text_to_speech`. |
| `source_grounding` | `required`, `optional`, or `not_applicable`. |
| `privacy_level` | `public`, `learner_scoped`, `sensitive`, or `system_only`. |
| `created` | Creation date. |

## Prompt template structure

A prompt file should use this structure:

```markdown
---
slug: goals.goal-refinement
version: v1
status: draft
task: goal_refinement
owner_area: goals
input_schema: goals/goal-refinement.input.schema.json
output_schema: goals/goal-refinement.schema.json
model_family: text
source_grounding: not_applicable
privacy_level: learner_scoped
created: 2026-05-25
---

# Purpose

One paragraph describing what this prompt does.

# System instructions

Stable behavior, role, pedagogy, safety, and constraints.

# Inputs

- `rawGoal`: learner-entered goal text.
- `learnerContext`: optional current level, time budget, deadline, constraints.

# Output contract

Return JSON matching `goals/goal-refinement.schema.json`.

# Quality criteria

- Ask no more than 3-5 clarifying questions.
- Preserve learner intent.
- Generate measurable success criteria.

# Failure behavior

If the goal is too vague, return clarifying questions instead of hallucinating a full plan.

# Template

Prompt text with placeholders such as `{{rawGoal}}` and `{{learnerContext}}`.
```

## Input policy

Inputs must be explicit. Avoid prompts that depend on hidden global state.

For each prompt, document:

- required inputs;
- optional inputs;
- source records used;
- privacy/sensitivity class;
- whether learner-personal data is necessary;
- whether uploaded/course source material is required;
- redaction expectations before provider call.

Example input contract:

```ts
type GoalRefinementInput = {
  rawGoal: string;
  learnerContext?: {
    currentLevel?: 'beginner' | 'intermediate' | 'advanced' | 'unknown';
    timeBudgetMinutesPerDay?: number;
    deadline?: string;
    constraints?: string[];
  };
};
```

## Output and schema policy

Structured product outputs must be validated before persistence.

Use JSON schemas for prompts that generate or mutate product state:

- goal refinement;
- curriculum generation;
- quest generation;
- mentor selection;
- lesson stage action;
- lesson summary;
- quiz generation;
- assessment grading;
- learner wiki update;
- Study Oracle topic maps/practice exams;
- artifact specs.

Schema expectations:

- schemas live next to the prompt file or in a shared schema directory;
- required fields are explicit;
- enum values match state-machine/data-model values;
- nullable fields are intentional;
- generated IDs are not trusted unless assigned by the backend;
- model output cannot directly set `user_id`, ownership fields, RLS fields, or provider secrets.

Example output contract:

```json
{
  "type": "object",
  "required": ["title", "desiredOutcome", "successCriteria", "clarifyingQuestions"],
  "properties": {
    "title": { "type": "string" },
    "desiredOutcome": { "type": "string" },
    "successCriteria": {
      "type": "array",
      "items": { "type": "string" }
    },
    "clarifyingQuestions": {
      "type": "array",
      "maxItems": 5,
      "items": { "type": "string" }
    }
  }
}
```

## Prompt-run logging

Every AI gateway call should create a `prompt_runs` record or equivalent audit entry.

Log:

- user/learner scope when applicable;
- task;
- prompt definition/version;
- provider;
- model;
- request/input hash;
- redacted input summary when useful;
- output or output reference;
- schema validation status;
- token/cost usage if available;
- warnings and fallback behavior;
- source record IDs for grounded outputs.

Do not log:

- provider API keys;
- raw secrets;
- unnecessary sensitive learner data;
- full uploads when a source ID/hash is enough;
- hidden system prompts in places learners can accidentally export as personal content unless product policy explicitly allows it.

Prompt runs are audit records. They should not be the only copy of learner-facing product state.

## Source-grounding policy

Some prompts may answer from general model knowledge; others must cite sources.

| Prompt category | Source grounding |
| --- | --- |
| Goal refinement | optional / not applicable |
| Curriculum generation | optional unless course material is supplied |
| Quest generation | optional unless course material is supplied |
| Lesson response | optional, required when answering from uploaded course material |
| Assessment generation | required when based on uploaded/course material |
| Assessment grading | required to cite rubric/answer key when available |
| Learner wiki update | required to cite source event IDs |
| Study Oracle | required |
| Artifact generation | required for factual/history/science artifacts; optional for abstract diagrams |

When source grounding is required, the output schema should include source references. The backend should reject or flag outputs that omit required citations.

## Evaluation notes

Every prompt version should include evaluation notes before activation.

Minimum evaluation checklist:

- Does it satisfy the product objective?
- Does it follow 3-2-1 pedagogy where relevant?
- Does it avoid always-Socratic beginner-hostile behavior?
- Does it respect the output schema?
- Does it avoid creating hidden canonical state outside backend records?
- Does it preserve learner intent and agency?
- Does it avoid exposing sensitive data?
- Does it cite source material when required?
- Does it fail safely when inputs are missing or invalid?

Suggested evaluation record:

```markdown
# Evaluation notes

Test date: 2026-05-25
Evaluator: <name or agent>
Prompt version: lessons.lesson-response-3-2-1@v1
Provider/model tested: <provider/model>

Cases:
- beginner asks vague question
- learner requests more explanation
- learner answers guided-practice problem incorrectly
- learner passes Socratic check
- source-grounded course-material question

Findings:
- Schema validity: pass/fail
- Pedagogy: pass/fail
- Safety/privacy: pass/fail
- Source grounding: pass/fail/not applicable

Decision: draft / canary / active / needs revision
```

## Rollback expectations

Rollback is required when a prompt version causes:

- schema validation failures above acceptable threshold;
- unsafe or privacy-violating outputs;
- direct contradiction of product pedagogy;
- hidden state mutation outside canonical records;
- source-grounding failures for source-required tasks;
- materially worse learner outcomes or review feedback;
- provider-specific behavior that breaks adapter portability.

Rollback process:

1. Mark the bad version `rolled_back` or `deprecated`.
2. Reactivate the last known good version for the task/environment.
3. Preserve the failed version and prompt-run examples for audit.
4. Add rollback notes explaining failure mode and detection signal.
5. Add or update eval cases that would catch the failure next time.
6. If product records were written from invalid outputs, run a targeted repair/recompute job.

Rollback metadata should include:

| Field | Purpose |
| --- | --- |
| `rolled_back_at` | When rollback happened. |
| `rolled_back_by` | Human or service actor. |
| `reason` | Short failure summary. |
| `restored_version` | Last known good version. |
| `affected_prompt_run_ids` | Examples or range of bad runs. |
| `repair_required` | Whether product data repair is needed. |

## Initial M0 prompt registry

These are the first prompt definitions to create as implementation reaches the relevant feature. M0 documents them; later issues can add prompt files and schemas.

| Slug | Task | Owner area | Output type | Grounding | Purpose |
| --- | --- | --- | --- | --- | --- |
| `goals.goal-refinement` | `goal_refinement` | goals | structured JSON | not applicable | Turn raw learner intent into a measurable goal. |
| `curriculum.one-week-curriculum` | `curriculum_generation` | curriculum | structured JSON | optional | Generate a practical one-week plan from a goal. |
| `quests.quest-generation` | `quest_generation` | quests | structured JSON | optional | Create focused quests with prerequisites, practice, and mastery criteria. |
| `mentors.mentor-selection` | `mentor_selection` | mentors | structured JSON | optional | Select teaching strategy/mentor fit for a goal or quest. |
| `lessons.lesson-response-3-2-1` | `lesson_response` | lessons | structured JSON + learner text | optional/required by source | Produce the next lesson response while respecting lesson stage. |
| `lessons.lesson-summary` | `lesson_summary` | lessons | structured JSON | optional | Summarize a session and propose next action. |
| `assessment.quiz-generation` | `assessment_generation` | assessment | structured JSON | optional/required by source | Generate mastery quiz and answer key/rubric. |
| `assessment.short-answer-grading` | `assessment_grading` | assessment | structured JSON | required when rubric/source exists | Grade short answers with learner-visible feedback. |
| `learner-wiki.wiki-update` | `wiki_update` | learner-wiki | structured JSON patch | required source event IDs | Update learner memory from lessons and assessments. |
| `study-oracle.course-material-topic-map` | `study_oracle_analysis` | study-oracle | structured JSON | required | Generate high-yield topic map from uploaded course materials. |
| `artifacts.artifact-spec` | `artifact_generation` | artifacts | structured JSON | required for factual content | Specify diagrams, flashcards, maps, or worksheets tied to objectives. |

## Example prompt-run lifecycle

```text
GoalRoute submits raw goal
  → goalService validates input
  → aiGateway resolves goals.goal-refinement active version
  → aiGateway redacts/minimizes learner context
  → provider adapter executes prompt
  → output schema validates
  → prompt_runs row records metadata/status
  → goalService saves refined goal
  → UI renders saved goal
```

If schema validation fails:

```text
provider output
  → schema validation failed
  → prompt_runs.status = validation_failed
  → gateway retries or falls back if configured
  → product service receives safe error state
  → no malformed product record is persisted
```

## Review checklist for prompt changes

Before activating a new prompt version:

- [ ] Prompt has required frontmatter.
- [ ] Inputs are documented.
- [ ] Output contract and schema are documented.
- [ ] Version bump matches change type.
- [ ] Evaluation notes exist.
- [ ] Source-grounding policy is explicit.
- [ ] Privacy level is explicit.
- [ ] Rollback plan references last known good version or safe fallback.
- [ ] Prompt runs will log task/version/provider/schema status.
- [ ] Product service validates output before persistence.

## Open decisions

- Whether prompt files are loaded directly at runtime or synced into database records during deploy.
- Whether active prompt version is environment-specific (`dev`, `preview`, `prod`) from day one.
- Whether canary prompts are selected by user cohort, feature flag, or manual admin action.
- Whether prompt input/output schemas live beside prompt files or in `src/lib/ai/schemas`.
- Retention period for prompt runs containing learner-scoped data.
- How much of the final prompt text should be included in learner exports versus admin-only audit logs.
