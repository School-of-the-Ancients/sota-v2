import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { OperatorError, OperatorService } from "./operatorService.ts";
import { observationLesson } from "./observationLesson.ts";
import type { OperatorLesson } from "./operatorTypes.ts";

export const OPERATOR_API_PREFIX = "/api/operator/v1";
export const OPERATOR_MAX_BODY = 64 * 1024;

function loopback(host: string) {
  return host === "localhost" || host === "::1" || host === "[::1]" || /^127(?:\.\d{1,3}){3}$/.test(host) || /^::ffff:127(?:\.\d{1,3}){3}$/.test(host);
}
function send(response: ServerResponse, status: number, value: unknown) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "content-security-policy": "default-src 'none'; frame-ancestors 'none'",
  });
  response.end(JSON.stringify(value));
}
function validateBoundary(request: IncomingMessage) {
  if (!loopback(request.socket.remoteAddress ?? "")) throw new OperatorError(403, "Operator API is local-only");
  const host = request.headers.host;
  if (!host || host.length > 255 || /[/@\\\s]/.test(host)) throw new OperatorError(400, "Invalid Host");
  let parsed: URL;
  try { parsed = new URL("http://" + host); } catch { throw new OperatorError(400, "Invalid Host"); }
  if (!loopback(parsed.hostname.toLowerCase()) || (Number(parsed.port || 80) !== request.socket.localPort)) throw new OperatorError(403, "Host is not allowed");
  if (request.headers.origin && request.headers.origin.toLowerCase() !== parsed.origin.toLowerCase()) throw new OperatorError(403, "Cross-origin request rejected");
}
async function readBody(request: IncomingMessage): Promise<unknown> {
  if (request.headers["transfer-encoding"]) throw new OperatorError(400, "Transfer encoding is unsupported");
  if ((request.headers["content-type"] ?? "").split(";")[0].trim().toLowerCase() !== "application/json") throw new OperatorError(415, "Content-Type must be application/json");
  const size = Number(request.headers["content-length"]);
  if (!Number.isSafeInteger(size) || size <= 0 || size > OPERATOR_MAX_BODY) throw new OperatorError(413, "Request body must be 1–65536 bytes");
  const chunks: Buffer[] = [];
  let received = 0;
  for await (const chunk of request) {
    received += chunk.length;
    if (received > OPERATOR_MAX_BODY) throw new OperatorError(413, "Request body is too large");
    chunks.push(Buffer.from(chunk));
  }
  if (received !== size) throw new OperatorError(400, "Incomplete request body");
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new OperatorError(400, "Invalid JSON"); }
}

export function createOperatorServer(options: { directory: string; lessons?: OperatorLesson[]; service?: OperatorService }) {
  const service = options.service ?? new OperatorService({ directory: options.directory, lessons: options.lessons ?? [observationLesson] });
  const server = createServer(async (request, response) => {
    try {
      validateBoundary(request);
      const url = new URL(request.url ?? "/", "http://localhost");
      if (url.search) throw new OperatorError(400, "Query parameters are unsupported");
      const path = url.pathname;
      let result: unknown;
      if (request.method === "GET") {
        if (path === OPERATOR_API_PREFIX + "/health") result = { apiVersion: 1, ok: true, mode: "authored-local", learningEngine: "sota-v2", masteryAssessed: false };
        else if (path === OPERATOR_API_PREFIX + "/lessons") result = service.listLessons();
        else if (path === OPERATOR_API_PREFIX + "/sessions") result = service.listSessions();
        else {
          const session = path.match(/^\/api\/operator\/v1\/sessions\/([A-Za-z0-9_.:-]+)$/);
          const checkpoint = path.match(/^\/api\/operator\/v1\/checkpoints\/([A-Za-z0-9_.:-]+)$/);
          if (session) result = service.getSession(session[1]);
          else if (checkpoint) result = service.getCheckpoint(checkpoint[1]);
          else throw new OperatorError(404, "Endpoint not found");
        }
      } else if (request.method === "POST") {
        const body = await readBody(request);
        const action = path.match(/^\/api\/operator\/v1\/sessions\/([A-Za-z0-9_.:-]+)\/actions$/);
        const checkpoint = path.match(/^\/api\/operator\/v1\/sessions\/([A-Za-z0-9_.:-]+)\/checkpoints$/);
        const restore = path.match(/^\/api\/operator\/v1\/checkpoints\/([A-Za-z0-9_.:-]+)\/restore$/);
        if (path === OPERATOR_API_PREFIX + "/sessions") result = service.start(body);
        else if (action) result = service.act(action[1], body);
        else if (checkpoint) result = service.checkpoint(checkpoint[1], body);
        else if (restore) result = service.restore(restore[1], body);
        else throw new OperatorError(404, "Endpoint not found");
      } else throw new OperatorError(405, "Use GET or POST");
      send(response, 200, result);
    } catch (error) {
      request.resume();
      const known = error instanceof OperatorError;
      send(response, known ? error.status : 500, { apiVersion: 1, error: known ? error.message : "Operator service error; existing state was preserved" });
    }
  });
  server.requestTimeout = 10000;
  server.headersTimeout = 10000;
  server.maxRequestsPerSocket = 100;
  server.on("clientError", (_error, socket) => {
    if (socket.writable) socket.end("HTTP/1.1 400 Bad Request\r\nConnection: close\r\nContent-Length: 0\r\n\r\n");
  });
  return server;
}
