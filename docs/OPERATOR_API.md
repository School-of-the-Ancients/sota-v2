# Local Operator lesson API v1

This headless service exposes one authored lesson through the canonical v2 `LessonRuntimeService`. It adds durable local sessions, checkpoints and mutation receipts for the [Matrix Loading Operator client](https://github.com/School-of-the-Ancients/matrix-loading-operator/tree/codex/learning-sessions). Python coordinates Unity scene changes; this service owns lesson stages and learner records. The authored guide does not call a model, grade understanding, update quest mastery or write the learner wiki.

The existing Vite lesson preview is separate. Starting this API does not wire its old static example to the new session service. Vite may run beside the API when working on the web app, but is not required by the Operator client.

## Run sibling checkouts

Use Node.js 24 and keep both checkouts as sibling directories:

```text
workspace/
  sota-v2/
  matrix-loading-operator/
```

In a terminal at `sota-v2`:

```powershell
npm.cmd ci
npm.cmd run dev:operator
```

The default listener is `http://127.0.0.1:8787`; the data directory is `.sota-data/operator`, relative to the working directory. Keep this terminal running. Optional arguments:

```powershell
npm.cmd run dev:operator -- --host 127.0.0.1 --port 8787 --data .sota-data/operator
Invoke-RestMethod http://127.0.0.1:8787/api/operator/v1/health
```

In another terminal at `matrix-loading-operator`, follow that repository's guided-lesson runbook and run `./Start-ControlService.ps1`. Its Python adapter defaults to the same core URL. If the API port changes, set `SOTA_CORE_URL` in the Python process environment, for example `http://127.0.0.1:8788`. The Operator browser panel uses the Python service at port 8765; Unity polls that service. The browser does not make cross-origin calls directly to port 8787.

Only loopback hosts are accepted. Host/Origin checks and the lack of CORS prevent arbitrary browser origins from using this local API; this is not a multi-user authenticated service. Do not expose it through a public reverse proxy or assume it supplies school-account authorization.

## HTTP contract

Prefix every path below with `/api/operator/v1`. Successful responses use HTTP 200 and `apiVersion: 1`. POST requests must provide JSON, `Content-Type: application/json` and a valid `Content-Length` of 1-65,536 bytes; chunked requests, query parameters and extra request fields are rejected.

| Method and path | Request | Response |
| --- | --- | --- |
| `GET /health` | None | `{apiVersion, ok, mode: "authored-local", learningEngine: "sota-v2", masteryAssessed: false}` |
| `GET /lessons` | None | `{apiVersion, lessons}`; lesson metadata and sources, with stage content omitted. |
| `GET /sessions` | None | `{apiVersion, sessions}` sorted by latest update. |
| `GET /sessions/:id` | None | `{apiVersion, session}`. |
| `POST /sessions` | `{requestId, lessonId, context}` | `{apiVersion, session}` starting at `explain`, revision 1. |
| `POST /sessions/:id/actions` | `{requestId, expectedRevision, action, message?, evidence?}` | `{apiVersion, session}` after one accepted action. |
| `POST /sessions/:id/checkpoints` | `{requestId, expectedRevision}` | `{apiVersion, checkpoint: {id, sessionId, revision}}`. |
| `GET /checkpoints/:id` | None | `{apiVersion, checkpoint, session}` containing the checkpoint's immutable session snapshot. |
| `POST /checkpoints/:id/restore` | `{requestId}` | `{apiVersion, session}`; a new session fork, revision 1, with `restoredFrom`. |

Errors return `{apiVersion: 1, error: "message"}`. Malformed input generally returns 400; unknown records 404; stale revisions, invalid stage actions or reused request IDs with different payloads 409; an unmet scale postcondition 422; persistence failure 500. Unsupported methods return 405, body limits 413, content type 415 and invalid caller boundaries 403. An error is not confirmation that a separate Unity command was rolled back.

## Start and bind a lesson

The bundled lesson ID is `observation-and-scale`, version `1.0.0`. The Operator supplies real context from an acknowledged Unity snapshot; do not invent IDs or treat the example below as a hardware record.

```json
{
  "requestId": "start-demo-001",
  "lessonId": "observation-and-scale",
  "context": {
    "roomId": "simulated-room-v1",
    "anchorId": "table",
    "objectId": "example-prop-id",
    "baselineScale": {"x": 1, "y": 1, "z": 1}
  }
}
```

The context permanently binds this attempt to one room, anchor, prop and starting scale. Baseline scale components must be finite and within 0.01-10; reported practice scale components must be within 0.01-20. The API does not contact Unity to establish that the supplied context is true. The Python adapter must derive it from the current settled runtime and validate the selected object.

A session includes the existing runtime fields (`id`, `userId`, `questId`, `objective`, `stage`, `stageLabel`, `availableActions`, `history`, `messages`, timestamps), plus:

- `revision`, `lessonId`, `lessonVersion`, `mentorId` and `promptVersion`.
- `content: {title, body, prompt, hint, sources}`. Sources carry `id`, `title`, optional URL/citation and `kind: research | authored | technical`.
- `context`, captured `evidence`, `progress: {index, total}` and `completionLabel`.
- Optional `restoredFrom: {checkpointId, sessionId, revision}` for a fork.

`userId` is the local Operator identity. For this bounded activity, `questId` is the authored lesson ID; it does not imply a generated curriculum quest or a mastery update. Use `availableActions` from the latest session to render controls.

## Canonical stages and actions

The authored content covers the canonical `not_started` stage, but API sessions start at `explain`:

```text
Explain -> Example -> Guided Practice -> Socratic Check -> Recap -> Ended
```

| Current stage | Action | Effect and required input |
| --- | --- | --- |
| `explain` | `ask_more_explanation` | Record the authored hint; remain on this stage. |
| `explain` | `ask_example` or `advance` | Move to `example`. |
| `example` | `ask_more_explanation` | Record the hint; remain on this stage. |
| `example` | `advance` | Require a prediction in `message`, then move to `guided_practice`. |
| `guided_practice` | `ask_more_explanation` | Record the hint; remain on this stage. |
| `guided_practice` | `submit_practice` | Require a learner observation and matching transform evidence, then move to `socratic_check`. |
| `socratic_check` | `ask_more_explanation` | Record the hint; remain on this stage. |
| `socratic_check` | `answer_socratic_check` | Require a learner answer, then move to `recap`. |
| `recap` | `finish` | Require a reflection, then move to terminal `ended`. |
| `ended` | None | Read or checkpoint the completed record. |

Required prediction, observation, answer and reflection messages must contain at least 3 characters after trimming leading/trailing whitespace and at most 2,000 characters before trimming. Optional messages also have a 2,000-character limit; prohibited control characters are rejected. This minimum checks record presence, not reasoning quality. Authored hints do not become adaptive model feedback when requested repeatedly.

The wrapper reuses the existing stage transitions/events and explicitly advances after accepted practice and Socratic responses. It removes the generic `advance` shortcut during the Socratic check. It persists the Operator record after each mutation rather than relying on the existing in-memory completed-session repository.

Example practice action, using the current session revision and its actual bound IDs:

```json
{
  "requestId": "practice-demo-001",
  "expectedRevision": 3,
  "action": "submit_practice",
  "message": "Each recorded scale value doubled while the same prop stayed selected.",
  "evidence": {
    "roomId": "simulated-room-v1",
    "anchorId": "table",
    "objectId": "example-prop-id",
    "scale": {"x": 2, "y": 2, "z": 2}
  }
}
```

Each practice scale component must be twice its corresponding baseline value, within 1% tolerance (or an absolute tolerance of 0.00001 when greater). All three context IDs must match. Evidence is accepted only with `submit_practice` and stored with kind `runtime_scale_report` and a server timestamp. This is a reported transform postcondition, not proof of physics, a trusted hardware attestation or an assessment of mastery. For a rectangular block with an unchanged parent, the lesson derives the geometric volume multiplier as `2 x 2 x 2 = 8`.

## Retries, revisions and checkpoints

Every mutation requires a new logical `requestId`: 1-128 characters, beginning with a letter/digit and containing only letters, digits, `_` or `-`. UUID strings work. IDs are shared across operations in the store; do not reuse a session-start ID for an action.

Retry an uncertain HTTP result with the **same request ID and identical operation/payload**. The durable receipt returns the original response, even when the session has advanced since that response. Reusing the ID with a different payload or operation returns 409. After receiving a replayed receipt, fetch the session if the latest state is needed. Changing `expectedRevision` requires a new request ID because it changes the operation's payload.

Actions and checkpoint creation require the latest positive integer `expectedRevision`. A stale value returns 409 without applying a new mutation. Each accepted action increments the revision; checkpoint creation does not change it. Failed requests do not create successful receipts.

A checkpoint contains the complete session and authored lesson version used by that attempt. Restoring it creates a **new session ID** with revision 1 and `restoredFrom`, retaining the checkpoint's stage, responses and captured evidence. It never rewinds the original session or overwrites a later attempt. An ended checkpoint restores an ended record.

These checkpoints contain learning state, not the Unity scene. The Python adapter saves a checkpoint reference beside its scene snapshot, reloads the scene, waits for acknowledgement and verifies the restored snapshot before restoring the canonical lesson. Calling `/restore` directly cannot restore a room or place a prop. Keep the core data directory together with the Operator's scene saves when moving a local workspace; scene files alone do not contain the canonical checkpoint data.

## Local persistence and limits

`.sota-data/` is ignored by Git. The service writes `store.json` using a temporary file, flush and atomic replacement; it retains sessions, authored lesson snapshots, checkpoints and successful mutation receipts across normal restarts. Stored data is validated on startup; an invalid record fails closed and preserves the file.

Keep one service process per data directory. Every write takes an exclusive `.writer.lock` and compares the on-disk store fingerprint with the version loaded by this process. A locked directory or a stale second writer returns 409 instead of overwriting newer data. Restart a stale service before making another mutation. Normal completion releases its own lock; a forced process exit during a write may leave one behind. Stop every writer using that directory before manually removing an abandoned `.writer.lock`. The service does not delete an unknown lock automatically.

The prototype bounds its local store to 200 sessions, 500 checkpoints, 5,000 mutation receipts and 16 MiB. A session also has bounded message/event history. Successful receipts are not evicted to make room, so their request IDs remain reserved. Capacity errors preserve existing data; there is no automatic archival or deletion API. This is a local development store, not the canonical app's planned account database/RLS deployment.

## Validation and scope

Run `npm.cmd test` for the repository tests, including the Operator service/server tests. Cross-process Python/Unity checks live in the partner repository. The default lesson is authored and source-linked; no live model access is required or implied. This API leaves existing assessment/rubric services intact and does not claim a completed activity meets their mastery criteria.

The integrated lesson/scene loop requires separate validation from a passing API test. The partner project's native Quest build remains subject to its documented Meta assembly quarantine, and desktop results do not establish headset testing. Consult both repositories' current runbooks and validation reports for the executed results.
