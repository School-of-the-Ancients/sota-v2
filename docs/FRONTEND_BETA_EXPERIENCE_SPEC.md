# Frontend beta experience spec for M1.5

Source issue: #56, `frontend: audit sota-beta UX and define the better v2 frontend`.
Beta reference: `School-of-the-Ancients/sota-beta` cloned for audit at sota-beta commit: f0cf562.

This is the source-of-truth UX/reference spec for M1.5 issues #57-#63. It uses `sota-beta` as a product reference, not as a code-port plan. The goal is to preserve the immediacy and magical Operator feel while rebuilding on v2's service boundaries, canonical learner records, server-side AI gateway, and explicit model/image call policy.

## Beta reference audit

### Preserve from beta

- Immersive home hub: beta opens as a destination, not a settings form. It centers the learner in a mythic academy with immediate choices.
- Mentor selector: large historical mentor cards with portraits, expertise, timeframe, biography, hover/focus detail, and a direct "Speak" action made the product feel alive.
- Character/mentor creation: custom mentors were a strong creative affordance and should survive as a governed template/registry flow in v2.
- Quest library: beta's quest grid made available learning paths concrete, with duration, objective, mentor pairing, focus points, progress state, and begin/continue/review affordances.
- Quest detail: the detail page gave a clear objective, focus points, mentor context, and single start action before entering the conversation.
- Conversation feel: beta's conversation room combined transcript, mentor voice, suggested prompts, text fallback, microphone state, ambient audio, saving state, and an end/resume loop.
- Conversation history: saved sessions, environment images, quest associations, and resume links made the app feel persistent rather than ephemeral.
- Quiz feedback: beta surfaced score, missed objective tags, mastery/needs-review status, retry, and follow-up actions.
- Settings/API affordance: beta made provider access a visible user concern instead of silently failing.
- Matrix Operator magic: the Operator could respond to "take me to..." or "show me..." by changing the scene/background or creating a visual artifact. This is core product feel for v2, not optional garnish.
- Scene/background immersion: beta generated atmospheric background art and changed ambience to match the lesson moment.
- Inline visual artifact cards: beta inserted generated artifact images into the transcript so diagrams and visuals became part of the learning history.

### Redesign for v2

- Browser-to-provider model calls: beta directly used `@google/genai` and browser-held API keys for chat, suggestions, quiz generation, image generation, and Gemini Live. V2 should route app-owned model/image calls through explicit server-side AI gateway and artifact provider paths. If user-supplied keys are supported, they must be a deliberate settings product flow with clear privacy/cost copy.
- State ownership: beta kept cross-cutting state in a large app component plus browser/user-data hooks. V2 should keep goals, curricula, quests, lessons, assessments, progress, wiki, prompt runs, and artifacts in canonical repository/service seams.
- localStorage migration assumptions: beta migrated browser snapshots into Supabase user data. V2 should treat browser storage as cache only; learner-owned records live in repositories and can be exported/deleted.
- Voice-first fragility: beta's Gemini Live microphone path was magical but fragile. V2 should be text-first with optional voice layered over the same lesson runtime and transcript records.
- API key UX: beta stored/decrypted user API keys in browser paths. V2 settings should distinguish app-managed provider routing, user preference selection, and optional user-owned credentials without exposing app provider secrets.
- Operator implementation: beta conflated function calls, image generation, ambience selection, and transcript mutation in the conversation component. V2 should split this into Operator intents, artifact generation, scene state, persistence, and render cards.
- Quiz generation/grading: beta UI quiz feedback should map to v2 AssessmentService, grading evidence, mastery gates, and targeted review records rather than local-only quest completion flags.
- Resume behavior: beta's resume links were useful; v2 should resume from persisted lesson session state and stage history, not route params alone.
- Visual shell: beta's dark/amber academy style and portraits are worth preserving, but M1.5 should rebuild with reusable app shell, navigation, design tokens, accessibility, and reduced-motion support.

### Drop or defer

- Blind code porting from beta's old React tree.
- Hidden direct browser-to-provider app secrets.
- Voice as the only viable path through a lesson.
- Local/browser-only canonical progress or completion state.
- Unpersisted throwaway generated images.
- UI controls that can bypass v2 state machines, mastery gates, or service validation.
- Full auth/payments/marketplace production hardening in M1.5 unless needed for the frontend smoke gate.

## V2 frontend information architecture

The M1.5 frontend should feel like a coherent browser app with a visible learning loop:

1. Home hub: orient the learner, resume the most important next action, and show the primary journeys.
2. Goal intake: capture/refine a learner goal and trigger curriculum generation through the server-side AI gateway.
3. Curriculum review: present the one-week plan, day structure, generation state, validation errors, regeneration, and quest seeds.
4. Quest library/detail: browse current quests, inspect objectives, see mastery state, and start/resume the next lesson.
5. Lesson runtime: run the 3-2-1 lesson stages with mentor context, transcript, actions, history, and Operator visual affordances.
6. Progress/assessment: show active quest, mastery evidence, quiz entry points, rubric feedback, needs-review state, and targeted review next action.
7. History/artifacts: let learners inspect prior conversations, generated diagrams, scene changes, and visual artifacts as persisted learning records.
8. Settings/models: expose model preferences, provider availability, privacy/cost copy, retry/fallback behavior, and optional user-owned credential entry.

## Route inventory and service ownership

| Route | Primary purpose | V2 service/API boundary | State owner |
| --- | --- | --- | --- |
| `/` | Home hub, next action, mentor/quest entry points | progress summary, quest repository, lesson session lookup | Progress and quest records |
| `/goals/new` | Goal intake and AI refinement | GoalIntakeService through server-side AI gateway | Goal repository and prompt-run records |
| `/curriculum/:curriculumId` | Review one-week plan and regeneration state | CurriculumService through server-side AI gateway | Curriculum repository |
| `/quests` | Quest library, status, create/browse actions | QuestService and quest repository | Quest records and progress projection |
| `/quests/:questId` | Quest detail, objectives, mastery criteria, start/resume | QuestService, LessonRuntimeService, AssessmentService | Quest, lesson session, assessment evidence |
| `/learn/:sessionId` | 3-2-1 lesson runtime with mentor and Operator UI | LessonRuntimeService, mentor registry, server-side AI gateway | Lesson session and prompt-run records |
| `/progress` | Progress, assessment entry points, mastery feedback | AssessmentService, TargetedReviewService, progress summary | Assessment, targeted review, quest state |
| `/settings/models` | Model preferences, provider availability, privacy/cost controls | model preference resolver and server-side AI gateway | Learner preferences and provider registry |
| `/history` | Resume/inspect past sessions | lesson session repository and transcript records | Lesson sessions and summaries |
| `/artifacts` | Browse diagrams, generated images, scene changes | ArtifactService and image-generation provider adapter | Artifact records linked to session/objective |

## Primary journeys

### New learner: goal to first quest

- Learner lands on `/` and chooses "Start a goal".
- `/goals/new` shows privacy copy that learner content may be sent to AI for refinement/curriculum generation.
- Saving a goal creates a learner-owned goal and can call the server-side AI gateway for refinement.
- Curriculum generation enters a visible loading state, then routes to `/curriculum/:curriculumId`.
- Validation failure shows a clear retry path and does not persist malformed AI output as accepted content.
- Curriculum days expose quest seeds and route to quest creation/review without browser-owned provider calls.

### Returning learner: resume next action

- `/` highlights the active quest, latest mastery evidence, and recommended next action.
- If the last assessment failed or low-confidence grading occurred, the next action points to TargetedReviewService output.
- History remains inspectable, but the primary CTA is the current state-machine-safe next action.

### Quest to lesson runtime

- `/quests` and `/quests/:questId` show quest objective, focus points, mastery criteria, current state, and mentor/strategy assignment.
- Starting/resuming a quest opens `/learn/:sessionId` at a persisted lesson stage.
- Lesson runtime starts with explanation, then guided practice, then Socratic check, then recap; UI cannot skip state-machine requirements.
- Ask-more-explanation and ask-example actions are visible before checking.

### Operator visual moment

- In `/learn/:sessionId`, a learner or mentor can invoke an Operator intent such as "take me to the Roman Forum" or "show me a diagram of binary search".
- The frontend shows an Operator card with loading, cost/privacy copy if needed, and cancel/retry affordances.
- The backend classifies the intent as scene/background or visual artifact, calls the image provider adapter, validates output metadata, and persists the artifact record.
- Scene changes update the lesson visual context and become part of session history.
- Visual artifact cards render inline and also appear in `/artifacts`.

### Assessment and review

- Progress surfaces link to quiz/mastery entry points backed by AssessmentService.
- Grading shows score/pass, per-question feedback, misconception tags, confidence, manual-review state, and next action.
- Failed or low-confidence results route to targeted review instead of marking completion.

## Screens that initiate model calls

| Screen | Model/image task | Required user-visible states |
| --- | --- | --- |
| Goal intake | goal refinement, curriculum generation | loading, validation failure, retry, privacy copy, provider unavailable |
| Curriculum review | regenerate one-week plan, derive quest seeds | loading, stale draft warning, retry, cost note, validation failure |
| Quest create/detail | quest generation or regeneration | loading, provider unavailable, retry, draft review before accepting |
| Lesson runtime | mentor response, examples, Socratic checks, Operator intent classification | streaming, thinking, retry, blocked/unavailable, transcript persistence |
| Lesson runtime Operator | scene/background image generation and visual artifact generation | loading card, cancel/retry, provider unavailable, cost/privacy copy, artifact persistence |
| Progress/assessment | quiz generation, rubric grading, targeted review | loading, validation failure, low confidence/manual review, retry |
| Settings/models | preference resolution and provider availability checks | provider unavailable, disabled model, saved preference, privacy/cost explanation |
| Artifacts/history | regenerate or explain an artifact if later allowed | explicit consent, loading, retry, source/unchecked marker |

## Model-call policy

- App-owned model calls go through server-side AI gateway or typed provider adapters; no uncontrolled hidden provider coupling in browser code.
- User-owned API keys, if supported, live behind an explicit settings flow. The UI must say what leaves the browser, where keys are stored, and what costs may be incurred.
- Every AI task records task name, prompt version, resolved provider/model, source preference, input/source IDs, validation status, and failure reason when available.
- Invalid structured output is rejected before persistence and shown as a recoverable validation failure.
- Image-generation providers such as Nano Banana / GPT Image / Gemini image models are allowed and expected for Operator visuals, but must be routed through provider adapters with persisted artifact metadata.

## Accessibility and interaction requirements

- Keyboard: every route, card, action, tab, modal, and generated artifact control must be reachable and operable by keyboard.
- Focus: route changes, modal opens, validation errors, loading completion, and generated artifacts need visible focus states and predictable focus management.
- Contrast: preserve the dark academy aesthetic while meeting readable contrast for body text, disabled states, badges, and error/warning copy.
- Reduced-motion: scene/background transitions, hover zoom, shimmer, waveform, and loading animation should respect reduced-motion preferences.
- ARIA: navigation, primary landmarks, status regions, loading updates, validation errors, artifact cards, and streaming/typing regions should use appropriate ARIA labels/live regions.
- Text fallback: voice and visuals enhance the loop but the text path must remain complete.

## Source-of-truth notes for issues #57-#63

- #57 should create the React/Vite/Tailwind foundation without importing beta's app state or direct provider calls.
- #58 should build the app shell/navigation/design primitives around the route inventory in this spec.
- #59 should expose goal intake and curriculum review with first-class model-call states.
- #60 should implement quest library/detail and 3-2-1 lesson runtime UI over v2 services.
- #61 should expose progress, assessment entry points, mastery feedback, and targeted review next actions.
- #62 should implement settings/model preferences with provider availability, privacy, cost, and no browser app-owned secrets.
- #63 should add smoke/e2e/deployment preview checks for the coherent browser app.

## Open product questions

- Which exact image providers ship first for Operator visuals: Nano Banana, GPT Image, Gemini image, or a provider-neutral adapter with mock/fallback first?
- Should learner-supplied provider keys be supported in M1.5, or should settings only expose app-managed provider/model preferences for now?
- Which mentor/character roster should be canonical in v2: beta's historical figures, v2's teaching strategies, or a merged versioned mentor template system?
- What artifact retention/export/delete controls are required before public preview?
