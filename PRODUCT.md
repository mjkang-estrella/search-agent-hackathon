# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary user is a member of a bounded community, such as a university program or a makerspace, who has something they are trying to do. They bring a short excerpt from their AI-assistant conversations, or type the intention directly. They review what the agent extracted, approve what may be shared, and choose a next step.

Hackathon judges see the product through that member's story, usually over a laptop screen share. Community organizers are the first paying-customer hypothesis but are not the primary user of these screens.

## Product Purpose

Wayfinder turns approved personal context into an intention and finds ways to act on it. The LLM proposes ways forward and the counterpart capabilities that could help. Telem retrieves current public evidence: projects, services, listings, open requests, communities, and events. Convex searches intentions that other members approved for sharing. The member compares public options, member connections, and combined options against the same constraints, then follows a published route or requests a mutual introduction.

Success is an intention the member makes progress on through a discovered opportunity or connection.

## Positioning

A profile describes a person. An intention describes what would make a connection useful right now. Wayfinder matches complementary intentions, checks them from both sides under separate permissions, and shows which claims are LLM inference, which come from public sources, and which come from another member's approved intention.

## Operating Context

The first build is a hackathon demo (SearchHack, November 14, 2026). It uses live Telem search and fetch, synthetic members, and simulated acceptance. The lead story is Dana, a poet who wants to turn a poem into a song. Firmware and crosswalk scenarios use the same screens. A newly typed intention works without a scenario template.

The flow has eight screens: bring context, review intentions, review external sharing, follow discovery, explore ways forward, compare options, request an introduction, and inspect evidence and evaluation.

## Capabilities and Constraints

- Stack: Next.js, TypeScript, Convex, Telem AI, OpenAI, and shadcn/ui components.
- Raw context reaches the model only for the owner's extraction. It never reaches Telem or another member's check. The interface says so explicitly and never claims memory stays on the device.
- Only a user-approved search brief leaves the application. Names, contact details, and private excerpts stay out of public queries.
- Synthetic members, simulated acceptance, replay, and cached results carry visible labels wherever they appear.
- Missing facts stay unknown. Constraint results use meets, conflicts, and unknown. There are no compatibility percentages.
- A public page never establishes a person's willingness to connect. Contact details appear only after both sides accept.
- Renamed from the working title "Search Agent". The repository and docs still use the old name.

## Evidence on Hand

- Live Telem responses observed during setup: seven providers per query (exa, tavily, brave, parallel, ceramic, seltz, you), per-URL fetch results, and a failed fetch with its provider chain.
- No testimonials, customers, usage numbers, or measured accuracy exist yet. Do not invent them. Evaluation results appear only after the evaluation suite runs.

## Product Principles

1. Show the source of every claim: inference, public evidence, or a member's approved intention.
2. The member approves what leaves, and sees exactly what was shared.
3. An unknown stays unknown. A hard conflict removes an option from recommendations.
4. One engine for any intention. Scenarios are sample inputs, not templates.
5. Label anything synthetic, simulated, cached, or replayed.

## Accessibility & Inclusion

No product-specific requirement was set. Follow WCAG 2.2 AA as the baseline. Primary viewing is a laptop screen share, and every screen must also work at phone width.
