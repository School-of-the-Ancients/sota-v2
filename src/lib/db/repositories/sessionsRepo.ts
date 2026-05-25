import type { LessonSessionSummary, PersistCompletedLessonInput, PersistedLessonSession } from "../../../features/lessons/lessonTypes.ts";
import type { LessonRuntimeSession } from "../../../features/lessons/lessonTypes.ts";

export type LessonSessionCreateInput = PersistCompletedLessonInput & {
  session: LessonRuntimeSession;
};

export type LessonSessionsRepository = {
  createCompleted(input: LessonSessionCreateInput): Promise<PersistedLessonSession>;
  getById(userId: string, id: string): Promise<PersistedLessonSession | null>;
  listByQuest(userId: string, questId: string): Promise<PersistedLessonSession[]>;
  listSummariesByQuest(userId: string, questId: string): Promise<LessonSessionSummary[]>;
};

export class InMemoryLessonSessionsRepository implements LessonSessionsRepository {
  private readonly records = new Map<string, PersistedLessonSession>();

  async createCompleted(input: LessonSessionCreateInput): Promise<PersistedLessonSession> {
    const now = new Date().toISOString();
    const id = crypto.randomUUID?.() ?? `lesson-session-${this.records.size + 1}`;
    const record: PersistedLessonSession = {
      id,
      userId: input.session.userId,
      questId: input.session.questId,
      objective: input.session.objective,
      mentorId: input.mentorId,
      promptVersions: [...input.promptVersions],
      summary: input.summary,
      learnerVisibleRecap: input.learnerVisibleRecap,
      finalStage: input.session.stage,
      messages: input.session.messages.map((message) => ({ ...message })),
      history: input.session.history.map((event) => ({ ...event })),
      createdAt: now,
      updatedAt: now,
    };

    this.records.set(id, record);
    return record;
  }

  async getById(userId: string, id: string): Promise<PersistedLessonSession | null> {
    const session = this.records.get(id);
    return session?.userId === userId ? session : null;
  }

  async listByQuest(userId: string, questId: string): Promise<PersistedLessonSession[]> {
    return [...this.records.values()].filter((session) => session.userId === userId && session.questId === questId);
  }

  async listSummariesByQuest(userId: string, questId: string): Promise<LessonSessionSummary[]> {
    return (await this.listByQuest(userId, questId)).map((session) => ({
      id: session.id,
      userId: session.userId,
      questId: session.questId,
      mentorId: session.mentorId,
      promptVersions: [...session.promptVersions],
      summary: session.summary,
      learnerVisibleRecap: session.learnerVisibleRecap,
      finalStage: session.finalStage,
      createdAt: session.createdAt,
    }));
  }
}

export const sessionsRepo = new InMemoryLessonSessionsRepository();
