import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const specPath = new URL("../docs/FRONTEND_BETA_EXPERIENCE_SPEC.md", import.meta.url);

async function readSpec(): Promise<string> {
  return readFile(specPath, "utf8");
}

test("beta experience spec records preserve redesign and drop decisions", async () => {
  const spec = await readSpec();

  assert.match(spec, /sota-beta commit: f0cf562/i);
  assert.match(spec, /## Preserve from beta/i);
  assert.match(spec, /## Redesign for v2/i);
  assert.match(spec, /## Drop or defer/i);

  for (const preserved of [
    "mentor selector",
    "quest library",
    "conversation history",
    "quiz feedback",
    "Matrix Operator",
    "scene/background",
    "visual artifact",
  ]) {
    assert.match(spec, new RegExp(preserved, "i"));
  }

  for (const redesigned of [
    "browser-to-provider",
    "state ownership",
    "localStorage",
    "voice-first",
    "API key",
  ]) {
    assert.match(spec, new RegExp(redesigned, "i"));
  }
});

test("beta experience spec defines route inventory mapped to v2 service boundaries", async () => {
  const spec = await readSpec();

  const expectedRoutes = [
    "/",
    "/goals/new",
    "/curriculum/:curriculumId",
    "/quests",
    "/quests/:questId",
    "/learn/:sessionId",
    "/progress",
    "/settings/models",
    "/history",
    "/artifacts",
  ];

  for (const route of expectedRoutes) {
    assert.ok(spec.includes(`| \`${route}\``), `expected route table to include ${route}`);
  }

  for (const serviceBoundary of [
    "GoalIntakeService",
    "CurriculumService",
    "QuestService",
    "LessonRuntimeService",
    "AssessmentService",
    "TargetedReviewService",
    "ArtifactService",
    "server-side AI gateway",
  ]) {
    assert.match(spec, new RegExp(serviceBoundary, "i"));
  }
});

test("beta experience spec makes model-call states and accessibility explicit", async () => {
  const spec = await readSpec();

  for (const modelState of [
    "loading",
    "streaming",
    "retry",
    "validation failure",
    "provider unavailable",
    "privacy",
    "cost",
  ]) {
    assert.match(spec, new RegExp(modelState, "i"));
  }

  for (const accessibilityRequirement of [
    "keyboard",
    "focus",
    "contrast",
    "reduced-motion",
    "ARIA",
  ]) {
    assert.match(spec, new RegExp(accessibilityRequirement, "i"));
  }
});
