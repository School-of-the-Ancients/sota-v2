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

test("schema validator accepts a valid quiz generation payload", () => {
  const result = validator.validate(
    {
      title: "Big-O mastery check",
      instructions: "Answer briefly and explain your reasoning.",
      questions: [
        {
          prompt: "What is the time complexity of a single loop over n items?",
          kind: "short_answer",
          objective_refs: ["Correctly classify common loop runtimes"],
          expected_answer: "O(n)",
          rubric: ["Names O(n)", "Explains one operation per item"],
        },
      ],
    },
    validationSchemas.quizGeneration,
  );

  assert.equal(result.ok, true);
});

test("schema validator rejects quiz generation payloads without questions", () => {
  const result = validator.validate(
    {
      title: "Big-O mastery check",
      instructions: "Answer briefly and explain your reasoning.",
      questions: [],
    },
    validationSchemas.quizGeneration,
  );

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.error, /at least 1 items/i);
  }
});

test("schema validator accepts a valid quiz grading payload", () => {
  const result = validator.validate(
    {
      overall_score: 0.9,
      passed: true,
      confidence: 0.86,
      learner_summary: "You correctly explained linear runtime.",
      improvement_step: "Keep naming the operation that scales with n.",
      misconception_tags: [],
      question_results: [
        {
          question_id: "q1",
          score: 0.9,
          passed: true,
          correct: "Named O(n).",
          missing: "",
          feedback: "Correct and clear.",
          improvement_step: "Mention one operation per item.",
          rubric_hits: ["Names O(n)"],
          misconception_tags: [],
        },
      ],
    },
    validationSchemas.quizGrading,
  );

  assert.equal(result.ok, true);
});

test("schema validator rejects quiz grading payloads without question results", () => {
  const result = validator.validate(
    {
      overall_score: 0.9,
      passed: true,
      confidence: 0.86,
      learner_summary: "You correctly explained linear runtime.",
      improvement_step: "Keep naming the operation that scales with n.",
      misconception_tags: [],
      question_results: [],
    },
    validationSchemas.quizGrading,
  );

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.error, /at least 1 items/i);
  }
});
