// Shared application types and structured-output schemas.
// Convex validators live in convex/validators.ts and mirror these shapes.
import { z } from "zod";

export const SCENARIO_IDS = ["creative", "firmware", "civic"] as const;
export type ScenarioId = (typeof SCENARIO_IDS)[number];

export const PROMPT_VERSION = "2026-11-14.2";

export type Audience = "network" | "private";
export type IntentionStatus = "draft" | "approved" | "hidden" | "withdrawn";

export type Constraint = {
  label: string; // "Evening availability"
  value: string | null; // "Weeknights after 7pm"; null when unknown
  hard: boolean;
};

export type EvidenceRef = {
  quote: string; // must occur in the referenced memory source after whitespace normalization
  field: IntentionField;
};

export type IntentionField = "aim" | "blocker" | "contribution" | "timing" | "constraint";

/** The full private intention. Never sent to Telem or to another member's check. */
export type IntentionCard = {
  title: string;
  aim: string;
  blocker: string | null;
  contributions: string[];
  timing: string | null;
  topics: string[]; // topic words that may go into public queries once approved
  hardConstraints: Constraint[];
  softConstraints: Constraint[];
  privateConstraints: Constraint[]; // used only in this person's own checks
};

/** Fields another member's agent may see after network approval. */
export type NetworkCard = {
  title: string;
  aim: string;
  blocker: string | null;
  contributions: string[];
  timing: string | null;
  hardConstraints: Constraint[];
  softConstraints: Constraint[];
};

export function toNetworkCard(card: IntentionCard): NetworkCard {
  return {
    title: card.title,
    aim: card.aim,
    blocker: card.blocker,
    contributions: card.contributions,
    timing: card.timing,
    hardConstraints: card.hardConstraints,
    softConstraints: card.softConstraints,
  };
}

export type SharedFields = { aim: boolean; blocker: boolean; contributions: boolean; timing: boolean; constraints: boolean };

/** Project the requester's card to exactly the fields they chose to share in an introduction. */
export function sharedProjection(card: IntentionCard, fields: SharedFields): NetworkCard {
  return {
    title: card.title,
    aim: fields.aim ? card.aim : "(not shared)",
    blocker: fields.blocker ? card.blocker : null,
    contributions: fields.contributions ? card.contributions : [],
    timing: fields.timing ? card.timing : null,
    hardConstraints: fields.constraints ? card.hardConstraints : [],
    softConstraints: fields.constraints ? card.softConstraints : [],
  };
}

/** The only content allowed to leave the application in a Telem query. */
export type ExternalBrief = {
  sharedTopics: string[];
  initialQueries: string[];
  allowExpansion: boolean; // later queries may combine sharedTopics, never other fields
  blockedTerms: string[];
};

export type RunMode = "live" | "replay";
export type RunStage =
  | "created"
  | "solution_planning"
  | "discovery"
  | "compatibility_checks"
  | "followup_decision"
  | "evidence_verification"
  | "ranking"
  | "complete";
export const RUN_STAGES: RunStage[] = [
  "created",
  "solution_planning",
  "discovery",
  "compatibility_checks",
  "followup_decision",
  "evidence_verification",
  "ranking",
  "complete",
];
/** Discovery runs public search and member retrieval as separate concurrent branches. */
export type DiscoveryBranch = "public" | "members";
export type FollowUpStatus = "pending" | "skipped" | "running" | "succeeded" | "failed";
/** Where a claim came from. The interface shows these separately. */
export type Origin = "llm_inference" | "public_evidence" | "member_intention";
export type RunStatus = "running" | "succeeded" | "partial" | "failed" | "cancelled";

export type FitCategory = "strong_fit" | "possible_fit" | "not_a_fit";
export type ConstraintResult = "meets" | "conflicts" | "unknown";
export type OptionKind = "public" | "member" | "combined";
export type CounterpartOutcome = "compatible" | "needs_input" | "decline";

export type IntroductionState =
  | "drafted"
  | "requester_approved"
  | "counterpart_checked"
  | "pending_acceptance"
  | "accepted"
  | "declined";

/** Synthetic member intention used by fixtures. */
export type FixtureMember = {
  key: string; // stable id, e.g. "theo-composer"
  displayName: string; // always rendered with a "Synthetic" label
  scenarioId: ScenarioId | "general";
  contact: string; // synthetic contact, revealed only after mutual acceptance
  profile: string; // whole-profile text for the profile-embedding baseline
  intention: IntentionCard;
  shareableWithRequesters: string[]; // details this member allows a counterpart check to share
  notes: string; // why this member exists in the dataset (fixture documentation)
};

export type FixtureScenario = {
  id: ScenarioId;
  label: string;
  requesterName: string;
  context: string; // selected text that a requester pastes
};

export type EvalCase = {
  id: string;
  scenarioId: ScenarioId | "general"; // "general" = newly typed intention with no scenario template
  description: string;
  requester: IntentionCard; // an approved requester intention
  relevantMemberKeys: string[]; // useful members (empty for a no-match case)
  hardConflictMemberKeys: string[]; // must never appear in recommendations
  misleadingMemberKeys: string[]; // interest overlap but no relevant intention
  followUp: "expected" | "skip" | "either"; // whether a follow-up public search is justified
};

// ---------- Structured model outputs ----------

const zConstraint = z.object({
  label: z.string(),
  value: z.string().nullable(),
  hard: z.boolean(),
});

export const zIntentionDraft = z.object({
  kind: z.enum(["need", "offer"]).describe("need: something they want. offer: something they could give others"),
  inferred: z
    .boolean()
    .describe("True when the memory states no goal and you inferred this from an interest, skill, habit, or spare resource"),
  title: z.string().describe("Short title for the intention"),
  aim: z.string(),
  blocker: z.string().nullable(),
  contributions: z.array(z.string()),
  timing: z.string().nullable(),
  topics: z
    .array(z.string())
    .describe("Generic topic phrases with no names, places smaller than a city, or contact details"),
  hardConstraints: z.array(zConstraint),
  softConstraints: z.array(zConstraint),
  privateConstraints: z.array(zConstraint),
  evidence: z.array(
    z.object({
      quote: z.string().describe("Exact text copied from the selected context"),
      field: z.enum(["aim", "blocker", "contribution", "timing", "constraint"]),
    }),
  ),
  questions: z
    .array(z.string())
    .max(2)
    .describe("At most two questions about missing facts that change discovery"),
  blockedTerms: z
    .array(z.string())
    .describe("Names, contact details, and private terms that must not appear in public queries"),
});
export type IntentionDraft = z.infer<typeof zIntentionDraft>;

/** One memory can hold several intentions. */
export const zExtraction = z.object({
  memoryTitle: z.string().describe("A plain title for this memory, 2 to 4 words"),
  intentions: z.array(zIntentionDraft).min(1).max(3).describe("Distinct things the person is trying to do. Usually one or two"),
});
export type Extraction = z.infer<typeof zExtraction>;

export const zSolutionPlan = z.object({
  hypotheses: z
    .array(
      z.object({
        solution: z.string().describe("A way the intention could be fulfilled"),
        path: z.enum(["public_resource", "member_connection", "either"]),
        rationale: z.string(),
      }),
    )
    .min(2)
    .max(5),
  capabilities: z
    .array(
      z.object({
        capability: z.string().describe("Counterpart role or capability, e.g. 'composer seeking lyrics'"),
        rationale: z.string(),
        memberQuery: z.string().describe("Text to retrieve member intentions that offer or need this"),
      }),
    )
    .min(1)
    .max(4),
  publicQueries: z
    .array(z.string())
    .min(3)
    .max(6)
    .describe("Web queries built only from the approved topics. No names, addresses, or private details"),
  peopleQueries: z
    .array(z.string())
    .max(2)
    .describe(
      "Social media searches for posts by people who have the experience the person needs, written the way such a person would post. E.g. 'just got back from my first trip to Seoul vegetarian'. Empty when people's posts would not help",
    ),
});
export type SolutionPlan = z.infer<typeof zSolutionPlan>;

export const zRequesterChecks = z.object({
  checks: z.array(
    z.object({
      candidateId: z.string(),
      relevant: z.boolean().describe("False when interests overlap but no intention fits"),
      reasons: z.array(z.string()),
      constraintResults: z.array(
        z.object({
          constraint: z.string(),
          result: z.enum(["meets", "conflicts", "unknown"]),
          note: z.string(),
        }),
      ),
    }),
  ),
});

export const zCounterpartCheck = z.object({
  outcome: z.enum(["compatible", "needs_input", "decline"]),
  reasonForMember: z.string().describe("Private explanation for the member. Never shared."),
  sharedNote: z
    .string()
    .describe("What the requester may learn. Use only details the member permits sharing."),
  questions: z.array(z.string()).max(3),
});

export const zFollowUpDecision = z.object({
  decision: z.enum(["run", "skip"]),
  reason: z.string(),
  question: z
    .string()
    .nullable()
    .describe("The specific unresolved question public evidence could answer. Null when skipping"),
  affects: z
    .string()
    .nullable()
    .describe("Which recommendation the answer could change, and how. Null when skipping"),
  queries: z.array(z.string()).max(4).describe("Empty when skipping. Approved topics only"),
});

export const zSourceFacts = z.object({
  pages: z.array(
    z.object({
      url: z.string(),
      title: z.string(),
      isOpportunity: z.boolean().describe("A workshop, listing, request, issue, or group someone can act on"),
      participationRoute: z.string().nullable().describe("How to take part, as published. Null if absent"),
      conditions: z.array(
        z.object({
          label: z.string().describe("e.g. 'Schedule', 'Cost', 'Format', 'Eligibility'"),
          value: z.string().nullable(),
          quote: z.string().nullable().describe("Exact text from the page that states the value"),
          hard: z.boolean(),
        }),
      ),
    }),
  ),
  revealedCapabilities: z
    .array(
      z.object({
        capability: z.string(),
        reason: z.string().describe("Which source showed this capability and why it matters"),
        sourceUrl: z.string(),
        memberQuery: z.string(),
      }),
    )
    .max(2)
    .describe("Only capabilities the plan missed that a source clearly shows. Usually empty"),
});

export const zRanking = z.object({
  options: z.array(
    z.object({
      kind: z.enum(["public", "member", "combined"]),
      title: z.string().describe("At most 6 words, starting with a verb, e.g. 'Co-write with Theo'"),
      why: z.string().describe("One sentence, at most 30 words. Explain how this option addresses the requester intention using a specific capability or source detail. Avoid generic claims of a good fit."),
      summary: z.string(),
      candidateId: z.string().nullable().describe("Candidate alias such as c1, or null"),
      opportunityId: z.string().nullable().describe("Opportunity alias such as o1, or null"),
      fitCategory: z.enum(["strong_fit", "possible_fit", "not_a_fit"]),
      constraintResults: z.array(
        z.object({
          constraint: z.string(),
          result: z.enum(["meets", "conflicts", "unknown"]),
          evidence: z.string(),
        }),
      ),
      questions: z.array(z.string()),
      nextStep: z.string(),
    }),
  ),
});

export const zIntroDraft = z.object({ message: z.string() });

export const zPeoplePick = z.object({
  picks: z
    .array(z.object({
      index: z.number().int(),
      reason: z.string().describe("One sentence, at most 30 words. Connect a specific detail from this post to the requester intention. Do not claim availability or willingness to help."),
      about: z.string().nullable().describe("At most 16 words about the author's relevant experience, supported by the post. Null if unknown. Do not invent a job title or biography."),
      evidenceQuote: z.string().describe("An exact short excerpt from the supplied post that supports both the description and match reason."),
    }))
    .max(6)
    .describe("Posts whose author clearly has the experience the person needs. Skip brands, ads, and off-topic posts"),
});
