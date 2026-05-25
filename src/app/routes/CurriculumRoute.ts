import type { Curriculum } from "../../features/curriculum/curriculumTypes.ts";

export type CurriculumReviewRenderInput = {
  curriculum: Curriculum;
};

export function renderCurriculumReviewRoute(input: CurriculumReviewRenderInput): string {
  const { curriculum } = input;
  return `
    <main data-route="curriculum-review" class="curriculum-review-route">
      <p class="eyebrow">One-week curriculum draft</p>
      <h1>${escapeHtml(curriculum.title)}</h1>
      ${curriculum.description ? `<p>${escapeHtml(curriculum.description)}</p>` : ""}
      ${curriculum.weeklyRhythm ? `<p><strong>Weekly rhythm:</strong> ${escapeHtml(curriculum.weeklyRhythm)}</p>` : ""}
      <section aria-labelledby="curriculum-days-heading">
        <h2 id="curriculum-days-heading">Review the seven-day plan</h2>
        <ol>
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
      <form method="post" action="/goals/${escapeHtml(curriculum.goalId)}/curriculum">
        <input type="hidden" name="previousCurriculumId" value="${escapeHtml(curriculum.id)}" />
        <button type="submit">Regenerate curriculum</button>
      </form>
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
