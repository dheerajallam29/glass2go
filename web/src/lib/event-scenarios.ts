import type { Scenario } from "./scenarios";
import { SCENARIOS } from "./scenarios";
import { DECA_EVENT_SCENARIOS } from "./deca-event-scenarios";

// Practice scenarios for FBLA case study and presentation events. Every business is fictional and the
// wording is Glass2Go's own. Timings are practice timings, so check your event guidelines for the real ones.
export type EventScenario = Scenario & { slug: string };

const CASE = { prep: 20, present: 7, track: "fbla" as const };
const TALK = { prep: 10, present: 7, track: "fbla" as const };

const base = SCENARIOS.find((s) => s.id === "fbla-case-lumen")!;

const PMK = SCENARIOS.find((x) => x.id === "deca-pmk-harbor")!;

const FBLA_EVENT_SCENARIOS: EventScenario[] = [
  { ...base, slug: "marketing" },
  {
    ...CASE,
    id: "fbla-case-business-management",
    slug: "business-management",
    format: "Business Management case study",
    you: "Management consultants (team of one to three)",
    judge: "Owner and operations manager of Pinewood Print Works",
    business: "Pinewood Print Works, a fictional print shop with 14 employees that makes posters, banners and school yearbooks.",
    situation: [
      "Over the last year Pinewood lost three of its five best press operators to a competitor that pays about 8 percent more.",
      "Yearbook orders now arrive late 4 times out of 10, and two schools have said they may not renew.",
      "The owner can raise total wage spending by at most 5 percent, and wants a plan that stops people leaving without hurting profit.",
    ],
    tasks: [
      "Explain the likely causes of the turnover and the late orders.",
      "Recommend a plan that fits the 5 percent wage limit.",
      "Describe how Pinewood will measure whether the plan is working after six months.",
    ],
    indicators: [
      "Identify the root problem rather than only the symptoms",
      "Weigh pay against other ways to keep staff, such as scheduling and growth",
      "Give a realistic plan that respects the budget limit",
      "Explain how results will be measured",
    ],
  },
  {
    ...CASE,
    id: "fbla-case-entrepreneurship",
    slug: "entrepreneurship",
    format: "Entrepreneurship case study",
    you: "Advisers to a young founder (team of one to three)",
    judge: "Founder of Tidewater Bikes and a local small-business mentor",
    business: "Tidewater Bikes, a fictional start-up that rents and repairs bicycles in a small beach town.",
    situation: [
      "Tidewater makes most of its money from June to August and almost nothing from November to March.",
      "The founder has $9,000 in savings and a chance to open a second counter at a campground 20 miles away.",
      "A friend has suggested offering electric bike tours instead, which would need about $6,000 of equipment.",
    ],
    tasks: [
      "Compare the campground counter and the electric tour idea.",
      "Recommend one choice and explain the risks.",
      "Explain how the founder can smooth out the slow winter months.",
    ],
    indicators: [
      "Compare options using costs, demand and risk",
      "Recognize the effect of seasonal cash flow",
      "Recommend a clear, realistic next step",
      "Show an understanding of what a new business needs to survive",
    ],
  },
  {
    ...CASE,
    id: "fbla-case-hospitality",
    slug: "hospitality-event-management",
    format: "Hospitality & Event Management case study",
    you: "Event consultants (team of one to three)",
    judge: "General manager of Cedar Hollow Lodge",
    business: "Cedar Hollow Lodge, a fictional 60-room lodge with a ballroom that hosts weddings and company retreats.",
    situation: [
      "The ballroom is booked on most Saturdays but empty on weekdays, and weekday bookings have fallen for two years.",
      "Guest surveys praise the food but say check-in is slow and the Wi-Fi in the meeting rooms is unreliable.",
      "The lodge can spend up to $12,000 and wants more midweek business events within one year.",
    ],
    tasks: [
      "Explain why midweek business events are hard to win today.",
      "Recommend how to spend the $12,000.",
      "Describe how the lodge will promote the new weekday offer and track results.",
    ],
    indicators: [
      "Use guest feedback to find service gaps",
      "Match spending to what business planners actually need",
      "Describe a clear promotion plan for the target group",
      "Explain how success will be measured",
    ],
  },
  {
    ...CASE,
    id: "fbla-case-international",
    slug: "international-business",
    format: "International Business case study",
    you: "Market-entry consultants (team of one to three)",
    judge: "Export director of Alder & Finch Housewares",
    business: "Alder & Finch Housewares, a fictional U.S. maker of kitchen tools that wants to sell in two new countries.",
    situation: [
      "The firm is choosing between Country A, a large market with high import tariffs and strong local rivals, and Country B, a smaller market with low tariffs and growing demand.",
      "Shipping to A takes five weeks and to B takes two weeks. The firm's cash is limited and it has no local staff in either place.",
      "The director wants one recommendation and a first-year plan.",
    ],
    tasks: [
      "Compare the two countries on cost, risk and opportunity.",
      "Recommend an entry method, such as exporting through a distributor or opening a local office.",
      "Name two cultural or legal issues the firm must handle.",
    ],
    indicators: [
      "Compare markets using costs, tariffs and demand",
      "Choose an entry method that fits the firm's limited cash",
      "Show awareness of cultural and legal differences",
      "Give a clear, realistic first-year plan",
    ],
  },
  {
    ...CASE,
    id: "fbla-case-sports-entertainment",
    slug: "sports-entertainment-management",
    format: "Sports and Entertainment Management case study",
    you: "Management consultants (team of one to three)",
    judge: "Front-office team of the Riverbend Otters",
    business: "The Riverbend Otters, a fictional minor-league baseball team with a 6,000-seat ballpark.",
    situation: [
      "Average attendance is 2,300 and weekday games are often under 1,500. Concessions earn more per fan than tickets do.",
      "A local survey found families like the games but think parking and food lines are a hassle.",
      "The team has $20,000 for upgrades and wants to raise weekday attendance by 25 percent next season.",
    ],
    tasks: [
      "Explain why weekday attendance is low.",
      "Recommend how to use the $20,000 and any promotions.",
      "Explain how the team will measure the effect on attendance and revenue.",
    ],
    indicators: [
      "Use fan feedback to identify problems",
      "Link ticket, concession and promotion choices to the goal",
      "Keep the plan within the budget",
      "Explain how results will be measured",
    ],
  },
  {
    ...TALK,
    id: "fbla-talk-business-plan",
    slug: "business-plan",
    format: "Business Plan presentation practice",
    you: "Founders presenting a business plan",
    judge: "Panel of two local business owners",
    business: "Practice pitch: you choose a fictional start-up idea for your community and present its plan.",
    situation: [
      "Pick one realistic business, such as a mobile phone repair service for students or a meal-prep kitchen for busy families.",
      "In the planning time, outline the problem, the customer, how the business makes money, the first-year costs and the biggest risk.",
      "Judges will ask how you know people will buy and how you will pay for the first six months.",
    ],
    tasks: [
      "Pitch the idea, the customer and the revenue model.",
      "Show the start-up costs and when you expect to break even.",
      "Answer the question 'what could go wrong and what is your backup?'",
    ],
    indicators: [
      "A clear problem, customer and solution",
      "Realistic costs, pricing and break-even reasoning",
      "Evidence that people will buy",
      "A confident, organized delivery and good answers to questions",
    ],
  },
  {
    ...TALK,
    id: "fbla-talk-coding",
    slug: "coding-programming",
    format: "Coding & Programming presentation practice",
    you: "Developers presenting a program",
    judge: "Two technology professionals",
    business: "Practice presentation: you explain a small program you built, such as a quiz app, a budget tracker or a scheduling tool.",
    situation: [
      "In the planning time, decide what problem your program solves, who uses it and the three most important features.",
      "Prepare a short walkthrough of how it works, one design decision you are proud of and one bug you had to fix.",
      "Judges will ask how you tested it and how you would make it safer or easier to use.",
    ],
    tasks: [
      "Explain the problem and who the program helps.",
      "Walk through the main features and how the code is organized.",
      "Describe how you tested it and one improvement you would make next.",
    ],
    indicators: [
      "A clear problem and a program that solves it",
      "Understanding of how the code is structured",
      "Testing, debugging and security thinking",
      "A clear explanation for a non-technical judge",
    ],
  },
  {
    ...TALK,
    id: "fbla-talk-public-speaking",
    slug: "public-speaking",
    format: "Public Speaking practice",
    you: "A speaker giving a prepared talk",
    judge: "A panel of judges listening for ideas and delivery",
    business: "Practice talk: choose a business topic such as 'Why small businesses should care about cybersecurity' or 'How teens can start saving'.",
    situation: [
      "In the planning time, pick one clear message, three supporting points and one short story or example.",
      "Plan a strong opening line, a clear transition between points and a closing that asks the audience to think or act.",
      "Practice speaking slowly, using pauses and looking at your audience rather than at your notes.",
    ],
    tasks: [
      "Open with something that earns attention.",
      "Make three points that support one message.",
      "Close with a clear takeaway or call to action.",
    ],
    indicators: [
      "A clear message with relevant support",
      "Organized structure with smooth transitions",
      "Voice, pace, eye contact and body language",
      "A strong opening and closing",
    ],
  },
  {
    ...TALK,
    id: "fbla-talk-financial-statement-analysis",
    slug: "financial-statement-analysis",
    format: "Financial Statement Analysis presentation practice",
    you: "Analysts presenting to an investor",
    judge: "An investor deciding whether to lend to Birchwood Outfitters",
    business: "Birchwood Outfitters, a fictional outdoor-gear retailer. Figures are in thousands of dollars.",
    situation: [
      "Year 1: sales 4,000, cost of goods sold 2,600, operating expenses 1,000, net income 300. Current assets 900, current liabilities 600, total debt 1,500, equity 1,500.",
      "Year 2: sales 4,400, cost of goods sold 3,000, operating expenses 1,150, net income 200. Current assets 950, current liabilities 800, total debt 2,100, equity 1,550.",
      "The investor asks whether Birchwood is a safe borrower and what you would watch next year.",
    ],
    tasks: [
      "Calculate gross margin, net margin, the current ratio and debt to equity for both years.",
      "Explain what changed and why it matters to a lender.",
      "Recommend whether to lend and name the two things to watch.",
    ],
    indicators: [
      "Correct calculations of the key ratios",
      "Clear explanation of trends between the two years",
      "A reasoned lending recommendation",
      "Plain-language delivery to a non-accountant",
    ],
  },
];

export const EVENT_SCENARIOS: EventScenario[] = [
  ...FBLA_EVENT_SCENARIOS,
  { ...PMK, slug: "principles-of-marketing" },
  ...DECA_EVENT_SCENARIOS,
];

export const eventScenarioFor = (track: string, slug: string) => EVENT_SCENARIOS.find((s) => s.track === track && s.slug === slug);
