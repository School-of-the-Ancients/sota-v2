import { demoQuest } from "./QuestRoute.ts";

const lessonStages = [
  {
    label: "Explanation",
    title: "Stage 3: Explain the idea",
    body: "Big-O describes how work grows as input grows. First identify the operation being repeated, then keep the dominant growth term.",
  },
  {
    label: "Example",
    title: "Worked example",
    body: "A single loop over n items is O(n). Two nested loops over the same n items usually produce O(n²).",
  },
  {
    label: "Guided practice",
    title: "Stage 2: Practice with support",
    body: "Classify a loop, say what repeats, and explain which term dominates. Ask for a hint before advancing if needed.",
  },
  {
    label: "Socratic check",
    title: "Stage 1: Prove understanding",
    body: "Why do we drop constants in Big-O, and when would a nested loop not be O(n²)?",
  },
] as const;

export function renderLessonRuntimeRoute(): string {
  return `
    <main data-route="lesson-runtime" class="lesson-runtime-route">
      <p class="eyebrow">3-2-1 lesson runtime</p>
      <h1>${escapeHtml(demoQuest.title)}</h1>
      <p>${escapeHtml(demoQuest.objective)}</p>
      <section aria-labelledby="lesson-stages-heading">
        <h2 id="lesson-stages-heading">Visible lesson stages</h2>
        <div class="stage-grid">
          ${lessonStages
            .map(
              (stage) => `<article class="stage-card">
                <p class="eyebrow">${escapeHtml(stage.label)}</p>
                <h3>${escapeHtml(stage.title)}</h3>
                <p>${escapeHtml(stage.body)}</p>
              </article>`,
            )
            .join("\n          ")}
        </div>
      </section>
      <section aria-labelledby="lesson-session-heading">
        <h2 id="lesson-session-heading">Saved session preview</h2>
        <p>The M1 service seam persists mentor messages, learner messages, prompt versions, summary, learner-visible recap, and next action after the lesson ends.</p>
        <blockquote>Recap: You can classify simple loops by identifying the repeated operation and dominant growth term.</blockquote>
      </section>
      <div class="action-row">
        <a class="primary-action" href="/progress">Save progress and view next action</a>
        <a href="/quests/demo">Back to quest</a>
      </div>
    </main>
  `.trim();
}

export function LessonRoute() {
  return renderLessonRuntimeRoute();
}

function escapeHtml(value: string | number): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
