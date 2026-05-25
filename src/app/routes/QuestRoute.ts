import type { Quest } from "../../features/quests/questTypes.ts";

export const demoQuest: Quest = {
  id: "demo-quest",
  userId: "demo-user",
  goalId: "demo-goal",
  curriculumId: "demo-curriculum",
  title: "Big-O foundations",
  objective: "Classify simple loop runtimes and explain the dominant-term rule.",
  prerequisiteNotes: ["Comfort with variables, loops, and basic algebra notation"],
  lessonPlan: [
    "Explain Big-O as an upper-bound language for growth",
    "Walk through a constant, linear, logarithmic, and quadratic example",
    "Practice classifying snippets before the Socratic check",
  ],
  focusPoints: ["Big-O", "dominant terms", "loop analysis", "runtime explanation"],
  practiceTasks: ["Classify five loop snippets", "Explain why constants and lower-order terms drop"],
  masteryCriteria: ["Classifies common loop shapes", "Justifies answers in learner-visible language", "Names the dominant operation"],
  status: "lesson_in_progress",
  createdAt: "2026-05-25T00:00:00.000Z",
  updatedAt: "2026-05-25T00:00:00.000Z",
};

export type QuestDetailRenderInput = {
  quest?: Quest;
};

export function renderQuestDetailRoute(input: QuestDetailRenderInput = {}): string {
  const quest = input.quest ?? demoQuest;
  return `
    <main data-route="quest-detail" data-quest-id="${escapeHtml(quest.id)}" class="quest-detail-route">
      <p class="eyebrow">Generated quest</p>
      <h1>${escapeHtml(quest.title)}</h1>
      <p>${escapeHtml(quest.objective)}</p>
      <div class="status-card">
        <strong>Status:</strong> ${escapeHtml(formatStatus(quest.status))}
      </div>
      <section aria-labelledby="quest-focus-heading">
        <h2 id="quest-focus-heading">Focus points</h2>
        ${renderList(quest.focusPoints)}
      </section>
      <section aria-labelledby="quest-lesson-heading">
        <h2 id="quest-lesson-heading">Lesson plan</h2>
        ${renderList(quest.lessonPlan)}
      </section>
      <section aria-labelledby="quest-practice-heading">
        <h2 id="quest-practice-heading">Practice tasks</h2>
        ${renderList(quest.practiceTasks)}
      </section>
      <section aria-labelledby="quest-mastery-heading">
        <h2 id="quest-mastery-heading">Mastery criteria</h2>
        ${renderList(quest.masteryCriteria)}
      </section>
      <div class="action-row">
        <a class="primary-action" href="/learn/demo">Start 3-2-1 lesson</a>
        <a href="/curriculum/demo">Back to curriculum</a>
      </div>
    </main>
  `.trim();
}

export function QuestRoute() {
  return renderQuestDetailRoute();
}

function renderList(items: readonly string[]): string {
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("\n")}</ul>`;
}

function formatStatus(value: string): string {
  return value
    .split("_")
    .map((part, index) => (index === 0 ? `${part.charAt(0).toUpperCase()}${part.slice(1)}` : part))
    .join(" ");
}

function escapeHtml(value: string | number): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
