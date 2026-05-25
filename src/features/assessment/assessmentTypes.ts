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

export type LearnerQuizAnswer = {
  questionId: string;
  answer: string;
};

export type QuizGradingQuestionOutput = {
  question_id: string;
  score: number;
  passed: boolean;
  correct: string;
  missing: string;
  feedback: string;
  improvement_step: string;
  rubric_hits: string[];
  misconception_tags: string[];
};

export type QuizGradingOutput = {
  overall_score: number;
  passed: boolean;
  confidence: number;
  learner_summary: string;
  improvement_step: string;
  misconception_tags: string[];
  question_results: QuizGradingQuestionOutput[];
};

export type QuizQuestionGradingResult = {
  questionId: string;
  score: number;
  passed: boolean;
  correct: string;
  missing: string;
  feedback: string;
  improvementStep: string;
  rubricHits: string[];
  misconceptionTags: string[];
};

export type QuizGradeStatus = "graded" | "manual_review";

export type QuizGradeResult = {
  id: string;
  userId: string;
  questId: string;
  quizId: string;
  status: QuizGradeStatus;
  learnerAnswers: LearnerQuizAnswer[];
  overallScore: number;
  passed: boolean;
  confidence: number;
  learnerSummary: string;
  improvementStep: string;
  misconceptionTags: string[];
  questionResults: QuizQuestionGradingResult[];
  promptVersion: string;
  gradedByPromptRunId?: string;
  manualReviewReason?: string;
  createdAt: string;
  updatedAt: string;
};

export type ReviewGenerationPracticeStep = {
  title: string;
  instructions: string;
  mastery_criterion: string;
};

export type ReviewGenerationOutput = {
  title: string;
  summary: string;
  missed_concepts: string[];
  practice_steps: ReviewGenerationPracticeStep[];
  next_action: string;
};

export type ReviewPracticeStep = {
  title: string;
  instructions: string;
  masteryCriterion: string;
};

export type ReviewPathStatus = "active" | "superseded" | "fallback";

export type TargetedReviewPath = {
  id: string;
  userId: string;
  questId: string;
  quizId: string;
  assessmentResultId: string;
  status: ReviewPathStatus;
  title: string;
  summary: string;
  missedConcepts: string[];
  practiceSteps: ReviewPracticeStep[];
  nextAction: string;
  promptVersion: string;
  generatedByPromptRunId?: string;
  createdAt: string;
  updatedAt: string;
};
