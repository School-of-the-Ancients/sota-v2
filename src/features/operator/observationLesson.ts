import type { OperatorLesson, OperatorSource } from "./operatorTypes.ts";

const researchCommit = "34339194752555c7b5bb840cd3ac972349f9116f";
const researchRoot = `https://github.com/School-of-the-Ancients/research/blob/${researchCommit}`;
const frameworkUrl = `${researchRoot}/Ancient%20Educational%20Philosophies%20and%20a%20Modern%20AI-Era%20Framework.pdf`;

const inquirySource: OperatorSource = {
  id: "research-inquiry-and-action",
  title: "Ancient Educational Philosophies and a Modern AI-Era Framework",
  url: `${frameworkUrl}#page=9`,
  citation: "Pages 9-10: questioning, hints and learning through action. Project research synthesis; pedagogical inspiration, not a validated lesson or historical quotation.",
  kind: "research",
};

const evidenceSource: OperatorSource = {
  id: "research-reflection-and-evidence",
  title: "Ancient Educational Philosophies and a Modern AI-Era Framework",
  url: `${frameworkUrl}#page=11`,
  citation: "Pages 11-12: portfolio revisions, reflection and source checking. The proposed methods do not establish learning gains for this activity.",
  kind: "research",
};

const scaleSource: OperatorSource = {
  id: "unity-local-scale",
  title: "Unity 6 Scripting API: Transform.localScale",
  url: "https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Transform-localScale.html",
  citation: "Description: local scale is relative to the object's parent. Scale values are multipliers, not measurements in metres.",
  kind: "technical",
};

const activitySource: OperatorSource = {
  id: "authored-observation-and-scale-v1",
  title: "Observation and Scale: authored activity v1.0.0",
  citation: "Original exercise and scripted guide. For a rectangular block, geometric volume is width x height x depth: doubling all three multiplies it by 2 x 2 x 2 = 8; doubling one multiplies it by 2. This is an authored derivation, not a historical quotation or physics test. Completion is not mastery.",
  kind: "authored",
};

export const observationLesson: OperatorLesson = {
  id: "observation-and-scale",
  version: "1.0.0",
  title: "Observation and Scale",
  objective: "Predict a uniform scale change, double a prop's three starting scale values, and explain the result using before-and-after evidence.",
  mentor: {
    id: "observation-guide",
    name: "Observation guide (scripted)",
    promptVersion: "operator.observation-and-scale.v1",
  },
  sources: [inquirySource, evidenceSource, scaleSource, activitySource],
  stages: {
    not_started: {
      title: "Make a prediction, then test it",
      body: "Use a bundled prop to compare what you expect with what changes. This guide is authored and scripted; it does not generate AI replies.",
      prompt: "What would 'twice the size' mean for the prop's X, Y and Z scale values?",
      hint: "Consider each axis separately before changing the prop.",
      sources: [inquirySource, activitySource],
    },
    explain: {
      title: "Explain: name the change",
      body: "Local scale has X, Y and Z multipliers relative to the prop's parent. In this activity, 'twice the size' means multiplying all three starting values by 2.",
      prompt: "Predict what will change and what should stay the same when all three scale values double.",
      hint: "First list the three scale values. Then consider whether scaling requires moving or rotating the prop.",
      sources: [scaleSource, inquirySource, activitySource],
    },
    example: {
      title: "Example: compare three values",
      body: "A scale of (0.5, 1, 1.5) becomes (1, 2, 3). For a rectangular block, doubling width, height and depth multiplies geometric volume by 2 x 2 x 2 = 8. Doubling only one dimension multiplies it by 2. Keep the same parent; this compares geometry, not mass or physics.",
      prompt: "Before changing your block, record the three values you predict and what should stay the same. How will you tell that every axis changed by the same factor?",
      hint: "Compare each new value with its starting value: new X / starting X, then Y, then Z.",
      sources: [scaleSource, activitySource],
    },
    guided_practice: {
      title: "Guided practice: test your prediction",
      body: "Use the activity's starting prop. Make its X, Y and Z scale values twice their starting values, then wait for the change to finish. Keep the same prop and placement.",
      prompt: "Compare the starting and current values. Describe what changed before submitting your practice evidence.",
      hint: "First compare one axis with its starting value. Then check all three: each should be 2 times its own starting value. Avoid doubling an already doubled prop.",
      sources: [scaleSource, inquirySource, activitySource],
    },
    socratic_check: {
      title: "Socratic check: support your claim",
      body: "The transform check can establish that the recorded values match the task. Your explanation connects those values to your prediction.",
      prompt: "Which before-and-after values support your claim? How would your evidence differ if you had doubled only one axis?",
      hint: "Name a pair of starting and final values, then identify a different axis that also changed. Revise your prediction if it was incomplete.",
      sources: [evidenceSource, activitySource],
    },
    recap: {
      title: "Recap: record what you learned",
      body: "Review your prediction, the prop's recorded change and your explanation. This record preserves an attempt and its evidence; it is not an assessment of mastery.",
      prompt: "What did the evidence confirm or change in your prediction, and what would you test next?",
      hint: "Write one observation and one revision or remaining question. Separate what you saw from what you inferred.",
      sources: [evidenceSource, activitySource],
    },
    ended: {
      title: "Activity recorded",
      body: "Your prediction, observations, explanation and reflection are saved. Use this record to plan your next experiment.",
      prompt: "Review your record and sources when planning your next attempt.",
      hint: "Compare a new prediction with this attempt before changing another variable.",
      sources: [evidenceSource, activitySource],
    },
  },
};
