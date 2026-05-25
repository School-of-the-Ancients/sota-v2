import type { Curriculum } from "../../features/curriculum/curriculumTypes.ts";

export type CurriculumReviewRenderInput = {
  curriculum: Curriculum;
};

export const demoCurriculum: Curriculum = {
  id: "demo-curriculum",
  userId: "demo-user",
  goalId: "demo-goal",
  title: "Algorithms summer foundations",
  description: "A one-week bridge from prerequisite review into the first CSCI 3104-style quest.",
  durationDays: 7,
  weeklyRhythm: "45 minutes per day: concept, worked example, short practice, reflection.",
  status: "draft",
  createdAt: "2026-05-25T00:00:00.000Z",
  updatedAt: "2026-05-25T00:00:00.000Z",
  plan: {
    days: [
      {
        day: 1,
        title: "Runtime language and Big-O",
        objective: "Explain dominant-term runtime and classify simple loops.",
        focus_points: ["Big-O", "dominant terms", "loop counting"],
        practice_tasks: ["Classify five loop snippets", "Explain why constants drop"],
        mastery_criteria: ["Can justify O(n), O(log n), and O(n²) examples"],
      },
      {
        day: 2,
        title: "Arrays, lists, and invariants",
        objective: "Trace data-structure operations and name the invariant being preserved.",
        focus_points: ["arrays", "linked lists", "invariants"],
        practice_tasks: ["Trace insert/delete operations", "State the invariant after each step"],
        mastery_criteria: ["Can explain cost and correctness for basic operations"],
      },
      {
        day: 3,
        title: "Recursion and recurrence intuition",
        objective: "Connect recursive code to a simple recurrence tree.",
        focus_points: ["recursion", "base cases", "recurrence trees"],
        practice_tasks: ["Draw a recursion tree", "Identify base and recursive cases"],
        mastery_criteria: ["Can predict work per level for a small recurrence"],
      },
      {
        day: 4,
        title: "Sorting tradeoffs",
        objective: "Compare simple sorting algorithms by runtime and stability.",
        focus_points: ["sorting", "stability", "tradeoffs"],
        practice_tasks: ["Sort a sample by hand", "Explain one tradeoff"],
        mastery_criteria: ["Can choose a sort for a stated constraint"],
      },
      {
        day: 5,
        title: "Graphs as models",
        objective: "Model a small problem as nodes and edges.",
        focus_points: ["graphs", "nodes", "edges", "adjacency"],
        practice_tasks: ["Build an adjacency list", "Name directed vs undirected edges"],
        mastery_criteria: ["Can translate a word problem into a graph representation"],
      },
      {
        day: 6,
        title: "BFS and DFS intuition",
        objective: "Explain what BFS and DFS explore first.",
        focus_points: ["BFS", "DFS", "frontier", "visited set"],
        practice_tasks: ["Run BFS and DFS on the same graph", "Compare visit order"],
        mastery_criteria: ["Can choose BFS or DFS for a simple search goal"],
      },
      {
        day: 7,
        title: "Synthesis quest prep",
        objective: "Combine runtime, invariants, and graph traversal in one mini-quest.",
        focus_points: ["synthesis", "explanation", "mastery check"],
        practice_tasks: ["Solve one mixed problem", "Write a recap of weak points"],
        mastery_criteria: ["Can explain the chosen algorithm and its runtime"],
      },
    ],
  },
};

export function renderCurriculumReviewRoute(input: CurriculumReviewRenderInput = { curriculum: demoCurriculum }): string {
  const { curriculum } = input;
  return `
    <main data-route="curriculum-review" class="curriculum-review-route">
      <p class="eyebrow">One-week curriculum draft</p>
      <h1>${escapeHtml(curriculum.title)}</h1>
      ${curriculum.description ? `<p>${escapeHtml(curriculum.description)}</p>` : ""}
      ${curriculum.weeklyRhythm ? `<p><strong>Weekly rhythm:</strong> ${escapeHtml(curriculum.weeklyRhythm)}</p>` : ""}
      <section aria-labelledby="curriculum-days-heading">
        <h2 id="curriculum-days-heading">Review the seven-day plan</h2>
        <ol class="timeline-list">
          ${curriculum.plan.days
            .map(
              (day) => `<li>
                <h3>Day ${day.day}: ${escapeHtml(day.title)}</h3>
                <p>${escapeHtml(day.objective)}</p>
                <p><strong>Focus:</strong> ${day.focus_points.map(escapeHtml).join(", ")}</p>
                <p><strong>Practice:</strong> ${day.practice_tasks.map(escapeHtml).join(", ")}</p>
                <p><strong>Mastery:</strong> ${day.mastery_criteria.map(escapeHtml).join(", ")}</p>
              </li>`,
            )
            .join("\n          ")}
        </ol>
      </section>
      <div class="action-row">
        <form method="post" action="/goals/${escapeHtml(curriculum.goalId)}/curriculum">
          <input type="hidden" name="previousCurriculumId" value="${escapeHtml(curriculum.id)}" />
          <button type="submit">Regenerate curriculum</button>
        </form>
        <a class="primary-action" href="/quests/demo">Generate first quest</a>
        <a href="/progress">View progress</a>
      </div>
    </main>
  `.trim();
}

function escapeHtml(value: string | number): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
