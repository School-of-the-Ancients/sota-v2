import type { LessonRuntimeSession, LessonStage } from "../lessons/lessonTypes.ts";

export type OperatorVector = { x: number; y: number; z: number };
export type OperatorSource = {
  id: string;
  title: string;
  url?: string;
  citation?: string;
  kind: "research" | "authored" | "technical";
};
export type OperatorContent = { title: string; body: string; prompt: string; hint: string; sources: OperatorSource[] };
export type OperatorLesson = {
  id: string;
  version: string;
  title: string;
  objective: string;
  mentor: { id: string; name: string; promptVersion: string };
  stages: Record<LessonStage, OperatorContent>;
  sources: OperatorSource[];
};
export type OperatorContext = { roomId: string; anchorId: string; objectId: string; baselineScale: OperatorVector };
export type OperatorEvidence = { roomId: string; anchorId: string; objectId: string; scale: OperatorVector };
export type OperatorSession = LessonRuntimeSession & {
  revision: number;
  lessonId: string;
  lessonVersion: string;
  mentorId: string;
  promptVersion: string;
  content: OperatorContent;
  progress: { index: number; total: number };
  context: OperatorContext;
  completionLabel: string;
  evidence: Array<OperatorEvidence & { recordedAt: string; kind: "runtime_scale_report" }>;
  restoredFrom?: { checkpointId: string; sessionId: string; revision: number };
};
export type OperatorCheckpoint = { id: string; sessionId: string; revision: number };
export type OperatorSessionResponse = { apiVersion: 1; session: OperatorSession };
