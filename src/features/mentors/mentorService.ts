import type { MentorDefinition } from "./mentorTypes.ts";
import { findMentorForSubject, getActiveMentorVersion, mentorRegistry, renderMentorSystemPrompt } from "./mentorRegistry.ts";

export type MentorSelectionInput = {
  subjectTags: string[];
  mentors?: readonly MentorDefinition[];
};

export type MentorPromptInput = {
  mentorId: string;
  mentors?: readonly MentorDefinition[];
};

export class MentorService {
  private readonly mentors: readonly MentorDefinition[];

  constructor(mentors: readonly MentorDefinition[] = mentorRegistry) {
    this.mentors = mentors;
  }

  selectForSubject(input: MentorSelectionInput): MentorDefinition | null {
    return findMentorForSubject(input.subjectTags, input.mentors ?? this.mentors);
  }

  getPrompt(input: MentorPromptInput): string {
    const mentor = (input.mentors ?? this.mentors).find((candidate) => candidate.id === input.mentorId);
    if (!mentor) {
      throw new Error(`Mentor not found: ${input.mentorId}`);
    }

    getActiveMentorVersion(mentor);
    return renderMentorSystemPrompt(mentor);
  }
}

export const mentorService = new MentorService();
