import test from "node:test";
import assert from "node:assert/strict";

import { renderGoalIntakeRoute, submitGoalIntakeRoute } from "../src/app/routes/GoalRoute.ts";
import { InMemoryGoalsRepository } from "../src/lib/db/repositories/goalsRepo.ts";

test("goal intake route renders a text-first form for a learner goal", () => {
  const html = renderGoalIntakeRoute();

  assert.match(html, /<form[^>]+method="post"[^>]+action="\/goals\/new"/);
  assert.match(html, /name="goal"/);
  assert.match(html, /learning goal, class need, curiosity, or exam target/i);
  assert.match(html, /name="refineWithAI"/);
  assert.match(html, /name="generateCurriculum"/);
  assert.doesNotMatch(html, /name="refineWithAI"[^>]*checked/);
});

test("goal intake submission saves the learner-entered goal", async () => {
  const goalsRepo = new InMemoryGoalsRepository();

  const result = await submitGoalIntakeRoute({
    userId: "user-1",
    formData: {
      goal: "Prepare for CSCI 3104 algorithms",
    },
    goalsRepo,
  });

  assert.equal(result.ok, true);
  assert.equal(result.goal.title, "Prepare for CSCI 3104 algorithms");
  assert.equal(result.goal.description, "Prepare for CSCI 3104 algorithms");
  assert.equal(result.goal.status, "active");
  assert.equal(result.redirectTo, `/goals/${result.goal.id}`);
  assert.deepEqual(await goalsRepo.listByUser("user-1"), [result.goal]);
});

test("goal intake can refine the saved goal through the AI gateway before persistence", async () => {
  const goalsRepo = new InMemoryGoalsRepository();
  const calls: unknown[] = [];
  const aiGateway = {
    async generateText(request: unknown) {
      calls.push(request);
      return {
        data: {
          title: "CSCI 3104 Algorithms Prep",
          description: "Prepare for CSCI 3104 algorithms with a focused prerequisite rebuild.",
          desired_outcome: "Be ready to solve algorithm analysis and graph problems before the course starts.",
          current_level: "beginner",
          success_criteria: ["Explain asymptotic notation", "Solve recurrence and graph practice problems"],
        },
        provider: "fake",
        model: "fake-model",
        promptVersion: "goals.goal-refinement.v1",
        task: "goal_refinement",
      };
    },
  };

  const result = await submitGoalIntakeRoute({
    userId: "user-1",
    formData: {
      goal: "algorithms summer prep",
      refineWithAI: "on",
    },
    goalsRepo,
    aiGateway,
  });

  assert.equal(result.ok, true);
  assert.equal(result.goal.title, "CSCI 3104 Algorithms Prep");
  assert.equal(result.goal.desiredOutcome, "Be ready to solve algorithm analysis and graph problems before the course starts.");
  assert.deepEqual(result.goal.successCriteria, ["Explain asymptotic notation", "Solve recurrence and graph practice problems"]);
  assert.equal(calls.length, 1);
});

test("goal intake rejects empty goals before persistence", async () => {
  const goalsRepo = new InMemoryGoalsRepository();

  const result = await submitGoalIntakeRoute({
    userId: "user-1",
    formData: { goal: "   " },
    goalsRepo,
  });

  assert.equal(result.ok, false);
  assert.match(result.error, /goal is required/i);
  assert.deepEqual(await goalsRepo.listByUser("user-1"), []);
});
