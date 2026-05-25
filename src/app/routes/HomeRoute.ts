import type { Quest } from "../../features/quests/questTypes.ts";
import type { QuestStatus } from "../../features/quests/questStateMachine.ts";

export type HomeRouteOptions = {
  quests?: readonly Quest[];
};

export type ActiveQuestProgressSurface = {
  activeQuest: Quest | null;
  currentState: string;
  recommendedNextAction: {
    label: string;
    href: string;
  };
};

const activeQuestStatuses: QuestStatus[] = ["active", "lesson_in_progress", "practice_due", "quiz_ready", "needs_review"];

export function renderHomeRoute(options: HomeRouteOptions = {}): string {
  const progressSurface = buildActiveQuestProgressSurface(options.quests ?? []);
  return `
    <main data-route="home" class="home-route">
      <section class="hero">
        <p class="eyebrow">Text-first learning engine</p>
        <h1>School of the Ancients</h1>
        <p>Turn a goal, class need, curiosity, or exam target into a structured learning journey.</p>
        <a class="primary-action" href="/goals/new">Start a new goal</a>
      </section>
      ${renderActiveQuestSection(progressSurface)}
      <section aria-label="Current M1 loop">
        <h2>Implemented M1 learning loop</h2>
        <div class="capability-grid">
          <article class="capability-card"><h3>Goal intake</h3><p>Capture a learner goal and optionally refine it through the server-side AI gateway seam.</p><a href="/goals/new">Open goal intake</a></article>
          <article class="capability-card"><h3>One-week curriculum</h3><p>Generate and review a structured seven-day curriculum from a saved goal.</p><a href="/curriculum/demo">View curriculum</a></article>
          <article class="capability-card"><h3>Quest generation</h3><p>Create a focused quest with objectives, focus points, practice tasks, and mastery criteria.</p><a href="/quests/demo">View quest</a></article>
          <article class="capability-card"><h3>3-2-1 lesson</h3><p>Move from explanation to guided practice to Socratic check without starting Socratic too early.</p><a href="/learn/demo">Open lesson</a></article>
          <article class="capability-card"><h3>Saved session</h3><p>Persist messages, prompt versions, summaries, learner recap, and next action.</p><a href="/progress">View progress</a></article>
        </div>
      </section>
    </main>
  `.trim();
}

export function buildActiveQuestProgressSurface(quests: readonly Quest[]): ActiveQuestProgressSurface {
  const activeQuest = [...quests]
    .filter((quest) => activeQuestStatuses.includes(quest.status))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] ?? null;

  if (!activeQuest) {
    return {
      activeQuest: null,
      currentState: "No active quest",
      recommendedNextAction: {
        label: "Generate a quest",
        href: "/goals/new",
      },
    };
  }

  return {
    activeQuest,
    currentState: formatQuestStatus(activeQuest.status),
    recommendedNextAction: nextActionForQuest(activeQuest),
  };
}

export function HomeRoute() {
  return renderHomeRoute();
}

export function renderActiveQuestSection(surface: ActiveQuestProgressSurface): string {
  if (!surface.activeQuest) {
    return `
      <section data-section="active-quest" aria-label="Active quest">
        <p class="eyebrow">Progress</p>
        <h2>No active quest yet</h2>
        <p>Generate a quest from a saved goal or curriculum to begin the text-first learning loop.</p>
        <a class="primary-action" href="${surface.recommendedNextAction.href}">${surface.recommendedNextAction.label}</a>
      </section>
    `.trim();
  }

  return `
    <section data-section="active-quest" data-quest-id="${escapeHtml(surface.activeQuest.id)}" aria-label="Active quest">
      <p class="eyebrow">Active quest</p>
      <h2>${escapeHtml(surface.activeQuest.title)}</h2>
      <p>${escapeHtml(surface.activeQuest.objective)}</p>
      <dl>
        <dt>Current state</dt>
        <dd>${escapeHtml(surface.currentState)}</dd>
        <dt>Recommended next action</dt>
        <dd><a class="primary-action" href="${surface.recommendedNextAction.href}">${escapeHtml(surface.recommendedNextAction.label)}</a></dd>
      </dl>
    </section>
  `.trim();
}

function nextActionForQuest(quest: Quest): ActiveQuestProgressSurface["recommendedNextAction"] {
  const href = `/quests/${encodeURIComponent(quest.id)}`;
  if (quest.status === "lesson_in_progress") {
    return { label: "Continue 3-2-1 lesson", href: `${href}/lesson` };
  }
  if (quest.status === "practice_due") {
    return { label: "Submit guided practice", href: `${href}/practice` };
  }
  if (quest.status === "quiz_ready") {
    return { label: "Answer Socratic check", href: `${href}/check` };
  }
  if (quest.status === "needs_review") {
    return { label: "Review missed concepts", href: `${href}/review` };
  }

  return { label: "Start 3-2-1 lesson", href: `${href}/lesson` };
}

function formatQuestStatus(status: QuestStatus): string {
  return status
    .split("_")
    .map((part, index) => (index === 0 ? capitalize(part) : part))
    .join(" ");
}

function capitalize(value: string): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
