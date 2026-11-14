---
version: 2
slug: "app"
primary_target: "app"
related_targets: []
---

# Relay app surface

Scope: everything under `app/`. That is the one-page board (`/`), the run page "How we found these" (`/r/[runId]`), its Sources tab (`/r/[runId]/evidence`), and `/evaluation`. Mode: Operate. Primary moment: the selected intention's people and opportunities, each showing where it came from.

Audience and job: a general consumer opens a memory, reads what Relay found in it, and takes one step: say hi to a sample member, open a page, or read a public post. Judges watch over a laptop screen share.

Constraints: Sample members, simulated acceptance, and replayed runs are labeled wherever they appear. Fit is shown in words ("Great fit"), never as a percentage. No approval or sharing-review steps. Avoid AI-chat chrome, terminal traces, swipe or match-score idioms, and dense enterprise dashboards.

## Direction contract

THESIS: A calm board of white cards on a cool light ground, with airmail blue for the selected item and the one next step. Postmarks appear only where a claim's source needs naming: an Inferred postmark on LLM ideas and a Public source postmark on Telem sources.

OWN-WORLD: Airmail blue `#1D3F8F` for selection, the proposal block, and primary actions. Cool ground `#F4F6FA`, white cards with a soft shadow, rounded `2xl` cards and `3xl` feature blocks, pill buttons. Kraft only for "Great fit" and unknowns; red only for failures. Public Sans with tabular figures. See DESIGN.md for tokens.

STORY: The member picks a memory, sees the intentions in it, and acts on a person, a page, or a post. "How we found these" shows the same search as a flow chart, with the same totals as the board.

FIRST VIEWPORT: The Relay mark and account controls on the light ground; the airmail-blue "Idea for you" block with one action; then three columns: memories, what you want, people and opportunities.

FORM: One page with three columns that stack on phones. The memory list becomes a horizontal row below 1024px.

Signature interaction: postmarks stamp in once (a short scale-and-settle) when a run page opens.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
