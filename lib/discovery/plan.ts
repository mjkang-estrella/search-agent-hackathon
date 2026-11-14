import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { SearchQuery } from "./types.ts";

// The fields of an intention that may leave the owner's account. Private
// constraints, excerpts, and the owner's name never reach this function.
export interface PublicBrief {
  aim: string;
  counterpart?: string;
  contributions: string[];
  location?: string;
  constraints: string[];
}

const Plan = z.object({
  queries: z.array(
    z.object({
      platform: z.enum(["x", "linkedin", "substack"]),
      query: z.string().describe("A short natural-language search, 3 to 8 words. No quotes or boolean operators."),
      why: z.string().describe("Which signal this query looks for, in a few words."),
    }),
  ),
});

const SYSTEM = `You plan searches of public posts to find people who match a counterpart description.

Write 8 to 10 short queries across X, LinkedIn, and Substack. Search for signals, not job titles:
- people describing work they did that matches the needed skill
- people showing they are free or about to move (left a job, side project, "what's next")
- people asking for what the requester offers
Spread queries across platforms; X is best for build-in-public posts, LinkedIn for job changes, Substack for build logs.
Never include the requester's name, company, or anything identifying them.`;

const client = new Anthropic();

export async function planSearch(brief: PublicBrief): Promise<SearchQuery[]> {
  const response = await client.beta.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 8000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: betaZodOutputFormat(Plan) },
    system: SYSTEM,
    messages: [{ role: "user", content: JSON.stringify(brief, null, 2) }],
  });
  if (!response.parsed_output) throw new Error(`Planning returned no result (${response.stop_reason})`);
  return response.parsed_output.queries.slice(0, 10);
}
