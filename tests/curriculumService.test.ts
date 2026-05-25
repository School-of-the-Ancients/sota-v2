import test from "node:test";
import assert from "node:assert/strict";

import { CurriculumService } from "../src/features/curriculum/curriculumService.ts";
import type { OneWeekCurriculumOutput } from "../src/features/curriculum/curriculumTypes.ts";
import type { LearningGoal } from "../src/features/goals/goalTypes.ts";
import { InMemoryCurriculaRepository } from "../src/lib/db/repositories/curriculaRepo.ts";

const savedGoal: LearningGoal = {
  id: "goal-1",
  userId: "user-1",
  title: "CSCI 3104 Algorithms Prep",
  description: "Prepare for CSCI 3104 algorithms.",
  desiredOutcome: "Be ready to solve algorithm analysis and graph problems.",
  currentLevel: "beginner",
  constraints: [],
  successCriteria: ["Explain Big-O", "Solve graph traversal problems"],
  status: "active",
  source: "learner",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const generatedCurriculum: OneWeekCurriculumOutput = {
  title: "One-week algorithms readiness sprint",
  description: "A practical seven-day prep plan for CSCI 3104.",
  duration_days: 7,
  weekly_rhythm: "Daily concept review, guided practice, and a mastery check.",
  days: [
    {
      day: 1,
      title: "Asymptotic notation",
      objective: "Explain Big-O, Big-Omega, and Big-Theta.",
      focus_points: ["Big-O", "growth rates"],
      practice_tasks: ["Rank common functions by growth"],
      mastery_criteria: ["Classify a loop by time complexity"],
    },
    {
      day: 2,
      title: "Recurrences",
      objective: "Solve simple recurrences.",
      focus_points: ["substitution", "recursion trees"],
      practice_tasks: ["Solve three recurrence examples"],
      mastery_criteria: ["Pick the right recurrence technique"],
    },
  ],
};

test("curriculum service generates and saves a structured one-week curriculum from a goal", async () => {
  const curriculaRepo = new InMemoryCurriculaRepository();
  const calls: unknown[] = [];
  const aiGateway = {
    async generateText(request: unknown) {
      calls.push(request);
      return {
        data: generatedCurriculum,
        provider: "fake",
        model: "fake-model",
        promptVersion: "curriculum.one-week-curriculum.v1",
        task: "curriculum_generation",
      };
    },
  };

  const service = new CurriculumService({ curriculaRepo, aiGateway });
  const curriculum = await service.generateOneWeekFromGoal({ userId: "user-1", goal: savedGoal });

  assert.equal(curriculum.userId, "user-1");
  assert.equal(curriculum.goalId, "goal-1");
  assert.equal(curriculum.title, "One-week algorithms readiness sprint");
  assert.equal(curriculum.durationDays, 7);
  assert.equal(curriculum.status, "draft");
  assert.deepEqual(curriculum.plan.days, generatedCurriculum.days);
  assert.deepEqual(await curriculaRepo.listByGoal("user-1", "goal-1"), [curriculum]);
  assert.equal(calls.length, 1);
});

test("saved curriculum plans expose day-level quest seeds", async () => {
  const curriculaRepo = new InMemoryCurriculaRepository();
  const service = new CurriculumService({
    curriculaRepo,
    aiGateway: {
      async generateText() {
        return {
          data: generatedCurriculum,
          provider: "fake",
          model: "fake-model",
          promptVersion: "curriculum.one-week-curriculum.v1",
          task: "curriculum_generation",
        };
      },
    },
  });

  const curriculum = await service.generateOneWeekFromGoal({ userId: "user-1", goal: savedGoal });
  const questSeeds = service.deriveQuestSeeds(curriculum);

  assert.deepEqual(questSeeds, [
    {
      goalId: "goal-1",
      curriculumId: curriculum.id,
      title: "Asymptotic notation",
      objective: "Explain Big-O, Big-Omega, and Big-Theta.",
      focusPoints: ["Big-O", "growth rates"],
      practiceTasks: ["Rank common functions by growth"],
      masteryCriteria: ["Classify a loop by time complexity"],
    },
    {
      goalId: "goal-1",
      curriculumId: curriculum.id,
      title: "Recurrences",
      objective: "Solve simple recurrences.",
      focusPoints: ["substitution", "recursion trees"],
      practiceTasks: ["Solve three recurrence examples"],
      masteryCriteria: ["Pick the right recurrence technique"],
    },
  ]);
});

test("curriculum service can regenerate a reviewable draft curriculum", async () => {
  const curriculaRepo = new InMemoryCurriculaRepository();
  let generation = 0;
  const service = new CurriculumService({
    curriculaRepo,
    aiGateway: {
      async generateText() {
        generation += 1;
        return {
          data: {
            ...generatedCurriculum,
            title: `Generated plan ${generation}`,
          },
          provider: "fake",
          model: "fake-model",
          promptVersion: "curriculum.one-week-curriculum.v1",
          task: "curriculum_generation",
        };
      },
    },
  });

  const first = await service.generateOneWeekFromGoal({ userId: "user-1", goal: savedGoal });
  const regenerated = await service.regenerateOneWeekFromGoal({ userId: "user-1", goal: savedGoal, previousCurriculumId: first.id });

  assert.equal(first.status, "archived");
  assert.equal(regenerated.status, "draft");
  assert.equal(regenerated.title, "Generated plan 2");
  assert.deepEqual((await curriculaRepo.listByGoal("user-1", "goal-1")).map((curriculum) => curriculum.status), ["archived", "draft"]);
});
