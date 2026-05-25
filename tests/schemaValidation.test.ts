import test from "node:test";
import assert from "node:assert/strict";

import { PassthroughSchemaValidator, validationSchemas } from "../src/lib/validation/schemas.ts";

const validator = new PassthroughSchemaValidator();

test("schema validator rejects missing required fields", () => {
  const result = validator.validate(
    { title: "Learn algorithms" },
    validationSchemas.learningGoal,
  );

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.error, /desired_outcome/i);
  }
});

test("schema validator rejects enum values outside the schema", () => {
  const result = validator.validate(
    {
      title: "Algorithms prep",
      desired_outcome: "Pass CSCI 3104",
      current_level: "wizard",
    },
    validationSchemas.learningGoal,
  );

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.error, /current_level/i);
  }
});

test("schema validator accepts a valid quest generation payload", () => {
  const result = validator.validate(
    {
      quests: [
        {
          title: "Asymptotic notation",
          objective: "Explain Big-O, Big-Omega, and Big-Theta with examples.",
          focus_points: ["Big-O", "Big-Omega", "Big-Theta"],
          lesson_plan: ["Define each notation", "Compare growth-rate examples"],
          practice_tasks: ["Rank growth rates", "Classify loop runtimes"],
          mastery_criteria: ["Classify common functions by growth rate"],
        },
      ],
    },
    validationSchemas.questGeneration,
  );

  assert.equal(result.ok, true);
});

test("schema validator rejects malformed one-week curriculum days", () => {
  const result = validator.validate(
    {
      title: "Algorithms sprint",
      duration_days: 7,
      days: [
        {
          day: 1,
          title: "Asymptotic notation",
          focus_points: ["Big-O"],
          practice_tasks: ["Rank growth rates"],
          mastery_criteria: ["Classify a loop"],
        },
      ],
    },
    validationSchemas.oneWeekCurriculum,
  );

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.error, /at least 7 items|objective/i);
  }
});

test("schema validator rejects one-week curriculum payloads without seven days", () => {
  const result = validator.validate(
    {
      title: "Algorithms sprint",
      duration_days: 7,
      days: [1, 2].map((day) => ({
        day,
        title: `Day ${day}`,
        objective: `Objective ${day}`,
        focus_points: ["Big-O"],
        practice_tasks: ["Rank growth rates"],
        mastery_criteria: ["Classify a loop"],
      })),
    },
    validationSchemas.oneWeekCurriculum,
  );

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.error, /at least 7 items/i);
  }
});
