import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { extractIntentions } from "@/lib/discovery/extract.ts";
import { DEMO_OWNER_ID, DEMO_OWNER_NAME } from "@/lib/demo";

export const maxDuration = 120;

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Reads conversation text, saves what it notices as private intentions.
export async function POST(req: Request) {
  const { transcript } = (await req.json()) as { transcript?: string };
  if (!transcript?.trim()) return Response.json({ error: "Paste a conversation first." }, { status: 400 });

  try {
    const { intentions } = await extractIntentions(transcript.slice(0, 60_000));
    const ids = [];
    for (const i of intentions) {
      ids.push(
        await convex.mutation(api.intentions.create, {
          ownerId: DEMO_OWNER_ID,
          ownerName: DEMO_OWNER_NAME,
          source: "claude",
          aim: i.aim,
          blocker: i.blocker || undefined,
          counterpart: i.counterpart || undefined,
          contributions: i.contributions,
          timing: i.timing || undefined,
          location: i.location || undefined,
          constraints: i.constraints,
          category: i.category,
          seeking: i.seeking,
          excerpts: i.excerpts,
        }),
      );
    }
    return Response.json({ ids });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Extraction failed." }, { status: 500 });
  }
}
