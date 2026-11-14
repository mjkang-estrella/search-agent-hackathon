import assert from "node:assert/strict";
import { test } from "node:test";
import type { FunctionReturnType } from "convex/server";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";

const modules = {
  "./board.ts": () => import("../convex/board"),
  "./_generated/server.ts": () => import("../convex/_generated/server"),
};

async function fixture() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const sessionId = await ctx.db.insert("demoSessions", { createdAt: 0 });
    const other = await ctx.db.insert("demoSessions", { createdAt: 0 });
    const memoryIds = [];
    for (let i = 0; i < 301; i++) {
      memoryIds.push(await ctx.db.insert("memorySources", {
        sessionId, scenarioId: null, title: `Memory ${i}`, text: i === 0 ? "A pottery class in the community" : `A memory about gardening ${i}`,
        createdAt: i,
      }));
    }
    const foreignId = await ctx.db.insert("memorySources", { sessionId: other, scenarioId: null, text: "A pottery class", createdAt: 500 });
    return { sessionId, other, memoryIds, foreignId };
  });
  return { t, ...ids };
}

test("pages all 301 memories in timestamp order without duplicates", async () => {
  const { t, sessionId, memoryIds } = await fixture();
  let cursor: string | null = null;
  const seen: string[] = [];
  for (;;) {
    const result: FunctionReturnType<typeof api.board.listMemories> = await t.query(api.board.listMemories, { sessionId, search: "  ", paginationOpts: { numItems: 25, cursor } });
    assert.ok(result.page.length <= 25);
    assert.ok(result.page.every((m) => !("text" in m) && !("intentions" in m)));
    seen.push(...result.page.map((m) => m._id));
    if (result.isDone) break;
    cursor = result.continueCursor;
  }
  assert.deepEqual(seen, [...memoryIds].reverse());
});

test("search finds old memories beyond the first page and stays within the session", async () => {
  const { t, sessionId, memoryIds } = await fixture();
  const result: FunctionReturnType<typeof api.board.listMemories> = await t.query(api.board.listMemories, { sessionId, search: " pottery ", paginationOpts: { numItems: 25, cursor: null } });
  assert.deepEqual(result.page.map((m) => m._id), [memoryIds[0]]);
  const none = await t.query(api.board.listMemories, { sessionId, search: "astronaut", paginationOpts: { numItems: 25, cursor: null } });
  assert.equal(none.page.length, 0);
  assert.equal(none.isDone, true);
});

test("selected details return only the requested memory and reject a foreign memory", async () => {
  const { t, sessionId, memoryIds, foreignId } = await fixture();
  const result = await t.query(api.board.get, { sessionId, memoryId: memoryIds[0] });
  assert.ok(result);
  assert.deepEqual(result.memories.map((m) => m._id), [memoryIds[0]]);
  assert.equal(result.memories[0].text, "A pottery class in the community");
  const foreign = await t.query(api.board.get, { sessionId, memoryId: foreignId });
  assert.deepEqual(foreign, { memories: [], proposals: [] });
});

test("guest queries cannot open or search a signed-in user's board", async () => {
  const { t } = await fixture();
  const sessionId = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { name: "Sample account" });
    const sessionId = await ctx.db.insert("demoSessions", { createdAt: 0, userId });
    await ctx.db.insert("memorySources", { sessionId, scenarioId: null, text: "A pottery class", createdAt: 0 });
    return sessionId;
  });
  assert.equal(await t.query(api.board.get, { sessionId }), null);
  const list = await t.query(api.board.listMemories, { sessionId, search: "pottery", paginationOpts: { numItems: 25, cursor: null } });
  assert.deepEqual(list.page, []);
});
