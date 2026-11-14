# Implementation plan

This plan covers a complete demonstration built by three contributors. The target includes live Telem discovery, synthetic members, private compatibility checks, replay, and measured results. Completion depends on demonstrated behavior and evidence. No application code exists yet.

## Product decision

Search Agent turns approved personal context into an intention, finds ways to act on it, and connects people who could help each other.

Telem changes which connections the agent proposes. Its first search round finds relevant work, approaches, and counterpart roles. Member retrieval uses those findings. A second search round finds a public opportunity that compatible people could pursue together.

The results include public opportunities, member connections, and combined options. A combined option explains who could work together, what they could do, and which public source supports the proposed next step. A public source never establishes a person's willingness to participate.

The product stays general. A scenario changes the context and data, not the screens, intention schema, or pipeline.

## Decisions already made

- Next.js and TypeScript provide the application interface. Use shadcn/ui components.
- Convex stores the application data, runs backend actions, and updates the interface as each discovery stage completes.
- Telem provides public web search and page fetching. It does not index private member intentions.
- OpenAI is the recommended model provider for structured extraction, search planning, matching, and explanations. Record the selected model and prompt version with each run.
- Use the Convex Agent component for model execution and its conversation records. Keep pipeline state in application tables. Do not add another agent framework or API server.
- Use OpenAI embeddings and Convex vector search for intention retrieval. Select the embedding model and dimensions during setup and keep the index definition consistent with that choice.
- Seed 40 to 60 synthetic intentions. Label synthetic members and simulated acceptance wherever they appear.
- Keep Supermemory as a supported future context source. Direct extraction from selected text is the initial path. This remains the earlier memory-integration decision, not a reduction of the discovery or matching scope.
- Apply pstack's technical-writing and unslop skills to documentation and implementation notes. Settle caller usage, types, and module ownership before concurrent implementation.

## The complete demo

Dana has written poems and wants to turn one into a song. She has no composition experience, wants an evening collaboration, and states her budget and preferred format. Separate approved context says she wants to perform something she helped create.

Telem finds public approaches to that goal. The agent cites the sources that suggest a composer, co-writer, songwriting group, or another relevant role. These roles expand the member search. A synthetic composer has an approved intention to find a lyric collaborator and compatible working preferences.

The agents check the match from both sides. Telem's second round looks for a public workshop, open collaboration, or performance opportunity relevant to their shared goal. The final result compares an existing public option, a member connection, and a combined option where the evidence supports one.

The demonstration includes a candidate with the right interests but no relevant intention, a candidate with a conflicting hard constraint, and a plausible option with a missing fact. Those cases prove different behavior. A missing fact remains unknown.

Select the lead story after a live Telem search and fetch. Keep the product and schema fixed if the story changes. Never invent a public opportunity to fit a prepared story.

The firmware scenario provides a second complete example. Telem finds a public issue or relevant technical evidence. A synthetic member has recent experience with the exact hardware and version. A combined option proposes working together on a contribution to the public issue. Posting remains a user action.

The crosswalk scenario demonstrates shared intentions across several people. Match the same place and outcome, rather than treating every road-safety concern as one group.

## Eight screens

1. **Bring context.** Paste selected text or load a synthetic example. Explain that the selected text goes to the model for extraction. Allow direct intention entry as well.
2. **Review intentions.** Show the aim, blocker, contributions, timing, constraints, and supporting excerpts. Allow edits, hiding, and approval. Ask at most two questions about missing information that affects discovery.
3. **Review external sharing.** Show the exact initial queries and the approved public search brief. Explain what later topic-based query expansion may use. Keep names, contact information, and private excerpts out of that brief.
4. **Follow discovery.** Show Telem queries, returned providers, results, fetch outcomes, and stage timing. Show the roles suggested by the sources and which role changed the member search. Display concise decisions and tool events, not hidden model reasoning.
5. **Explore ways forward.** Use one list with public, member, and combined labels. Show why each option fits, its supporting evidence, and unresolved conditions. Keep rejected candidates under a separate explanation.
6. **Compare options.** Compare selected options against the same constraints. Use meets, conflicts, and unknown. Do not invent compatibility percentages.
7. **Request an introduction.** Show exactly what the requester will share. Run the counterpart check under its own data permissions. Show a simulated human acceptance step, then reveal synthetic contact details only after both sides accept. A counterpart view shows what that side received.
8. **Inspect evidence and evaluation.** Show sources, recorded Telem operations, live or replay mode, and evaluation results. Allow the same interface to load the creative, firmware, and civic scenarios.

## Pipeline and permissions

The initial external search brief requires user approval. Any later query may use only fields approved for external sharing. A network-only contribution does not become public because a second search round needs it.

1. Extract an intention and evidence references from the selected context.
2. Save a revision when the user approves the intention and external brief.
3. Start a discovery run tied to that revision, brief, prompt version, and model configuration.
4. Run Telem round one with several public queries. Preserve provider provenance and deduplicate URLs without dropping attribution.
5. Fetch promising sources. Derive counterpart roles and evidence-backed approaches. Label roles based only on snippets as provisional.
6. Retrieve member intentions using the original aim, desired contributions, and web-derived roles. Search contributions against needs in both directions where relevant. Recheck approval and audience after retrieval.
7. Check shortlisted candidates from the requester side. The check sees only network-approved candidate fields.
8. Run separate counterpart checks for up to three candidates. Each check can use that synthetic member's private constraints. Return compatible, needs input, or decline. Return only questions and details that the member permits sharing.
9. Plan Telem round two using externally approved shared topics. Find a public next step for the selected pair. Do not put the candidate's identity or network-only context in the query.
10. Fetch promising round-two sources and extract cited conditions.
11. Validate evidence references and check constraints. Produce public, member, and combined options when supported.
12. Let the user choose a published participation route or request an introduction.

Each stage persists its output before the next stage starts. Independent counterpart checks and page reads can run concurrently. An event records the stage, status, duration, and error when present.

Raw context can reach the selected model for the owner's extraction step. It never reaches Telem or another member's check. This distinction must be explicit in the interface. Do not claim that all memory stays on the device.

Keep private fields out of reactive client queries, logs shown to other participants, and network-facing model inputs. Use typed projections for external search, network cards, and counterpart results. Reject blocked terms and direct identifiers before an outbound query. That guard supports field-level permission checks. It is not a general guarantee against every disclosure.

An edit creates a new revision and marks older discovery results stale. A hidden or withdrawn intention cannot support a new introduction.

## Evidence and constraint rules

Every condition has a source and a hard or soft designation. Preserve unknown values as null.

A hard conflict excludes an option from the recommended list. A missing hard condition makes the option a possible fit with an explicit question. Soft preferences influence ordering but do not become mandatory conditions.

For every supporting quote, check that the text occurs in the referenced approved excerpt or fetched page after whitespace normalization. Check that the reference belongs to the current run and revision. These checks prove that a quote exists. They do not prove that the quote supports the claim or that the page is correct. Evaluate those separately.

Do not infer availability from a profile, current eligibility from an old event, or willingness to connect from a public page. A failed fetch leaves an unverified lead. It cannot supply verified conditions.

Use fit categories such as strong fit, possible fit, and not a fit. Keep vector similarity as a retrieval diagnostic rather than a user-facing probability.

## Telem features the demo must make visible

- Query planning across different ways to fulfill one intention.
- Automatic provider routing and provider attribution from the actual response. If routing is unavailable, show that outcome.
- Results from multiple providers in a shared result format, with URL deduplication and retained provenance.
- Page fetching that confirms, contradicts, or fails to establish a condition from a search result.
- A second search whose purpose follows from the proposed connection.
- A trace linking each recommendation to a query, a source, and an extracted condition.
- Partial results when a provider or page fails.

Do not claim that multiple providers prove a fact. Several providers may return the same page. Do not promise an accuracy improvement before measuring one.

## Caller usage and backend boundaries

The interface starts extraction, approves a revision, starts discovery, subscribes to the run, and requests an introduction. Those are the public operations. The discovery coordinator owns the stage order and calls internal helpers.

Proposed public operations:

```ts
extractIntentions({ demoSessionId, selectedText, scenarioId })
approveIntention({ intentionId, expectedRevision, approvedCard, externalBrief })
startDiscovery({ intentionId, revision, briefId, mode }) // returns a runId
getDiscovery({ runId }) // returns the client-safe run view
requestIntroduction({ optionId, sharedFields, message })
respondToIntroduction({ introductionId, response }) // synthetic demo controls
```

These signatures are a design sketch, not existing functions. Define complete input and return validators before implementation. Store a demo session scope on each owned record. Use Convex actions for external calls and internal queries and mutations for pipeline data. Public queries return approved projections rather than raw database documents.

Proposed module ownership:

- `app/` and `components/` contain the eight screens and reusable interface components.
- `lib/contracts.ts` contains the shared application types and structured-output schemas.
- `convex/schema.ts` defines tables, indexes, and vector search fields.
- `convex/intentions.ts` owns drafts, approval, revisions, and approved projections.
- `convex/discovery.ts` owns run creation, stage progression, and client subscriptions.
- `convex/telem.ts` owns request construction, response normalization, provenance, and per-page errors.
- `convex/matching.ts` owns retrieval and the two permission-separated checks.
- `convex/evidence.ts` owns source references and quote validation.
- `convex/introductions.ts` owns sharing selections and acceptance states.
- `convex/agents.ts` configures the Agent component and structured model tasks.
- `convex/fixtures.ts` seeds synthetic records and labeled scenarios.
- `scripts/evaluate.ts` runs the evaluation methods against the same scenarios.

The coordinator must not expose arbitrary tools to a model loop. It calls bounded tasks with validated outputs. Fetched pages are evidence, not instructions for the agent to follow.

## Proposed stored data

Keep these conceptual records. Several small records may share a table if the resulting type remains explicit.

- Demo sessions and synthetic members contain ownership, labels, and synthetic contact data.
- Memory sources contain selected context and source spans with private access.
- Intentions contain aim, blocker, contributions, timing, hard and soft constraints, private constraints, revision, approval, and audience.
- Search facets contain the intention field, searchable text, embedding, audience, approval state, and revision. Add a text index for the keyword baseline.
- Search briefs contain the externally approved fields, initial queries, permitted query expansion, and approval revision.
- Runs contain their input references, live or replay mode, stage state, errors, and budget use.
- Tool events contain Telem requests, response references, provider provenance, duration, timestamps, and failures. Model-call metadata points to Agent component records rather than duplicating a message store.
- Counterpart roles contain the capability, rationale, source references, and whether fetched text supports the role.
- Web opportunities contain source URLs, fetch results, cited conditions, and published participation routes.
- Member candidates contain retrieval methods, diagnostic similarity, and permission-safe compatibility outcomes.
- Options contain source type, supporting record references, constraint results, fit category, unresolved questions, and a next step.
- Introductions contain the participants, selected shared fields, optional public opportunity, response states, and the synthetic marker.
- Evaluation scenarios and results contain expected outcomes, method configuration, observations, and dataset version.

Store large responses through Convex storage when necessary. Keep secrets out of records returned to the client. Add indexes for reads by session, intention, run, revision, approval state, and audience as required by each function.

## Run states and introduction states

Run stages are created, web round one, role extraction, member retrieval, compatibility checks, web round two, evidence verification, ranking, and complete. Track running, succeeded, partial, failed, or cancelled separately from the stage name.

An introduction moves through drafted, requester approved, counterpart checked, pending acceptance, and accepted or declined. Contact disclosure requires both acceptance fields. Repeating a request must not create duplicate introductions.

Do not implement an open-ended negotiation loop. The two checks and human response states are enough to demonstrate the agents' separate perspectives.

## Calls, deadlines, and replay

The initial budget allows two Telem search rounds and eight fetched pages across two fetch batches. Round one allows six queries. Round two allows four. These are application budgets, not promises about provider cost or latency.

The model tasks are extraction, initial search planning, role derivation, batched requester checks, up to three isolated counterpart checks, second-round planning, two batches of source-fact extraction, final ranking, and an introduction draft. That is at most 12 task calls before one bounded retry. Batch seed embeddings, then batch the query embeddings for each run.

Use configurable per-call timeouts and a whole-run deadline. Measure the first complete run before fixing the demo deadline. Show partial results as soon as a stage has useful output. Never let retries consume the remaining run budget without a visible status change.

Retry transient failures once when the remaining budget allows it. Respect Retry-After. Inspect provider and per-page outcomes rather than relying only on the outer HTTP status.

Record one complete live run for replay after the implementation works. Replay uses the same saved input, model outputs, and tool responses, and displays its recording timestamp. A changed intention cannot reuse that replay as if it were a new live search. Reused live results show a cached label and their age. Never switch to replay silently.

## Three-person build ownership and completion criteria

Contributor A owns the interface. Contributor B owns Telem and run coordination. Contributor C owns matching, evidence, and evaluation. All three use the same contracts and fixtures. Coordinate changes to shared files through one owner.

### Establish shared contracts and prove public discovery

Agree on shared types, one complete fixture, and the public operation signatures. Establish Next.js and Convex. Confirm server-side credential configuration without printing secrets. Run a real Telem search and fetch. Test the creative story against real results and select the lead scenario.

Contributor A builds the context and intention screens against the agreed fixture. Contributor B proves Telem responses and records a sample run. Contributor C creates the schema, synthetic dataset, and expected matches.

### Integrate the first real results

Contributor A builds the trace and result screens. Contributor B connects extraction, approval, round one, source reads, and stage events. Contributor C implements embedding facets, vector retrieval, and the keyword baseline.

Complete this stage when the interface shows a live public result and a retrieved synthetic member for the same approved intention. Final ranking follows in the next stage.

### Complete the combined option and introduction

Contributor A adds comparison, introduction controls, and the counterpart view. Contributor B connects second-round discovery and replay storage. Contributor C adds the separate compatibility checks, quote validation, and ranked options.

Complete the lead story through a combined option and simulated mutual acceptance. Exercise a real hard conflict and an unknown condition in the same flow.

### Prove the same engine across different intentions

Complete the eight screens, the firmware scenario, and the civic group scenario. Add replay controls and make all synthetic, cached, and replay labels visible. Validate that the counterpart view contains only approved disclosures.

### Measure quality and test failure behavior

Run the evaluation suite and collect real latency, source-fetch, and usage observations. Test failed fetches, model errors, revoked intentions, repeated requests, and stale runs. Fix the causes of incorrect recommendations. Record the complete live demo and its labeled replay.

### Rehearse and verify the demonstration

Freeze new behavior. Rehearse the stage demo and fallback. Prepare the judging evidence, source links, a concise startup argument, and the measured limits. Verify the exact build used for the demonstration.

These stages preserve the full discovery and matching scope. If a stage fails its completion criteria, fix the cause and reassign contributors as needed. Do not replace live behavior with fixtures without a visible replay or synthetic label.

## Evaluation and completion criteria

Use 12 labeled scenarios across the creative, technical, and civic examples. Include relevant matches, misleading interests, hard conflicts, unknown conditions, and no-match cases. Use the same synthetic dataset for every matching method.

Compare keyword retrieval, whole-profile embeddings, intention-field embeddings, and intention fields plus web-derived roles. Then evaluate the full constrained ranking. Report how often a useful member appears in the first three results and whether hard conflicts survive into recommendations.

Measure quote existence separately from whether the source supports the claim. Have a contributor review the highest-ranked web options and disclose the sample size and labeling method. A negative or unchanged result is still a result.

Record Telem provider attribution, duplicate results, fetch outcomes, query count, duration, and available usage fields. Report costs only when the returned data or account usage supports them.

Complete the build only after type checking, a Convex deploy check, and an end-to-end live run pass. Test the acceptance state machine and permission projections with fixtures. Verify the eight screens at desktop and narrow widths during the implementation's browser testing.

The finished demonstration must show how Telem changed a proposed connection, where a fetched source ruled an option out, what the counterpart learned, and which action the user chose.

## Startup case

The first customer hypothesis is an operator of a bounded community that already makes introductions, such as a university entrepreneurship program or a makerspace. The product remains general within that community.

Public discovery provides a useful path before the member network is dense. Approved intentions make later member connections more specific. A community subscription is a pricing hypothesis. Validate it with an organizer conversation rather than claiming demand from the demo.

Track intentions on which users report progress. Separate public opportunities used, introductions accepted, and connections judged useful. Use measured model and Telem costs to discuss the economics.

## Further development

Telem monitors can extend the completed discovery flow to standing intentions. A participant can approve a topic to watch and return when a relevant opportunity appears. Confirm monitor limits, costs, and cleanup before enabling scheduled searches.

A second browser can let a judge accept a synthetic introduction. Supermemory can supply retrieved context through the same extraction input. Real accounts, messaging, direct AI-tool imports, and payments require a separate implementation scope. The current user decision remains a synthetic-member hackathon demo.

## Planning sources

- [Telem search parameters](https://docs.telem.ai/resources/search-parameters/) cover routing, provider attribution, batching, and result fields.
- [Telem overview](https://docs.telem.ai/overview/) covers public search and page fetching.
- [Convex Agent component](https://docs.convex.dev/agents/overview) documents agent execution and conversation support.
- [Convex vector search](https://docs.convex.dev/search/vector-search) documents embedding retrieval in actions.
- [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs) documents schema-constrained output and refusal handling.
- [pstack technical-writing](https://github.com/cursor/plugins/blob/main/pstack/skills/technical-writing/SKILL.md) and [pstack unslop](https://github.com/cursor/plugins/blob/main/pstack/skills/unslop/SKILL.md) guide the documentation.

Claude Opus 5.5 at high effort reviewed the product and implementation approach. This plan keeps its full discovery and matching scope, defines teammate ownership and completion criteria, and uses the Convex Agent component to follow this project's backend guidance.
