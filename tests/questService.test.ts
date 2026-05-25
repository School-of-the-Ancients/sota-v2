import test from "node:test";
import assert from "node:assert/strict";

import { QuestService } from "../src/features/quests/questService.ts";
import type { QuestGenerationOutput } from "../src/features/quests/questTypes.ts";
import type { LearningGoal } from "../src/features/goals/goalTypes.ts";
import type { QuestSeed } from "../src/features/curriculum/curriculumTypes.ts";
import type { TextGenerationRequest, TextGenerationResponse } from "../src/lib/ai/aiGateway.ts";
import { InMemoryQuestsRepository } from "../src/lib/db/repositories/questsRepo.ts";

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

const generatedQuest: QuestGenerationOutput = {
  quests: [
    {
      title: "Big-O foundations",
      objective: "Explain time and space complexity for simple loops.",
      prerequisite_notes: ["Comfortable with algebraic expressions", "Can trace simple loops"],
      lesson_plan: ["Review asymptotic notation", "Walk through loop counting examples", "Compare nested loop patterns"],
      focus_points: ["Big-O", "loop analysis"],
      practice_tasks: ["Classify five loop snippets", "Write a short explanation for O(n log n)"],
      mastery_criteria: ["Correctly classify common loop runtimes", "Explain the dominant-term rule"],
    },
  ],
};

const curriculumSeed: QuestSeed = {
  goalId: "goal-1",
  curriculumId: "curriculum-1",
  title: "Graph traversal practice",
  objective: "Implement and trace BFS and DFS.",
  focusPoints: ["BFS", "DFS"],
  practiceTasks: ["Trace BFS on an adjacency list"],
  masteryCriteria: ["Explain queue vs stack traversal behavior"],
};

function fakeQuestGateway(producer: (request: TextGenerationRequest) => QuestGenerationOutput | Promise<QuestGenerationOutput>) {
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

test("quest service generates and saves a focused quest from a goal", async () => {
  const questsRepo = new InMemoryQuestsRepository();
  const calls: TextGenerationRequest[] = [];
  const service = new QuestService({
    questsRepo,
    aiGateway: fakeQuestGateway((request) => {
      calls.push(request);
      return generatedQuest;
    }),
  });

  const [quest] = await service.generateFromGoal({ userId: "user-1", goal: savedGoal });

  assert.equal(quest.userId, "user-1");
  assert.equal(quest.goalId, "goal-1");
  assert.equal(quest.curriculumId, undefined);
  assert.equal(quest.title, "Big-O foundations");
  assert.equal(quest.objective, "Explain time and space complexity for simple loops.");
  assert.deepEqual(quest.prerequisiteNotes, ["Comfortable with algebraic expressions", "Can trace simple loops"]);
  assert.deepEqual(quest.lessonPlan, ["Review asymptotic notation", "Walk through loop counting examples", "Compare nested loop patterns"]);
  assert.deepEqual(quest.practiceTasks, ["Classify five loop snippets", "Write a short explanation for O(n log n)"]);
  assert.deepEqual(quest.masteryCriteria, ["Correctly classify common loop runtimes", "Explain the dominant-term rule"]);
  assert.equal(quest.status, "draft");
  assert.deepEqual(await questsRepo.listByGoal("user-1", "goal-1"), [quest]);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].task, "quest_generation");
  assert.equal(calls[0].promptVersion, "quests.generate-from-goal.v1");
  assert.deepEqual(calls[0].sourceIds, ["goal-1"]);
});

test("quest service generates and saves a quest from a curriculum seed", async () => {
  const questsRepo = new InMemoryQuestsRepository();
  const calls: TextGenerationRequest[] = [];
  const service = new QuestService({
    questsRepo,
    aiGateway: fakeQuestGateway((request) => {
      calls.push(request);
      return generatedQuest;
    }),
  });

  const [quest] = await service.generateFromCurriculumSeed({ userId: "user-1", seed: curriculumSeed });

  assert.equal(quest.goalId, "goal-1");
  assert.equal(quest.curriculumId, "curriculum-1");
  assert.deepEqual(await questsRepo.listByGoal("user-1", "goal-1"), [quest]);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].promptVersion, "quests.generate-from-curriculum.v1");
  assert.deepEqual(calls[0].sourceIds, ["goal-1", "curriculum-1"]);
});

test("quest service rejects incomplete generated quests before persistence", async () => {
  const questsRepo = new InMemoryQuestsRepository();
  const service = new QuestService({
    questsRepo,
    aiGateway: fakeQuestGateway(() => ({
      quests: [
        {
          ...generatedQuest.quests[0],
          practice_tasks: [],
        },
      ],
    })),
  });

  await assert.rejects(
    () => service.generateFromGoal({ userId: "user-1", goal: savedGoal }),
    /practice tasks/i,
  );
  assert.deepEqual(await questsRepo.listByGoal("user-1", "goal-1"), []);
});
