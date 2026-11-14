// Boards, who may open them, and the signed-in user's memory MCP link.
// A guest board is opened by its id, which only that browser knows. A signed-in user's board opens only for them.
import { ConvexError, v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internalMutation, internalQuery, mutation, query, type ActionCtx, type QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";

const NO_ACCESS = "This board belongs to another account. Sign in to open it.";

/** The board, or null when it doesn't exist or belongs to someone other than the caller. */
export async function sessionAccess(ctx: QueryCtx, sessionId: Id<"demoSessions">): Promise<Doc<"demoSessions"> | null> {
  const session = await ctx.db.get(sessionId);
  if (!session) return null;
  if (!session.userId) return session;
  return (await getAuthUserId(ctx)) === session.userId ? session : null;
}

export async function requireSession(ctx: QueryCtx, sessionId: Id<"demoSessions">): Promise<Doc<"demoSessions">> {
  const session = await sessionAccess(ctx, sessionId);
  if (!session) throw new ConvexError(NO_ACCESS);
  return session;
}

/** The same check for actions, which have no database access of their own. */
export async function requireSessionInAction(ctx: ActionCtx, sessionId: Id<"demoSessions">): Promise<void> {
  const owner = await ctx.runQuery(internal.sessions.ownerOf, { sessionId });
  if (owner === undefined) throw new ConvexError(NO_ACCESS);
  // getAuthUserId accepts an action ctx at runtime; its type only lists the query ctx.
  if (owner !== null && (await getAuthUserId(ctx as unknown as QueryCtx)) !== owner) throw new ConvexError(NO_ACCESS);
}

/** The board's owner: undefined when the board is missing, null for a guest board. */
export const ownerOf = internalQuery({
  args: { sessionId: v.id("demoSessions") },
  handler: async (ctx, { sessionId }): Promise<Id<"users"> | null | undefined> => {
    const session = await ctx.db.get(sessionId);
    return session ? (session.userId ?? null) : undefined;
  },
});

async function latestBoard(ctx: QueryCtx, userId: Id<"users">) {
  return ctx.db.query("demoSessions").withIndex("by_user", (q) => q.eq("userId", userId)).order("desc").first();
}

/**
 * Returns the board this browser should show. A signed-in user gets their latest board; on their first
 * sign-in, the guest board in this browser becomes theirs. A guest keeps their stored board or gets a new one.
 */
export const openSession = mutation({
  args: { stored: v.optional(v.string()) },
  returns: v.id("demoSessions"),
  handler: async (ctx, { stored }) => {
    const userId = await getAuthUserId(ctx);
    const storedId = stored ? ctx.db.normalizeId("demoSessions", stored) : null;
    const guest = storedId ? await ctx.db.get(storedId) : null;
    if (userId === null) {
      if (guest && !guest.userId) return guest._id;
      return ctx.db.insert("demoSessions", { createdAt: Date.now() });
    }
    const own = await latestBoard(ctx, userId);
    if (own) return own._id;
    if (guest && !guest.userId) {
      // A legacy per-board key would otherwise keep writing into the user's board.
      await ctx.db.patch(guest._id, { userId, mcpKey: undefined });
      return guest._id;
    }
    return ctx.db.insert("demoSessions", { createdAt: Date.now(), userId });
  },
});

/** Starts an empty board. A signed-in user's memory MCP link moves to it. */
export const startOver = mutation({
  args: {},
  returns: v.id("demoSessions"),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    return ctx.db.insert("demoSessions", { createdAt: Date.now(), ...(userId ? { userId } : {}) });
  },
});

export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    const user = userId ? await ctx.db.get(userId) : null;
    return user ? { name: user.name ?? null, email: user.email ?? null, image: user.image ?? null } : null;
  },
});

// ---------- Memory MCP link ----------

function mcpUrl(key: string): string {
  return `${process.env.CONVEX_SITE_URL ?? ""}/mcp?key=${key}`;
}

function newKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export const getConnection = query({
  args: { sessionId: v.id("demoSessions") },
  handler: async (ctx, { sessionId }) => {
    const session = await sessionAccess(ctx, sessionId);
    if (!session) return null;
    const userId = await getAuthUserId(ctx);
    const user = userId ? await ctx.db.get(userId) : null;
    return { signedIn: user !== null, mcpUrl: user?.mcpKey ? mcpUrl(user.mcpKey) : null, persona: session.persona ?? null };
  },
});

async function requireUser(ctx: QueryCtx): Promise<Doc<"users">> {
  const userId = await getAuthUserId(ctx);
  const user = userId ? await ctx.db.get(userId) : null;
  if (!user) throw new ConvexError("Sign in with Google to connect an agent");
  return user;
}

/** Returns the signed-in user's memory MCP address, creating it on first use. */
export const enableMcp = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    if (user.mcpKey) return mcpUrl(user.mcpKey);
    const key = newKey();
    await ctx.db.patch(user._id, { mcpKey: key });
    return mcpUrl(key);
  },
});

/** Replaces the memory MCP address. Agents using the old one stop working. */
export const replaceMcpLink = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const key = newKey();
    await ctx.db.patch(user._id, { mcpKey: key });
    return mcpUrl(key);
  },
});

/** The board a memory MCP key writes to: the user's latest board, or a legacy guest board's own key. */
export const boardForMcpKey = internalMutation({
  args: { key: v.string() },
  handler: async (ctx, { key }): Promise<Id<"demoSessions"> | null> => {
    const user = await ctx.db.query("users").withIndex("by_mcp_key", (q) => q.eq("mcpKey", key)).first();
    if (user) {
      const own = await latestBoard(ctx, user._id);
      return own?._id ?? (await ctx.db.insert("demoSessions", { createdAt: Date.now(), userId: user._id }));
    }
    const legacy = await ctx.db.query("demoSessions").withIndex("by_mcp_key", (q) => q.eq("mcpKey", key)).first();
    return legacy?._id ?? null;
  },
});
