import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { request } from "node:http";
import test from "node:test";
import { createOperatorServer, OPERATOR_API_PREFIX, OPERATOR_MAX_BODY } from "../src/features/operator/operatorServer.ts";
import { observationLesson } from "../src/features/operator/observationLesson.ts";

async function fixture(t: { after: (fn: () => Promise<void>) => void }) {
  const directory = mkdtempSync(join(tmpdir(), "sota-operator-http-"));
  const server = createOperatorServer({ directory });
  await new Promise<void>(done => server.listen(0, "127.0.0.1", done));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const base = "http://127.0.0.1:" + address.port + OPERATOR_API_PREFIX;
  t.after(async () => {
    server.closeAllConnections();
    await new Promise<void>((done, reject) => server.close(error => error ? reject(error) : done()));
    assert.ok(resolve(directory).startsWith(resolve(tmpdir()) + sep + "sota-operator-http-"));
    rmSync(directory, { recursive: true, force: true });
  });
  async function api(path: string, body?: unknown, headers: Record<string, string> = {}) {
    const result = await fetch(base + path, { method: body === undefined ? "GET" : "POST",
      headers: body === undefined ? headers : { "content-type": "application/json", ...headers },
      body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: result.status, body: await result.json() };
  }
  return { base, api };
}
const startBody = { requestId: "http-start", lessonId: observationLesson.id,
  context: { roomId: "room", anchorId: "floor", objectId: "block", baselineScale: { x: 0.2, y: 0.2, z: 0.2 } } };

test("operator HTTP endpoints expose authored status, source catalog, sessions and durable checkpoints", async t => {
  const { api } = await fixture(t);
  assert.deepEqual((await api("/health")).body, { apiVersion: 1, ok: true, mode: "authored-local", learningEngine: "sota-v2", masteryAssessed: false });
  const catalog = await api("/lessons");
  assert.equal(catalog.status, 200);
  assert.equal(catalog.body.lessons[0].id, observationLesson.id);
  assert.ok(catalog.body.lessons[0].sources.length);
  const created = await api("/sessions", startBody);
  assert.equal(created.status, 200);
  const session = created.body.session;
  assert.equal((await api("/sessions")).body.sessions.length, 1);
  assert.deepEqual((await api("/sessions/" + session.id)).body, created.body);
  const checkpoint = await api("/sessions/" + session.id + "/checkpoints", { requestId: "http-checkpoint", expectedRevision: 1 });
  assert.equal(checkpoint.status, 200);
  const snapshot = await api("/checkpoints/" + checkpoint.body.checkpoint.id);
  assert.deepEqual(snapshot.body.session, session);
  const restored = await api("/checkpoints/" + checkpoint.body.checkpoint.id + "/restore", { requestId: "http-restore" });
  assert.equal(restored.status, 200);
  assert.notEqual(restored.body.session.id, session.id);
  assert.equal(restored.body.session.stage, "explain");
});

test("concurrent HTTP mutations serialize with revisions and duplicate request IDs return one receipt", async t => {
  const { api } = await fixture(t);
  const concurrentStarts = await Promise.all([api("/sessions", startBody), api("/sessions", startBody)]);
  assert.deepEqual(concurrentStarts[0], concurrentStarts[1]);
  assert.equal((await api("/sessions")).body.sessions.length, 1);
  const id = concurrentStarts[0].body.session.id;
  const results = await Promise.all([
    api("/sessions/" + id + "/actions", { requestId: "race-one", expectedRevision: 1, action: "advance" }),
    api("/sessions/" + id + "/actions", { requestId: "race-two", expectedRevision: 1, action: "advance" }),
  ]);
  assert.deepEqual(results.map(result => result.status).sort(), [200, 409]);
  const current = (await api("/sessions/" + id)).body.session;
  assert.equal(current.stage, "example");
  assert.equal(current.revision, 2);
});

test("operator HTTP rejects hostile origins/hosts, unsupported requests and malformed/oversized JSON", async t => {
  const { api, base } = await fixture(t);
  const hostileHost = await new Promise<number>((done, reject) => {
    const req = request(base + "/health", { headers: { Host: "evil.example" } }, res => { res.resume(); res.on("end", () => done(res.statusCode ?? 0)); });
    req.on("error", reject); req.end();
  });
  assert.equal(hostileHost, 403);
  assert.equal((await api("/sessions", startBody, { Origin: "https://evil.example" })).status, 403);
  assert.equal((await api("/health?secret=not-used")).status, 400);
  assert.equal((await api("/missing")).status, 404);
  assert.equal((await api("/sessions", startBody, { "content-type": "text/plain" })).status, 415);
  const malformed = await fetch(base + "/sessions", { method: "POST", headers: { "content-type": "application/json" }, body: "{" });
  assert.equal(malformed.status, 400);
  assert.match((await malformed.json()).error, /Invalid JSON/);
  const huge = await fetch(base + "/sessions", { method: "POST", headers: { "content-type": "application/json" }, body: "x".repeat(OPERATOR_MAX_BODY + 1) });
  assert.equal(huge.status, 413);
  await huge.json();
  assert.equal((await api("/sessions")).body.sessions.length, 0);
});
