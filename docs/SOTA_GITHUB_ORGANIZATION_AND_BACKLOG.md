# School of the Ancients — Repo Organization and Backlog

**Status:** Draft v0.1  
**Date:** May 25, 2026

---

## 1. Canonical Project Structure

The project should be organized around one source of truth:

```text
SotA Core = main web learning engine
```

Everything else is either:

- research/reference
- prototype/archive
- future client
- public landing site

---

## 2. Repo Roles

| Repo | Recommended Role | Action |
|---|---|---|
| `sota-beta` | Main app / canonical rebuild repo | Use as primary unless creating `sota-core` |
| `sota-v2-feature-creeped` | Private idea salvage | Do not build from it directly; extract useful specs only |
| `sota-alpha` | Historical prototype | Archive or mark as deprecated |
| `research` | Research and source grounding | Keep; organize into curated references |
| `school-of-the-ancients-vr` | VR / Meta Horizon prototype | Keep as future client/reference |
| `matrix-loading-operator` | Operator concept | Keep as future VR/operator reference |
| `School-of-the-Ancients.github.io` | Landing page | Keep separate from product app |

---

## 3. Product Epics

## Epic 0 — Rebuild Foundation

Purpose: create the clean structure and prevent future disorganization.

Issues:

1. `docs: add fresh rebuild PRD`
2. `docs: add implementation plan`
3. `docs: replace execplan with living execution plan`
4. `chore: create clean feature folders`
5. `chore: create prompt registry`
6. `infra: move model calls behind API gateway`
7. `infra: add Supabase schema migrations`
8. `infra: enable RLS policies`
9. `test: add state machine and schema tests`
10. `docs: define repo roles and archive policy`

Acceptance:

- Documentation lives in `/docs`
- Model keys are not exposed in browser
- Prompt versions are tracked
- DB schema has RLS
- Current issues are mapped into epics

---

## Epic 1 — Text-First Core Learning Loop

Purpose: make the product work without voice.

Issues:

1. `feat(goals): create goal intake route`
2. `feat(goals): add goal refinement prompt`
3. `feat(curriculum): generate one-week curriculum`
4. `feat(quests): generate quest from goal`
5. `feat(mentors): create mentor registry`
6. `feat(lessons): implement 3-2-1 lesson state machine`
7. `feat(lessons): create lesson runtime UI`
8. `feat(sessions): persist messages and summaries`
9. `feat(quests): add quest status transitions`
10. `feat(progress): show active quest and next action`

Acceptance:

- User can go from goal to lesson in one flow
- Lesson has visible stage: explain, example, guided practice, Socratic check
- Session is saved
- Quest state updates correctly

---

## Epic 2 — Assessment and Mastery

Purpose: make learning measurable.

Issues:

1. `feat(assessment): generate quiz from quest objective`
2. `feat(assessment): support short-answer rubric grading`
3. `feat(assessment): save quiz result`
4. `feat(quests): gate completion on mastery`
5. `feat(review): generate targeted review after failed quiz`
6. `feat(progress): recompute progress from DB records`
7. `feat(progress): add mastery tags`
8. `feat(badges): add badge definitions`
9. `test(progress): prevent counter drift`
10. `docs: assessment rubric examples`

Acceptance:

- Passing quiz completes a quest
- Failing quiz creates a review path
- Progress counters recompute from canonical records

---

## Epic 3 — Learner Wiki

Purpose: every student gets a growing learning history and profile.

Issues:

1. `feat(wiki): create learner_wikis table`
2. `feat(wiki): create wiki update prompt`
3. `feat(wiki): update wiki after session`
4. `feat(wiki): update wiki after assessment`
5. `feat(wiki): create wiki view`
6. `feat(wiki): show strengths and weaknesses`
7. `feat(wiki): generate next quest recommendations`
8. `feat(privacy): export learner wiki`
9. `feat(privacy): delete learner wiki`
10. `test(wiki): wiki update preserves user edits`

Acceptance:

- Wiki grows after sessions
- Learner can see current strengths, weaknesses, and next steps
- Learner can export/delete memory

---

## Epic 4 — Study Oracle

Purpose: turn course materials into study strategy.

Issues:

1. `feat(study): create upload/paste route`
2. `feat(study): store uploaded course materials`
3. `feat(study): parse PDF/text/slides`
4. `feat(study): generate high-yield topic map`
5. `feat(study): generate practice exam`
6. `feat(study): generate cheat sheet`
7. `feat(study): detect weak concepts`
8. `feat(study): add what-do-i-need calculator`
9. `feat(study): create course skill tree`
10. `test(study): outputs cite uploaded materials`

Acceptance:

- User can provide course material
- System generates study plan and practice questions
- Output is tied to source material

---

## Epic 5 — Artifacts

Purpose: make visual learning aids useful and grounded.

Issues:

1. `feat(artifacts): create artifact data model`
2. `feat(artifacts): generate concept map`
3. `feat(artifacts): generate diagram prompt`
4. `feat(artifacts): attach artifacts to sessions`
5. `feat(artifacts): revise artifact`
6. `feat(artifacts): add source/factuality checklist`
7. `feat(artifacts): add flashcard generator`
8. `feat(artifacts): export artifact`
9. `test(artifacts): artifact schema validation`
10. `docs: artifact quality guidelines`

Acceptance:

- Artifacts are generated from learning objectives
- Artifacts are saved to sessions
- Factual/historical artifacts have review metadata

---

## Epic 6 — Voice Layer

Purpose: add voice without making it the core architecture.

Issues:

1. `feat(voice): add STT adapter`
2. `feat(voice): add TTS adapter`
3. `feat(voice): add provider toggle`
4. `feat(voice): add text/voice mode switch`
5. `feat(voice): save corrected transcript`
6. `fix(voice): prevent bad STT from breaking summaries`
7. `fix(voice): enforce learner-selected language`
8. `test(voice): transcript correction flow`
9. `docs: voice provider adapter spec`
10. `perf(voice): latency budget`

Acceptance:

- Text mode works without voice
- Voice transcript can be corrected
- Summaries use corrected transcript

---

## Epic 7 — Creator Tools

Purpose: support user-created mentors, quests, and imports.

Issues:

1. `feat(creator): create private mentor templates`
2. `feat(creator): create private quest templates`
3. `feat(creator): import quest JSON`
4. `feat(creator): export quest JSON`
5. `feat(creator): import mentor JSON`
6. `feat(creator): export mentor JSON`
7. `feat(creator): user quest library`
8. `feat(creator): user character library`
9. `security: validate imported templates`
10. `docs: template schema`

Acceptance:

- Users can save private templates
- Templates can be imported/exported
- Invalid templates are rejected

---

## Epic 8 — VR / Operator

Purpose: turn the core learning engine into an immersive client.

Issues:

1. `feat(operator): parse operator commands`
2. `feat(operator): map command to environment`
3. `feat(vr): load quest state into VR client`
4. `feat(vr): load mentor metadata into VR client`
5. `feat(vr): save session back to core`
6. `feat(vr): Renaissance demo scene`
7. `feat(vr): Socratic oral check in scene`
8. `feat(vr): progress persistence`
9. `docs: VR client architecture`
10. `docs: matrix operator command grammar`

Acceptance:

- VR client consumes existing core state
- VR does not create a separate progress system
- Operator command can load a scene + mentor + quest

---

## 4. Milestones

### M0 — Rebuild Foundation

Docs, repo structure, schema, auth, AI gateway.

### M1 — Core Learning Loop

Goal → quest → lesson → summary.

### M2 — Assessment + Mastery

Homework, quiz, pass/fail, progress.

### M3 — Learner Wiki

Student profile, strengths/weaknesses, recommendations.

### M4 — Study Oracle Lite

Course material upload, study plan, practice exam.

### M5 — Voice + Artifacts

STT/TTS adapters and artifact generation.

### M6 — Creator Tools

Import/export quests and mentors.

### M7 — VR Operator Demo

Matrix-style command and immersive client.

---

## 5. Labels

### Priority

- `priority:P0` — core loop blocker
- `priority:P1` — MVP requirement
- `priority:P2` — later improvement

### Type

- `type:feature`
- `type:bug`
- `type:chore`
- `type:docs`
- `type:test`
- `type:infra`

### Area

- `area:goals`
- `area:curriculum`
- `area:quests`
- `area:mentors`
- `area:lessons`
- `area:assessment`
- `area:progress`
- `area:wiki`
- `area:study-oracle`
- `area:artifacts`
- `area:voice`
- `area:vr`
- `area:infra`
- `area:docs`

### Epic

- `epic:foundation`
- `epic:core-loop`
- `epic:mastery`
- `epic:learner-wiki`
- `epic:study-oracle`
- `epic:artifacts`
- `epic:voice`
- `epic:creator-tools`
- `epic:vr-operator`

### Status

- `status:spec`
- `status:ready`
- `status:in-progress`
- `status:blocked`
- `status:review`
- `status:done`

---

## 6. First 10 Issues to Create

### 1. `docs: add fresh rebuild PRD`

Acceptance:
- PRD exists at `/docs/PRD.md`
- Defines MVP and out-of-scope
- Defines product loop

### 2. `docs: add implementation plan`

Acceptance:
- Implementation plan exists at `/docs/IMPLEMENTATION_PLAN.md`
- Defines folder structure, phases, schema, APIs

### 3. `docs: replace execplan with living execution plan`

Acceptance:
- `execplan.md` contains active milestone status
- Includes current sprint, next sprint, risks, and done criteria

### 4. `infra: create Supabase schema for goals, curricula, quests, sessions`

Acceptance:
- Migration exists
- Tables have RLS
- Local dev migration can run

### 5. `infra: create AI gateway function`

Acceptance:
- Browser calls internal function only
- Function can run one prompt task
- Prompt run is logged

### 6. `feat(goals): create goal intake route`

Acceptance:
- User can create a goal
- Goal persists
- Goal can be selected from dashboard

### 7. `feat(curriculum): generate one-week curriculum`

Acceptance:
- Curriculum created from goal
- Daily plan follows stored schema
- User can edit before accepting

### 8. `feat(quests): generate first quest from curriculum`

Acceptance:
- Quest has objective, focus points, mentor, and assessment criteria
- Quest appears on dashboard

### 9. `feat(lessons): implement 3-2-1 lesson runtime`

Acceptance:
- Lesson has visible stage
- User can move through explanation, example, practice, Socratic check
- Messages persist

### 10. `feat(assessment): add quiz and completion gate`

Acceptance:
- Quiz generated from objective
- Result saved
- Passing completes quest
- Failing marks quest as needs review

---

## 7. Feature Parking Lot

Do not delete these ideas. Park them until the core loop is working.

- Sora/video generation
- Full VR classroom
- Multiplayer
- Public mentor/quest marketplace
- Career Pathfinder full version
- Complex voice character accents
- Public artifact galleries
- Advanced gamified RPG map
- Multi-instructor curriculum classes
- Real-time class cohorts

---

## 8. Rule for Adding New Features

A new feature must answer one of these:

1. Does it improve goal → quest?
2. Does it improve quest → lesson?
3. Does it improve lesson → practice?
4. Does it improve practice → assessment?
5. Does it improve assessment → learner wiki?
6. Does it improve learner wiki → next quest?

If not, it belongs in the parking lot.
