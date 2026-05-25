import type { AIGateway } from "../../lib/ai/aiGateway.ts";
import type { AssessmentsRepository } from "../../lib/db/repositories/assessmentsRepo.ts";
import type { QuestSeed } from "../curriculum/curriculumTypes.ts";
import type { LearningGoal } from "../goals/goalTypes.ts";
import { validationSchemas } from "../../lib/validation/schemas.ts";
import type { QuestsRepository } from "../../lib/db/repositories/questsRepo.ts";
import { transitionQuest } from "./questStateMachine.ts";
import type { Quest, QuestGenerationItem, QuestGenerationOutput, QuestMasteryEvidence } from "./questTypes.ts";

export type QuestServiceOptions = {
  questsRepo: QuestsRepository;
  aiGateway: Pick<AIGateway, "generateText">;
  assessmentsRepo?: Pick<AssessmentsRepository, "listGradeResultsByQuest">;
};

export type GenerateQuestFromGoalInput = {
  userId: string;
  goal: LearningGoal;
};

export type GenerateQuestFromCurriculumSeedInput = {
  userId: string;
  seed: QuestSeed;
};

export type CompleteQuestWithMasteryInput = {
  userId: string;
  questId: string;
  manualOverride?: {
    actorId: string;
    reason: string;
  };
};

export type RecomputeMasteryStateInput = {
  userId: string;
  questId: string;
};

export class QuestService {
  private readonly questsRepo: QuestsRepository;
  private readonly aiGateway: Pick<AIGateway, "generateText">;
  private readonly assessmentsRepo?: Pick<AssessmentsRepository, "listGradeResultsByQuest">;

  constructor(options: QuestServiceOptions) {
    this.questsRepo = options.questsRepo;
    this.aiGateway = options.aiGateway;
    this.assessmentsRepo = options.assessmentsRepo;
  }

  async generateFromGoal(input: GenerateQuestFromGoalInput): Promise<Quest[]> {
    const generated = await this.aiGateway.generateText<QuestGenerationOutput>({
      task: "quest_generation",
      promptVersion: "quests.generate-from-goal.v1",
      userId: input.userId,
      jsonSchema: validationSchemas.questGeneration,
      sourceIds: [input.goal.id],
      messages: [
        {
          role: "system",
          content:
            "Generate focused learning quests for a saved goal. Each quest must include prerequisite notes, a lesson plan, practice tasks, and mastery criteria.",
        },
        {
          role: "user",
          content: JSON.stringify({
            title: input.goal.title,
            description: input.goal.description,
            desiredOutcome: input.goal.desiredOutcome,
            currentLevel: input.goal.currentLevel,
            successCriteria: input.goal.successCriteria,
          }),
        },
      ],
      metadata: {
        goalId: input.goal.id,
      },
    });

    return this.persistGeneratedQuests({
      userId: input.userId,
      goalId: input.goal.id,
      generated: generated.data,
    });
  }

  async generateFromCurriculumSeed(input: GenerateQuestFromCurriculumSeedInput): Promise<Quest[]> {
    const generated = await this.aiGateway.generateText<QuestGenerationOutput>({
      task: "quest_generation",
      promptVersion: "quests.generate-from-curriculum.v1",
      userId: input.userId,
      jsonSchema: validationSchemas.questGeneration,
      sourceIds: [input.seed.goalId, input.seed.curriculumId],
      messages: [
        {
          role: "system",
          content:
            "Generate a focused learning quest from a curriculum day seed. Preserve the objective and turn it into a lesson plan, practice tasks, and mastery criteria.",
        },
        {
          role: "user",
          content: JSON.stringify({
            title: input.seed.title,
            objective: input.seed.objective,
            focusPoints: input.seed.focusPoints,
            practiceTasks: input.seed.practiceTasks,
            masteryCriteria: input.seed.masteryCriteria,
          }),
        },
      ],
      metadata: {
        goalId: input.seed.goalId,
        curriculumId: input.seed.curriculumId,
      },
    });

    return this.persistGeneratedQuests({
      userId: input.userId,
      goalId: input.seed.goalId,
      curriculumId: input.seed.curriculumId,
      generated: generated.data,
    });
  }

  async completeQuestWithMastery(input: CompleteQuestWithMasteryInput): Promise<Quest> {
    const quest = await this.requireQuest(input.userId, input.questId);
    if (quest.status === "archived") {
      throw new Error("Archived quests are terminal and cannot be completed");
    }

    const now = new Date().toISOString();
    if (input.manualOverride) {
      if (!input.manualOverride.actorId.trim() || !input.manualOverride.reason.trim()) {
        throw new Error("Manual override requires an actor and learner-visible reason");
      }
      const evidence: QuestMasteryEvidence = {
        type: "manual_override",
        actorId: input.manualOverride.actorId,
        reason: input.manualOverride.reason,
        recordedAt: now,
      };
      const status = transitionQuest(quest.status, "completed", { hasManualOverride: true });
      return this.questsRepo.updateMasteryState(input.userId, quest.id, { status, masteryEvidence: evidence });
    }

    const latestGrade = await this.latestCanonicalGrade(input.userId, quest.id);
    if (!latestGrade) {
      throw new Error("Quest completion requires a passed assessment or manual override. Next action: take and pass the mastery quiz.");
    }

    if (latestGrade.status === "graded" && latestGrade.passed) {
      const evidence: QuestMasteryEvidence = {
        type: "assessment_pass",
        assessmentResultId: latestGrade.id,
        recordedAt: now,
      };
      const status = transitionQuest(quest.status, "completed", { hasPassedAssessment: true });
      return this.questsRepo.updateMasteryState(input.userId, quest.id, { status, masteryEvidence: evidence });
    }

    const evidence: QuestMasteryEvidence = {
      type: "assessment_fail",
      assessmentResultId: latestGrade.id,
      recordedAt: now,
    };
    const status = quest.status === "needs_review"
      ? "needs_review"
      : transitionQuest(quest.status, "needs_review", { hasPassedAssessment: false });
    return this.questsRepo.updateMasteryState(input.userId, quest.id, {
      status,
      masteryEvidence: evidence,
      nextAction: "Review the rubric feedback, practice the missing criteria, then retake the quiz.",
    });
  }

  async recomputeMasteryState(input: RecomputeMasteryStateInput): Promise<Quest> {
    const quest = await this.requireQuest(input.userId, input.questId);
    if (quest.status === "archived") {
      return quest;
    }
    if (quest.masteryEvidence?.type === "manual_override") {
      return quest;
    }

    const latestGrade = await this.latestCanonicalGrade(input.userId, quest.id);
    if (latestGrade?.status === "graded" && latestGrade.passed) {
      return quest.status === "completed"
        ? quest
        : this.questsRepo.updateMasteryState(input.userId, quest.id, {
          status: transitionQuest(quest.status, "completed", { hasPassedAssessment: true }),
          masteryEvidence: {
            type: "assessment_pass",
            assessmentResultId: latestGrade.id,
            recordedAt: new Date().toISOString(),
          },
        });
    }

    if (quest.status === "completed" && quest.masteryEvidence?.type === "assessment_pass") {
      return this.questsRepo.updateMasteryState(input.userId, quest.id, {
        status: "quiz_ready",
        nextAction: "Retake the mastery quiz because the prior assessment evidence is no longer available.",
      });
    }

    return quest;
  }

  private async requireQuest(userId: string, questId: string): Promise<Quest> {
    const quest = await this.questsRepo.getById(userId, questId);
    if (!quest) {
      throw new Error(`Quest not found: ${questId}`);
    }
    return quest;
  }

  private async latestCanonicalGrade(userId: string, questId: string) {
    if (!this.assessmentsRepo) {
      return null;
    }
    const grades = await this.assessmentsRepo.listGradeResultsByQuest(userId, questId);
    return grades.sort((left, right) => left.createdAt.localeCompare(right.createdAt)).at(-1) ?? null;
  }

  private async persistGeneratedQuests(input: {
    userId: string;
    goalId: string;
    curriculumId?: string;
    generated: QuestGenerationOutput;
  }): Promise<Quest[]> {
    assertGeneratedQuests(input.generated);

    const quests: Quest[] = [];
    for (const generatedQuest of input.generated.quests) {
      quests.push(
        await this.questsRepo.create({
          userId: input.userId,
          goalId: input.goalId,
          curriculumId: input.curriculumId,
          title: generatedQuest.title,
          objective: generatedQuest.objective,
          prerequisiteNotes: generatedQuest.prerequisite_notes ?? [],
          lessonPlan: generatedQuest.lesson_plan,
          focusPoints: generatedQuest.focus_points,
          practiceTasks: generatedQuest.practice_tasks,
          masteryCriteria: generatedQuest.mastery_criteria,
          status: "draft",
        }),
      );
    }

    return quests;
  }
}

function assertGeneratedQuests(generated: QuestGenerationOutput): void {
  if (!Array.isArray(generated.quests) || generated.quests.length === 0) {
    throw new Error("Quest generation must return at least one quest");
  }

  generated.quests.forEach((quest, index) => assertGeneratedQuest(quest, index));
}

function assertGeneratedQuest(quest: QuestGenerationItem, index: number): void {
  const label = `Generated quest ${index + 1}`;
  if (!quest.title?.trim()) {
    throw new Error(`${label} must include a title`);
  }
  if (!quest.objective?.trim()) {
    throw new Error(`${label} must include an objective`);
  }
  if (!Array.isArray(quest.lesson_plan) || quest.lesson_plan.length === 0) {
    throw new Error(`${label} must include a lesson plan`);
  }
  if (!Array.isArray(quest.focus_points) || quest.focus_points.length === 0) {
    throw new Error(`${label} must include focus points`);
  }
  if (!Array.isArray(quest.practice_tasks) || quest.practice_tasks.length === 0) {
    throw new Error(`${label} must include practice tasks`);
  }
  if (!Array.isArray(quest.mastery_criteria) || quest.mastery_criteria.length === 0) {
    throw new Error(`${label} must include mastery criteria`);
  }
}

export const questService = QuestService;
