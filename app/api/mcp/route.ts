import { createMcpHandler } from "mcp-handler";
import { ConvexHttpClient } from "convex/browser";
import { z } from "zod";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { DEMO_OWNER_ID, DEMO_OWNER_NAME, appUrl } from "@/lib/demo";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const categorySchema = z
  .enum(["startup", "career", "creative", "technical", "learning", "community", "personal", "other"])
  .describe("Closest life area for this intention.");

const seekingSchema = z
  .enum(["people", "opportunities", "both"])
  .describe("people = someone to work with or learn from; opportunities = programs, listings, events, services.");

const constraintSchema = z.object({
  text: z.string().describe("One condition, e.g. 'Full-time' or 'Based in the Bay Area'."),
  strength: z.enum(["hard", "soft"]).describe("hard = a match that breaks this is useless; soft = a preference."),
  visibility: z
    .enum(["network", "private"])
    .describe("private = used only for the owner's own checks, never shown to others."),
});

const intentionFields = {
  aim: z.string().describe("What the person is trying to achieve, in one sentence."),
  blocker: z.string().optional().describe("What is stopping them or what would help them move forward."),
  contributions: z
    .array(z.string())
    .describe("Experience, skills, or resources they could offer a counterpart."),
  timing: z.string().optional().describe("Stage and when it matters, e.g. 'Ready to start within 2 months'."),
  location: z.string().optional(),
  constraints: z.array(constraintSchema),
  category: categorySchema,
  seeking: seekingSchema,
  excerpts: z
    .array(z.string())
    .describe("Short quotes from the user's own words that support this intention."),
};

function dashboardLink(id: string) {
  return appUrl(`/intentions/${id}`);
}

function summarize(intention: Doc<"intentions">) {
  const sharing = intention.shareWithNetwork
    ? intention.allowWebSearch
      ? "shared with network, web search allowed"
      : "shared with network"
    : intention.allowWebSearch
      ? "private to network, web search allowed"
      : "private";
  return {
    id: intention._id,
    aim: intention.aim,
    category: intention.category,
    status: intention.status,
    sharing,
    revision: intention.revision,
    dashboard: dashboardLink(intention._id),
  };
}

function text(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "save_intention",
      {
        title: "Save an intention",
        description:
          "Save something the user is trying to do, is stuck on, or could offer others, so Search Agent can later find people and public opportunities for it. " +
          "Use it when the user states a concrete goal or need (e.g. 'I need a technical co-founder'), not for passing remarks. " +
          "Check list_intentions first and use update_intention if a similar one exists. " +
          "Saved intentions are private. Tell the user it was saved privately and give them the dashboard link, where they can review it and choose to share it.",
        inputSchema: z.object(intentionFields),
      },
      async (fields) => {
        const id = await convex.mutation(api.intentions.create, {
          ownerId: DEMO_OWNER_ID,
          ownerName: DEMO_OWNER_NAME,
          source: "claude",
          ...fields,
        });
        return text({
          saved: true,
          id,
          sharing: "private",
          dashboard: dashboardLink(id),
          note: "Only the user can share this, from the dashboard.",
        });
      },
    );

    server.registerTool(
      "list_intentions",
      {
        title: "List my intentions",
        description:
          "List the user's saved intentions with their status and sharing state. Use it before saving a new one, or when the user asks what they are working toward.",
        inputSchema: z.object({
          status: z.enum(["active", "paused", "done", "all"]).default("active"),
        }),
      },
      async ({ status }) => {
        const all = await convex.query(api.intentions.listMine, { ownerId: DEMO_OWNER_ID });
        const filtered = status === "all" ? all : all.filter((i) => i.status === status);
        return text({ intentions: filtered.map(summarize), dashboard: appUrl("/") });
      },
    );

    server.registerTool(
      "update_intention",
      {
        title: "Update an intention",
        description:
          "Change an existing intention when the user's goal, constraints, or progress change. Only pass fields that changed. " +
          "Set status to 'done' or 'paused' when the user says so. This tool cannot change sharing; the user does that in the dashboard.",
        inputSchema: z.object({
          id: z.string().describe("Intention id from list_intentions or save_intention."),
          patch: z.object(intentionFields).partial(),
          status: z.enum(["active", "paused", "done"]).optional(),
        }),
      },
      async ({ id, patch, status }) => {
        const result = await convex.mutation(api.intentions.update, {
          id: id as Id<"intentions">,
          ownerId: DEMO_OWNER_ID,
          source: "claude",
          patch,
          status,
        });
        return text({ ...result, dashboard: dashboardLink(id) });
      },
    );
  },
  { serverInfo: { name: "search-agent", version: "0.1.0" } },
);

export { handler as GET, handler as POST, handler as DELETE };
