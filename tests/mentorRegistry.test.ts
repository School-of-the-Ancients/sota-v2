import test from "node:test";
import assert from "node:assert/strict";

import {
  findMentorForSubject,
  getActiveMentorVersion,
  mentorRegistry,
  renderMentorSystemPrompt,
} from "../src/features/mentors/mentorRegistry.ts";
import type { MentorDefinition } from "../src/features/mentors/mentorTypes.ts";

const mentor: MentorDefinition = {
  id: "algorithms-coach",
  subjectTags: ["algorithms", "computer-science"],
  strategy: {
    id: "socratic-practice-loop",
    name: "Socratic practice loop",
    instructionalStyle: "Ask short guiding questions before giving concise explanations.",
    constraints: ["Do not solve the whole problem before the learner attempts it", "Tie feedback to mastery criteria"],
    subjectFit: ["algorithms", "data-structures"],
  },
  persona: {
    id: "patient-professor",
    name: "Patient Professor",
    voice: "calm, precise, encouraging",
    boundaries: ["Avoid pretending to be a real professor"],
  },
  versions: [
    {
      id: "algorithms-coach@2026-01-01",
      status: "deprecated",
      promptVersion: "mentors.algorithms-coach.v0",
      createdAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "algorithms-coach@2026-02-01",
      status: "active",
      promptVersion: "mentors.algorithms-coach.v1",
      createdAt: "2026-02-01T00:00:00.000Z",
    },
  ],
};

test("mentor registry includes active mentors with strategy separated from persona", () => {
  assert.ok(mentorRegistry.length > 0);
  const active = mentorRegistry.map((entry) => getActiveMentorVersion(entry));

  for (const entry of mentorRegistry) {
    assert.notEqual(entry.strategy.id, entry.persona.id);
    assert.ok(entry.strategy.instructionalStyle.length > 0);
    assert.ok(entry.strategy.subjectFit.length > 0);
    assert.ok(entry.strategy.constraints.length > 0);
    assert.ok(entry.persona.voice.length > 0);
  }

  assert.ok(active.every((version) => version.status === "active"));
});

test("mentor registry selects mentors by subject fit without matching persona text", () => {
  const selected = findMentorForSubject(["graph algorithms", "runtime analysis"], [mentor]);

  assert.equal(selected?.id, "algorithms-coach");
  assert.equal(findMentorForSubject(["calm precise encouraging"], [mentor]), null);
});

test("mentor prompt rendering keeps teaching strategy and persona in distinct sections", () => {
  const prompt = renderMentorSystemPrompt(mentor);

  assert.match(prompt, /Teaching strategy/i);
  assert.match(prompt, /Persona/i);
  assert.match(prompt, /Socratic practice loop/);
  assert.match(prompt, /Patient Professor/);
  assert.ok(prompt.indexOf("Teaching strategy") < prompt.indexOf("Persona"));
  assert.match(prompt, /Do not solve the whole problem/);
  assert.match(prompt, /Avoid pretending to be a real professor/);
});
