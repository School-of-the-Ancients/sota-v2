export type FrontendRoute = {
  path: string;
  title: string;
  description: string;
};

export const frontendRoutes: FrontendRoute[] = [
  {
    path: "/goals/new",
    title: "Start a goal",
    description: "Capture a learner goal and route AI work through server-side gateway seams.",
  },
  {
    path: "/curriculum/demo",
    title: "Curriculum",
    description: "Review a generated one-week plan with visible loading, retry, and validation states.",
  },
  {
    path: "/quests/demo",
    title: "Quest",
    description: "Inspect quest objectives, mastery criteria, mentor assignment, and next lesson action.",
  },
  {
    path: "/learn/demo",
    title: "Lesson",
    description: "Run the 3-2-1 lesson flow with transcript, actions, and Operator visual placeholders.",
  },
  {
    path: "/progress",
    title: "Progress",
    description: "Show active quest state, assessment entry points, mastery feedback, and targeted review.",
  },
];

export function renderFrontendApp(pathname = "/"): string {
  const activePath = normalizePath(pathname);
  const route = frontendRoutes.find((item) => item.path === activePath);
  const cards = frontendRoutes
    .map(
      (item) => `<a class="frontend-card" href="${item.path}">
        <span>${escapeHtml(item.title)}</span>
        <small>${escapeHtml(item.description)}</small>
      </a>`,
    )
    .join("\n");

  return `<main data-frontend-route="${escapeHtml(route ? route.path : "home")}" class="frontend-shell">
    <p class="eyebrow">M1.5 frontend foundation</p>
    <h1>School of the Ancients</h1>
    <p class="lede">A React, Vite, and Tailwind browser app foundation over the v2 learning services.</p>
    <nav aria-label="Frontend routes" class="frontend-grid">${cards}</nav>
    <section class="boundary-card" aria-label="AI boundary">
      <h2>No browser-to-provider model calls</h2>
      <p>AI and image work remains behind the server-side gateway and typed provider adapters; browser code owns presentation, not app provider secrets.</p>
    </section>
  </main>`;
}

function normalizePath(pathname: string): string {
  try {
    return new URL(pathname, "http://localhost").pathname.replace(/\/$/, "") || "/";
  } catch {
    return pathname.replace(/\?.*$/, "").replace(/\/$/, "") || "/";
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
