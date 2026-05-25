import type { QuestStatus } from "./questStateMachine.ts";

export type QuestGenerationItem = {
  title: string;
  objective: string;
  prerequisite_notes?: string[];
  lesson_plan: string[];
  focus_points: string[];
  practice_tasks: string[];
  mastery_criteria: string[];
};

export type QuestGenerationOutput = {
  quests: QuestGenerationItem[];
};

export type QuestMasteryEvidence = {
  type: "assessment_pass" | "assessment_fail" | "manual_override";
  assessmentResultId?: string;
  actorId?: string;
  reason?: string;
  recordedAt: string;
};

export type Quest = {
  id: string;
  userId: string;
  goalId: string;
  curriculumId?: string;
  title: string;
  objective: string;
  prerequisiteNotes: string[];
  lessonPlan: string[];
  focusPoints: string[];
  practiceTasks: string[];
  masteryCriteria: string[];
  status: QuestStatus;
  masteryEvidence?: QuestMasteryEvidence;
  nextAction?: string;
  generatedByPromptRunId?: string;
  createdAt: string;
  updatedAt: string;
};
