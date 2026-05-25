import test from "node:test";
import assert from "node:assert/strict";

import { AssessmentService } from "../src/features/assessment/assessmentService.ts";
import type { QuizAssessment, QuizGradeResult, ReviewGenerationOutput } from "../src/features/assessment/assessmentTypes.ts";
import type { Quest } from "../src/features/quests/questTypes.ts";
import type { TextGenerationRequest, TextGenerationResponse } from "../src/lib/ai/aiGateway.ts";
import { InMemoryAssessmentsRepository } from "../src/lib/db/repositories/assessmentsRepo.ts";
import { InMemoryQuestsRepository } from "../src/lib/db/repositories/questsRepo.ts";

function fakeAssessmentGateway(producer: (request: TextGenerationRequest) => unknown | Promise<unknown>) {
  return {
    async generateText<T>(request: TextGenerationRequest): Promise<TextGenerationResponse<T>> {
      return {
        data: (await producer(request)) as T,
        provider: "fake",
        model: "fake-model",
        promptVersion: request.promptVersion,
        task: request.task,
        promptRunId: "review-run-1",
      };
    },
  };
}

const questInput = {
  userId: "user-1",
  goalId: "goal-1",
  curriculumId: "curriculum-1",
  title: "Big-O foundations",
  objective: "Explain time and space complexity for simple loops.",
  prerequisiteNotes: ["Can trace simple loops"],
  lessonPlan: ["Define asymptotic notation"],
  focusPoints: ["Big-O", "dominant terms"],
  practiceTasks: ["Classify five loop snippets"],
  masteryCriteria: ["Correctly classify common loop runtimes", "Explain the dominant-term rule"],
  status: "needs_review" as const,
};

const reviewOutput: ReviewGenerationOutput = {
  title: "Review linear scans and dominant terms",
  summary: "Focus on mapping loop counts to input size and naming the dominant term.",
  missed_concepts: ["linear-vs-constant", "dominant-term-vague"],
  practice_steps: [
    {
      title: "Trace a single loop",
      instructions: "Count how many times the loop body runs as n grows.",
      mastery_criterion: "Correctly classify common loop runtimes",
    },
    {
      title: "Circle the dominant term",
      instructions: "Compare n² + n + 4 and explain which term controls growth.",
      mastery_criterion: "Explain the dominant-term rule",
    },
  ],
  next_action: "Practice these two gaps, then retake the mastery quiz.",
};

async function createQuest(repo: InMemoryQuestsRepository): Promise<Quest> {
  return repo.create(questInput);
}

async function createQuiz(repo: InMemoryAssessmentsRepository, questId: string): Promise<QuizAssessment> {
  return repo.createQuiz({
    userId: "user-1",
    questId,
    title: "Big-O mastery check",
    instructions: "Answer briefly.",
    questions: [
      {
        id: "q1",
        prompt: "What is a single loop over n items?",
        kind: "short_answer",
        objectiveRefs: ["Correctly classify common loop runtimes"],
        expectedAnswer: "O(n)",
        rubric: ["Names O(n)", "Explains one operation per item"],
      },
      {
        id: "q2",
        prompt: "Why drop lower-order terms?",
        kind: "short_answer",
        objectiveRefs: ["Explain the dominant-term rule"],
        expectedAnswer: "Dominant terms determine growth.",
        rubric: ["Mentions asymptotic growth", "Identifies dominant term"],
      },
    ],
    sourceLessonSessionIds: ["session-1"],
    promptVersion: "assessment.quiz-generation.v1",
    generatedByPromptRunId: "quiz-run-1",
  });
}

async function createGrade(repo: InMemoryAssessmentsRepository, input: {
  questId: string;
  quizId: string;
  passed: boolean;
  overallScore?: number;
  misconceptionTags?: string[];
}): Promise<QuizGradeResult> {
  return repo.createGradeResult({
    userId: "user-1",
    questId: input.questId,
    quizId: input.quizId,
    status: "graded",
    learnerAnswers: [
      { questionId: "q1", answer: input.passed ? "O(n)" : "O(1)" },
      { questionId: "q2", answer: input.passed ? "Dominant term" : "Constants vanish" },
    ],
    overallScore: input.overallScore ?? (input.passed ? 0.9 : 0.4),
    passed: input.passed,
    confidence: 0.88,
    learnerSummary: input.passed ? "Passed mastery." : "Needs review on loop growth and dominant terms.",
    improvementStep: "Practice tracing the loop body count.",
    misconceptionTags: input.misconceptionTags ?? (input.passed ? [] : ["linear-vs-constant"]),
    questionResults: [
      {
        questionId: "q1",
        score: input.passed ? 1 : 0.2,
        passed: input.passed,
        correct: input.passed ? "Named O(n)." : "",
        missing: input.passed ? "" : "Linear runtime.",
        feedback: input.passed ? "Correct." : "A single loop over n items is linear, not constant.",
        improvementStep: "Count each loop iteration.",
        rubricHits: input.passed ? ["Names O(n)"] : [],
        misconceptionTags: input.passed ? [] : ["linear-vs-constant"],
      },
      {
        questionId: "q2",
        score: input.passed ? 0.9 : 0.45,
        passed: input.passed,
        correct: input.passed ? "Named dominant term." : "Mentions constants.",
        missing: input.passed ? "" : "Dominant-term reasoning.",
        feedback: input.passed ? "Correct." : "Explain which term grows fastest as n increases.",
        improvementStep: "Compare terms for large n.",
        rubricHits: input.passed ? ["Identifies dominant term"] : [],
        misconceptionTags: input.passed ? [] : ["dominant-term-vague"],
      },
    ],
    promptVersion: "assessment.short-answer-grading.v1",
    gradedByPromptRunId: "grade-run-1",
  });
}

test("assessment service creates a targeted review path from a failed quiz and moves quest to review", async () => {
  const assessmentsRepo = new InMemoryAssessmentsRepository();
  const questsRepo = new InMemoryQuestsRepository();
  const quest = await createQuest(questsRepo);
  const quiz = await createQuiz(assessmentsRepo, quest.id);
  const grade = await createGrade(assessmentsRepo, { questId: quest.id, quizId: quiz.id, passed: false, misconceptionTags: ["linear-vs-constant", "dominant-term-vague"] });
  const calls: TextGenerationRequest[] = [];
  const service = new AssessmentService({
    assessmentsRepo,
    questsRepo,
    aiGateway: fakeAssessmentGateway((request) => {
      calls.push(request);
      return reviewOutput;
    }),
  });

  const review = await service.generateTargetedReviewForResult({ userId: "user-1", assessmentResultId: grade.id });

  assert.equal(review.userId, "user-1");
  assert.equal(review.questId, quest.id);
  assert.equal(review.quizId, quiz.id);
  assert.equal(review.assessmentResultId, grade.id);
  assert.equal(review.status, "active");
  assert.equal(review.promptVersion, "assessment.targeted-review.v1");
  assert.equal(review.generatedByPromptRunId, "review-run-1");
  assert.deepEqual(review.missedConcepts, ["linear-vs-constant", "dominant-term-vague"]);
  assert.equal(review.practiceSteps.length, 2);
  assert.match(review.nextAction, /retake/i);
  assert.deepEqual(await assessmentsRepo.listReviewPathsByQuest("user-1", quest.id), [review]);
  const updatedQuest = await questsRepo.getById("user-1", quest.id);
  assert.equal(updatedQuest?.status, "needs_review");
  assert.equal(updatedQuest?.masteryEvidence?.assessmentResultId, grade.id);
  assert.equal(updatedQuest?.nextAction, review.nextAction);
  assert.equal(calls[0].task, "assessment_grading");
  assert.equal(calls[0].promptVersion, "assessment.targeted-review.v1");
  assert.deepEqual(calls[0].sourceIds, [grade.id, quiz.id, quest.id]);
  assert.ok(calls[0].jsonSchema);
  assert.match(calls[0].messages[1].content, /linear-vs-constant/);
  assert.match(calls[0].messages[1].content, /Correctly classify common loop runtimes/);
});

test("assessment service creates targeted review for partial non-passing quizzes", async () => {
  const assessmentsRepo = new InMemoryAssessmentsRepository();
  const questsRepo = new InMemoryQuestsRepository();
  const quest = await createQuest(questsRepo);
  const quiz = await createQuiz(assessmentsRepo, quest.id);
  const grade = await createGrade(assessmentsRepo, { questId: quest.id, quizId: quiz.id, passed: false, overallScore: 0.68, misconceptionTags: ["dominant-term-vague"] });
  const service = new AssessmentService({
    assessmentsRepo,
    questsRepo,
    aiGateway: fakeAssessmentGateway(() => ({ ...reviewOutput, missed_concepts: ["dominant-term-vague"] })),
  });

  const review = await service.generateTargetedReviewForResult({ userId: "user-1", assessmentResultId: grade.id });

  assert.equal(review.assessmentResultId, grade.id);
  assert.deepEqual(review.missedConcepts, ["dominant-term-vague"]);
  assert.equal((await questsRepo.getById("user-1", quest.id))?.status, "needs_review");
});

test("assessment service can regenerate a targeted review path after another failed attempt", async () => {
  const assessmentsRepo = new InMemoryAssessmentsRepository();
  const questsRepo = new InMemoryQuestsRepository();
  const quest = await createQuest(questsRepo);
  const quiz = await createQuiz(assessmentsRepo, quest.id);
  const firstGrade = await createGrade(assessmentsRepo, { questId: quest.id, quizId: quiz.id, passed: false, misconceptionTags: ["linear-vs-constant"] });
  const secondGrade = await createGrade(assessmentsRepo, { questId: quest.id, quizId: quiz.id, passed: false, misconceptionTags: ["dominant-term-vague"] });
  const service = new AssessmentService({
    assessmentsRepo,
    questsRepo,
    aiGateway: fakeAssessmentGateway((request) => request.metadata?.assessmentResultId === secondGrade.id
      ? { ...reviewOutput, title: "Second review", missed_concepts: ["dominant-term-vague"] }
      : { ...reviewOutput, title: "First review", missed_concepts: ["linear-vs-constant"] }),
  });

  const first = await service.generateTargetedReviewForResult({ userId: "user-1", assessmentResultId: firstGrade.id });
  const second = await service.generateTargetedReviewForResult({ userId: "user-1", assessmentResultId: secondGrade.id, regenerate: true });

  assert.notEqual(second.id, first.id);
  assert.equal(first.status, "superseded");
  assert.equal(second.status, "active");
  assert.equal(second.assessmentResultId, secondGrade.id);
  assert.deepEqual((await assessmentsRepo.listReviewPathsByQuest("user-1", quest.id)).map((review) => review.status), ["superseded", "active"]);
});

test("assessment service rejects targeted review generation for passed assessments to preserve completion compatibility", async () => {
  const assessmentsRepo = new InMemoryAssessmentsRepository();
  const questsRepo = new InMemoryQuestsRepository();
  const quest = await createQuest(questsRepo);
  const quiz = await createQuiz(assessmentsRepo, quest.id);
  const grade = await createGrade(assessmentsRepo, { questId: quest.id, quizId: quiz.id, passed: true });
  const service = new AssessmentService({
    assessmentsRepo,
    questsRepo,
    aiGateway: fakeAssessmentGateway(() => reviewOutput),
  });

  await assert.rejects(
    () => service.generateTargetedReviewForResult({ userId: "user-1", assessmentResultId: grade.id }),
    /only generated for non-passing/i,
  );

  assert.deepEqual(await assessmentsRepo.listReviewPathsByQuest("user-1", quest.id), []);
  assert.equal((await questsRepo.getById("user-1", quest.id))?.status, "needs_review");
});

test("assessment service falls back to a safe review plan when the review model fails", async () => {
  const assessmentsRepo = new InMemoryAssessmentsRepository();
  const questsRepo = new InMemoryQuestsRepository();
  const quest = await createQuest(questsRepo);
  const quiz = await createQuiz(assessmentsRepo, quest.id);
  const grade = await createGrade(assessmentsRepo, { questId: quest.id, quizId: quiz.id, passed: false });
  const service = new AssessmentService({
    assessmentsRepo,
    questsRepo,
    aiGateway: fakeAssessmentGateway(() => {
      throw new Error("model unavailable");
    }),
  });

  const review = await service.generateTargetedReviewForResult({ userId: "user-1", assessmentResultId: grade.id });

  assert.equal(review.status, "fallback");
  assert.equal(review.generatedByPromptRunId, undefined);
  assert.match(review.summary, /safe fallback/i);
  assert.deepEqual(review.missedConcepts, ["linear-vs-constant"]);
  assert.equal(review.practiceSteps.length, 1);
  assert.match(review.nextAction, /review the rubric feedback/i);
  assert.equal((await questsRepo.getById("user-1", quest.id))?.status, "needs_review");
});

test("assessment service rejects invalid targeted review output before persistence", async () => {
  const assessmentsRepo = new InMemoryAssessmentsRepository();
  const questsRepo = new InMemoryQuestsRepository();
  const quest = await createQuest(questsRepo);
  const quiz = await createQuiz(assessmentsRepo, quest.id);
  const grade = await createGrade(assessmentsRepo, { questId: quest.id, quizId: quiz.id, passed: false });
  const service = new AssessmentService({
    assessmentsRepo,
    questsRepo,
    aiGateway: fakeAssessmentGateway(() => ({
      title: "Broken review",
      summary: "Missing practice steps.",
      missed_concepts: ["linear-vs-constant"],
      practice_steps: [],
      next_action: "Try again.",
    })),
  });

  await assert.rejects(
    () => service.generateTargetedReviewForResult({ userId: "user-1", assessmentResultId: grade.id }),
    /practice step/i,
  );

  assert.deepEqual(await assessmentsRepo.listReviewPathsByQuest("user-1", quest.id), []);
}
);
