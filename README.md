# School of the Ancients v2

**School of the Ancients v2 is the canonical app repository for building a text-first AI learning operating system that improves and supplements education with AI.**

The goal is not to replace teachers, schools, or human mentorship. The goal is to give every learner an adaptive learning companion that can help them clarify goals, build curricula, practice deliberately, prove mastery, and remember what they have learned over time.

## Product Vision

School of the Ancients turns a learner's goal, class, curiosity, or exam into a structured learning journey.

```text
Find Goal → Create Curriculum/Quest → Summon Mentor → Learn → Practice → Assess → Reflect → Update Learner Wiki → Next Quest
```

The product should feel like a personal academy: part tutor, part curriculum designer, part study strategist, part memory system, and part mentor network.

## Core Principle

**Text-first learning engine. Optional voice, artifacts, and VR layers.**

The core app must work as a strong text-first educational system before adding richer interfaces. Voice, generated diagrams, simulations, character experiences, and VR classrooms are valuable surfaces, but they should sit on top of the same reliable learning engine.

## What We Are Building

A canonical web app for AI-assisted education with these foundations:

- **Goal intake:** help learners define what they want or need to learn.
- **Curriculum and quest generation:** turn goals into structured learning paths.
- **Mentor system:** match learners with useful teaching styles and mentor personas.
- **3-2-1 lesson flow:** explain, demonstrate, practice together, then check mastery.
- **Assessment and mastery:** learners complete quests by proving understanding, not just clicking through content.
- **Learner wiki:** durable memory of strengths, weaknesses, progress, sessions, and next steps.
- **Study Oracle:** analyze course materials and produce study plans, practice exams, and high-yield topic maps.
- **Artifact generation:** create useful diagrams, concept maps, flashcards, and simulations when they support learning.
- **Voice and VR clients:** future presentation layers over the same core engine.

## Pedagogy

The default teaching flow is **3-2-1**:

1. **Explain + Example** — introduce the idea clearly and show a worked example.
2. **Guided Practice** — learner and mentor work through problems together.
3. **Socratic Check** — the mentor asks questions to verify understanding and expose gaps.

This avoids the beginner-hostile pattern of answering every question with another question. Socratic teaching is still important, but it belongs after explanation and practice.

## Architecture Direction

The app should be organized around a core learning engine that owns educational state:

- goals
- curricula
- quests
- mentors
- lessons
- assessments
- progress
- learner wiki
- uploaded course materials
- prompt/version logs

Presentation layers should not own learning state:

```text
Core Learning Engine
 ├── Web UI
 ├── Voice UI
 ├── Artifact UI
 └── VR / Operator UI
```

## AI Safety and Infrastructure Rules

- Browser code must not call model providers directly.
- Model calls go through a server-side AI gateway/provider adapter.
- Prompt versions are tracked.
- Structured outputs are validated with schemas.
- Source-grounded educational answers should cite course materials or trusted references where appropriate.
- Learner memory must be inspectable, editable, exportable, and deletable.
- Database access should use row-level security where applicable.

## Canonical Repository Role

This repository is the **canonical app repo** for School of the Ancients v2.

Other repositories, prototypes, and research artifacts should be treated as references unless explicitly promoted into this app:

- Historical prototypes: archive/reference only.
- Research docs: source-grounding and product reference.
- VR/operator experiments: future clients over the core learning engine.
- Landing pages: separate public marketing surfaces.

## Current Documentation

Planning docs live in [`docs/`](docs/):

- [`docs/SOTA_FRESH_REBUILD_PRD.md`](docs/SOTA_FRESH_REBUILD_PRD.md)
- [`docs/SOTA_FRESH_REBUILD_IMPLEMENTATION_PLAN.md`](docs/SOTA_FRESH_REBUILD_IMPLEMENTATION_PLAN.md)
- [`docs/SOTA_GITHUB_ORGANIZATION_AND_BACKLOG.md`](docs/SOTA_GITHUB_ORGANIZATION_AND_BACKLOG.md)

## Initial Roadmap

1. **Rebuild Foundation** — docs, architecture, prompt registry, clean repo structure, AI gateway, database/RLS, tests.
2. **Text-First Core Learning Loop** — goal → curriculum/quest → lesson → saved session → progress.
3. **Assessment and Mastery** — quizzes, rubrics, targeted review, mastery-gated quest completion.
4. **Learner Wiki** — durable learning memory, strengths/weaknesses, next quest recommendations, export/delete.
5. **Study Oracle** — course-material ingestion, study plans, practice exams, high-yield topic maps.
6. **Artifacts** — diagrams, concept maps, flashcards, simulations, exportable learning aids.
7. **Voice Layer** — optional STT/TTS interface over the text-first engine.
8. **Creator and Marketplace Layer** — reusable quests, mentors, curricula, and prompt/version templates.
9. **VR / Operator Layer** — immersive clients once the core engine is stable.

## Development Status

Early canonical rebuild planning. Issues and milestones track the first implementation sequence.

## License

License not yet selected.
