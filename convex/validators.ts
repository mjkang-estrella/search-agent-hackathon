// Convex validators that mirror lib/contracts.ts.
import { v, type Infer } from "convex/values";

export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 1536;

export const vScenarioId = v.union(v.literal("creative"), v.literal("firmware"), v.literal("civic"));
export const vMemberScenario = v.union(vScenarioId, v.literal("general"));

export const vConstraint = v.object({
  label: v.string(),
  value: v.union(v.string(), v.null()),
  hard: v.boolean(),
});

export const vIntentionField = v.union(
  v.literal("aim"),
  v.literal("blocker"),
  v.literal("contribution"),
  v.literal("timing"),
  v.literal("constraint"),
);

export const vEvidenceRef = v.object({
  quote: v.string(),
  field: vIntentionField,
  verified: v.boolean(), // the quote occurs in the memory source after whitespace normalization
});

export const vIntentionCard = v.object({
  title: v.string(),
  aim: v.string(),
  blocker: v.union(v.string(), v.null()),
  contributions: v.array(v.string()),
  timing: v.union(v.string(), v.null()),
  topics: v.array(v.string()),
  hardConstraints: v.array(vConstraint),
  softConstraints: v.array(vConstraint),
  privateConstraints: v.array(vConstraint),
});

export const vNetworkCard = v.object({
  title: v.string(),
  aim: v.string(),
  blocker: v.union(v.string(), v.null()),
  contributions: v.array(v.string()),
  timing: v.union(v.string(), v.null()),
  hardConstraints: v.array(vConstraint),
  softConstraints: v.array(vConstraint),
});

export const vIntentionStatus = v.union(
  v.literal("draft"),
  v.literal("approved"),
  v.literal("hidden"),
  v.literal("withdrawn"),
);

export const vAudience = v.union(v.literal("network"), v.literal("private"));

export const vRunStage = v.union(
  v.literal("created"),
  v.literal("solution_planning"),
  v.literal("discovery"),
  v.literal("compatibility_checks"),
  v.literal("followup_decision"),
  v.literal("evidence_verification"),
  v.literal("ranking"),
  v.literal("complete"),
);

export const vRunStatus = v.union(
  v.literal("running"),
  v.literal("succeeded"),
  v.literal("partial"),
  v.literal("failed"),
  v.literal("cancelled"),
);

export const vFollowUpStatus = v.union(
  v.literal("pending"),
  v.literal("skipped"),
  v.literal("running"),
  v.literal("succeeded"),
  v.literal("failed"),
);

export const vEventKind = v.union(
  v.literal("stage"),
  v.literal("telem_search"),
  v.literal("telem_fetch"),
  v.literal("model"),
  v.literal("retrieval"),
  v.literal("decision"),
  v.literal("guard"),
);

export const vEventStatus = v.union(
  v.literal("started"),
  v.literal("succeeded"),
  v.literal("partial"),
  v.literal("failed"),
  v.literal("skipped"),
  v.literal("info"),
);

export const vSearchRound = v.union(v.literal("initial"), v.literal("followup"));

export const vFetchOutcome = v.object({
  status: v.union(v.literal("succeeded"), v.literal("failed"), v.literal("not_fetched")),
  provider: v.union(v.string(), v.null()),
  cacheState: v.union(v.string(), v.null()),
  fetchedAt: v.union(v.string(), v.null()),
  contentLength: v.union(v.number(), v.null()),
  truncated: v.boolean(),
  latencyMs: v.union(v.number(), v.null()),
  error: v.union(v.string(), v.null()),
  providerChain: v.array(v.object({ provider: v.string(), status: v.string(), error: v.union(v.string(), v.null()) })),
});

export const vConditionStatus = v.union(
  v.literal("confirmed"), // quote found in fetched page
  v.literal("unverified"), // no quote, quote not found, or page not fetched
  v.literal("unknown"), // value is null
);

export const vCondition = v.object({
  label: v.string(),
  value: v.union(v.string(), v.null()),
  quote: v.union(v.string(), v.null()),
  hard: v.boolean(),
  status: vConditionStatus,
});

export const vConstraintResult = v.object({
  constraint: v.string(),
  result: v.union(v.literal("meets"), v.literal("conflicts"), v.literal("unknown")),
  evidence: v.string(),
});

export const vFitCategory = v.union(v.literal("strong_fit"), v.literal("possible_fit"), v.literal("not_a_fit"));
export const vOptionKind = v.union(v.literal("public"), v.literal("member"), v.literal("combined"));
export const vCounterpartOutcome = v.union(
  v.literal("compatible"),
  v.literal("needs_input"),
  v.literal("decline"),
);

export const vOrigin = v.union(
  v.literal("llm_inference"),
  v.literal("public_evidence"),
  v.literal("member_intention"),
);

export const vIntroState = v.union(
  v.literal("drafted"),
  v.literal("requester_approved"),
  v.literal("counterpart_checked"),
  v.literal("pending_acceptance"),
  v.literal("accepted"),
  v.literal("declined"),
);

export const vSharedFields = v.object({
  aim: v.boolean(),
  blocker: v.boolean(),
  contributions: v.boolean(),
  timing: v.boolean(),
  constraints: v.boolean(),
});

export type IntentionCardV = Infer<typeof vIntentionCard>;
export type ConditionV = Infer<typeof vCondition>;
export type FetchOutcomeV = Infer<typeof vFetchOutcome>;
export type SharedFields = Infer<typeof vSharedFields>;
