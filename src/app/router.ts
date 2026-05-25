import { renderGoalIntakeRoute } from "./routes/GoalRoute.ts";
import { renderHomeRoute } from "./routes/HomeRoute.ts";

export type AppRouteId = "home" | "goal-intake" | "not-found";

export type AppRoute = {
  id: AppRouteId;
  path: string;
  title: string;
  html: string;
  status: number;
};

export const routes = [
  { id: "home", path: "/", title: "Home" },
  { id: "goal-intake", path: "/goals/new", title: "Start a goal" },
] as const;

export type AppRenderOptions = {
  staticOnly?: boolean;
};

export function resolveRoute(pathname: string, options: AppRenderOptions = {}): AppRoute {
  const path = normalizePath(pathname);

  if (path === "/") {
    return {
      id: "home",
      path,
      title: "School of the Ancients",
      html: renderHomeRoute(),
      status: 200,
    };
  }

  if (path === "/goals/new") {
    return {
      id: "goal-intake",
      path,
      title: "Start a learning goal",
      html: renderGoalIntakeRoute({ staticOnly: options.staticOnly }),
      status: 200,
    };
  }

  return {
    id: "not-found",
    path,
    title: "Route not found",
    html: `<main data-route="not-found"><h1>Route not found</h1><p>No route exists for ${escapeHtml(path)}.</p><a href="/">Go home</a></main>`,
    status: 404,
  };
}

function normalizePath(pathname: string): string {
  try {
    const parsed = new URL(pathname, "http://localhost");
    return parsed.pathname.replace(/\/$/, "") || "/";
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
