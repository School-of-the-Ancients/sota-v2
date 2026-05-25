import type { AppRenderOptions } from "./App.ts";
import { renderCurriculumReviewRoute } from "./routes/CurriculumRoute.ts";
import { renderGoalIntakeRoute } from "./routes/GoalRoute.ts";
import { renderHomeRoute } from "./routes/HomeRoute.ts";
import { renderLessonRuntimeRoute } from "./routes/LessonRoute.ts";
import { renderProgressRoute } from "./routes/ProgressRoute.ts";
import { renderQuestDetailRoute } from "./routes/QuestRoute.ts";

export type AppRouteId = "home" | "goal-intake" | "curriculum-review" | "quest-detail" | "lesson-runtime" | "progress" | "not-found";

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
  { id: "curriculum-review", path: "/curriculum/demo", title: "Curriculum" },
  { id: "quest-detail", path: "/quests/demo", title: "Quest" },
  { id: "lesson-runtime", path: "/learn/demo", title: "Lesson" },
  { id: "progress", path: "/progress", title: "Progress" },
] as const;

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

  if (path === "/curriculum/demo") {
    return {
      id: "curriculum-review",
      path,
      title: "Curriculum",
      html: renderCurriculumReviewRoute(),
      status: 200,
    };
  }

  if (path === "/quests/demo") {
    return {
      id: "quest-detail",
      path,
      title: "Quest",
      html: renderQuestDetailRoute(),
      status: 200,
    };
  }

  if (path === "/learn/demo") {
    return {
      id: "lesson-runtime",
      path,
      title: "Lesson",
      html: renderLessonRuntimeRoute(),
      status: 200,
    };
  }

  if (path === "/progress") {
    return {
      id: "progress",
      path,
      title: "Progress",
      html: renderProgressRoute(),
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
