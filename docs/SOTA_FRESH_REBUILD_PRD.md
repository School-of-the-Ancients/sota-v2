# School of the Ancients — Fresh Rebuild PRD

**Status:** Living PRD; M0/M1 complete
**Date:** May 25, 2026  
**Product direction:** Rebuild from first principles as a text-first “Living Educational Operating System,” then layer voice, artifacts, and VR on top.

---

## 1. Product Summary

School of the Ancients is an AI-native learning platform where a learner turns any goal, course, curiosity, or exam into a structured learning journey.

The core product is not “chat with historical characters.” It is a **learning operating system**:

1. The learner sets a goal.
2. The system creates a quest or curriculum.
3. The system assigns the right mentor or mentor team.
4. The learner goes through lessons, guided practice, Socratic checks, homework, and quizzes.
5. The learner’s profile, mastery map, and “LLM-Wiki” update after every session.
6. The system recommends the next quest.

The historical mentors, VR classrooms, voice conversations, generated diagrams, and Matrix-style operator commands are high-value surfaces. They should be treated as layers on top of a strong text-first learning engine.

---

## 2. Why Rebuild

The existing material points toward a strong product but the implementation has become scattered across web prototype, VR prototype, research docs, feature-creeped repo, issues, and project notes.

The rebuild should solve four root problems:

### 2.1 Voice-first architecture is too fragile

The current v2 rebuild issue says the project is built on voice and should be rebuilt around a current text model, with text-to-speech and speech-to-text layered on top. That should become the central implementation principle.

### 2.2 “Always Socratic” is frustrating for beginners

The product should not answer every beginner question with another question. The v2 issue proposes a `3-2-1` teaching flow:

- **3:** explanation + example
- **2:** student and mentor work through problems together
- **1:** Socratic Q&A and oral mastery check

This should replace the old “always Socratic” model.

### 2.3 The product needs one canonical loop

The current best loop is:

```text
Find Goal → Create Curriculum/Quest → Summon Mentor → Learn → Practice → Assess → Reflect → Update Learner Wiki → Next Quest
```

Everything else should support that loop.

### 2.4 Improvements need to be staged

Features like Study Oracle, LLM-Wiki, voice, artifact generation, user uploads, character/quest marketplace, and VR are all important. They should not be implemented at once. The rebuild must start with a clean MVP, then add improvements as staged epics.

---

## 3. Product Vision

Build a universal academy of wisdom where every learner can turn curiosity into a personal curriculum, learn with adaptive mentors, prove mastery through practice and assessment, and accumulate a living map of their knowledge over time.

The long-term experience:

> “I want to learn reinforcement learning for robotics.”
>
> SotA asks clarifying questions, generates a 4-week curriculum, assigns an Aristotle/Ada Lovelace/Richard Feynman-style mentor team, teaches each day through 3-2-1 sessions, assigns homework, checks mastery, updates the learner’s wiki, generates diagrams or simulations when useful, and recommends the next quest.

---

## 4. Target Users

### 4.1 Self-directed learner

A learner who wants to master a subject but does not know how to structure the path.

**Needs:** goals, curriculum, explanations, practice, accountability, progress tracking.

### 4.2 Student with course materials

A student with lectures, homework, quizzes, exams, screenshots, or rubrics who wants to study intelligently.

**Needs:** upload materials, detect high-yield topics, generate practice exams, cheat sheets, weakness maps, final-grade calculators.

### 4.3 Mentor/teacher

A teacher, tutor, or parent who wants structured AI tutoring without turning learning into answer-copying.

**Needs:** control over pedagogy, source grounding, progress reports, assessment rubrics.

### 4.4 Creator/researcher

A creator who wants to design mentors, quests, historical worlds, or curriculum modules.

**Needs:** templates, import/export, versioned prompts, reusable quests, controlled publishing.

---

## 5. Product Principles

1. **Text-first, voice optional.** The learning engine must work perfectly in text before voice is added.
2. **Pedagogy first, persona second.** Historical mentors are teaching strategies, not gimmicks.
3. **3-2-1 teaching before Socratic testing.** Explain, demonstrate, practice, then question.
4. **Mastery over completion.** A quest is done only when the learner demonstrates understanding.
5. **Learner memory is a product primitive.** The LLM-Wiki is not an add-on; it is the long-term state of the learner.
6. **Artifacts must be useful.** Diagrams, images, videos, and simulations should support learning objectives.
7. **Source grounding for factual content.** Historical facts, diagrams, and course answers need citations or source references.
8. **Small coherent slices.** Every release should improve the core loop.

---

## 6. MVP Scope

### 6.1 MVP Name

**SotA Core v0.1 — Text-First Learning Loop**

### 6.2 MVP Goal

A learner can enter a goal, receive a structured quest, complete a 3-2-1 learning session, do homework/practice, take a quiz, and see their learner profile update.

### 6.3 MVP User Flow

```text
1. Home
2. Set Learning Goal
3. Goal Clarification Dialogue
4. Curriculum/Quest Generated
5. Mentor Assigned
6. Lesson Session
   - Explanation
   - Example
   - Guided practice
   - Socratic check
7. Homework or practice task
8. Quiz / mastery check
9. Reflection summary
10. Learner Wiki update
11. Next quest recommendation
```

### 6.4 MVP Includes

- Authentication
- Text-first chat/lesson runtime
- Goal intake
- Quest generator
- Simple curriculum planner
- Mentor assignment
- 3-2-1 lesson mode
- Homework/practice tasks
- Quiz and mastery check
- Progress dashboard
- Learner Wiki v0
- Basic history and session summaries
- Prompt/version logging
- Supabase persistence

### 6.5 MVP Excludes

- VR
- Multiplayer
- Public marketplace
- Full voice conversation
- Video generation
- Complex career pathfinder
- Full user-created public character database
- Full course upload ingestion pipeline

---

## 7. Core Product Modules

## 7.1 Goal Intake

Purpose: turn a vague goal into a clear learning objective.

Example input:

> “I want to learn machine learning.”

System output:

- Goal title
- Current level
- Desired outcome
- Time available
- Preferred learning style
- Constraints
- First quest recommendation

Requirements:

- Ask no more than 3–5 clarification questions.
- Allow learner to skip clarification and start.
- Store the goal as a persistent object.
- Generate measurable success criteria.

---

## 7.2 Curriculum / Quest Engine

Purpose: turn a goal into a sequence of quests and lessons.

A **Quest** is a contained learning unit with a clear objective, tasks, and assessment.

A **Curriculum** is a sequence of quests.

Requirements:

- Generate one-week plans by default.
- Support the weekly rhythm proposed in the v2 issue:
  - D1: lecture + homework
  - D2: homework / practice
  - D3: lecture + homework
  - D4: homework / practice
  - D5: quiz + lecture + homework due
- Support 1–2 hours/day of homework when the learner opts into it.
- Generate objectives, focus points, prerequisites, daily plan, homework, and quiz criteria.
- Store generated plans as editable structured data, not just chat text.

---

## 7.3 Mentor System

Purpose: assign the right teaching style.

Mentors can be historical, fictionalized archetypes, or role-based. The key is their pedagogy.

Examples:

- Socrates: critical questioning
- Aristotle: structured reasoning and classification
- Marcus Aurelius: reflection and applied ethics
- Ada Lovelace: computational creativity
- Leonardo da Vinci: invention, diagrams, imagination
- Feynman-style mentor: intuitive explanation and analogies

Requirements:

- Mentor templates must be versioned.
- Mentor output must obey the lesson mode.
- Mentor should not override curriculum state.
- Mentors must have:
  - name
  - teaching style
  - domain expertise
  - tone
  - allowed / disallowed behaviors
  - source-grounding policy
  - language policy
  - voice profile metadata, later

---

## 7.4 Lesson Runtime: 3-2-1 Mode

Purpose: avoid the “Socratic from the start” problem.

A lesson has three stages:

### Stage 3 — Explanation + Example

The mentor teaches the concept plainly and gives at least one example.

### Stage 2 — Guided Practice

The learner works through a problem with hints, partial steps, and feedback.

### Stage 1 — Socratic Check

The mentor asks questions that reveal whether the learner understands the idea.

Requirements:

- Every session has a visible stage.
- Learner can ask for more explanation.
- System can move backward if the learner struggles.
- System can move forward after successful practice.
- Session ends with a recap and next action.

---

## 7.5 Assessment Engine

Purpose: decide whether a learner can proceed.

Requirements:

- Generate 3–10 question quizzes depending on quest size.
- Support multiple choice, short answer, proof/explanation, and project-style assessment.
- Rubric-score short answers.
- Save results and mastery tags.
- If the learner fails, generate targeted review, not shame.
- A quest can enter:
  - Not started
  - Active
  - Practice due
  - Quiz ready
  - Complete
  - Needs review

---

## 7.6 Learner Wiki / Student Profile

Purpose: create a growing memory file for each learner.

The LLM-Wiki should summarize:

- Goals
- Completed quests
- Current quests
- Concepts mastered
- Weaknesses
- Interests
- Preferred learning style
- Misconceptions
- Artifacts created
- Reflections
- Next suggested quests

Requirements:

- Update after every completed session.
- Keep a structured JSON state plus human-readable wiki pages.
- Let the learner view, edit, export, or delete memory.
- Never store sensitive data without clear consent.
- Separate factual course knowledge from learner-personal data.

---

## 7.7 Study Oracle

Purpose: turn course material into study strategy.

Inputs:

- Lecture slides
- Lecture transcripts
- Homework
- Quizzes
- Exams
- Review sessions
- Instructor hints
- Screenshots
- Rubrics
- Current grade
- Time remaining

Outputs:

- Study plan
- Practice exam
- Cheat sheet
- High-yield topic map
- Trap list
- Weakness detector
- “What do I need on the final?” calculator
- Course skill tree
- Concept graph

MVP treatment:

Study Oracle should be implemented after the core quest loop, as v0.3 or v0.4. The first version can accept pasted text or uploaded PDFs/slides and produce a study plan and practice quiz.

---

## 7.8 Artifacts

Purpose: create visual learning aids.

Examples:

- Diagrams
- Concept maps
- Historical maps
- Worked examples
- Flashcards
- Practice worksheets
- Simulations, later
- Generated images/video, later

Requirements:

- Artifacts are attached to a quest/session.
- Artifact generation must be tied to learning objectives.
- Historical or factual artifacts must include source/context checks.
- The learner can revise artifacts.

---

## 7.9 Voice Layer

Purpose: make the same learning runtime conversational.

Voice should not be the core architecture.

Requirements:

- TTS and STT wrap the text engine.
- Transcript accuracy must be measured.
- A learner can always switch to text.
- Voice model, STT provider, and TTS provider are pluggable adapters.
- Session summaries and assessments should rely on corrected text transcripts, not raw STT guesses.

---

## 7.10 VR / Operator Layer

Purpose: immersive presentation of the learning engine.

The VR layer should call the same curriculum, mentor, lesson, and assessment services.

Example:

> “Operator, load Renaissance with Leonardo da Vinci.”

The VR client should:

- Load an environment
- Spawn the selected mentor
- Present the current quest objective
- Run the lesson through the core runtime
- Save progress back to the same learner wiki

VR should be treated as a client, not the source of truth.

---

## 8. Data Objects

## 8.1 LearningGoal

```ts
type LearningGoal = {
  id: string;
  userId: string;
  title: string;
  description: string;
  desiredOutcome: string;
  currentLevel: 'beginner' | 'intermediate' | 'advanced' | 'unknown';
  timeBudgetMinutesPerDay?: number;
  deadline?: string;
  constraints?: string[];
  createdAt: string;
  updatedAt: string;
};
```

## 8.2 Curriculum

```ts
type Curriculum = {
  id: string;
  goalId: string;
  title: string;
  durationDays: number;
  weeklyRhythm: string;
  questIds: string[];
  status: 'draft' | 'active' | 'paused' | 'complete';
  createdAt: string;
  updatedAt: string;
};
```

## 8.3 Quest

```ts
type Quest = {
  id: string;
  curriculumId?: string;
  goalId: string;
  title: string;
  objective: string;
  focusPoints: string[];
  mentorIds: string[];
  lessons: Lesson[];
  homework: HomeworkTask[];
  assessmentId?: string;
  status: 'draft' | 'active' | 'practice_due' | 'quiz_ready' | 'complete' | 'needs_review';
  masteryTags: string[];
  createdAt: string;
  updatedAt: string;
};
```

## 8.4 LessonSession

```ts
type LessonSession = {
  id: string;
  userId: string;
  questId: string;
  mentorId: string;
  stage: 'explain' | 'example' | 'guided_practice' | 'socratic_check' | 'recap';
  transcriptId: string;
  summary?: string;
  nextAction?: string;
  startedAt: string;
  endedAt?: string;
};
```

## 8.5 LearnerWiki

```ts
type LearnerWiki = {
  userId: string;
  summary: string;
  interests: string[];
  masteredConcepts: string[];
  weakConcepts: string[];
  misconceptions: string[];
  preferredLearningStyle?: string;
  questHistory: string[];
  nextRecommendations: string[];
  updatedAt: string;
};
```

---

## 9. Success Metrics

### Activation

- User creates first goal.
- User starts first quest.
- Time from signup to first lesson is under 5 minutes.

### Learning loop

- Session completion rate.
- Quiz completion rate.
- Quest completion rate.
- “Needs review” recovery rate.

### Quality

- Learner rates lesson helpfulness.
- Learner rates mentor quality.
- Learner asks fewer repeated confusion questions after review.
- Quiz score improves after targeted review.

### Retention

- Number of active learning days per week.
- Number of quests completed per month.
- Return rate after first quest.

### Study Oracle

- Practice exam completion.
- Weakness map usage.
- Study plan adherence.

---

## 10. Nonfunctional Requirements

### Security

- Model provider keys must not be exposed in the browser.
- User uploads must be private by default.
- Use row-level security for all user-owned records.
- Store prompt runs and model outputs for debugging, but avoid storing sensitive material unless needed.

### Privacy

- Learner Wiki must have export and delete.
- Career/path suggestions must be optional.
- Course material analysis must be user-controlled.

### Reliability

- Quests must have deterministic state transitions.
- Generated data must be validated with schemas.
- Failed AI calls must have retry and fallback states.

### Accessibility

- Text mode must always exist.
- Voice is optional.
- UI must support keyboard navigation.
- Visual artifacts need alt text or text summaries.

### Accuracy

- Historical mentor claims should be grounded.
- Study Oracle outputs should reference uploaded materials.
- Generated diagrams must be marked as generated and checked for factual consistency when used for history/science.

---

## Current implementation status

M0 and M1 are complete on `main`. The product now has a text-first app shell, goal intake, curriculum and quest generation seams, mentor registry, 3-2-1 lesson runtime, lesson persistence, progress summary helpers, active quest/next-action surface, and server-side AI gateway/model preference seams. The next product gap is M2 Assessment and Mastery: generated quizzes, rubric grading, mastery-gated quest completion, and targeted review.

## 11. Release Plan

### v0.0 — Rebuild Foundation

- Clean repo structure
- Auth
- DB schema
- AI gateway
- Prompt versioning
- Basic UI shell

### v0.1 — Core Learning Loop

- Goal intake
- Quest generation
- Mentor assignment
- 3-2-1 lesson runtime
- Quiz
- Progress dashboard

### v0.2 — Learner Wiki + Mastery

- LLM-Wiki
- Mastery tags
- Weakness detection
- Next quest recommendations
- Reflection archive

### v0.3 — Study Oracle Lite

- Upload/paste course materials
- Generate study plan
- Generate practice quiz
- High-yield topic map
- Weakness map

### v0.4 — Voice and Artifacts

- STT/TTS adapters
- Text/voice toggle
- Diagram/artifact generator
- Artifact library

### v0.5 — Creator Tools

- Import/export quests
- Import/export mentors
- User-created private quest database
- Templates

### v1.0 — Immersive Demo

- VR client or operator demo
- “Operator, load...” scene flow
- Multi-mentor curriculum demo
- Public demo-ready polish

---

## 12. North Star

A learner should feel that SotA is not giving them answers. It is building their personal academy: a curriculum, mentors, practice, memory, and a path forward.
