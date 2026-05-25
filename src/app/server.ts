import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";

import { renderAppShell } from "./App.ts";
import { resolveRoute } from "./router.ts";

export function createAppServer() {
  return createServer((request: IncomingMessage, response: ServerResponse) => {
    const url = new URL(request.url ?? "/", "http://localhost");

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
