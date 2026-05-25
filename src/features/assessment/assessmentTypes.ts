export type AssessmentType = "quiz" | "short_answer" | "project" | "oral_check" | "manual_override";

export type QuizQuestionKind = "short_answer" | "multiple_choice" | "true_false";

export type QuizGenerationQuestion = {
  id?: string;
  prompt: string;
  kind: QuizQuestionKind;
  objective_refs: string[];
  expected_answer: string;
  rubric: string[];
  choices?: string[];
};

export type QuizGenerationOutput = {
  title: string;
  instructions: string;
  questions: QuizGenerationQuestion[];
};

export type QuizQuestion = {
  id: string;
  prompt: string;
  kind: QuizQuestionKind;
  objectiveRefs: string[];
  expectedAnswer: string;
  rubric: string[];
  choices?: string[];
};

export type QuizAssessmentStatus = "active" | "archived";

export type QuizAssessment = {
  id: string;
  userId: string;
  questId: string;
  type: "quiz";
  status: QuizAssessmentStatus;
  title: string;
  instructions: string;
  questions: QuizQuestion[];
  sourceLessonSessionIds: string[];
  promptVersion: string;
  generatedByPromptRunId?: string;
  createdAt: string;
  updatedAt: string;
};
