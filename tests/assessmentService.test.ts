import test from "node:test";
import assert from "node:assert/strict";

import { AssessmentService } from "../src/features/assessment/assessmentService.ts";
import type { QuizGenerationOutput } from "../src/features/assessment/assessmentTypes.ts";
import type { Quest } from "../src/features/quests/questTypes.ts";
import type { LessonSessionSummary } from "../src/features/lessons/lessonTypes.ts";
import type { TextGenerationRequest, TextGenerationResponse } from "../src/lib/ai/aiGateway.ts";
import { InMemoryAssessmentsRepository } from "../src/lib/db/repositories/assessmentsRepo.ts";

const quest: Quest = {
  id: "quest-1",
  userId: "user-1",
  goalId: "goal-1",
  curriculumId: "curriculum-1",
  title: "Big-O foundations",
  objective: "Explain time and space complexity for simple loops.",
  prerequisiteNotes: ["Can trace simple loops"],
  lessonPlan: ["Define asymptotic notation", "Compare simple loops"],
  focusPoints: ["Big-O", "dominant terms"],
  practiceTasks: ["Classify five loop snippets"],
  masteryCriteria: ["Correctly classify common loop runtimes", "Explain the dominant-term rule"],
  status: "quiz_ready",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const lessonSummaries: LessonSessionSummary[] = [
  {
    id: "session-1",
    userId: "user-1",
    questId: "quest-1",
    mentorId: "mentor-socrates",
    promptVersions: ["lessons.3-2-1.v1"],
    summary: "Learner practiced classifying single and nested loops.",
    learnerVisibleRecap: "You can identify O(n) loops and should practice nested loops.",
    finalStage: "ended",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
];

const generatedQuiz: QuizGenerationOutput = {
  title: "Big-O mastery check",
  instructions: "Answer each question briefly and explain your reasoning.",
  questions: [
    {
      id: "q1",
      prompt: "What is the time complexity of a single loop over n items?",
      kind: "short_answer",
      objective_refs: ["Correctly classify common loop runtimes"],
      expected_answer: "O(n)",
      rubric: ["Names O(n)", "Explains one operation per item"],
    },
    {
      id: "q2",
      prompt: "Why do we drop lower-order terms in Big-O analysis?",
      kind: "short_answer",
      objective_refs: ["Explain the dominant-term rule"],
      expected_answer: "Dominant terms determine growth as n becomes large.",
      rubric: ["Mentions asymptotic growth", "Identifies dominant term"],
    },
  ],
};

function fakeAssessmentGateway(producer: (request: TextGenerationRequest) => unknown | Promise<unknown>) {
  return {
    async generateText<T>(request: TextGenerationRequest): Promise<TextGenerationResponse<T>> {
      return {
        data: (await producer(request)) as T,
        provider: "fake",
        model: "fake-model",
        promptVersion: request.promptVersion,
        task: request.task,
        promptRunId: "prompt-run-1",
      };
    },
  };
}

test("assessment service generates and saves a structured mastery quiz from a quest objective", async () => {
  const assessmentsRepo = new InMemoryAssessmentsRepository();
  const calls: TextGenerationRequest[] = [];
  const service = new AssessmentService({
    assessmentsRepo,
    aiGateway: fakeAssessmentGateway((request) => {
      calls.push(request);
      return generatedQuiz;
    }),
  });

  const quiz = await service.generateQuizForQuest({ userId: "user-1", quest, lessonSummaries });

  assert.equal(quiz.userId, "user-1");
  assert.equal(quiz.questId, "quest-1");
  assert.equal(quiz.type, "quiz");
  assert.equal(quiz.status, "active");
  assert.equal(quiz.title, "Big-O mastery check");
  assert.equal(quiz.generatedByPromptRunId, "prompt-run-1");
  assert.deepEqual(quiz.sourceLessonSessionIds, ["session-1"]);
  assert.equal(quiz.questions.length, 2);
  assert.deepEqual(await assessmentsRepo.listQuizzesByQuest("user-1", "quest-1"), [quiz]);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].task, "assessment_generation");
  assert.equal(calls[0].promptVersion, "assessment.quiz-generation.v1");
  assert.deepEqual(calls[0].sourceIds, ["quest-1", "session-1"]);
  assert.equal(calls[0].metadata?.questId, "quest-1");
  assert.ok(calls[0].jsonSchema);
  assert.match(calls[0].messages[1].content, /Big-O foundations/);
  assert.match(calls[0].messages[1].content, /Correctly classify common loop runtimes/);
  assert.match(calls[0].messages[1].content, /Learner practiced/);
});

test("assessment service rejects malformed generated quizzes before persistence", async () => {
  const assessmentsRepo = new InMemoryAssessmentsRepository();
  const service = new AssessmentService({
    assessmentsRepo,
    aiGateway: fakeAssessmentGateway(() => ({
      title: "Incomplete quiz",
      instructions: "Answer these.",
      questions: [],
    })),
  });

  await assert.rejects(
    () => service.generateQuizForQuest({ userId: "user-1", quest, lessonSummaries }),
    /at least one question/i,
  );

  assert.deepEqual(await assessmentsRepo.listQuizzesByQuest("user-1", "quest-1"), []);
});

test("assessment service reuses an existing active quiz unless regeneration is requested", async () => {
  const assessmentsRepo = new InMemoryAssessmentsRepository();
  let callCount = 0;
  const service = new AssessmentService({
    assessmentsRepo,
    aiGateway: fakeAssessmentGateway(() => {
      callCount += 1;
      return generatedQuiz;
    }),
  });

  const first = await service.generateQuizForQuest({ userId: "user-1", quest, lessonSummaries });
  const second = await service.generateQuizForQuest({ userId: "user-1", quest, lessonSummaries });

  assert.equal(second, first);
  assert.equal(callCount, 1);
  assert.deepEqual(await assessmentsRepo.listQuizzesByQuest("user-1", "quest-1"), [first]);

  const regenerated = await service.generateQuizForQuest({ userId: "user-1", quest, lessonSummaries, regenerate: true });

  assert.notEqual(regenerated.id, first.id);
  assert.equal(callCount, 2);
  assert.deepEqual((await assessmentsRepo.listQuizzesByQuest("user-1", "quest-1")).map((quiz) => quiz.status), ["archived", "active"]);
});

test("assessment service rejects quests without mastery criteria", async () => {
  const assessmentsRepo = new InMemoryAssessmentsRepository();
  const service = new AssessmentService({
    assessmentsRepo,
    aiGateway: fakeAssessmentGateway(() => generatedQuiz),
  });

  await assert.rejects(
    () => service.generateQuizForQuest({ userId: "user-1", quest: { ...quest, masteryCriteria: [] }, lessonSummaries }),
    /mastery criteria/i,
  );

  assert.deepEqual(await assessmentsRepo.listQuizzesByQuest("user-1", "quest-1"), []);
});
