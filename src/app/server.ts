import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";

import { renderAppShell } from "./App.ts";
import { resolveRoute } from "./router.ts";
import { submitGoalIntakeRoute, type GoalIntakeFormData } from "./routes/GoalRoute.ts";

export type AppServerOptions = {
  defaultUserId?: string;
};

export function createAppServer(options: AppServerOptions = {}) {
  return createServer(async (request: IncomingMessage, response: ServerResponse) => {
    const url = new URL(request.url ?? "/", "http://localhost");

    if (request.method === "POST" && url.pathname === "/goals/new") {
      const formData = await readUrlEncodedForm(request);
      const result = await submitGoalIntakeRoute({
        userId: options.defaultUserId ?? "local-dev-user",
        formData,
      });

      if (!result.ok) {
        response.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
        response.end(result.error);
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
  };
}
