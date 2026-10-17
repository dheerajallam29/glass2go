import type { Track } from "./questions";

// Original practice scenarios with fictional businesses. Indicator wording is Glass2Go's own,
// following the public structure of each competition without copying official judging material.
export type Scenario = {
  id: string;
  track: Track;
  format: string;
  prep: number; // minutes
  present: number;
  you: string;
  judge: string;
  business: string;
  situation: string[];
  tasks: string[];
  indicators: string[];
};

export const SCENARIOS: Scenario[] = [
  {
    id: "deca-pmk-harbor",
    track: "deca",
    format: "Principles of Marketing",
    prep: 10,
    present: 10,
    you: "Marketing assistant",
    judge: "Owner of Harbor & Pine Coffee",
    business: "Harbor & Pine Coffee, a fictional chain of four coffee shops near two high schools and a college.",
    situation: [
      "Harbor & Pine launched a cold brew line six weeks ago. Sales to adults are steady, but students, the group it was designed for, are barely buying it.",
      "A quick survey of 60 student customers said the cold brew 'looks expensive' and most had never seen it advertised.",
      "The owner has $1,500 for a four-week push and wants a plan before the next school term starts.",
    ],
    tasks: [
      "Explain why the cold brew is not reaching students.",
      "Recommend a four-week promotion that fits the budget.",
      "Explain how the owner will know whether it worked.",
    ],
    indicators: [
      "Explain what a promotional mix is and choose the right elements for this audience",
      "Use customer feedback to shape a marketing decision",
      "Explain how pricing affects how customers see value",
      "Show a customer-focused attitude in every recommendation",
    ],
  },
  {
    id: "fbla-case-lumen",
    track: "fbla",
    format: "Marketing case study",
    prep: 20,
    present: 7,
    you: "Consultants (team of one to three)",
    judge: "Leadership team at Lumen Fitness",
    business: "Lumen Fitness, a fictional regional gym with three locations and quiet afternoons.",
    situation: [
      "Lumen's gyms are busy before work and after 6 pm, but nearly empty from 2 pm to 5 pm.",
      "The leadership team wants to launch a student membership for those hours without discounting its regular plans.",
      "Two competitors already offer cheap student deals with no extras.",
    ],
    tasks: [
      "Define the target customer for the afternoon membership.",
      "Recommend the offer, the price logic and how to reach students.",
      "Name one risk and how Lumen should handle it.",
    ],
    indicators: [
      "Understanding of the problem",
      "Alternatives considered",
      "Logical, realistic solution",
      "Clear delivery and confident answers to questions",
    ],
  },
];

export const scenarioFor = (track: Track) => SCENARIOS.find((s) => s.track === track)!;
