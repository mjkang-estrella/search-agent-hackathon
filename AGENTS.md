# Project instructions

Use the pstack skills at https://github.com/cursor/plugins/tree/main/pstack during planning and implementation. Read the relevant skill before applying it. Follow the user's model choices rather than substituting pstack's default providers.

Apply the pstack unslop skill to documentation, implementation notes, and user-facing explanations. Its source is https://github.com/cursor/plugins/blob/main/pstack/skills/unslop/SKILL.md. Use the technical-writing skill for documentation structure and sentences.

The stack is Next.js, TypeScript, Convex, Telem AI, and OpenAI. Convex hosts the backend and Vercel hosts the app.

This is a hackathon demo for general consumers, not an enterprise product. Optimize for a working, intuitive demo. Do not add permission, approval, or sharing-review steps. Memories arrive through Wayfinder's memory MCP (`convex/http.ts`) or the demo persona, and each one starts discovery automatically. Google sign-in (Convex Auth v2, `convex/auth.ts`) is optional for the board and required for a memory MCP link. Keep the guest path working. People search uses Telem's social providers to show public posts with source links.

The app is one page: memories, the intentions extracted from them, ways to get there, and a proposed next step. Keep the UI minimal and direct. Prefer short labels and one clear action over explanatory text.

Keep the product general across personal, professional, creative, and community intentions. The LLM proposes solutions and counterpart capabilities. Telem finds public evidence. Convex searches member intentions. Demo scenarios are sample inputs, not limits on what the app can handle.

Members, their contacts, and acceptance are synthetic. Label them as samples. Never invent public results.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
