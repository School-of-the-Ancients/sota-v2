import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";

import { renderAppShell } from "./App.ts";
import { CurriculumService } from "../features/curriculum/curriculumService.ts";
import type { AIGateway } from "../lib/ai/aiGateway.ts";
import { curriculaRepo, type CurriculaRepository } from "../lib/db/repositories/curriculaRepo.ts";
import { goalsRepo, type GoalsRepository } from "../lib/db/repositories/goalsRepo.ts";
import { resolveRoute } from "./router.ts";
import { renderCurriculumReviewRoute } from "./routes/CurriculumRoute.ts";
import { submitGoalIntakeRoute, type GoalIntakeFormData } from "./routes/GoalRoute.ts";

export type AppServerOptions = {
  defaultUserId?: string;
  goalsRepo?: GoalsRepository;
  curriculaRepo?: CurriculaRepository;
  aiGateway?: Pick<AIGateway, "generateText">;
};

export function createAppServer(options: AppServerOptions = {}) {
  const defaultUserId = options.defaultUserId ?? "local-dev-user";
  const goalStore = options.goalsRepo ?? goalsRepo;
  const curriculumStore = options.curriculaRepo ?? curriculaRepo;
  return createServer(async (request: IncomingMessage, response: ServerResponse) => {
    const url = new URL(request.url ?? "/", "http://localhost");

    const curriculumPostMatch = url.pathname.match(/^\/goals\/([^/]+)\/curriculum$/);
    if (request.method === "POST" && curriculumPostMatch) {
      const goalId = curriculumPostMatch[1];
      const formData = await readUrlEncodedForm(request);
      const goal = await goalStore.getById(defaultUserId, goalId);
      if (!goal) {
        response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        response.end("Goal not found");
        return;
      }
      if (!options.aiGateway) {
        response.writeHead(503, { "content-type": "text/plain; charset=utf-8" });
        response.end("Curriculum generation requires an AI gateway");
        return;
      }

      const service = new CurriculumService({ curriculaRepo: curriculumStore, aiGateway: options.aiGateway });
      const previousCurriculumId = formData.previousCurriculumId;
      const curriculum = previousCurriculumId
        ? await service.regenerateOneWeekFromGoal({ userId: defaultUserId, goal, previousCurriculumId })
        : await service.generateOneWeekFromGoal({ userId: defaultUserId, goal });

      response.writeHead(303, { location: `/goals/${goal.id}/curricula/${curriculum.id}` });
      response.end();
      return;
    }

    if (request.method === "POST" && url.pathname === "/goals/new") {
      const formData = await readUrlEncodedForm(request);
      const result = await submitGoalIntakeRoute({
        userId: defaultUserId,
        formData,
        goalsRepo: goalStore,
        aiGateway: options.aiGateway,
      });

      if (!result.ok) {
        response.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
        response.end(result.error);
        return;
      }

      if (formData.generateCurriculum === "on") {
        response.writeHead(303, { location: `/goals/${result.goal.id}/curriculum` });
        response.end();
        return;
      }

      response.writeHead(303, { location: result.redirectTo });
      response.end();
      return;
    }

    if (request.method !== "GET") {
      response.writeHead(405, { "content-type": "text/plain; charset=utf-8" });
      response.end("Method not allowed");
      return;
    }

    const curriculumReviewMatch = url.pathname.match(/^\/goals\/([^/]+)\/curricula\/([^/]+)$/);
    if (curriculumReviewMatch) {
      const curriculum = await curriculumStore.getById(defaultUserId, curriculumReviewMatch[2]);
      if (!curriculum || curriculum.goalId !== curriculumReviewMatch[1]) {
        response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        response.end("Curriculum not found");
        return;
      }

      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(renderAppShell(url.pathname, { overrideHtml: renderCurriculumReviewRoute({ curriculum }), overrideTitle: curriculum.title }));
      return;
    }

    const route = resolveRoute(url.pathname);
    response.writeHead(route.status, { "content-type": "text/html; charset=utf-8" });
    response.end(renderAppShell(url.pathname));
  });
}

export async function startAppServer(options: { host?: string; port?: number } = {}) {
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? 5173;
  const server = createAppServer();

  await new Promise<void>((resolve) => server.listen(port, host, resolve));
  const address = server.address();
  const actualPort = address && typeof address === "object" ? address.port : port;
  console.log(`SOTA v2 app ready at http://${host}:${actualPort}`);
  return server;
}

async function readUrlEncodedForm(request: IncomingMessage): Promise<GoalIntakeFormData> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const params = new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
  return {
    goal: params.get("goal") ?? undefined,
    refineWithAI: params.get("refineWithAI") ?? undefined,
    generateCurriculum: params.get("generateCurriculum") ?? undefined,
    previousCurriculumId: params.get("previousCurriculumId") ?? undefined,
  };
}
