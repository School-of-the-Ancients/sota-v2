import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { OperatorError, OperatorService } from "../src/features/operator/operatorService.ts";
import { observationLesson } from "../src/features/operator/observationLesson.ts";
import type { OperatorSession } from "../src/features/operator/operatorTypes.ts";

const context = { roomId: "room-a", anchorId: "table-a", objectId: "block-a", baselineScale: { x: 0.2, y: 0.3, z: 0.4 } };
const practiceEvidence = { roomId: "room-a", anchorId: "table-a", objectId: "block-a", scale: { x: 0.4, y: 0.6, z: 0.8 } };
function fixture(t: { after: (fn: () => void) => void }) {
  const directory = mkdtempSync(join(tmpdir(), "sota-operator-test-"));
  t.after(() => {
    assert.ok(resolve(directory).startsWith(resolve(tmpdir()) + "\\sota-operator-test-") || resolve(directory).startsWith(resolve(tmpdir()) + "/sota-operator-test-"));
    rmSync(directory, { recursive: true, force: true });
  });
  return { directory, service: new OperatorService({ directory, lessons: [observationLesson] }) };
}
function start(service: OperatorService, requestId = "start-1") {
  return service.start({ requestId, lessonId: observationLesson.id, context }).session;
}
function action(service: OperatorService, session: OperatorSession, name: string, extras: Record<string, unknown> = {}) {
  return service.act(session.id, { requestId: "action-" + session.revision, expectedRevision: session.revision, action: name, ...extras }).session;
}
function rejects(status: number) { return (error: unknown) => error instanceof OperatorError && error.status === status; }
function guided(service: OperatorService) {
  let session = start(service);
  session = action(service, session, "advance");
  return action(service, session, "advance", { message: "I predict all three dimensions will double." });
}

test("operator runs the canonical authored flow with prediction, evidence, reflection, and no mastery claim", t => {
  const { service } = fixture(t);
  let session = start(service);
  assert.equal(session.stage, "explain");
  assert.equal(session.revision, 1);
  assert.equal(session.lessonVersion, observationLesson.version);
  assert.ok(session.content.sources.length);
  session = action(service, session, "ask_example");
  assert.equal(session.stage, "example");
  session = action(service, session, "advance", { message: "I predict all three dimensions will double." });
  assert.equal(session.stage, "guided_practice");
  session = action(service, session, "submit_practice", { message: "The reported dimensions doubled on each axis.", evidence: practiceEvidence });
  assert.equal(session.stage, "socratic_check");
  assert.equal(session.evidence.length, 1);
  assert.equal(session.evidence[0].kind, "runtime_scale_report");
  assert.ok(!session.availableActions.includes("advance"));
  session = action(service, session, "answer_socratic_check", { message: "Matching ratios support uniform scaling, not a one-axis stretch." });
  assert.equal(session.stage, "recap");
  session = action(service, session, "finish", { message: "I revised my prediction using the object's reported scale." });
  assert.equal(session.stage, "ended");
  assert.deepEqual(session.availableActions, []);
  assert.equal(session.progress.index, session.progress.total);
  assert.match(session.completionLabel, /Mastery was not assessed/);
  assert.ok(session.messages.some(message => message.role === "learner" && message.content.includes("predict")));
  assert.ok(!Object.hasOwn(session, "mastered") && !Object.hasOwn(session, "score"));
});

test("hint records authored response without advancing and wrong-stage actions preserve state", t => {
  const { service } = fixture(t);
  let session = start(service);
  session = action(service, session, "ask_more_explanation", { message: "Explain the scale comparison." });
  assert.equal(session.stage, "explain");
  assert.equal(session.messages.at(-1)?.content, session.content.hint);
  const before = service.getSession(session.id);
  assert.throws(() => action(service, session, "finish", { message: "Done." }), rejects(409));
  assert.deepEqual(service.getSession(session.id), before);
});

test("prediction and practice response/evidence cannot be skipped", t => {
  const { service } = fixture(t);
  let session = action(service, start(service), "advance");
  assert.throws(() => action(service, session, "advance"), rejects(400));
  session = action(service, session, "advance", { message: "All axes should double." });
  const before = service.getSession(session.id);
  assert.throws(() => action(service, session, "advance"), rejects(409));
  assert.throws(() => action(service, session, "submit_practice", { message: "It changed." }), rejects(400));
  assert.throws(() => action(service, session, "submit_practice", { evidence: practiceEvidence }), rejects(400));
  assert.deepEqual(service.getSession(session.id), before);
});

test("practice rejects wrong object, anchor, room, partial scaling, and malformed/nonfinite values atomically", t => {
  const { service } = fixture(t);
  const session = guided(service);
  const invalid = [
    { ...practiceEvidence, roomId: "other-room" },
    { ...practiceEvidence, anchorId: "other-anchor" },
    { ...practiceEvidence, objectId: "other-object" },
    { ...practiceEvidence, scale: { x: 0.4, y: 0.3, z: 0.4 } },
    { ...practiceEvidence, scale: { x: NaN, y: 0.6, z: 0.8 } },
    { ...practiceEvidence, scale: { x: 0.4, y: 0.6 } },
    { ...practiceEvidence, scale: { x: 0.4, y: 0.6, z: 0.8, injected: true } },
  ];
  for (const item of invalid) {
    assert.throws(() => action(service, session, "submit_practice", { message: "Observed change.", evidence: item }), OperatorError);
    assert.deepEqual(service.getSession(session.id).session, session);
  }
  const progressed = action(service, session, "submit_practice", { message: "Observed matching ratio.", evidence: { ...practiceEvidence, scale: { x: 0.40001, y: 0.60001, z: 0.80001 } } });
  assert.equal(progressed.stage, "socratic_check");
});

test("revision conflict, mismatched request ID reuse, unknown fields, and oversized responses preserve sessions", t => {
  const { service } = fixture(t);
  const session = start(service);
  assert.throws(() => service.act(session.id, { requestId: "stale", expectedRevision: 2, action: "advance" }), rejects(409));
  assert.throws(() => service.start({ requestId: "start-1", lessonId: observationLesson.id, context: { ...context, objectId: "other" } }), rejects(409));
  assert.throws(() => action(service, session, "advance", { arbitrary: "code" }), rejects(400));
  assert.throws(() => action(service, session, "advance", { message: "a".repeat(2001) }), rejects(400));
  assert.deepEqual(service.getSession(session.id).session, session);
});

test("successful receipts survive restart and retry never double-advances", t => {
  const { service, directory } = fixture(t);
  const original = start(service);
  const advanced = action(service, original, "advance");
  const reloaded = new OperatorService({ directory, lessons: [observationLesson] });
  assert.deepEqual(start(reloaded), original);
  assert.deepEqual(action(reloaded, original, "advance"), advanced);
  assert.equal(reloaded.listSessions().sessions.length, 1);
  assert.deepEqual(reloaded.getSession(original.id).session, advanced);
  assert.deepEqual(readdirSync(directory), ["store.json"]);
});

test("checkpoint captures immutable state and restore forks without rewinding original session", t => {
  const { service, directory } = fixture(t);
  const original = guided(service);
  const input = { requestId: "checkpoint-1", expectedRevision: original.revision };
  const saved = service.checkpoint(original.id, input) as { checkpoint: { id: string; sessionId: string; revision: number } };
  const newer = action(service, original, "submit_practice", { message: "The dimensions doubled.", evidence: practiceEvidence });
  const reloaded = new OperatorService({ directory, lessons: [observationLesson] });
  assert.deepEqual(reloaded.checkpoint(original.id, input), saved);
  assert.deepEqual(reloaded.getCheckpoint(saved.checkpoint.id).session, original);
  const restored = reloaded.restore(saved.checkpoint.id, { requestId: "restore-1" }).session;
  assert.notEqual(restored.id, original.id);
  assert.equal(restored.stage, "guided_practice");
  assert.equal(restored.revision, 1);
  assert.deepEqual(restored.messages, original.messages);
  assert.deepEqual(restored.context, original.context);
  assert.deepEqual(restored.restoredFrom, { checkpointId: saved.checkpoint.id, sessionId: original.id, revision: original.revision });
  assert.deepEqual(reloaded.getSession(original.id).session, newer);
  const restarted = new OperatorService({ directory, lessons: [observationLesson] });
  assert.deepEqual(restarted.restore(saved.checkpoint.id, { requestId: "restore-1" }).session, restored);
  assert.equal(restarted.listSessions().sessions.length, 2);
});

test("invalid starts cannot create unusable baseline or invented lesson", t => {
  const { service } = fixture(t);
  assert.throws(() => service.start({ requestId: "bad-lesson", lessonId: "invented", context }), rejects(404));
  assert.throws(() => service.start({ requestId: "bad-scale", lessonId: observationLesson.id, context: { ...context, baselineScale: { x: 11, y: 0.2, z: 0.2 } } }), rejects(400));
  assert.throws(() => service.start({ requestId: "bad-id", lessonId: observationLesson.id, context: { ...context, objectId: "../invalid" } }), rejects(400));
  assert.equal(service.listSessions().sessions.length, 0);
});

test("corrupt durable data fails closed and does not replace the file", t => {
  const { directory } = fixture(t);
  writeFileSync(join(directory, "store.json"), "{broken");
  assert.throws(() => new OperatorService({ directory, lessons: [observationLesson] }), rejects(500));
  assert.equal(readFileSync(join(directory, "store.json"), "utf8"), "{broken");
});

test("well-formed JSON with corrupt maps, sessions, checkpoints or receipts fails closed", t => {
  const { service, directory } = fixture(t);
  const session = start(service);
  service.checkpoint(session.id, { requestId: "schema-checkpoint", expectedRevision: 1 });
  const original = JSON.parse(readFileSync(join(directory, "store.json"), "utf8"));
  const corruptions = [
    (store: any) => { store.sessions = []; },
    (store: any) => { store.sessions[session.id].session.stage = "mastered"; },
    (store: any) => { store.sessions[session.id].session.revision = -1; },
    (store: any) => { store.sessions[session.id].session.context.baselineScale.x = "0.2"; },
    (store: any) => { store.sessions[session.id].session.messages = {}; },
    (store: any) => { store.sessions[session.id].session.history[0].type = "unknown"; },
    (store: any) => { store.sessions[session.id].session.content.body = "silently replaced"; },
    (store: any) => { Object.values<any>(store.checkpoints)[0].checkpoint.sessionId = "missing"; },
    (store: any) => { store.receipts["start-1"].fingerprint = "bad"; },
    (store: any) => { store.receipts["start-1"].response.session.progress = null; },
    (store: any) => { store.receipts["start-1"].response.session.content.body = "Replaced receipt guide"; },
  ];
  for (const corrupt of corruptions) {
    const store = structuredClone(original);
    corrupt(store);
    const serialized = JSON.stringify(store);
    writeFileSync(join(directory, "store.json"), serialized);
    assert.throws(() => new OperatorService({ directory, lessons: [observationLesson] }), rejects(500));
    assert.equal(readFileSync(join(directory, "store.json"), "utf8"), serialized);
  }
});

test("historical receipts retain original stage content and reject guide changes on restart", t => {
  const { service, directory } = fixture(t);
  const original = start(service);
  const advanced = action(service, original, "advance");
  const restarted = new OperatorService({ directory, lessons: [observationLesson] });
  assert.deepEqual(start(restarted), original);
  assert.equal(restarted.getSession(original.id).session.stage, advanced.stage);
  const path = join(directory, "store.json");
  const stored = JSON.parse(readFileSync(path, "utf8"));
  stored.receipts["start-1"].response.session.content.body = "A different guide appeared only on retry.";
  const corrupt = JSON.stringify(stored);
  writeFileSync(path, corrupt);
  assert.throws(() => new OperatorService({ directory, lessons: [observationLesson] }), rejects(500));
  assert.equal(readFileSync(path, "utf8"), corrupt);
});

test("another process's newer durable store and active writer lock cannot be overwritten", t => {
  const { service, directory } = fixture(t);
  const session = start(service);
  const second = new OperatorService({ directory, lessons: [observationLesson] });
  const newer = action(second, session, "advance");
  assert.throws(() => action(service, session, "ask_example"), rejects(409));
  assert.deepEqual(new OperatorService({ directory, lessons: [observationLesson] }).getSession(session.id).session, newer);
  const lock = join(directory, ".writer.lock");
  writeFileSync(lock, JSON.stringify({ pid: process.pid }));
  assert.throws(() => action(second, newer, "advance", { message: "My prediction." }), rejects(409));
  assert.equal(readFileSync(lock, "utf8"), JSON.stringify({ pid: process.pid }));
  rmSync(lock);
  assert.equal(action(second, newer, "advance", { message: "My prediction." }).stage, "guided_practice");
});
