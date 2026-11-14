import assert from "node:assert/strict";
import { test } from "node:test";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";

const modules = {
  "./board.ts": () => import("../convex/board"),
  "./sessions.ts": () => import("../convex/sessions"),
  "./_generated/api.ts": () => import("../convex/_generated/api"),
  "./_generated/server.ts": () => import("../convex/_generated/server"),
};

async function fixture() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { name: "Sample", mcpKey: "user-key" });
    const older = await ctx.db.insert("demoSessions", { createdAt: 0, userId });
    const owned = await ctx.db.insert("demoSessions", { createdAt: 1, userId });
    const guest = await ctx.db.insert("demoSessions", { createdAt: 2 });
    const legacy = await ctx.db.insert("demoSessions", { createdAt: 3, mcpKey: "legacy-key" });
    await ctx.db.insert("memorySources", { sessionId: owned, scenarioId: null, text: "A private memory", createdAt: 0 });
    return { userId, older, owned, guest, legacy };
  });
  return { t, ...ids };
}

test("a signed-in user's board is hidden from callers who are not signed in", async () => {
  const { t, owned } = await fixture();
  assert.equal(await t.query(api.board.get, { sessionId: owned }), null);
  const list = await t.query(api.board.listMemories, { sessionId: owned, search: "", paginationOpts: { numItems: 10, cursor: null } });
  assert.deepEqual(list.page, []);
  assert.equal(await t.query(api.sessions.getConnection, { sessionId: owned }), null);
});

test("guests keep their own board and never reopen a signed-in user's board", async () => {
  const { t, owned, guest } = await fixture();
  assert.equal(await t.mutation(api.sessions.openSession, { stored: guest }), guest);
  const fromOwned = await t.mutation(api.sessions.openSession, { stored: owned });
  assert.notEqual(fromOwned, owned);
  const fromGarbage = await t.mutation(api.sessions.openSession, { stored: "not-an-id" });
  assert.notEqual(fromGarbage, guest);
});

test("an MCP key writes to its user's latest board, and an unknown key finds nothing", async () => {
  const { t, owned, legacy } = await fixture();
  assert.equal(await t.mutation(internal.sessions.boardForMcpKey, { key: "user-key" }), owned);
  assert.equal(await t.mutation(internal.sessions.boardForMcpKey, { key: "legacy-key" }), legacy);
  assert.equal(await t.mutation(internal.sessions.boardForMcpKey, { key: "wrong" }), null);
});

test("connecting an agent requires sign-in", async () => {
  const { t } = await fixture();
  await assert.rejects(t.mutation(api.sessions.enableMcp, {}), /Sign in with Google/);
});
