export type MentorVersionStatus = "draft" | "active" | "deprecated";

export type MentorVersion = {
  id: string;
  status: MentorVersionStatus;
  promptVersion: string;
  createdAt: string;
};

export type MentorStrategy = {
  id: string;
  name: string;
  instructionalStyle: string;
  constraints: string[];
  subjectFit: string[];
};

export type MentorPersona = {
  id: string;
  name: string;
  voice: string;
  boundaries: string[];
};

export type MentorDefinition = {
  id: string;
  subjectTags: string[];
  strategy: MentorStrategy;
  persona: MentorPersona;
  versions: MentorVersion[];
};
