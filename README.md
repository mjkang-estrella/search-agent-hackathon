# Relay

**Your agents know you best. Why can't you find someone you need by searching others' agents?**

Tell your agent what you want to do. It finds public opportunities and people who could help.

```text
Memory from AI tools → Understand intention → Discover opportunities + Match people → Take action
```

Built for [SearchHack: Build the next layer of AI search](https://luma.com/e13wf1bd), November 14, 2026. Our goal is to win by demonstrating a useful new way to search for people through the context their agents already understand.

The [implementation plan](docs/implementation-plan.md) defines the three-person build, completion criteria, the Telem demonstration, the data model, and the evaluation. The LLM plans possible solutions. Telem retrieves public evidence, and our matching system searches approved member intentions. Further searches answer specific unresolved questions.

## The idea

Our conversations with AI tools contain context about what we're working on, what we need, what we can offer, and what we want to do next. Much of that context never makes it into a public profile or a search query.

Search Agent helps fulfill intentions through web discovery and person-to-person matching. Your agent helps articulate what you're trying to do, finds existing opportunities through Telem AI, searches intentions that other people have chosen to share, and explains which options fit your needs.

The core experience is general intention discovery across personal, creative, professional, and community life. The same flow should work across these contexts.

## Two paths to fulfilling an intention

1. **Discover an existing opportunity on the web.** Find a service, project, community, listing, or open request through Telem search and page fetching.
2. **Create an opportunity with another person.** Match complementary intentions so people can collaborate, share, exchange, or help each other. Neither person needs to know whom to search for beforehand.

The marketplace + P2P swap analogy captures two ways of meeting a need: an existing offering or a mutually useful arrangement between people. Swaps are one connection pattern; collaboration, shared goals, and voluntary help matter too.

| Your intention | Web discovery | Person-to-person matching |
| --- | --- | --- |
| Turn poems into songs | Songwriting workshops and open collaborations | A composer looking for lyrics |
| Find somewhere to test furniture designs | Makerspaces and workshop rentals | A workshop owner seeking help with digital fabrication |
| Learn conversational Korean | Classes and conversation groups | Someone learning your language with compatible availability |
| Get feedback on a product | Testing communities and research services | Someone facing the problem your product addresses |
| Find a technical co-founder | Founder posts on X, recent Product Hunt launches, Substack build logs, and accelerator programs | An engineer looking for a business co-founder in the same domain |

The agent compares options against the user's constraints, including timing, cost where stated, availability, and desired involvement. Explain the evidence and trade-offs, then let the user choose a next step. An existing service can be the best answer; a person-to-person connection can create an opportunity that was never listed.

## What is an intention?

An intention captures something you're trying to do, something blocking you, or something you could contribute. It has context and can change over time.

- **Aim:** What are you trying to achieve?
- **Blocker:** What would help you move forward?
- **Potential contribution:** What experience, capability, or resource could you choose to share?
- **Stage and timing:** Where are you in the process, and when does it matter?
- **Constraints:** What conditions would make a connection useful?
- **Openness:** What have you explicitly agreed to share, and with whom?

For example, "I write music" is a profile detail. "I have three unfinished melodies and want to turn one into a song with a lyricist" is an intention an agent can help connect.

## Connections we could discover

These are illustrative scenarios to validate, using synthetic participants for the hackathon.

| One person's context | Another person's context | The opportunity |
| --- | --- | --- |
| Stuck getting an obscure sensor working | Recently fixed the same firmware issue | Fresh experience unblocks a problem before the fix becomes a public tutorial |
| Has unfinished melodies that need lyrics | Writes poems and wonders whether they could become songs | Different creative intentions become a shared project |
| Needs firsthand details for a novel's hospital scene | A retired nurse organizing memories into a memoir | Lived experience finds an audience and supports authentic writing |
| Wants a safer crossing near a school | Other residents separately trying to improve that intersection | Independent efforts become collective action |
| Exploring furniture-making as a second career | A retiring craftsperson wants their skills and workshop to keep being used | A possible apprenticeship or succession |
| Needs a replacement clip for a discontinued household item | Has a 3D printer and wants useful projects | A problem meets a capability its owner might never think to search for |
| Needs primary sources for a local-history lesson | Digitizing family letters and wondering who would care | A family archive finds an educational audience |
| Needs observations from a particular valley | Has years of dated birdwatching notes from that area | A hobby could contribute to research, subject to checking data quality |
| Preparing to become a first-time manager | Recently navigated that transition and wants to share what helped | Relevant, recent experience reaches someone at the right stage |
| Wants to build something useful for community groups | A volunteer organizer struggling with shift coordination | A motivated builder discovers a concrete problem |
| Wants to start running but feels intimidated by established groups | Another beginner seeking a low-pressure accountability partner | Shared stage, pace, and availability make starting easier |
| A healthcare operator needs a technical co-founder | An ML engineer wants to start a company but lacks a market | Complementary founders meet before either posts a public search |
| A library wants to host a coding club | A developer wants local volunteering opportunities, and teenagers want to learn game development | Several intentions create an opportunity together |

Four patterns recur across these examples:

1. **You've done what I'm trying to do.** Recent experience helps someone earlier on the same path.
2. **You have something that could unblock me.** A capability, resource, or piece of knowledge meets a need.
3. **We're independently trying to achieve the same thing.** People discover shared effort and can act together.
4. **Our different goals become possible together.** Complementary intentions create a collaboration.

Connections can involve two people or a group. They do not require barter: someone might gain an audience, a collaborator, a sense of purpose, or the satisfaction of helping.

## Why search through agents?

A profile describes a person. An intention describes what would make a connection useful right now.

Someone with a problem may not know what kind of person could help. Someone with relevant experience may never identify themselves as an expert or publish an offer. Agents can help recognize those possibilities from approved context and reduce the effort of finding and asking each other.

For example, a person seeking a replacement clip may never search for a 3D-printing collaborator. Retrieval needs to connect the problem to a possible solution, then find a person with the relevant capability and explicit willingness to help.

The search challenge is to retrieve complementary intentions, check practical constraints, and explain the fit using evidence. Shared interests alone are not enough.

## The flow

1. **Memory from AI tools.** Import or paste a selected memory summary or conversation excerpt. The user chooses what enters the system.
2. **Connect intention.** Extract needs, offers, goals, and relevant constraints. Let the user edit and approve each intention before making it discoverable.
3. **Discover opportunities.** Search approved intentions within the network and use Telem AI to discover relevant public projects, communities, and collaboration requests. Evaluate complementary needs, timing, location, and preferences.
4. **Compare ways forward.** Explain how public opportunities and person-to-person matches could fulfill the intention, including practical constraints and evidence. Distinguish evidence from inference.
5. **Choose a next step.** Let the user follow a published participation route or request an introduction. Network introductions require both people's acceptance before revealing contact details or sharing further context.

## Telem AI's role

Telem AI is a core dependency of the proposed public discovery path. Its [official overview](https://docs.telem.ai/overview/) describes multi-provider web search and page fetching; its [search documentation](https://docs.telem.ai/resources/search-parameters/) documents automatic provider routing. Our application owns the private intention index, extraction, ranking, and introduction permissions.

For each approved intention, the agent should:

1. **Let the LLM plan ways forward.** Infer possible solutions and relevant capabilities from the intention. These are hypotheses. Generating them does not require a web search.
2. **Search through Telem.** Use `POST /v1/search` with automatic routing or an explicit provider selection to find public evidence of relevant work and requests.
3. **Read promising sources.** Use `POST /v1/fetch` to inspect the actual pages for the stated need, contribution, dates, and contact or participation route.
4. **Rank with evidence.** Combine these public opportunities with approved network matches, clearly distinguish their origins, and cite the supporting sources. Public content does not establish someone's current willingness to connect.
5. **Explain the next step.** For network members, propose a mutual introduction. For public opportunities, offer the published participation route for the user to review; do not imply an agent handshake or send unsolicited outreach.

For example, a poet's intention could lead Telem searches toward composers explicitly seeking lyrics or community songwriting projects. A public request can provide a useful next step even before another person joins our network. This is a hypothesis to validate through real search results.

When an intention is about finding people or a team, the planner can route queries to Telem's platform-specific providers instead of only the general web: X posts (`fetchlayer_x`, `socialdatax_x`), Product Hunt launches (`fetchlayer_producthunt`), Substack posts (`apify_substack`), and LinkedIn job and company posts (`apify_linkedin` search, `brightdata` fetch). See [supported platforms](https://docs.telem.ai/resources/supported-platforms/). The intention selects these providers; a scenario does not hard-code them. A public post is a lead, not consent: show its source link and date, and never contact the author on the user's behalf.

The demo must show useful public evidence retrieved through Telem and how that evidence affected a recommendation. Record queries, selected providers when returned, sources, latency, failures, and usage information when available. Compare LLM planning and member matching alone with the evidence-enriched pipeline to measure what public discovery adds. A second search is optional and must answer a specific unresolved question. An introduction can already be a complete outcome.

### Discovery pools

Telem searches the public web for projects, communities, listings, open requests, resources, and events. Convex searches the approved intentions of participating members. The requester's selected memory supplies private planning context. Other people's private context stays within their permitted counterpart checks.

The intention determines search terms and constraints. Demo scenarios supply example inputs and synthetic members. They do not define a whitelist of public destinations or a separate production search pool. The runtime must accept a new intention without requiring a scenario template.

Only a user-approved search brief may leave the application. Keep raw memory, private excerpts, and identifying details out of external queries unless explicitly approved. A public result remains a public lead until that person joins and approves an intention; search cannot expose their private agent context.

## Proposed hackathon MVP

Build one working path from personal context to useful options and a chosen next step:

- Paste or upload a small text export from an AI tool; use synthetic examples for other participants.
- Extract a structured intention with a need, an offer where applicable, constraints, and supporting excerpts.
- Review and approve the intention before indexing it.
- Run Telem searches from an approved search brief and fetch promising public sources.
- Retrieve candidates by meaning, then rerank for complementary needs and offers and explicit constraints.
- Compare public opportunities and person-to-person matches against the same intention and constraints, with evidence, uncertainties, and reasons each option fits. Label their origins separately.
- Demonstrate an introduction request and mutual acceptance; clearly label any simulated participant actions.

Start with a small, curated dataset spanning the four demo scenarios below. Include misleading keyword matches, incompatible constraints, and cases with no useful connection. Use the same intention schema, retrieval pipeline, and interface across scenarios.

Direct integrations with every AI tool, autonomous outreach, payments, and a production messaging system are future work. The initial import path should make the core search behavior testable within the hackathon.

## Search design to validate

```text
Selected memory
    → intention extraction
    → user review and sharing approval
    → approved intention index + approved external search brief
    → LLM solution hypotheses and capability requirements
    → Telem public search and fetch + approved member retrieval
    → requester and counterpart compatibility checks
    → optional targeted search for an unresolved question
    → evidence checks and option ranking
    → evidence-backed comparison and user choice
    → published participation route OR introduction request and mutual acceptance
```

Proposed searchable fields:

| Field | Purpose |
| --- | --- |
| Aim | What the person is trying to achieve |
| Blocker | What would help them move forward |
| Potential contribution | Experience, capabilities, or resources explicitly approved for discovery |
| Stage / timing | Where they are in the process, recency of relevant experience, and time window |
| Topic / context | Information needed to understand the intention |
| Constraints | Availability, location where relevant, scope, and explicit preferences |
| Evidence | Approved excerpts that support the intention |
| Sharing scope | Who may discover this intention |

Retrieve across fields: a blocker against another person's contribution or recent experience, and an aim against other people's shared or complementary aims. Explore query expansion from "what do I need?" to "who might have experience or a capability that helps?" Apply explicit constraints before presenting results. Rank for usefulness and approved openness, and allow "no suitable match" when the evidence is insufficient.

The MVP should demonstrate pairwise retrieval and grouping around a shared aim. More complex reasoning across several complementary participants is an extension to validate later.

This is a proposed architecture. The selected stack is Next.js, TypeScript, and Convex, with Telem for public search and page fetching. OpenAI is the recommended provider for structured model tasks and embeddings. See the implementation plan for the pipeline and module boundaries. Implementation will require a server-side `TELEM_API_KEY` following the [Telem quickstart](https://docs.telem.ai/quickstart/).

## One experience, four demo scenarios

The experience is: **"Here's what I'm working toward" → "Here are ways forward" → "Here's why they fit" → "Choose a next step."**

- **Composer + poet:** Show different creative goals becoming a collaboration. A candidate with a matching music interest but no relevant intention should not automatically rank first.
- **Independent crosswalk efforts:** Show several residents discovering that they're working toward the same local outcome. Distinguish the same intersection from similar concerns elsewhere.
- **Founder + co-founder:** Show complementary founders finding each other through approved intentions and platform-specific public evidence. A candidate with the right keywords but a conflicting constraint, such as remote-only or part-time, or a months-old post should not rank first.
- **Obscure bug + someone who recently solved it:** Show the value of recent experience captured in approved agent context. Distinguish the exact issue and hardware from superficially similar problems.

Make composer + poet the primary demonstration of both paths for one intention. A poet wants to turn poems into songs: use live Telem search and fetch to find a relevant workshop or open collaboration, then show a synthetic network composer explicitly seeking lyrics. Compare the options using supported facts such as format, timing, stated cost, and creative goals; let the poet choose a published route or request a mutual introduction. Do not fabricate public results or present a simulated member as real.

The founder, crosswalk, and private bug-fix examples test other connection patterns using synthetic, approved network intentions. Telem does not search those private memories.

For each scenario:

1. Import a short synthetic memory excerpt and show an extracted intention card.
2. Let the user edit, approve, or hide it. Ask for missing information instead of inventing it.
3. Retrieve useful candidates alongside near misses and explain the ranking with approved evidence. In the primary demo, show the live Telem queries and fetched sources.
4. Show practical constraints, unresolved questions, and why a public opportunity or person-to-person connection could help. In the primary demo, compare both paths for the same intention.
5. Compare against keyword search and profile similarity on the same dataset; measure rather than assume an improvement.
6. For a network match, finish with an introduction request and a clearly labeled simulation of mutual acceptance. For a public result, show its published participation route and the limits of what has been verified.

The demo should show what the LLM inferred, what Telem established from public sources, and why a proposed option fits. A shared public activity is useful when it advances the intention. It is not required for every connection.

## What would make this competitive?

Prioritize the judging weights provided by the team, which supersede the broader criteria on the event listing:

| Criterion | Weight | What we aim to demonstrate |
| --- | --- | --- |
| Use of Telem AI | 40% | Intention-driven public discovery using real Telem search and fetch calls, source-backed results, and a measured contribution to finding useful opportunities |
| Startup & Venture Potential | 20% | A clear initial customer, value from web discovery before network density, a plausible paid offering, and a path to repeated fulfilled intentions |
| Innovation | 20% | Comparing existing web opportunities with new opportunities created through complementary intentions and shared aims |
| Technical execution | 20% | A working import → approval → search → evidence → next-step flow, with constraint checks and graceful handling of failed searches |

### Startup hypothesis to validate

Keep the product general while testing distribution inside a bounded community, such as a university, makerspace, or alumni network. Community organizers are a potential paying customer for helping members discover useful collaborations. Telem-powered public discovery could provide value before the internal network is dense; approved member intentions could then make connections more specific over time.

Test willingness to share intentions, usefulness of proposed connections, repeat usage, and willingness to pay. Charging organizers for a community subscription is a business hypothesis, not validated demand. Do not sell private memory or assume network effects before measuring them.

Evaluate a small set of labeled scenarios: whether a useful candidate appears in the top three, whether explicit constraints are respected, and whether explanations are supported by approved evidence. Report measured results after implementation.

The longer-term success metric is **intentions users report making progress on through a discovered opportunity or connection**. Track useful web opportunities and mutually accepted, useful introductions separately so we can assess both paths.

## Sharing and trust

- Raw AI conversation history stays private by default; only explicitly approved content becomes searchable.
- Users can edit or remove shared intentions and control their audience.
- Another person's agent receives only the information approved for that audience.
- Search results must not invent needs, offers, availability, or willingness to connect.
- An agent may privately suggest that someone's experience could help another person. That inference remains a draft until the person approves making it discoverable; inferred relevance never grants permission to share.
- Introductions require both people's acceptance before contact information is revealed.

These are product requirements for implementation, not claims about protections already built.

## Project status

A first working version is live at https://wayfinder-woad.vercel.app. Relay is a memory MCP server for personal agents such as Grok, Dot, or Muse. An agent saves memories with the `add_memory` tool, and Relay turns each memory into intentions and starts looking on its own. Telem searches the public web and, through its social providers (X, TikTok, Reddit, Instagram, Facebook, LinkedIn), finds posts by people who have done what you need. Convex searches 51 sample member intentions, and both sides' agents check the fit. The best option becomes the "Idea for you." **Start with a demo persona** loads sample memories for one of four people:

- **Dana (personal and creative).** Turn a poem into a song, plan a first trip to Seoul, build a bench.
- **Jun (passing remarks).** "I like washing cars" becomes an offer to wash cars for neighbors who would pay. An idle 3D printer and unused Korean become offers too.
- **Marcus (work).** Becoming a team lead, finding beta testers, and a logo for a side business.
- **Priya (community).** A safer school crossing and volunteers for a library coding club. Sample members, contacts, and acceptance are labeled. Measured results are in [docs/evaluation-results.md](docs/evaluation-results.md).

## Run it locally

1. Run `npm install`.
2. Run `npx convex dev`. On first run it creates a local deployment and writes `.env.local`.
3. Set the server keys: `npx convex env set TELEM_API_KEY <key>` and `npx convex env set OPENAI_API_KEY <key>`. `OPENAI_MODEL` is optional and defaults to `gpt-5.4-mini`.
4. Set up Google sign-in. In Google Cloud Console, create an OAuth client of type "Web application". Add `<CONVEX_SITE_URL>/oauth/google/callback` as an authorized redirect URI. For a local deployment that URL is `http://127.0.0.1:3211/oauth/google/callback`. Then set the client and the app origin:
   - `npx convex env set AUTH_GOOGLE_CLIENT_ID <id>`
   - `npx convex env set AUTH_GOOGLE_CLIENT_SECRET <secret>`
   - `npx convex env set AUTH_REDIRECT_ORIGINS http://localhost:3000`. Separate several origins with commas. Google can only send people back to these origins.
   - `npx convex env set APP_URL http://localhost:3000`. This is optional. When it is set, the `add_memory` reply links to the app.

   Convex refuses to deploy until both `AUTH_GOOGLE_*` variables are set.
5. Seed the synthetic members: `npx convex run seed:seedMembers`.
6. Run `npm run dev` and open http://localhost:3000.

## Accounts and the memory MCP

Guests can use the whole app without signing in. A guest's board lives in one browser, through a board id in localStorage. Signing in with Google makes that board the user's, and the user can then open it on any device. If the user already has a board, it opens instead of the guest board.

The memory MCP link requires sign-in. Each user has one link, and it writes to their latest board. **New link** in the MCP panel replaces the key, and agents that still use the old link get a 401. Every public Convex function that takes a `sessionId` checks the board's owner, so a signed-in user's board id is useless to anyone else. `convex/sessions.ts` holds these checks.

Scripts:

- `npx tsx scripts/e2e.ts creative --replay` runs one scenario end to end, then replays it from the recording.
- `npx tsx scripts/evaluate.ts` compares the matching methods on 12 labeled cases and rewrites `docs/evaluation-results.md`.
