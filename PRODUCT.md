# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary user is a general consumer with something they want to do. Their AI assistant saves memories to Relay through the memory MCP, or they start with the demo persona or type a memory by hand. They read the intentions Relay finds in each memory and choose a next step.

Hackathon judges see the product through the demo persona, usually over a laptop screen share.

## Product Purpose

Relay turns memories into intentions and finds ways to act on them. Each new memory starts discovery automatically. The LLM proposes ways forward and the counterpart capabilities that could help. Telem retrieves current public evidence: projects, services, listings, open requests, communities, events, and public posts from social providers. Convex searches the intentions of sample members. The member says hi to a sample member, opens a public page, or reads a public post with its source link.

Success is an intention the member makes progress on through a discovered opportunity or connection.

## Positioning

A profile describes a person. An intention describes what would make a connection useful right now. Relay matches complementary intentions, checks them from both sides under separate permissions, and shows which claims are LLM inference, which come from public sources, and which come from another member's approved intention.

## Operating Context

The first build is a hackathon demo (SearchHack, November 14, 2026). It uses live Telem search and fetch, synthetic members, and simulated acceptance. The lead story is Dana, a poet who wants to turn a poem into a song. Other demo memories cover work, community, and passing remarks. A newly typed memory works without a scenario template.

The app is one page: memories, the intentions found in the selected memory, people and opportunities for the selected intention, and a proposed next step at the top. "How we found these" opens a run page with the search as a flow chart and a sources tab. Google sign-in is optional for the board and required for a memory MCP link.

## Capabilities and Constraints

- Stack: Next.js, TypeScript, Convex, Telem AI, OpenAI, and shadcn/ui components.
- Raw context reaches the model only for the owner's extraction. It never reaches Telem or another member's check. The interface says so explicitly and never claims memory stays on the device.
- Only the search brief leaves the application. Names, contact details, and private excerpts stay out of public queries.
- Synthetic members, simulated acceptance, replay, and cached results carry visible labels wherever they appear.
- Missing facts stay unknown. Constraint results use meets, conflicts, and unknown. There are no compatibility percentages.
- A public page never establishes a person's willingness to connect. Contact details appear only after both sides accept.
- Renamed from the working title "Search Agent". The repository and docs still use the old name.

## Evidence on Hand

- Live Telem responses observed during setup: seven providers per query (exa, tavily, brave, parallel, ceramic, seltz, you), per-URL fetch results, and a failed fetch with its provider chain.
- No testimonials, customers, usage numbers, or measured accuracy exist yet. Do not invent them. Evaluation results appear only after the evaluation suite runs.

## Product Principles

1. Show the source of every claim: inference, public evidence, or a member's approved intention.
2. No approval or sharing-review steps. The search brief keeps private details out of public queries instead.
3. An unknown stays unknown. A hard conflict removes an option from recommendations.
4. One engine for any intention. Scenarios are sample inputs, not templates.
5. Label anything synthetic, simulated, cached, or replayed.

## Accessibility & Inclusion

No product-specific requirement was set. Follow WCAG 2.2 AA as the baseline. Primary viewing is a laptop screen share, and every screen must also work at phone width.
