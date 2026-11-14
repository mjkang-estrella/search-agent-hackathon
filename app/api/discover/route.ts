import { ConvexHttpClient } from "convex/browser";
import { ConvexError } from "convex/values";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { runDiscovery } from "@/lib/discovery/run.ts";
import { DEMO_OWNER_ID } from "@/lib/demo";

export const maxDuration = 300;

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Starts a live discovery run and returns at once. The dashboard follows
// progress through the run record in Convex.
export async function POST(req: Request) {
  const { intentionId } = (await req.json()) as { intentionId?: string };
  if (!intentionId) return Response.json({ error: "Missing intentionId." }, { status: 400 });
  const id = intentionId as Id<"intentions">;

  try {
    const runId = await convex.mutation(api.runs.create, { intentionId: id, ownerId: DEMO_OWNER_ID });
    const data = await convex.query(api.intentions.get, { id, ownerId: DEMO_OWNER_ID });
    void runDiscovery(convex, runId, data!.intention);
    return Response.json({ runId });
  } catch (e) {
    const message = e instanceof ConvexError ? String(e.data) : e instanceof Error ? e.message : "Could not start.";
    return Response.json({ error: message }, { status: 400 });
  }
}
