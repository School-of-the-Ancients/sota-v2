import { createHash, randomUUID } from "node:crypto";
import { closeSync, existsSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { LessonRuntimeService } from "../lessons/lessonService.ts";
import type { LessonRuntimeAction, LessonStage } from "../lessons/lessonTypes.ts";
import type { OperatorCheckpoint, OperatorContext, OperatorEvidence, OperatorLesson, OperatorSession, OperatorSessionResponse, OperatorVector } from "./operatorTypes.ts";

const stages: LessonStage[] = ["explain", "example", "guided_practice", "socratic_check", "recap", "ended"];
const MAX_RECORDS = 200;
const MAX_CHECKPOINTS = 500;
const MAX_RECEIPTS = 5000;
const MAX_STORE_BYTES = 16 * 1024 * 1024;
type StoredSession = { session: OperatorSession; lesson: OperatorLesson };
type StoredCheckpoint = { checkpoint: OperatorCheckpoint; record: StoredSession };
type Receipt = { fingerprint: string; response: unknown };
type Store = { formatVersion: 1; sessions: Record<string, StoredSession>; checkpoints: Record<string, StoredCheckpoint>; receipts: Record<string, Receipt> };

export class OperatorError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}
function requireValue(condition: unknown, message: string, status = 400): asserts condition {
  if (!condition) throw new OperatorError(status, message);
}
function object(value: unknown, label: string): Record<string, unknown> {
  requireValue(value !== null && typeof value === "object" && !Array.isArray(value), "Invalid " + label);
  return value as Record<string, unknown>;
}
function fields(value: Record<string, unknown>, allowed: string[], required: string[]) {
  requireValue(Object.keys(value).every(key => allowed.includes(key)) && required.every(key => Object.hasOwn(value, key)), "Unexpected or missing request fields");
}
function identifier(value: unknown, label: string): string {
  requireValue(typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(value), "Invalid " + label);
  return value;
}
function requestId(value: unknown): string {
  requireValue(typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(value), "Invalid requestId");
  return value;
}
function vector(value: unknown, maximum: number): OperatorVector {
  const data = object(value, "scale");
  fields(data, ["x", "y", "z"], ["x", "y", "z"]);
  for (const axis of ["x", "y", "z"]) requireValue(typeof data[axis] === "number" && Number.isFinite(data[axis]) && (data[axis] as number) >= 0.01 && (data[axis] as number) <= maximum, "Scale must contain finite components between 0.01 and " + maximum);
  return { x: data.x as number, y: data.y as number, z: data.z as number };
}
function context(value: unknown): OperatorContext {
  const data = object(value, "context");
  fields(data, ["roomId", "anchorId", "objectId", "baselineScale"], ["roomId", "anchorId", "objectId", "baselineScale"]);
  return { roomId: identifier(data.roomId, "roomId"), anchorId: identifier(data.anchorId, "anchorId"), objectId: identifier(data.objectId, "objectId"), baselineScale: vector(data.baselineScale, 10) };
}
function evidence(value: unknown): OperatorEvidence {
  const data = object(value, "evidence");
  fields(data, ["roomId", "anchorId", "objectId", "scale"], ["roomId", "anchorId", "objectId", "scale"]);
  return { roomId: identifier(data.roomId, "roomId"), anchorId: identifier(data.anchorId, "anchorId"), objectId: identifier(data.objectId, "objectId"), scale: vector(data.scale, 20) };
}
function learnerText(value: unknown, required = false): string | undefined {
  if (value === undefined && !required) return undefined;
  requireValue(typeof value === "string" && value.trim().length >= (required ? 3 : 0) && value.length <= 2000 && !/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(value), "Provide a learner response of 3–2000 characters");
  return value.trim();
}
function stable(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(stable).join(",") + "]";
  if (value !== null && typeof value === "object") return "{" + Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => JSON.stringify(key) + ":" + stable(item)).join(",") + "}";
  return JSON.stringify(value);
}
function response(session: OperatorSession): OperatorSessionResponse { return { apiVersion: 1, session: JSON.parse(JSON.stringify(session)) }; }
function boundedText(value: unknown, maximum = 20000) {
  requireValue(typeof value === "string" && value.length <= maximum, "Invalid stored text");
}
function timestamp(value: unknown) {
  requireValue(typeof value === "string" && value.length <= 40 && Number.isFinite(Date.parse(value)), "Invalid stored timestamp");
}
function sources(value: unknown) {
  requireValue(Array.isArray(value) && value.length <= 64, "Invalid stored sources");
  for (const entry of value) {
    const item = object(entry, "source");
    identifier(item.id, "source ID"); boundedText(item.title, 500);
    requireValue(["authored", "research", "technical"].includes(item.kind as string), "Invalid source kind");
    if (item.url !== undefined) { boundedText(item.url, 2048); requireValue(/^https?:\/\//.test(item.url as string), "Invalid source URL"); }
    if (item.citation !== undefined) boundedText(item.citation, 4000);
  }
}
function validateLesson(value: unknown): asserts value is OperatorLesson {
  const lesson = object(value, "lesson");
  identifier(lesson.id, "lesson ID"); identifier(lesson.version, "lesson version");
  boundedText(lesson.title, 500); boundedText(lesson.objective, 4000);
  const mentor = object(lesson.mentor, "mentor");
  identifier(mentor.id, "mentor ID"); identifier(mentor.promptVersion, "prompt version"); boundedText(mentor.name, 500);
  sources(lesson.sources);
  const content = object(lesson.stages, "lesson stages");
  for (const stage of ["not_started", ...stages]) {
    const item = object(content[stage], "lesson content");
    for (const key of ["title", "body", "prompt", "hint"]) boundedText(item[key]);
    sources(item.sources);
  }
}
function validateSession(value: unknown, lesson?: OperatorLesson): asserts value is OperatorSession {
  const session = object(value, "stored session");
  for (const key of ["id", "userId", "questId", "lessonId", "lessonVersion", "mentorId", "promptVersion"]) identifier(session[key], key);
  requireValue(Number.isSafeInteger(session.revision) && (session.revision as number) >= 1 && (session.revision as number) <= MAX_RECEIPTS, "Invalid stored revision");
  requireValue(stages.includes(session.stage as LessonStage), "Invalid stored stage");
  for (const key of ["objective", "stageLabel", "visibleToLearner", "completionLabel"]) boundedText(session[key]);
  timestamp(session.createdAt); timestamp(session.updatedAt); context(session.context);
  const permitted: Record<string, string[]> = {
    explain: ["advance", "ask_example", "ask_more_explanation"], example: ["advance", "ask_more_explanation"],
    guided_practice: ["submit_practice", "ask_more_explanation"], socratic_check: ["answer_socratic_check", "ask_more_explanation"],
    recap: ["finish"], ended: [],
  };
  requireValue(Array.isArray(session.availableActions) && stable([...session.availableActions].sort()) === stable([...permitted[session.stage as string]].sort()), "Invalid stored actions");
  const progress = object(session.progress, "stored progress");
  requireValue(progress.total === stages.length && progress.index === stages.indexOf(session.stage as LessonStage) + 1, "Invalid stored progress");
  const content = object(session.content, "stored content");
  for (const key of ["title", "body", "prompt", "hint"]) boundedText(content[key]);
  sources(content.sources);
  requireValue(Array.isArray(session.messages) && session.messages.length <= 500, "Invalid stored messages");
  for (const raw of session.messages) {
    const message = object(raw, "stored message");
    identifier(message.id, "message ID"); boundedText(message.content);
    requireValue(["system", "mentor", "learner"].includes(message.role as string) && stages.includes(message.stage as LessonStage), "Invalid stored message role or stage");
    timestamp(message.createdAt);
    if (message.mentorId !== undefined) identifier(message.mentorId, "message mentor ID");
    if (message.promptVersion !== undefined) identifier(message.promptVersion, "message prompt version");
  }
  requireValue(Array.isArray(session.history) && session.history.length <= 1000, "Invalid stored history");
  for (const raw of session.history) {
    const event = object(raw, "stored event");
    requireValue(["stage_started", "lesson_message_recorded", "learner_requested_more_explanation", "learner_requested_example", "practice_submitted", "socratic_answer_submitted"].includes(event.type as string) && stages.includes(event.stage as LessonStage), "Invalid stored history event");
    timestamp(event.at);
    for (const key of ["content", "message", "response"]) if (event[key] !== undefined) boundedText(event[key]);
  }
  requireValue(Array.isArray(session.evidence) && session.evidence.length <= 100, "Invalid stored evidence");
  for (const raw of session.evidence) {
    const item = object(raw, "stored evidence");
    requireValue(item.kind === "runtime_scale_report", "Invalid stored evidence kind"); timestamp(item.recordedAt);
    evidence({ roomId: item.roomId, anchorId: item.anchorId, objectId: item.objectId, scale: item.scale });
  }
  if (session.restoredFrom !== undefined) {
    const provenance = object(session.restoredFrom, "restore provenance");
    identifier(provenance.checkpointId, "checkpoint ID"); identifier(provenance.sessionId, "original session ID");
    requireValue(Number.isSafeInteger(provenance.revision) && (provenance.revision as number) >= 1, "Invalid restore revision");
  }
  if (lesson) requireValue(session.lessonId === lesson.id && session.lessonVersion === lesson.version && session.mentorId === lesson.mentor.id &&
    session.promptVersion === lesson.mentor.promptVersion && stable(session.content) === stable(lesson.stages[session.stage as LessonStage]), "Stored session content does not match its immutable lesson version");
}
function validateStore(value: unknown): asserts value is Store {
  const store = object(value, "operator store");
  requireValue(store.formatVersion === 1, "Unsupported operator store");
  const sessions = object(store.sessions, "session map"), checkpoints = object(store.checkpoints, "checkpoint map"), receipts = object(store.receipts, "receipt map");
  requireValue(Object.keys(sessions).length <= MAX_RECORDS && Object.keys(checkpoints).length <= MAX_CHECKPOINTS && Object.keys(receipts).length <= MAX_RECEIPTS, "Operator store capacity exceeded");
  for (const [id, raw] of Object.entries(sessions)) {
    const record = object(raw, "stored session record"); validateLesson(record.lesson); validateSession(record.session, record.lesson);
    requireValue(id === record.session.id, "Stored session ID mismatch");
  }
  for (const [id, raw] of Object.entries(checkpoints)) {
    const saved = object(raw, "stored checkpoint"), checkpoint = object(saved.checkpoint, "checkpoint"), record = object(saved.record, "checkpoint session");
    validateLesson(record.lesson); validateSession(record.session, record.lesson);
    identifier(id, "checkpoint ID");
    requireValue(checkpoint.id === id && Object.hasOwn(sessions, checkpoint.sessionId as string) && checkpoint.sessionId === record.session.id && checkpoint.revision === record.session.revision, "Invalid checkpoint reference");
  }
  for (const [id, raw] of Object.entries(receipts)) {
    requestId(id);
    const receipt = object(raw, "stored receipt"), result = object(receipt.response, "receipt response");
    requireValue(typeof receipt.fingerprint === "string" && /^[a-f0-9]{64}$/.test(receipt.fingerprint) && result.apiVersion === 1, "Invalid stored receipt");
    if (result.session !== undefined) {
      const historical = object(result.session, "receipt session");
      const sessionId = identifier(historical.id, "receipt session ID");
      requireValue(Object.hasOwn(sessions, sessionId), "Receipt refers to an unknown session");
      const canonical = sessions[sessionId] as StoredSession;
      // A receipt may legitimately describe an older stage/revision. Its authored content
      // must still match that stage of the same immutable lesson retained by the session.
      validateSession(historical, canonical.lesson);
      requireValue(historical.revision <= canonical.session.revision, "Receipt revision is newer than its stored session");
    }
    else {
      const checkpoint = object(result.checkpoint, "receipt checkpoint");
      requireValue(Object.hasOwn(checkpoints, checkpoint.id as string) && stable(checkpoint) === stable((checkpoints[checkpoint.id as string] as StoredCheckpoint).checkpoint), "Invalid checkpoint receipt");
    }
  }
}

/** Local adapter around the canonical lesson runtime; records participation, never mastery. */
export class OperatorService {
  readonly directory: string;
  private readonly file: string;
  private readonly lessons: Map<string, OperatorLesson>;
  private readonly runtime = new LessonRuntimeService();
  private store: Store;
  private diskFingerprint: string | null = null;

  constructor(options: { directory: string; lessons: OperatorLesson[] }) {
    this.directory = resolve(options.directory);
    mkdirSync(this.directory, { recursive: true });
    this.file = join(this.directory, "store.json");
    this.lessons = new Map(options.lessons.map(lesson => [lesson.id, structuredClone(lesson)]));
    requireValue(this.lessons.size === options.lessons.length && this.lessons.size > 0, "Bundled lesson IDs must be unique");
    for (const lesson of this.lessons.values()) validateLesson(lesson);
    if (existsSync(this.file)) {
      requireValue(!lstatSync(this.file).isSymbolicLink() && lstatSync(this.file).size <= MAX_STORE_BYTES, "Operator store is invalid or oversized", 500);
      try {
        const raw = readFileSync(this.file, "utf8");
        const parsed = JSON.parse(raw);
        validateStore(parsed);
        this.store = parsed;
        this.diskFingerprint = createHash("sha256").update(raw).digest("hex");
      } catch { throw new OperatorError(500, "Cannot read operator store; existing data was preserved"); }
    } else this.store = { formatVersion: 1, sessions: {}, checkpoints: {}, receipts: {} };
  }
  listLessons() {
    return { apiVersion: 1, lessons: [...this.lessons.values()].map(({ stages: _, ...lesson }) => structuredClone(lesson)) };
  }
  listSessions() { return { apiVersion: 1, sessions: Object.values(this.store.sessions).map(record => structuredClone(record.session)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)) }; }
  getSession(id: string): OperatorSessionResponse { return response(this.getRecord(id).session); }
  getCheckpoint(id: string) {
    identifier(id, "checkpointId");
    const found = Object.hasOwn(this.store.checkpoints, id) ? this.store.checkpoints[id] : undefined;
    requireValue(found, "Checkpoint not found", 404);
    return { apiVersion: 1, checkpoint: structuredClone(found.checkpoint), session: structuredClone(found.record.session) };
  }

  start(raw: unknown): OperatorSessionResponse {
    const body = object(raw, "request");
    fields(body, ["requestId", "lessonId", "context"], ["requestId", "lessonId", "context"]);
    return this.mutate(requestId(body.requestId), "start", body, draft => {
      const lesson = this.lessons.get(identifier(body.lessonId, "lessonId"));
      requireValue(lesson, "Bundled lesson not found", 404);
      requireValue(Object.keys(draft.sessions).length < MAX_RECORDS, "Local session capacity reached", 409);
      const bound = context(body.context);
      const runtime = this.runtime.startLesson({ userId: "local-operator", questId: lesson.id, objective: lesson.objective });
      const session: OperatorSession = { ...runtime, revision: 1, lessonId: lesson.id, lessonVersion: lesson.version,
        mentorId: lesson.mentor.id, promptVersion: lesson.mentor.promptVersion, content: structuredClone(lesson.stages.explain),
        progress: { index: 1, total: stages.length }, context: bound, evidence: [], completionLabel: "" };
      this.present(session, lesson, true);
      draft.sessions[session.id] = { session, lesson: structuredClone(lesson) };
      return response(session);
    }) as OperatorSessionResponse;
  }

  act(id: string, raw: unknown): OperatorSessionResponse {
    identifier(id, "sessionId");
    const body = object(raw, "request");
    fields(body, ["requestId", "expectedRevision", "action", "message", "evidence"], ["requestId", "expectedRevision", "action"]);
    return this.mutate(requestId(body.requestId), "action:" + id, body, draft => {
      const record = this.getRecord(id, draft);
      let session = record.session;
      this.revision(session, body.expectedRevision);
      requireValue(session.history.length < 1000 && session.messages.length < 500, "Session event capacity reached", 409);
      const action = body.action as LessonRuntimeAction;
      requireValue(typeof action === "string" && session.availableActions.includes(action), "Action is unavailable at this lesson stage", 409);
      const mustRespond = ["submit_practice", "answer_socratic_check", "finish"].includes(action) || (action === "advance" && session.stage === "example");
      if (action === "advance" && session.stage === "example") requireValue(typeof body.message === "string" && body.message.trim().length >= 3, "Record your prediction before starting the practice");
      const message = learnerText(body.message, mustRespond);
      requireValue(body.evidence === undefined || action === "submit_practice", "Transform evidence is only accepted with practice submission");
      if (action === "submit_practice") {
        const reported = evidence(body.evidence);
        const bound = session.context;
        requireValue(reported.roomId === bound.roomId && reported.anchorId === bound.anchorId && reported.objectId === bound.objectId, "Practice evidence must refer to the bound room, anchor, and object", 409);
        for (const axis of ["x", "y", "z"] as const) {
          const expected = bound.baselineScale[axis] * 2;
          requireValue(Math.abs(reported.scale[axis] - expected) <= Math.max(0.00001, expected * 0.01), "Revise the bound object's scale to twice its starting size before submitting practice", 422);
        }
        session.evidence.push({ ...reported, recordedAt: new Date().toISOString(), kind: "runtime_scale_report" });
      }
      if (message) session = { ...session, ...this.runtime.recordLessonMessage(session, "learner", message) };
      const previousStage = session.stage;
      session = { ...session, ...this.runtime.recordLearnerAction(session, action, message) };
      if (action === "submit_practice" || action === "answer_socratic_check") session = { ...session, ...this.runtime.advance(session) };
      if (action === "ask_more_explanation") session = { ...session, ...this.runtime.recordLessonMessage(session, "mentor", record.lesson.stages[session.stage].hint, { mentorId: session.mentorId, promptVersion: session.promptVersion }) };
      session.revision++;
      this.present(session, record.lesson, previousStage !== session.stage);
      requireValue(session.history.length <= 1000 && session.messages.length <= 500, "Session event capacity reached", 409);
      record.session = session;
      return response(session);
    }) as OperatorSessionResponse;
  }

  checkpoint(id: string, raw: unknown) {
    identifier(id, "sessionId");
    const body = object(raw, "request");
    fields(body, ["requestId", "expectedRevision"], ["requestId", "expectedRevision"]);
    return this.mutate(requestId(body.requestId), "checkpoint:" + id, body, draft => {
      const record = this.getRecord(id, draft);
      this.revision(record.session, body.expectedRevision);
      requireValue(Object.keys(draft.checkpoints).length < MAX_CHECKPOINTS, "Local checkpoint capacity reached", 409);
      const checkpoint: OperatorCheckpoint = { id: randomUUID(), sessionId: id, revision: record.session.revision };
      draft.checkpoints[checkpoint.id] = { checkpoint, record: structuredClone(record) };
      return { apiVersion: 1, checkpoint: structuredClone(checkpoint) };
    });
  }
  restore(checkpointId: string, raw: unknown): OperatorSessionResponse {
    identifier(checkpointId, "checkpointId");
    const body = object(raw, "request");
    fields(body, ["requestId"], ["requestId"]);
    return this.mutate(requestId(body.requestId), "restore:" + checkpointId, body, draft => {
      const saved = Object.hasOwn(draft.checkpoints, checkpointId) ? draft.checkpoints[checkpointId] : undefined;
      requireValue(saved, "Checkpoint not found", 404);
      requireValue(Object.keys(draft.sessions).length < MAX_RECORDS, "Local session capacity reached", 409);
      const record = structuredClone(saved.record);
      const now = new Date().toISOString();
      record.session = { ...record.session, id: randomUUID(), revision: 1, createdAt: now, updatedAt: now,
        restoredFrom: { checkpointId, sessionId: saved.checkpoint.sessionId, revision: saved.checkpoint.revision } };
      draft.sessions[record.session.id] = record;
      return response(record.session);
    }) as OperatorSessionResponse;
  }
  private getRecord(id: string, store = this.store): StoredSession {
    identifier(id, "sessionId");
    const found = Object.hasOwn(store.sessions, id) ? store.sessions[id] : undefined;
    requireValue(found, "Session not found", 404);
    return found;
  }
  private revision(session: OperatorSession, expected: unknown) {
    requireValue(Number.isSafeInteger(expected) && (expected as number) >= 1, "Invalid expectedRevision");
    requireValue(session.revision === expected, "Session changed; fetch the latest revision before retrying", 409);
  }
  private present(session: OperatorSession, lesson: OperatorLesson, recordContent: boolean) {
    session.content = structuredClone(lesson.stages[session.stage]);
    session.progress = { index: Math.max(0, stages.indexOf(session.stage)) + 1, total: stages.length };
    session.completionLabel = session.stage === "ended" ? "Activity completed; participation and reflection recorded. Mastery was not assessed." : "In progress — authored activity; no mastery assessment";
    // Tighten the client interface without replacing canonical stage transitions.
    if (session.stage === "socratic_check") session.availableActions = session.availableActions.filter(action => action !== "advance");
    if (recordContent) Object.assign(session, this.runtime.recordLessonMessage(session, "mentor", session.content.body + "\n\n" + session.content.prompt, { mentorId: session.mentorId, promptVersion: session.promptVersion }));
  }
  private mutate(id: string, operation: string, body: unknown, apply: (draft: Store) => unknown): unknown {
    const fingerprint = createHash("sha256").update(stable({ operation, body })).digest("hex");
    const receipt = Object.hasOwn(this.store.receipts, id) ? this.store.receipts[id] : undefined;
    if (receipt) {
      requireValue(receipt.fingerprint === fingerprint, "requestId was already used for a different operation", 409);
      return structuredClone(receipt.response);
    }
    requireValue(Object.keys(this.store.receipts).length < MAX_RECEIPTS, "Local operation capacity reached", 409);
    const draft = structuredClone(this.store);
    const result = apply(draft);
    draft.receipts[id] = { fingerprint, response: structuredClone(result) };
    const serialized = JSON.stringify(draft);
    requireValue(Buffer.byteLength(serialized) <= MAX_STORE_BYTES, "Local operator data capacity reached", 409);
    const temporary = join(this.directory, ".store-" + randomUUID() + ".tmp");
    const lockPath = join(this.directory, ".writer.lock");
    let descriptor: number | undefined;
    let lock: number | undefined;
    try {
      try { lock = openSync(lockPath, "wx", 0o600); }
      catch { throw new OperatorError(409, "Operator data is locked by a writer. Use one service per data directory; after a forced exit, stop all writers before removing .writer.lock"); }
      writeFileSync(lock, JSON.stringify({ pid: process.pid }), "utf8");
      const currentFingerprint = existsSync(this.file) ? createHash("sha256").update(readFileSync(this.file, "utf8")).digest("hex") : null;
      requireValue(currentFingerprint === this.diskFingerprint, "Operator data changed in another process; restart this service before mutating it", 409);
      descriptor = openSync(temporary, "wx", 0o600);
      writeFileSync(descriptor, serialized, "utf8");
      fsyncSync(descriptor);
      closeSync(descriptor); descriptor = undefined;
      renameSync(temporary, this.file);
      // Match the durable JSON representation, including omitted optional fields, before exposing receipts.
      this.store = JSON.parse(serialized);
      this.diskFingerprint = createHash("sha256").update(serialized).digest("hex");
    } catch (error) {
      if (error instanceof OperatorError) throw error;
      throw new OperatorError(500, "Could not save operator state; previous state was preserved");
    } finally {
      if (descriptor !== undefined) closeSync(descriptor);
      if (existsSync(temporary)) unlinkSync(temporary);
      if (lock !== undefined) { closeSync(lock); unlinkSync(lockPath); }
    }
    return JSON.parse(JSON.stringify(result));
  }
}
