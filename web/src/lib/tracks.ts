import type { Track } from "./questions";

export type Exam = {
  slug: string;
  name: string;
  events: string[]; // event codes or names that use this exam
  areas: string[]; // topics with sample questions today
};

export type TrackInfo = {
  id: Track;
  name: string;
  tagline: string;
  exams: Exam[];
  noExam: string; // how events without a test are handled
  events?: { kind: "case" | "presentation" | "roleplay"; slug: string; name: string; isNew?: boolean }[]; // events practised with a scenario instead of a test
  roleplay: { name: string; prep: number; present: number; indicators: number | null; note: string }[];
};

// DECA: about 60 high-school events share 7 exams (2026-27 blueprints).
const DECA_CORE = ["Economics", "Customer Relations", "Financial Analysis", "Emotional Intelligence",
  "Communication Skills", "Operations", "Business Law", "Entrepreneurship"];

export const TRACKS: Record<Track, TrackInfo> = {
  deca: {
    id: "deca",
    name: "DECA",
    tagline: "Seven exams, one question bank, built from the 2026-27 blueprints.",
    exams: [
      { slug: "core", name: "Business Administration Core", events: ["PBM", "PEN", "PFN", "PHT", "PMK"], areas: DECA_CORE },
      { slug: "bma", name: "Business Management + Administration", events: ["HRM", "BLTDM"], areas: DECA_CORE },
      { slug: "finance", name: "Finance", events: ["ACT", "BFS", "FTDM", "FCE"], areas: DECA_CORE },
      { slug: "hospitality", name: "Hospitality + Tourism", events: ["HLM", "QSRM", "RFSM", "HTDM", "TTDM", "HTPS"], areas: DECA_CORE },
      { slug: "marketing", name: "Marketing", events: ["AAM", "ASM", "BSM", "FMS", "MCS", "RMS", "SEM", "BTDM", "MTDM", "STDM", "IMCE", "IMCP", "IMCS", "PSE"], areas: DECA_CORE },
      { slug: "entrepreneurship", name: "Entrepreneurship", events: ["ENT", "ETDM"], areas: DECA_CORE },
      { slug: "pfl", name: "Personal Financial Literacy", events: ["PFL"], areas: DECA_CORE },
    ],
    events: [
      { kind: "roleplay", slug: "principles-of-business-management", name: "Principles of Business Management and Administration (PBM)" },
      { kind: "roleplay", slug: "principles-of-entrepreneurship", name: "Principles of Entrepreneurship (PEN)" },
      { kind: "roleplay", slug: "principles-of-finance", name: "Principles of Finance (PFN)" },
      { kind: "roleplay", slug: "principles-of-hospitality-and-tourism", name: "Principles of Hospitality and Tourism (PHT)" },
      { kind: "roleplay", slug: "principles-of-marketing", name: "Principles of Marketing (PMK)" },
      { kind: "roleplay", slug: "human-resources-management", name: "Human Resources Management Series (HRM)" },
      { kind: "roleplay", slug: "hotel-and-lodging-management", name: "Hotel and Lodging Management Series (HLM)" },
      { kind: "roleplay", slug: "entrepreneurship-series", name: "Entrepreneurship Series (ENT)" },
      { kind: "roleplay", slug: "marketing-communications", name: "Marketing Communications Series (MCS)" },
      { kind: "roleplay", slug: "financial-services-team-decision-making", name: "Financial Services Team Decision Making (FTDM)" },
      { kind: "roleplay", slug: "personal-financial-literacy", name: "Personal Financial Literacy (PFL)" },
    ],
    noExam:
      "26 DECA events have no exam: business plans, operations research, project management and online simulations. They are judged on a written entry or simulation instead.",
    roleplay: [
      { name: "Principles", prep: 10, present: 10, indicators: 4, note: "First-year events. One judge, one situation." },
      { name: "Series", prep: 10, present: 10, indicators: 5, note: "Individual series events in each cluster." },
      { name: "Team Decision Making", prep: 30, present: 15, indicators: 5, note: "Teams of two, longer prep." },
      { name: "Personal Financial Literacy", prep: 10, present: 10, indicators: 3, note: "Fewer indicators, money decisions." },
    ],
  },
  fbla: {
    id: "fbla",
    name: "FBLA",
    tagline: "Objective tests and role plays, built from FBLA's published competencies and 2026-27 rating sheets.",
    exams: [
      { slug: "accounting", name: "Accounting", events: ["Accounting"], areas: ["Accounting"] },
      { slug: "business-law", name: "Business Law", events: ["Business Law"], areas: ["Business Law"] },
      { slug: "economics", name: "Economics", events: ["Economics"], areas: ["Economics"] },
      { slug: "personal-finance", name: "Personal Finance", events: ["Personal Finance"], areas: ["Personal Finance"] },
      { slug: "securities", name: "Securities & Investments", events: ["Securities & Investments"], areas: ["Securities & Investments"] },
      { slug: "leadership", name: "Organizational Leadership", events: ["Organizational Leadership"], areas: ["Organizational Leadership"] },
      { slug: "data-science-ai", name: "Data Science & AI", events: ["Data Science & AI (new)"], areas: ["Data Science & AI"] },
      { slug: "healthcare-administration", name: "Healthcare Administration", events: ["Healthcare Administration"], areas: ["Healthcare Administration"] },
      { slug: "intro-business", name: "Introduction to Business Concepts", events: ["Grades 9 and 10 only"], areas: ["Introduction to Business Concepts"] },
    ],
    events: [
      { kind: "presentation", slug: "business-plan", name: "Business Plan" },
      { kind: "presentation", slug: "coding-programming", name: "Coding & Programming" },
      { kind: "presentation", slug: "public-speaking", name: "Public Speaking" },
      { kind: "presentation", slug: "financial-statement-analysis", name: "Financial Statement Analysis" },
    ],
    noExam:
      "Case study and presentation events have no objective test. They are judged on a performance, so you practise them with a timed scenario and a self-scoring rubric.",
    roleplay: [
      { name: "Role play", prep: 20, present: 7, indicators: null, note: "Individual or team of up to three, depending on the event. The judge can ask questions as you present." },
    ],
  },
};
