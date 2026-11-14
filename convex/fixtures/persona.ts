// Demo personas: sample memories that personal agents saved to Wayfinder's memory MCP.
// They span personal, work, community, and passive memories (an interest with no stated goal).
// Everything here is synthetic and labeled as a sample in the app.
import type { Constraint, FixtureMember } from "../../lib/contracts";
import { SCENARIOS } from "./data";

export type AgentName = "Dot" | "Grok" | "Muse";
export type Category = "Personal" | "Creative" | "Work" | "Community" | "Learning" | "Health" | "Travel" | "Just a passing remark";

type PersonaMemory = { source: AgentName; category: Category; text: string; scenarioId: "creative" | "firmware" | "civic" | null };
export type Persona = { id: string; name: string; tagline: string; featured?: boolean; memories: PersonaMemory[] };

/** The single demo person. Her first three memories lead the demo; the rest show the range of intentions. */
export const DEMO_PERSONA: Persona = {
  id: "dana",
  name: "Dana",
  tagline: "Poems, a Seoul trip, and a dozen other things on her mind",
    memories: [
      { source: "Dot", category: "Creative", scenarioId: "creative", text: SCENARIOS.find((s) => s.id === "creative")!.context },
      {
        source: "Grok",
        category: "Personal",
        scenarioId: null,
        text: `Things I told Grok while planning my trip:
- I'm going to Seoul for the first time in April, for about ten days.
- I'm vegetarian and nervous about ordering food. I'd love to hear from someone who just traveled to Korea, especially about vegetarian food and getting around the subway.
- I'm learning a little Korean on an app, but I freeze when I have to speak. I want to practice real conversation before I go.
- I can't pay for a tutor. Free language exchange is ideal. Evenings after 7pm work for calls.`,
      },
      {
        source: "Muse",
        category: "Personal",
        scenarioId: null,
        text: `Notes from Muse:
- I've sketched a small bench and keep wondering if I could actually build it.
- I don't own any tools and have never used a table saw.
- I'd like a workshop or makerspace where someone can show me the basics, or a woodworker who wants a beginner to help out.
- I'm in Oakland and prefer weeknights. Budget is small, under $60 a month.`,
      },
      {
        source: "Grok",
        category: "Just a passing remark",
        scenarioId: null,
        text: `From a chat with Grok on Saturday:
- Honestly I like washing cars. It's relaxing, I put on a podcast and lose an hour.
- I washed my neighbor's SUV last week just for fun and she was thrilled.
- I'm free most weekend mornings.`,
      },
      {
        source: "Dot",
        category: "Just a passing remark",
        scenarioId: null,
        text: `Mentioned to Dot:
- My 3D printer has been sitting idle since I printed a phone stand. I barely use it.
- I can model simple parts.
- Either it should be useful to someone, or maybe I should just sell it.`,
      },
      {
        source: "Muse",
        category: "Just a passing remark",
        scenarioId: null,
        text: `Muse journal:
- My sourdough starter is eight years old and has never died, even when I forgot it for weeks.
- I bake every Sunday and always throw away extra starter.`,
      },
      {
        source: "Grok",
        category: "Just a passing remark",
        scenarioId: null,
        text: `Told Grok:
- I finished scanning 200 letters my great-grandparents wrote while homesteading in the 1910s.
- They describe the town, prices, school, and a flu outbreak.
- I wonder who besides my family would find them interesting.`,
      },
      {
        source: "Dot",
        category: "Work",
        scenarioId: null,
        text: `Work notes with Dot:
- When I go back to the clinic in January, I'll lead the front desk team. Five people, and I've never managed anyone.
- I'm worried about one-on-ones and giving hard feedback.
- I'd love to talk with someone who became a manager in the last year or two, not a coach selling a course.`,
      },
      {
        source: "Muse",
        category: "Creative",
        scenarioId: null,
        text: `Side project notes:
- I'm printing a small chapbook of my poems to sell at the Saturday farmers market.
- I need a simple cover and a little banner for the table.
- Budget is tight, maybe $100.`,
      },
      {
        source: "Dot",
        category: "Community",
        scenarioId: null,
        text: `Notes with Dot:
- I walk my niece to Hillcrest Elementary, and the crossing at Alder St and 14th Ave is scary. Cars don't slow down.
- I want a marked crosswalk there and would like to team up with other neighbors who care about the same corner.
- Weekends work for meetings.`,
      },
      {
        source: "Grok",
        category: "Community",
        scenarioId: null,
        text: `Notes from Grok:
- Our branch library asked if anyone could help start a teen coding club.
- I can organize and bring snacks, but I can't teach programming.
- We need one or two volunteers who can teach basic game making on Tuesday afternoons.`,
      },
      {
        source: "Muse",
        category: "Health",
        scenarioId: null,
        text: `Muse journal:
- I want to start running, but running clubs look intimidating. Everyone seems fast.
- I can barely run 10 minutes without stopping.
- I'd love a buddy at the same level for slow runs, early mornings, around Lake Merritt.`,
      },
    ],
};

const hard = (label: string, value: string | null): Constraint => ({ label, value, hard: true });
const soft = (label: string, value: string | null): Constraint => ({ label, value, hard: false });

/** Bump when DEMO_PERSONA changes, so the saved demo results are rebuilt. */
export const DEMO_VERSION = "dana-2026-11-14.5";

/** Sample members added for the wider demo: people who need what passive offers can give. */
export const EXTRA_MEMBERS: FixtureMember[] = [
  {
    key: "leo-printer-buyer",
    displayName: "Leo M.",
    scenarioId: "general",
    contact: "leo.m@synthetic.example",
    profile: "Middle school science teacher in Oakland who coaches a robotics club.",
    intention: {
      title: "Buy a used 3D printer for my robotics club",
      aim: "Buy a working used 3D printer so my students can print robot parts.",
      blocker: "New printers are over our budget.",
      contributions: ["Up to $200", "Pickup anywhere in the East Bay"],
      timing: "Before the spring competition in March",
      topics: ["used 3D printer", "school robotics club"],
      hardConstraints: [hard("Budget", "Up to $200"), hard("Location", "East Bay pickup")],
      softConstraints: [soft("Model", "Any common hobby printer")],
      privateConstraints: [],
    },
    shareableWithRequesters: ["Budget up to $200", "East Bay pickup", "For a school robotics club"],
    notes: "relevant match for selling an idle 3D printer",
  },
  {
    key: "mira-car-wash",
    displayName: "Mira K.",
    scenarioId: "general",
    contact: "mira.k@synthetic.example",
    profile: "ER nurse in Oakland who works long weekend shifts and bakes on her days off.",
    intention: {
      title: "Get my car washed while I'm on shift",
      aim: "Have someone wash my car at home twice a month while I work weekend shifts.",
      blocker: "I never have time to wash it and car washes near me are always backed up.",
      contributions: ["$25 per wash", "Fresh bread from my baking days"],
      timing: "Saturday or Sunday mornings, starting this month",
      topics: ["car washing help", "paid household help"],
      hardConstraints: [hard("Location", "Oakland, at my home"), hard("Pay", "Up to $25 per wash")],
      softConstraints: [soft("Products", "Eco-friendly soap if possible")],
      privateConstraints: [],
    },
    shareableWithRequesters: ["Pays $25 per wash", "Weekend mornings", "Oakland"],
    notes: "relevant match for a car-washing offer: wants to delegate with a reward",
  },
  {
    key: "greg-car-help",
    displayName: "Greg A.",
    scenarioId: "general",
    contact: "greg.a@synthetic.example",
    profile: "Retired machinist in Oakland with a bad shoulder and a 20-year-old sedan he loves.",
    intention: {
      title: "Find help washing my car",
      aim: "Find a neighbor who could wash my car now and then, since my shoulder can't take it.",
      blocker: "I can't scrub or reach the roof anymore.",
      contributions: ["Happy to pay", "Can teach basic car maintenance"],
      timing: "Weekends, flexible",
      topics: ["car washing help", "helping older neighbors"],
      hardConstraints: [hard("Location", "Oakland")],
      softConstraints: [soft("Who", "Prefers a neighbor over a business")],
      privateConstraints: [],
    },
    shareableWithRequesters: ["Will pay", "Can teach car maintenance", "Weekends"],
    notes: "relevant match for a car-washing offer: wants to delegate, offers pay or skills",
  },
  {
    key: "ken-detailing",
    displayName: "Ken D.",
    scenarioId: "general",
    contact: "ken.d@synthetic.example",
    profile: "Owns a mobile car detailing business and loves cars.",
    intention: {
      title: "Find new detailing customers",
      aim: "Grow my mobile detailing business with recurring customers.",
      blocker: "Need more clients on weekdays.",
      contributions: ["Professional detailing at $120 per car"],
      timing: "Weekdays",
      topics: ["car detailing business"],
      hardConstraints: [hard("Service", "Paid detailing only")],
      softConstraints: [],
      privateConstraints: [],
    },
    shareableWithRequesters: ["Professional detailing"],
    notes: "misleading: car interest but a competing seller, not someone who wants to delegate",
  },
  {
    key: "tom-korean-learner",
    displayName: "Tom R.",
    scenarioId: "general",
    contact: "tom.r@synthetic.example",
    profile: "Software tester learning Korean before moving to Seoul for work next year.",
    intention: {
      title: "Practice Korean with a native speaker",
      aim: "Have regular conversations with a fluent Korean speaker before my move to Seoul.",
      blocker: "Apps don't prepare me for real conversation.",
      contributions: ["$15 per hour or coffee", "Help with resumes and tech interviews"],
      timing: "Weeknight evenings, once a week",
      topics: ["Korean conversation practice", "language exchange"],
      hardConstraints: [hard("Format", "Video call or in person in the East Bay")],
      softConstraints: [],
      privateConstraints: [],
    },
    shareableWithRequesters: ["Pays $15 an hour or coffee", "Can help with tech interviews", "Weeknights"],
    notes: "relevant match for a native Korean speaker offering conversation",
  },
  {
    key: "ivy-design-student",
    displayName: "Ivy P.",
    scenarioId: "general",
    contact: "ivy.p@synthetic.example",
    profile: "Graphic design student who wants real clients for her portfolio.",
    intention: {
      title: "Design for a real small business",
      aim: "Make a logo and signage for a real small business to build my portfolio.",
      blocker: "Class projects don't impress clients.",
      contributions: ["Logo and banner design", "Low cost, around $100"],
      timing: "This spring",
      topics: ["portfolio design projects", "small business branding"],
      hardConstraints: [hard("Credit", "Must be able to show the work in my portfolio")],
      softConstraints: [soft("Payment", "Food or small fee is fine")],
      privateConstraints: [],
    },
    shareableWithRequesters: ["Designs logos and banners", "About $100", "Needs portfolio credit"],
    notes: "relevant match for a small business that needs a logo on a budget",
  },
];
