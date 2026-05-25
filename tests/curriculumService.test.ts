import test from "node:test";
import assert from "node:assert/strict";

import { CurriculumService } from "../src/features/curriculum/curriculumService.ts";
import type { OneWeekCurriculumOutput } from "../src/features/curriculum/curriculumTypes.ts";
import type { LearningGoal } from "../src/features/goals/goalTypes.ts";
import type { TextGenerationRequest, TextGenerationResponse } from "../src/lib/ai/aiGateway.ts";
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
  days: [1, 2, 3, 4, 5, 6, 7].map((day) => ({
    day,
    title: `Day ${day}`,
    objective: `Complete day ${day} objective.`,
    focus_points: [`focus ${day}`],
    practice_tasks: [`practice ${day}`],
    mastery_criteria: [`mastery ${day}`],
  })),
};

function fakeGateway(producer: (request: TextGenerationRequest) => OneWeekCurriculumOutput | Promise<OneWeekCurriculumOutput>) {
  return {
    async generateText<T>(request: TextGenerationRequest): Promise<TextGenerationResponse<T>> {
      return {
        data: (await producer(request)) as T,
        provider: "fake",
        model: "fake-model",
        promptVersion: request.promptVersion,
        task: request.task,
      };
    },
  };
}

test("curriculum service generates and saves a structured one-week curriculum from a goal", async () => {
  const curriculaRepo = new InMemoryCurriculaRepository();
  const calls: unknown[] = [];
  const aiGateway = fakeGateway((request) => {
    calls.push(request);
    return generatedCurriculum;
  });

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
    aiGateway: fakeGateway(() => generatedCurriculum),
  });

  const curriculum = await service.generateOneWeekFromGoal({ userId: "user-1", goal: savedGoal });
  const questSeeds = service.deriveQuestSeeds(curriculum);

  assert.equal(questSeeds.length, 7);
  assert.deepEqual(questSeeds[0], {
    goalId: "goal-1",
    curriculumId: curriculum.id,
    title: "Day 1",
    objective: "Complete day 1 objective.",
    focusPoints: ["focus 1"],
    practiceTasks: ["practice 1"],
    masteryCriteria: ["mastery 1"],
  });
});

test("curriculum regeneration archives the previous draft only after replacement creation succeeds", async () => {
  const curriculaRepo = new InMemoryCurriculaRepository();
  let failNextGeneration = false;
  const service = new CurriculumService({
    curriculaRepo,
    aiGateway: fakeGateway(() => {
      if (failNextGeneration) {
        throw new Error("provider outage");
      }

      return generatedCurriculum;
    }),
  });

  const first = await service.generateOneWeekFromGoal({ userId: "user-1", goal: savedGoal });

  failNextGeneration = true;
  await assert.rejects(
    () => service.regenerateOneWeekFromGoal({ userId: "user-1", goal: savedGoal, previousCurriculumId: first.id }),
    /provider outage/i,
  );
  assert.equal(first.status, "draft");

  failNextGeneration = false;
  const regenerated = await service.regenerateOneWeekFromGoal({ userId: "user-1", goal: savedGoal, previousCurriculumId: first.id });

  assert.equal(first.status, "archived");
  assert.equal(regenerated.status, "draft");
  assert.deepEqual((await curriculaRepo.listByGoal("user-1", "goal-1")).map((curriculum) => curriculum.status), ["archived", "draft"]);
});

test("curriculum service rejects non-seven-day generated plans before persistence", async () => {
  const curriculaRepo = new InMemoryCurriculaRepository();
  const service = new CurriculumService({
    curriculaRepo,
    aiGateway: fakeGateway(() => ({
      ...generatedCurriculum,
      days: generatedCurriculum.days.slice(0, 2),
    })),
  });

  await assert.rejects(
    () => service.generateOneWeekFromGoal({ userId: "user-1", goal: savedGoal }),
    /exactly seven day plans/i,
  );
  assert.deepEqual(await curriculaRepo.listByGoal("user-1", "goal-1"), []);
});
