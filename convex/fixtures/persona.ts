// Demo personas: sample memories that personal agents saved to Relay's memory MCP.
// They span personal, work, community, and passive memories (an interest with no stated goal).
// Everything here is synthetic and labeled as a sample in the app.
import type { Constraint, FixtureMember } from "../../lib/contracts";

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
      {
        source: "Dot",
        category: "Creative",
        scenarioId: "creative",
        text: `I read "Salt Year" aloud again last night and caught myself humming between the lines. I've been writing poems for six years, but this one keeps sounding like it could be a song. I can't read music or play an instrument, so the tune never gets very far.

At an open mic in Oakland last week, I kept imagining what it would feel like to perform something I'd helped make. Paying someone to write it would feel different from making it together. I have about $40 a month for this, and weeknights after 7pm are usually free. Weekends are mostly taken. Oakland or a video call works for me, but trips across the bay are too much right now.`,
      },
      {
        source: "Grok",
        category: "Personal",
        scenarioId: null,
        text: `My first trip to Seoul is booked for April, about ten days. I spent last night saving restaurants, then realized I couldn't tell which dishes were vegetarian. The subway map is still open in another tab.

I've kept up my Korean app lessons, but when I tried saying a simple order out loud, my mind went blank. Reading the answer is much easier than saying it. There's no room in my trip budget for tutoring. Most evenings I'm home after 7pm.`,
      },
      {
        source: "Muse",
        category: "Personal",
        scenarioId: null,
        text: `I sketched a small bench over the weekend and spent an hour watching people build one. The sketch is still on my kitchen table. I keep looking at it and wondering whether I could make the real thing.

I've never used a table saw and don't own any tools. That stopped me before I even bought wood. I'm in Oakland, with time on weeknights and less than $60 a month to spend on a new hobby.`,
      },
      {
        source: "Grok",
        category: "Just a passing remark",
        scenarioId: null,
        text: `I washed my neighbor's SUV on Saturday just because I felt like it. Put on a podcast, got through the whole episode, and didn't think about anything else. She was thrilled when she saw it.

I forget how much I like doing this. Most weekend mornings are free anyway.`,
      },
      {
        source: "Dot",
        category: "Just a passing remark",
        scenarioId: null,
        text: `I cleared some space on my desk and realized the 3D printer hasn't run since I made that phone stand. I used to enjoy modeling simple parts, but I haven't had a reason to open the software lately.

It still works. It feels silly having it sit there collecting dust, though I haven't quite brought myself to sell it.`,
      },
      {
        source: "Muse",
        category: "Just a passing remark",
        scenarioId: null,
        text: `Sunday baking again. My sourdough starter is eight years old now and somehow survives even when I forget it for weeks.

The bread came out well, but I threw away another jar's worth of extra starter. That happens almost every week.`,
      },
      {
        source: "Grok",
        category: "Just a passing remark",
        scenarioId: null,
        text: `Finished scanning the last of my great-grandparents' letters today. Two hundred of them, all from when they were homesteading in the 1910s.

I expected family stories, but there are pages about grocery prices, the town school, and a flu outbreak. I lost an hour reading one instead of naming the files. It seems a shame if the scans just stay in our family folder.`,
      },
      {
        source: "Dot",
        category: "Work",
        scenarioId: null,
        text: `The clinic confirmed that I'll lead the front desk team when I go back in January. Five people. I've worked alongside them, but I've never been anyone's manager.

I started drafting a one-on-one agenda and got stuck on how I'd bring up something difficult without making it awkward. The management advice I found was mostly ads for coaching courses. I kept wondering what someone's first year actually felt like.`,
      },
      {
        source: "Muse",
        category: "Creative",
        scenarioId: null,
        text: `I printed a test copy of my poetry chapbook for the Saturday farmers market. Seeing the pages folded together made it feel real.

The cover is still just the title in a default font. I tried laying out a little banner for the table too, but couldn't get either to look right. After printing costs, I have about $100 left for both.`,
      },
      {
        source: "Dot",
        category: "Community",
        scenarioId: null,
        text: `Another car came through Alder St and 14th Ave without slowing down while I was walking my niece to Hillcrest Elementary. We waited at the corner for ages. There isn't a marked crosswalk.

I keep thinking about it after we get to school. I see other families waiting there too, but we usually just exchange a look and hurry on. Weekends are when I'd have time to do something about it.`,
      },
      {
        source: "Grok",
        category: "Community",
        scenarioId: null,
        text: `I stayed after the event at our branch library to talk about their idea for a teen coding club. Tuesday afternoons are the open slot, and the teens apparently keep asking about making games.

I said I could handle the schedule, setup, and snacks. Then we got to who would actually teach, and neither of us had an answer. I don't know how to program. Even one or two people who could show the basics would make a difference.`,
      },
      {
        source: "Muse",
        category: "Health",
        scenarioId: null,
        text: `Tried running around Lake Merritt early this morning. I made it about ten minutes before I had to walk, then watched a running club go past at a pace I couldn't keep up with.

I liked being out that early. Going alone made it easy to turn back, though, and joining that group felt like too much. I'd feel less self-conscious if someone else needed the walking breaks too.`,
      },
    ],
};

const hard = (label: string, value: string | null): Constraint => ({ label, value, hard: true });
const soft = (label: string, value: string | null): Constraint => ({ label, value, hard: false });

/** Bump when DEMO_PERSONA changes, so the saved demo results are rebuilt. */
export const DEMO_VERSION = "dana-2026-11-14.6";

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
