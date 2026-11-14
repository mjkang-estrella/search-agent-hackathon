import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  EMBEDDING_DIMENSIONS,
  vAudience,
  vCondition,
  vConstraintResult,
  vCounterpartOutcome,
  vEventKind,
  vEventStatus,
  vEvidenceRef,
  vFetchOutcome,
  vFitCategory,
  vFollowUpStatus,
  vIntentionCard,
  vIntentionStatus,
  vIntroState,
  vMemberScenario,
  vNetworkCard,
  vOptionKind,
  vOrigin,
  vRunStage,
  vRunStatus,
  vScenarioId,
  vSearchRound,
  vSharedFields,
} from "./validators";

export default defineSchema({
  // People who signed in with Google. Each has one memory MCP key.
  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    image: v.optional(v.string()),
    mcpKey: v.optional(v.string()), // secret in this user's memory MCP URL
  }).index("by_mcp_key", ["mcpKey"]),

  // A board. A guest opens it by its id, kept in localStorage. A signed-in user's board opens only for them.
  demoSessions: defineTable({
    createdAt: v.number(),
    userId: v.optional(v.id("users")),
    mcpKey: v.optional(v.string()), // legacy per-board MCP key from before sign-in
    persona: v.optional(v.string()), // set when the demo persona was loaded
  })
    .index("by_mcp_key", ["mcpKey"])
    .index("by_user", ["userId"]),

  // A hidden session that holds one complete live run of the demo persona.
  // "Start with demo persona" copies it, so the demo does not search again every time.
  demoTemplates: defineTable({
    version: v.string(),
    sessionId: v.id("demoSessions"),
    status: v.union(v.literal("building"), v.literal("ready")),
    createdAt: v.number(),
  }).index("by_version", ["version"]),

  // Synthetic participants. Every UI surface labels them as synthetic.
  members: defineTable({
    key: v.string(),
    displayName: v.string(),
    scenarioId: vMemberScenario,
    contact: v.string(), // synthetic, revealed only after mutual acceptance
    profile: v.string(),
    shareableWithRequesters: v.array(v.string()),
    notes: v.string(),
    datasetVersion: v.string(),
  }).index("by_key", ["key"]),

  // Selected context a requester pasted. Private to the owner's extraction step.
  memorySources: defineTable({
    sessionId: v.id("demoSessions"),
    scenarioId: v.union(vScenarioId, v.null()),
    title: v.optional(v.string()),
    source: v.optional(v.string()), // the agent that saved it through the memory MCP, e.g. "Grok"
    category: v.optional(v.string()), // demo label such as "Work" or "Just a passing remark"
    sample: v.optional(v.boolean()), // demo persona memory
    text: v.string(),
    createdAt: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_session_created_at", ["sessionId", "createdAt"])
    .searchIndex("search_text", { searchField: "text", filterFields: ["sessionId"] }),

  intentions: defineTable({
    owner: v.union(
      v.object({ kind: v.literal("requester"), sessionId: v.id("demoSessions") }),
      v.object({ kind: v.literal("member"), memberId: v.id("members") }),
    ),
    memorySourceId: v.union(v.id("memorySources"), v.null()),
    scenarioId: v.union(vMemberScenario, v.null()),
    status: vIntentionStatus,
    audience: vAudience,
    revision: v.number(),
    card: vIntentionCard,
    evidence: v.array(vEvidenceRef),
    questions: v.array(v.string()),
    blockedTerms: v.array(v.string()),
    kind: v.optional(v.union(v.literal("need"), v.literal("offer"))),
    inferred: v.optional(v.boolean()), // proposed from a passing remark rather than a stated goal
    // Automatic discovery: planning happens before the first run exists.
    auto: v.optional(v.object({ state: v.union(v.literal("planning"), v.literal("started"), v.literal("failed")), error: v.union(v.string(), v.null()) })),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_member", ["owner.memberId"])
    .index("by_memory", ["memorySourceId"])
    .index("by_session", ["owner.sessionId"]),

  // Retrieval facets. searchKey = "<on|off>:<field>" because vector filters cannot AND fields.
  facets: defineTable({
    intentionId: v.id("intentions"),
    memberId: v.id("members"),
    field: v.union(
      v.literal("aim"),
      v.literal("blocker"),
      v.literal("contribution"),
      v.literal("profile"),
      v.literal("intention_text"),
    ),
    searchKey: v.string(),
    text: v.string(),
    embedding: v.optional(v.array(v.float64())),
    revision: v.number(),
  })
    .index("by_intention", ["intentionId"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: EMBEDDING_DIMENSIONS,
      filterFields: ["searchKey"],
    })
    .searchIndex("by_text", { searchField: "text", filterFields: ["searchKey"] }),

  // LLM solution plan for one intention revision. Proposed before the brief is approved
  // so the user approves the exact public queries.
  solutionPlans: defineTable({
    intentionId: v.id("intentions"),
    revision: v.number(),
    hypotheses: v.array(
      v.object({
        solution: v.string(),
        path: v.union(v.literal("public_resource"), v.literal("member_connection"), v.literal("either")),
        rationale: v.string(),
      }),
    ),
    capabilities: v.array(v.object({ capability: v.string(), rationale: v.string(), memberQuery: v.string() })),
    proposedQueries: v.array(v.string()),
    peopleQueries: v.optional(v.array(v.string())),
    rejectedQueries: v.array(v.object({ query: v.string(), reason: v.string() })),
    model: v.string(),
    promptVersion: v.string(),
    threadId: v.string(),
    createdAt: v.number(),
  }).index("by_intention_revision", ["intentionId", "revision"]),

  searchBriefs: defineTable({
    intentionId: v.id("intentions"),
    revision: v.number(),
    planId: v.id("solutionPlans"),
    sharedTopics: v.array(v.string()),
    initialQueries: v.array(v.string()),
    allowExpansion: v.boolean(),
    blockedTerms: v.array(v.string()),
    approvedAt: v.number(),
  }).index("by_intention_revision", ["intentionId", "revision"]),

  runs: defineTable({
    sessionId: v.id("demoSessions"),
    intentionId: v.id("intentions"),
    revision: v.number(),
    briefId: v.id("searchBriefs"),
    mode: v.union(v.literal("live"), v.literal("replay")),
    // members_only skips public discovery. Evaluation uses it to measure what public evidence adds.
    variant: v.optional(v.union(v.literal("full"), v.literal("members_only"))),
    replayOf: v.union(v.id("runs"), v.null()),
    recordedAt: v.union(v.number(), v.null()), // for replay: when the source run was recorded
    stage: vRunStage,
    status: vRunStatus,
    branches: v.object({
      public: v.union(v.literal("pending"), v.literal("running"), v.literal("succeeded"), v.literal("partial"), v.literal("failed"), v.literal("skipped")),
      members: v.union(v.literal("pending"), v.literal("running"), v.literal("succeeded"), v.literal("partial"), v.literal("failed")),
    }),
    followUp: v.object({
      status: vFollowUpStatus,
      question: v.union(v.string(), v.null()),
      affects: v.union(v.string(), v.null()),
      reason: v.union(v.string(), v.null()),
    }),
    model: v.string(),
    embeddingModel: v.string(),
    promptVersion: v.string(),
    threadId: v.union(v.string(), v.null()),
    budget: v.object({ searchQueries: v.number(), fetchedPages: v.number(), modelCalls: v.number() }),
    error: v.union(v.string(), v.null()),
    startedAt: v.number(),
    completedAt: v.union(v.number(), v.null()),
  })
    .index("by_session", ["sessionId"])
    .index("by_intention_revision", ["intentionId", "revision"]),

  runEvents: defineTable({
    runId: v.id("runs"),
    stage: vRunStage,
    kind: vEventKind,
    status: vEventStatus,
    label: v.string(),
    detail: v.optional(v.any()),
    durationMs: v.union(v.number(), v.null()),
    error: v.union(v.string(), v.null()),
    at: v.number(),
  }).index("by_run", ["runId"]),

  // Recorded external calls. Replay reads these instead of calling Telem or OpenAI.
  callLog: defineTable({
    runId: v.id("runs"),
    key: v.string(),
    response: v.any(),
    durationMs: v.number(),
    at: v.number(),
  }).index("by_run_key", ["runId", "key"]),

  // Inferred hypotheses and capabilities attached to a run, plus capabilities revealed by sources.
  hypotheses: defineTable({
    runId: v.id("runs"),
    kind: v.union(v.literal("solution"), v.literal("capability")),
    text: v.string(),
    rationale: v.string(),
    origin: vOrigin,
    sourceUrl: v.union(v.string(), v.null()),
    memberQuery: v.union(v.string(), v.null()),
    usedInRetrieval: v.boolean(),
  }).index("by_run", ["runId"]),

  sources: defineTable({
    runId: v.id("runs"),
    round: vSearchRound,
    url: v.string(),
    normalizedUrl: v.string(),
    title: v.union(v.string(), v.null()),
    snippet: v.union(v.string(), v.null()),
    hits: v.array(v.object({ provider: v.string(), query: v.string(), rank: v.number() })),
    fetch: vFetchOutcome,
    content: v.union(v.string(), v.null()),
  }).index("by_run", ["runId"]),

  // Public posts by people, found through Telem's social providers (X, TikTok, Reddit, and others).
  people: defineTable({
    runId: v.id("runs"),
    platform: v.string(),
    provider: v.string(),
    url: v.string(),
    author: v.union(v.string(), v.null()),
    title: v.string(),
    reason: v.optional(v.string()), // generated relevance explanation, separate from source text
    about: v.optional(v.string()),
    excerpt: v.optional(v.string()),
    evidenceQuote: v.optional(v.string()),
    matchChecked: v.optional(v.boolean()),
    avatarUrl: v.optional(v.string()),
    profileUrl: v.optional(v.string()),
    publishedAt: v.union(v.string(), v.null()),
    query: v.string(),
  }).index("by_run", ["runId"]),

  opportunities: defineTable({
    runId: v.id("runs"),
    sourceId: v.id("sources"),
    round: vSearchRound,
    url: v.string(),
    title: v.string(),
    participationRoute: v.union(v.string(), v.null()),
    conditions: v.array(vCondition),
    fetched: v.boolean(),
  }).index("by_run", ["runId"]),

  candidates: defineTable({
    runId: v.id("runs"),
    intentionId: v.id("intentions"),
    memberId: v.id("members"),
    retrievedBy: v.array(v.string()), // "aim", "contribution", "capability: composer", ...
    similarity: v.number(), // diagnostic only
    networkCard: vNetworkCard, // projection captured at retrieval time
    requesterCheck: v.union(
      v.null(),
      v.object({ relevant: v.boolean(), reasons: v.array(v.string()), constraintResults: v.array(vConstraintResult) }),
    ),
    counterpart: v.union(
      v.null(),
      v.object({ outcome: vCounterpartOutcome, sharedNote: v.string(), questions: v.array(v.string()) }),
    ),
    status: v.union(v.literal("retrieved"), v.literal("shortlisted"), v.literal("checked"), v.literal("rejected")),
    rejectionReason: v.union(v.string(), v.null()),
  }).index("by_run", ["runId"]),

  // The counterpart's private reasoning. Never returned by a public query.
  counterpartPrivate: defineTable({
    candidateId: v.id("candidates"),
    reasonForMember: v.string(),
    threadId: v.string(),
  }).index("by_candidate", ["candidateId"]),

  options: defineTable({
    runId: v.id("runs"),
    kind: vOptionKind,
    title: v.string(),
    why: v.optional(v.string()),
    summary: v.string(),
    fitCategory: vFitCategory,
    constraintResults: v.array(vConstraintResult),
    questions: v.array(v.string()),
    nextStep: v.string(),
    candidateId: v.union(v.id("candidates"), v.null()),
    opportunityId: v.union(v.id("opportunities"), v.null()),
    trace: v.object({
      queries: v.array(v.string()),
      sourceUrls: v.array(v.string()),
      conditionLabels: v.array(v.string()),
      inferredCapabilities: v.array(v.string()),
    }),
    rank: v.number(),
    excluded: v.boolean(),
    excludedReason: v.union(v.string(), v.null()),
  }).index("by_run", ["runId"]),

  introductions: defineTable({
    sessionId: v.id("demoSessions"),
    runId: v.id("runs"),
    optionId: v.id("options"),
    candidateId: v.id("candidates"),
    requesterIntentionId: v.id("intentions"),
    counterpartIntentionId: v.id("intentions"),
    opportunityId: v.union(v.id("opportunities"), v.null()),
    sharedFields: vSharedFields,
    sharedCard: v.any(), // exactly what the counterpart receives
    message: v.string(),
    state: vIntroState,
    counterpartOutcome: v.union(vCounterpartOutcome, v.null()),
    counterpartNote: v.union(v.string(), v.null()),
    requesterAccepted: v.boolean(),
    counterpartAccepted: v.union(v.boolean(), v.null()),
    synthetic: v.literal(true),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_option", ["optionId"])
    .index("by_session", ["sessionId"]),

  evalResults: defineTable({
    datasetVersion: v.string(),
    method: v.string(),
    caseId: v.string(),
    observation: v.any(),
    createdAt: v.number(),
  }).index("by_dataset", ["datasetVersion"]),
});
