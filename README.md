# Search Agent

**Your agents know you best. Why can’t you find someone you need by searching others’ agents?**

Connecting people’s needs through their personal agents.

```text
Memory from AI tools → Connect Intention → Connect People
```

Built for [SearchHack: Build the next layer of AI search](https://luma.com/e13wf1bd), November 14, 2026. Our goal is to win by demonstrating a useful new way to search for people through the context their agents already understand.

## The idea

Our conversations with AI tools contain context about what we’re working on, what we need, what we can offer, and what we want to do next. Much of that context never makes it into a public profile or a search query.

Search Agent turns user-approved context into searchable intentions. Your agent helps articulate what you need, searches the intentions that other people have chosen to share, and explains why a connection could help both of you.

The scope is general personal and professional connections: people whose plans, needs, and offers can help each other. The first demo focuses on travel and temporary housing.

## The connection we want to make

You live in the US and are traveling to Korea for a week. You want to sublease your place while you’re away. Someone in Korea is traveling to your US city during that same week and needs somewhere to stay. They may also have a place in Korea available while they’re gone.

Your agents already have context about these plans. With permission to share the relevant intentions, they could discover the overlap:

- Your empty home could meet the other traveler’s housing need.
- Their available home could meet yours if the destination, dates, and terms fit.
- Even when a reciprocal stay does not fit, a one-way sublease could still benefit both people.

The result is a potential introduction, with the reasons and unresolved conditions clearly explained. Both people decide whether to connect and agree on an arrangement.

The broader value is making existing resources useful to more people: less unused housing, easier travel, and connections that benefit both sides. Travel is the first example of a general system for discovering complementary intentions.

## Why search through agents?

A profile describes a person. An intention describes what would make a connection useful right now.

“I’ll be away for a week” and “I need a place in your city” use different words but may describe the two sides of one useful connection. Finding that opportunity requires understanding dates, origin and destination, housing availability, and willingness to share. Travel alone does not imply permission to offer someone’s home.

The search challenge is to retrieve complementary intentions, check practical constraints, and explain the fit using evidence. Shared interests alone are not enough.

## The flow

1. **Memory from AI tools.** Import or paste a selected memory summary or conversation excerpt. The user chooses what enters the system.
2. **Connect intention.** Extract needs, offers, goals, and relevant constraints. Let the user edit and approve each intention before making it discoverable.
3. **Search others’ agents.** Search approved intention summaries and evaluate candidates for complementary needs, timing, location, and preferences.
4. **Explain the connection.** Show what each person needs or offers, why the match is useful, and which approved facts support it. Distinguish evidence from inference.
5. **Connect people.** Let both people accept an introduction before revealing contact details or sharing further context.

## Proposed hackathon MVP

Build one working path from personal context to an explained introduction:

- Paste or upload a small text export from an AI tool; use synthetic examples for other participants.
- Extract a structured intention with a need, an offer where applicable, constraints, and supporting excerpts.
- Review and approve the intention before indexing it.
- Retrieve candidates by meaning, then rerank for complementary needs and offers and explicit constraints.
- Display a short ranked list with evidence, uncertainties, and reasons a candidate fits.
- Demonstrate an introduction request and mutual acceptance; clearly label any simulated participant actions.

Start with a small, curated dataset of travel and temporary-housing intentions. Include misleading keyword matches and candidates that fail a timing, destination, or housing constraint so the demo can show meaningful retrieval decisions. The broader personal and professional use cases remain part of the product vision.

Direct integrations with every AI tool, autonomous outreach, payments, and a production messaging system are future work. The initial import path should make the core search behavior testable within the hackathon.

## Search design to validate

```text
Selected memory
    → intention extraction
    → user review and sharing approval
    → searchable intention index
    → candidate retrieval
    → constraint checks and mutual-fit ranking
    → evidence-backed explanation
    → introduction request and mutual acceptance
```

Proposed searchable fields:

| Field | Purpose |
| --- | --- |
| Need / goal | What the person wants help with or wants to do |
| Offer | What they can contribute to a connection |
| Topic / context | Information needed to understand the intention |
| Constraints | Date ranges, origin and destination, housing availability, budget or terms, and explicit preferences |
| Evidence | Approved excerpts that support the intention |
| Sharing scope | Who may discover this intention |

Retrieve using the relationship between a need and a possible offer, alongside semantic similarity. Apply explicit constraints before presenting results. Rank for usefulness to both sides, and allow “no suitable match” when the evidence is insufficient.

This is a proposed architecture. The stack, retrieval method, ranking implementation, and agent interface remain open.

## Demo that makes the idea clear

1. Start with a natural intention: “I’m going from San Francisco to Seoul December 1–8 and want to sublease my San Francisco apartment while I’m away.” Use synthetic dates and participants for the demo.
2. Import a short memory excerpt and show the extracted dates, locations, and housing offer for approval. Ask for missing terms instead of inventing them.
3. Search a dataset containing a Seoul resident seeking a San Francisco stay for those dates, someone traveling during a different week, and someone visiting another US city.
4. Show why the first traveler fits, with evidence for the date overlap and need–offer relationship. If they also explicitly offer a Seoul home, evaluate that reciprocal opportunity separately; flag any unknown terms.
5. Compare against a simple keyword baseline on the same dataset.
6. Finish with an introduction request and a clearly labeled simulation of mutual acceptance.

The demo should answer: **Why could these two people find each other through their agents when a conventional profile or keyword search would miss the opportunity?**

## What would make this competitive?

The [event page](https://luma.com/e13wf1bd) lists innovation, technical execution, search intelligence, and impact as judging criteria.

| Criterion | What we aim to demonstrate |
| --- | --- |
| Innovation | Searching personal intentions through agents to discover useful human connections |
| Technical execution | A working import → approval → retrieval → explanation → introduction flow |
| Search intelligence | Complementary intent retrieval, constraint handling, evidence, and a keyword baseline comparison |
| Impact | A connection where both people can explain why accepting would help them |

Evaluate a small set of labeled scenarios: whether a useful candidate appears in the top three, whether explicit constraints are respected, and whether explanations are supported by approved evidence. Report measured results after implementation.

The longer-term success metric is **mutually accepted, useful introductions**.

## Sharing and trust

- Raw AI conversation history stays private by default; only explicitly approved content becomes searchable.
- Users can edit or remove shared intentions and control their audience.
- Another person’s agent receives only the information approved for that audience.
- Search results must not invent needs, offers, availability, or willingness to connect.
- Introductions require both people’s acceptance before contact information is revealed.

These are product requirements for implementation, not claims about protections already built.

## Project status

Initial concept and hackathon plan. This repository currently contains this README; no application, AI-tool integration, search index, or agent protocol has been implemented yet. Setup instructions and demo results will be added as the working prototype takes shape.
