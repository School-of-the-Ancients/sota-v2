import { renderActiveQuestSection, buildActiveQuestProgressSurface } from "./HomeRoute.ts";
import { demoQuest } from "./QuestRoute.ts";
import { buildLearnerProgressSummary } from "../../features/progress/progressSummary.ts";

export function renderProgressRoute(): string {
  const activeQuest = { ...demoQuest, status: "practice_due" as const };
  const summary = buildLearnerProgressSummary([
    { id: activeQuest.id, status: activeQuest.status, updatedAt: activeQuest.updatedAt },
    { id: "completed-demo-quest", status: "completed", updatedAt: "2026-05-24T00:00:00.000Z" },
    { id: "review-demo-quest", status: "needs_review", updatedAt: "2026-05-23T00:00:00.000Z" },
  ]);
  const surface = buildActiveQuestProgressSurface([activeQuest]);

  return `
    <main data-route="progress" class="progress-route">
      <p class="eyebrow">Progress dashboard</p>
      <h1>Core loop progress</h1>
      <p>Progress is recomputed from quest/session records instead of mutable browser counters.</p>
      <section aria-label="Progress summary" class="metric-grid">
        <article><strong>${summary.activeQuests}</strong><span>Active quest</span></article>
        <article><strong>${summary.completedQuests}</strong><span>Completed quest</span></article>
        <article><strong>${summary.practiceDueQuests}</strong><span>Practice due</span></article>
        <article><strong>${summary.questsNeedingReview}</strong><span>Needs review</span></article>
      </section>
      ${renderActiveQuestSection(surface)}
      <section aria-labelledby="m1-capabilities-heading">
        <h2 id="m1-capabilities-heading">Implemented M1 capabilities</h2>
        <ul>
          <li>Goal intake saves learner-entered goals through a service seam.</li>
          <li>One-week curriculum generation validates structured output.</li>
          <li>Quest generation saves focus points, practice tasks, and mastery criteria.</li>
          <li>3-2-1 lesson runtime blocks Socratic checking until guided practice.</li>
          <li>Saved session summaries include mentor, prompt versions, messages, recap, and next action.</li>
        </ul>
      </section>
    </main>
  `.trim();
}

export function ProgressRoute() {
  return renderProgressRoute();
}
