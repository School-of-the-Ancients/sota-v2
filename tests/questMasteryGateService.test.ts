import test from "node:test";
import assert from "node:assert/strict";

import { QuestService } from "../src/features/quests/questService.ts";
import { buildLearnerProgressSummary } from "../src/features/progress/progressSummary.ts";
import { InMemoryQuestsRepository } from "../src/lib/db/repositories/questsRepo.ts";
import { InMemoryAssessmentsRepository } from "../src/lib/db/repositories/assessmentsRepo.ts";

function fakeGateway() {
  return {
    async generateText() {
      throw new Error("AI gateway should not be called by mastery gate transitions");
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
  focusPoints: ["Big-O"],
  practiceTasks: ["Classify five loop snippets"],
  masteryCriteria: ["Correctly classify common loop runtimes"],
  status: "quiz_ready" as const,
};

async function createQuizForQuest(assessmentsRepo: InMemoryAssessmentsRepository, questId: string) {
  return assessmentsRepo.createQuiz({
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
        rubric: ["Names O(n)"],
      },
    ],
    sourceLessonSessionIds: [],
    promptVersion: "assessment.quiz-generation.v1",
    generatedByPromptRunId: "quiz-run-1",
  });
}

async function createGradeResult(assessmentsRepo: InMemoryAssessmentsRepository, input: {
  questId: string;
  quizId: string;
  passed: boolean;
  status?: "graded" | "manual_review";
  confidence?: number;
}) {
  return assessmentsRepo.createGradeResult({
    userId: "user-1",
    questId: input.questId,
    quizId: input.quizId,
    status: input.status ?? "graded",
    learnerAnswers: [{ questionId: "q1", answer: "O(n)" }],
    overallScore: input.passed ? 0.92 : 0.38,
    passed: input.passed,
    confidence: input.confidence ?? 0.9,
    learnerSummary: input.passed ? "Passed mastery check." : "Needs more review.",
    improvementStep: "Practice one more loop classification.",
    misconceptionTags: input.passed ? [] : ["linear-vs-constant"],
    questionResults: [
      {
        questionId: "q1",
        score: input.passed ? 1 : 0.25,
        passed: input.passed,
        correct: input.passed ? "Named O(n)." : "",
        missing: input.passed ? "" : "Correct runtime.",
        feedback: input.passed ? "Correct." : "Review linear scans.",
        improvementStep: "Tie loop count to input size.",
        rubricHits: input.passed ? ["Names O(n)"] : [],
        misconceptionTags: input.passed ? [] : ["linear-vs-constant"],
      },
    ],
    promptVersion: "assessment.short-answer-grading.v1",
    gradedByPromptRunId: "grade-run-1",
  });
}

test("quest service blocks completion without passing assessment evidence and returns a clear next action", async () => {
  const questsRepo = new InMemoryQuestsRepository();
  const assessmentsRepo = new InMemoryAssessmentsRepository();
  const quest = await questsRepo.create(questInput);
  const service = new QuestService({ questsRepo, assessmentsRepo, aiGateway: fakeGateway() });

  await assert.rejects(
    () => service.completeQuestWithMastery({ userId: "user-1", questId: quest.id }),
    /requires a passed assessment or manual override/i,
  );

  assert.equal((await questsRepo.getById("user-1", quest.id))?.status, "quiz_ready");
});

test("quest service completes a quiz-ready quest when canonical grading evidence passed", async () => {
  const questsRepo = new InMemoryQuestsRepository();
  const assessmentsRepo = new InMemoryAssessmentsRepository();
  const quest = await questsRepo.create(questInput);
  const quiz = await createQuizForQuest(assessmentsRepo, quest.id);
  const grade = await createGradeResult(assessmentsRepo, { questId: quest.id, quizId: quiz.id, passed: true });
  const service = new QuestService({ questsRepo, assessmentsRepo, aiGateway: fakeGateway() });

  const completed = await service.completeQuestWithMastery({ userId: "user-1", questId: quest.id });

  assert.equal(completed.status, "completed");
  assert.equal(completed.masteryEvidence?.assessmentResultId, grade.id);
  assert.equal(completed.masteryEvidence?.type, "assessment_pass");
});

test("quest service routes failed assessment evidence to needs_review without corrupting progress", async () => {
  const questsRepo = new InMemoryQuestsRepository();
  const assessmentsRepo = new InMemoryAssessmentsRepository();
  const quest = await questsRepo.create(questInput);
  const quiz = await createQuizForQuest(assessmentsRepo, quest.id);
  const grade = await createGradeResult(assessmentsRepo, { questId: quest.id, quizId: quiz.id, passed: false });
  const service = new QuestService({ questsRepo, assessmentsRepo, aiGateway: fakeGateway() });

  const review = await service.completeQuestWithMastery({ userId: "user-1", questId: quest.id });

  assert.equal(review.status, "needs_review");
  assert.equal(review.masteryEvidence?.assessmentResultId, grade.id);
  assert.equal(review.nextAction, "Review the rubric feedback, practice the missing criteria, then retake the quiz.");
  const summary = buildLearnerProgressSummary([review]);
  assert.equal(summary.completedQuests, 0);
  assert.equal(summary.questsNeedingReview, 1);
});

test("quest service records visible manual override evidence when completing without passing assessment", async () => {
  const questsRepo = new InMemoryQuestsRepository();
  const assessmentsRepo = new InMemoryAssessmentsRepository();
  const quest = await questsRepo.create(questInput);
  const service = new QuestService({ questsRepo, assessmentsRepo, aiGateway: fakeGateway() });

  const completed = await service.completeQuestWithMastery({
    userId: "user-1",
    questId: quest.id,
    manualOverride: {
      actorId: "mentor-1",
      reason: "Reviewed project verbally and confirmed mastery.",
    },
  });

  assert.equal(completed.status, "completed");
  assert.equal(completed.masteryEvidence?.type, "manual_override");
  assert.equal(completed.masteryEvidence?.actorId, "mentor-1");
  assert.match(completed.masteryEvidence?.reason ?? "", /confirmed mastery/i);
});

test("progress summary recomputes completion from canonical assessment evidence after evidence deletion", async () => {
  const questsRepo = new InMemoryQuestsRepository();
  const assessmentsRepo = new InMemoryAssessmentsRepository();
  const quest = await questsRepo.create(questInput);
  const quiz = await createQuizForQuest(assessmentsRepo, quest.id);
  await createGradeResult(assessmentsRepo, { questId: quest.id, quizId: quiz.id, passed: true });
  const service = new QuestService({ questsRepo, assessmentsRepo, aiGateway: fakeGateway() });
  const completed = await service.completeQuestWithMastery({ userId: "user-1", questId: quest.id });

  assert.equal(buildLearnerProgressSummary([completed]).completedQuests, 1);

  await assessmentsRepo.deleteGradeResultsByQuest("user-1", quest.id);

  const recomputed = await service.recomputeMasteryState({ userId: "user-1", questId: quest.id });

  assert.equal(recomputed.status, "quiz_ready");
  assert.equal(buildLearnerProgressSummary([recomputed]).completedQuests, 0);
});

test("quest service preserves archived terminal quests even when passing evidence exists", async () => {
  const questsRepo = new InMemoryQuestsRepository();
  const assessmentsRepo = new InMemoryAssessmentsRepository();
  const quest = await questsRepo.create({ ...questInput, status: "archived" });
  const quiz = await createQuizForQuest(assessmentsRepo, quest.id);
  await createGradeResult(assessmentsRepo, { questId: quest.id, quizId: quiz.id, passed: true });
  const service = new QuestService({ questsRepo, assessmentsRepo, aiGateway: fakeGateway() });

  await assert.rejects(
    () => service.completeQuestWithMastery({ userId: "user-1", questId: quest.id }),
    /archived quests are terminal/i,
  );

  assert.equal((await questsRepo.getById("user-1", quest.id))?.status, "archived");
});
