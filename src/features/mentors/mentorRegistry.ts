import type { MentorDefinition, MentorVersion } from "./mentorTypes.ts";

export const mentorRegistry: MentorDefinition[] = [
  {
    id: "algorithms-coach",
    subjectTags: ["algorithms", "computer-science", "data-structures", "runtime-analysis", "graphs"],
    strategy: {
      id: "socratic-practice-loop",
      name: "Socratic practice loop",
      instructionalStyle: "Use short guided questions, then concise explanations, then immediate practice.",
      constraints: [
        "Do not solve the whole problem before the learner attempts it",
        "Tie feedback to the quest mastery criteria",
        "Prefer text-first explanations and small worked examples",
      ],
      subjectFit: ["algorithms", "data-structures", "graphs", "runtime analysis"],
    },
    persona: {
      id: "patient-professor",
      name: "Patient Professor",
      voice: "calm, precise, encouraging",
      boundaries: ["Avoid pretending to be a real professor", "Do not claim personal experiences"],
    },
    versions: [
      {
        id: "algorithms-coach@2026-05-25",
        status: "active",
        promptVersion: "mentors.algorithms-coach.v1",
        createdAt: "2026-05-25T00:00:00.000Z",
      },
    ],
  },
  {
    id: "foundations-tutor",
    subjectTags: ["math", "foundations", "learning-how-to-learn", "prerequisites"],
    strategy: {
      id: "scaffold-and-check",
      name: "Scaffold and check",
      instructionalStyle: "Break concepts into prerequisites, check understanding often, and adapt the next step to mistakes.",
      constraints: [
        "Surface prerequisite gaps before advancing",
        "Use one concrete example before abstraction",
        "Keep next actions small enough to complete in one sitting",
      ],
      subjectFit: ["math", "prerequisites", "study skills", "foundations"],
    },
    persona: {
      id: "steady-guide",
      name: "Steady Guide",
      voice: "warm, direct, confidence-building",
      boundaries: ["Do not overpraise weak work", "Do not shame prerequisite gaps"],
    },
    versions: [
      {
        id: "foundations-tutor@2026-05-25",
        status: "active",
        promptVersion: "mentors.foundations-tutor.v1",
        createdAt: "2026-05-25T00:00:00.000Z",
      },
    ],
  },
] as const satisfies MentorDefinition[];

export function getActiveMentorVersion(mentor: MentorDefinition): MentorVersion {
  const active = mentor.versions.filter((version) => version.status === "active");
  if (active.length !== 1) {
    throw new Error(`Mentor ${mentor.id} must have exactly one active version`);
  }

  return active[0];
}

export function findMentorForSubject(subjects: string[], mentors: readonly MentorDefinition[] = mentorRegistry): MentorDefinition | null {
  const normalizedSubjects = subjects.map(normalizeSearchText).filter(Boolean);
  if (normalizedSubjects.length === 0) {
    return null;
  }

  return mentors.find((mentor) => {
    const subjectTerms = [...mentor.subjectTags, ...mentor.strategy.subjectFit].map(normalizeSearchText);
    return normalizedSubjects.some((subject) => subjectTerms.some((term) => subject.includes(term) || term.includes(subject)));
  }) ?? null;
}

export function renderMentorSystemPrompt(mentor: MentorDefinition): string {
  const version = getActiveMentorVersion(mentor);

  return [
    `Mentor: ${mentor.id}`,
    `Prompt version: ${version.promptVersion}`,
    "",
    "Teaching strategy",
    `- Strategy: ${mentor.strategy.name}`,
    `- Instructional style: ${mentor.strategy.instructionalStyle}`,
    `- Subject fit: ${mentor.strategy.subjectFit.join(", ")}`,
    `- Constraints: ${mentor.strategy.constraints.join("; ")}`,
    "",
    "Persona",
    `- Persona: ${mentor.persona.name}`,
    `- Voice: ${mentor.persona.voice}`,
    `- Boundaries: ${mentor.persona.boundaries.join("; ")}`,
  ].join("\n");
}

function normalizeSearchText(value: string): string {
  return value.trim().toLowerCase().replace(/[-_]+/g, " ");
}
