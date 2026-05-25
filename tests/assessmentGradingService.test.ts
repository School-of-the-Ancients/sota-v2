import test from "node:test";
import assert from "node:assert/strict";

import { AssessmentService } from "../src/features/assessment/assessmentService.ts";
import type { QuizAssessment, QuizGradingOutput } from "../src/features/assessment/assessmentTypes.ts";
import type { TextGenerationRequest, TextGenerationResponse } from "../src/lib/ai/aiGateway.ts";
import { InMemoryAssessmentsRepository } from "../src/lib/db/repositories/assessmentsRepo.ts";

function fakeAssessmentGateway(producer: (request: TextGenerationRequest) => unknown | Promise<unknown>) {
  return {
    async generateText<T>(request: TextGenerationRequest): Promise<TextGenerationResponse<T>> {
      return {
        data: (await producer(request)) as T,
        provider: "fake",
        model: "fake-model",
        promptVersion: request.promptVersion,
        task: request.task,
        promptRunId: "grade-run-1",
      };
    },
  };
}

const quizInput = {
  userId: "user-1",
  questId: "quest-1",
  title: "Big-O mastery check",
  instructions: "Answer briefly and explain your reasoning.",
  questions: [
    {
      id: "q1",
      prompt: "What is the time complexity of a single loop over n items?",
      kind: "short_answer" as const,
      objectiveRefs: ["Correctly classify common loop runtimes"],
      expectedAnswer: "O(n)",
      rubric: ["Names O(n)", "Explains one operation per item"],
    },
    {
      id: "q2",
      prompt: "Why do we drop lower-order terms in Big-O analysis?",
      kind: "short_answer" as const,
      objectiveRefs: ["Explain the dominant-term rule"],
      expectedAnswer: "Dominant terms determine growth as n becomes large.",
      rubric: ["Mentions asymptotic growth", "Identifies dominant term"],
    },
  ],
  sourceLessonSessionIds: ["session-1"],
  promptVersion: "assessment.quiz-generation.v1",
  generatedByPromptRunId: "quiz-run-1",
  status: "active" as const,
};

const passingGrade: QuizGradingOutput = {
  overall_score: 0.94,
  passed: true,
  confidence: 0.91,
  learner_summary: "You correctly named O(n) and explained the dominant-term rule.",
  improvement_step: "Keep explaining why the dominant term controls growth.",
  misconception_tags: [],
  question_results: [
    {
      question_id: "q1",
      score: 1,
      passed: true,
      correct: "You identified O(n).",
      missing: "",
      feedback: "Correct: a single pass over n items is linear.",
      improvement_step: "Mention that the loop body runs once per item.",
      rubric_hits: ["Names O(n)", "Explains one operation per item"],
      misconception_tags: [],
    },
    {
      question_id: "q2",
      score: 0.88,
      passed: true,
      correct: "You connected Big-O to asymptotic growth.",
      missing: "Could more explicitly name the dominant term.",
      feedback: "Mostly correct and learner-visible.",
      improvement_step: "State which term dominates as n grows.",
      rubric_hits: ["Mentions asymptotic growth"],
      misconception_tags: [],
    },
  ],
};

async function createSavedQuiz(repo: InMemoryAssessmentsRepository): Promise<QuizAssessment> {
  return repo.createQuiz(quizInput);
}

test("assessment service grades short-answer quiz submissions and persists learner-visible rubric feedback", async () => {
  const assessmentsRepo = new InMemoryAssessmentsRepository();
  const quiz = await createSavedQuiz(assessmentsRepo);
  const calls: TextGenerationRequest[] = [];
  const service = new AssessmentService({
    assessmentsRepo,
    aiGateway: fakeAssessmentGateway((request) => {
      calls.push(request);
      return passingGrade;
    }),
  });

  const result = await service.gradeQuizSubmission({
    userId: "user-1",
    quizId: quiz.id,
    learnerAnswers: [
      { questionId: "q1", answer: "O(n), because the loop touches each item once." },
      { questionId: "q2", answer: "Because the highest-growth term dominates for large n." },
    ],
  });

  assert.equal(result.userId, "user-1");
  assert.equal(result.questId, "quest-1");
  assert.equal(result.quizId, quiz.id);
  assert.equal(result.status, "graded");
  assert.equal(result.passed, true);
  assert.equal(result.overallScore, 0.94);
  assert.equal(result.confidence, 0.91);
  assert.equal(result.promptVersion, "assessment.short-answer-grading.v1");
  assert.equal(result.gradedByPromptRunId, "grade-run-1");
  assert.match(result.learnerSummary, /correctly named O\(n\)/i);
  assert.equal(result.questionResults.length, 2);
  assert.deepEqual(result.questionResults[0].rubricHits, ["Names O(n)", "Explains one operation per item"]);
  assert.deepEqual(await assessmentsRepo.listGradeResultsByQuiz("user-1", quiz.id), [result]);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].task, "assessment_grading");
  assert.equal(calls[0].promptVersion, "assessment.short-answer-grading.v1");
  assert.deepEqual(calls[0].sourceIds, [quiz.id, "quest-1"]);
  assert.equal(calls[0].metadata?.quizId, quiz.id);
  assert.ok(calls[0].jsonSchema);
  assert.match(calls[0].messages[1].content, /What is the time complexity/);
  assert.match(calls[0].messages[1].content, /O\(n\), because/);
});

test("assessment service persists partial passing grades with missing feedback and misconception tags", async () => {
  const assessmentsRepo = new InMemoryAssessmentsRepository();
  const quiz = await createSavedQuiz(assessmentsRepo);
  const partialGrade: QuizGradingOutput = {
    ...passingGrade,
    overall_score: 0.72,
    passed: true,
    confidence: 0.82,
    learner_summary: "You passed, but your second answer needs sharper dominant-term language.",
    misconception_tags: ["dominant-term-vague"],
    question_results: [
      passingGrade.question_results[0],
      {
        ...passingGrade.question_results[1],
        score: 0.44,
        passed: false,
        missing: "Explicit dominant-term identification.",
        misconception_tags: ["dominant-term-vague"],
      },
    ],
  };
  const service = new AssessmentService({
    assessmentsRepo,
    aiGateway: fakeAssessmentGateway(() => partialGrade),
  });

  const result = await service.gradeQuizSubmission({
    userId: "user-1",
    quizId: quiz.id,
    learnerAnswers: [
      { questionId: "q1", answer: "O(n)." },
      { questionId: "q2", answer: "Smaller terms matter less." },
    ],
  });

  assert.equal(result.status, "graded");
  assert.equal(result.passed, true);
  assert.equal(result.overallScore, 0.72);
  assert.deepEqual(result.misconceptionTags, ["dominant-term-vague"]);
  assert.equal(result.questionResults[1].passed, false);
  assert.match(result.questionResults[1].missing, /dominant-term/i);
});

test("assessment service persists failing grades without treating them as passed", async () => {
  const assessmentsRepo = new InMemoryAssessmentsRepository();
  const quiz = await createSavedQuiz(assessmentsRepo);
  const failingGrade: QuizGradingOutput = {
    ...passingGrade,
    overall_score: 0.38,
    passed: false,
    confidence: 0.89,
    learner_summary: "Your answers do not yet show mastery of Big-O loop analysis.",
    improvement_step: "Review how loop iterations map to input size.",
    misconception_tags: ["linear-vs-constant"],
    question_results: passingGrade.question_results.map((question) => ({
      ...question,
      score: 0.25,
      passed: false,
      correct: "",
      missing: "Correct runtime and reasoning.",
      misconception_tags: ["linear-vs-constant"],
    })),
  };
  const service = new AssessmentService({
    assessmentsRepo,
    aiGateway: fakeAssessmentGateway(() => failingGrade),
  });

  const result = await service.gradeQuizSubmission({
    userId: "user-1",
    quizId: quiz.id,
    learnerAnswers: [
      { questionId: "q1", answer: "O(1)" },
      { questionId: "q2", answer: "Because constants disappear." },
    ],
  });

  assert.equal(result.status, "graded");
  assert.equal(result.passed, false);
  assert.equal(result.overallScore, 0.38);
  assert.deepEqual(result.misconceptionTags, ["linear-vs-constant"]);
});

test("assessment service rejects invalid grader output before persistence", async () => {
  const assessmentsRepo = new InMemoryAssessmentsRepository();
  const quiz = await createSavedQuiz(assessmentsRepo);
  const service = new AssessmentService({
    assessmentsRepo,
    aiGateway: fakeAssessmentGateway(() => ({
      overall_score: 0.9,
      passed: true,
      confidence: 0.9,
      learner_summary: "Looks good.",
      improvement_step: "Keep practicing.",
      misconception_tags: [],
      question_results: [],
    })),
  });

  await assert.rejects(
    () => service.gradeQuizSubmission({
      userId: "user-1",
      quizId: quiz.id,
      learnerAnswers: [
        { questionId: "q1", answer: "O(n)" },
        { questionId: "q2", answer: "Dominant term" },
      ],
    }),
    /question result/i,
  );

  assert.deepEqual(await assessmentsRepo.listGradeResultsByQuiz("user-1", quiz.id), []);
});

test("assessment service marks low-confidence grading for manual review instead of passing", async () => {
  const assessmentsRepo = new InMemoryAssessmentsRepository();
  const quiz = await createSavedQuiz(assessmentsRepo);
  const service = new AssessmentService({
    assessmentsRepo,
    aiGateway: fakeAssessmentGateway(() => ({
      ...passingGrade,
      overall_score: 0.93,
      passed: true,
      confidence: 0.41,
    })),
  });

  const result = await service.gradeQuizSubmission({
    userId: "user-1",
    quizId: quiz.id,
    learnerAnswers: [
      { questionId: "q1", answer: "O(n)" },
      { questionId: "q2", answer: "Dominant term" },
    ],
  });

  assert.equal(result.status, "manual_review");
  assert.equal(result.passed, false);
  assert.equal(result.confidence, 0.41);
  assert.match(result.manualReviewReason ?? "", /low confidence/i);
});
