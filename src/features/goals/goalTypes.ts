export type LearningGoalStatus = "draft" | "active" | "paused" | "completed" | "archived";
export type LearningGoalLevel = "beginner" | "intermediate" | "advanced" | "unknown";

export type LearningGoal = {
  id: string;
  userId: string;
  title: string;
  description?: string;
  desiredOutcome?: string;
  currentLevel: LearningGoalLevel;
  timeBudgetMinutesPerDay?: number;
  deadline?: string;
  constraints: unknown[];
  successCriteria: string[];
  status: LearningGoalStatus;
  source: string;
  createdAt: string;
  updatedAt: string;
};

export type GoalIntakeInput = {
  userId: string;
  goal: string;
  refineWithAI?: boolean;
};

export type GoalRefinementOutput = {
  title: string;
  description?: string;
  desired_outcome?: string;
  current_level?: LearningGoalLevel;
  success_criteria?: string[];
};
