export type CurriculumStatus = "draft" | "active" | "paused" | "completed" | "archived";

export type CurriculumDayPlan = {
  day: number;
  title: string;
  objective: string;
  focus_points: string[];
  practice_tasks: string[];
  mastery_criteria: string[];
};

export type OneWeekCurriculumOutput = {
  title: string;
  description?: string;
  duration_days: number;
  weekly_rhythm?: string;
  days: CurriculumDayPlan[];
};

export type CurriculumPlan = {
  days: CurriculumDayPlan[];
};

export type Curriculum = {
  id: string;
  userId: string;
  goalId: string;
  title: string;
  description?: string;
  durationDays: number;
  weeklyRhythm?: string;
  plan: CurriculumPlan;
  status: CurriculumStatus;
  generatedByPromptRunId?: string;
  createdAt: string;
  updatedAt: string;
};

export type QuestSeed = {
  goalId: string;
  curriculumId: string;
  title: string;
  objective: string;
  focusPoints: string[];
  practiceTasks: string[];
  masteryCriteria: string[];
};
