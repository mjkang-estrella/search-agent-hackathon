// Relay's memory MCP server. Personal agents (Grok, Dot, Muse, or any MCP client) save memories here,
// and Relay turns each one into intentions and starts looking for ways forward.
// Transport: MCP Streamable HTTP with plain JSON responses. The session key comes from ?key= or a Bearer token.
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

const PROTOCOL_VERSION = "2025-06-18";

const TOOLS = [
  {
    name: "add_memory",
    description:
      "Save something the user is working on, wants, or could offer. Relay reads it, finds the intentions in it, and searches the web and its member network for people and places that can help.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "The memory in plain words, as the user said it or as you summarized it" },
        source: { type: "string", description: "Your agent's name, for example Grok, Dot, or Muse" },
      },
      required: ["text"],
    },
  },
  {
    name: "list_memories",
    description: "List the memories saved to Relay for this user, newest first.",
    inputSchema: { type: "object", properties: {} },
  },
];

type RpcRequest = { jsonrpc: "2.0"; id?: string | number | null; method: string; params?: Record<string, unknown> };

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Mcp-Session-Id, Mcp-Protocol-Version",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...CORS } });
}

function rpcError(id: RpcRequest["id"], code: number, message: string) {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}

const mcp = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const key = url.searchParams.get("key") ?? request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const board: Id<"demoSessions"> | null = key ? await ctx.runMutation(internal.sessions.boardForMcpKey, { key }) : null;
  if (!board) return json(rpcError(null, -32001, "Unknown or missing Relay memory key"), 401);
  const sessionId = board;

  let body: RpcRequest | RpcRequest[];
  try {
    body = await request.json();
  } catch {
    return json(rpcError(null, -32700, "Parse error"), 400);
  }
  const batch = Array.isArray(body) ? body : [body];
  const responses = [];
  for (const req of batch) {
    if (req.id === undefined || req.method.startsWith("notifications/")) continue; // notifications get no response
    try {
      responses.push({ jsonrpc: "2.0", id: req.id, result: await handle(req) });
    } catch (e) {
      responses.push(rpcError(req.id, -32603, (e as Error).message));
    }
  }
  if (responses.length === 0) return new Response(null, { status: 202, headers: CORS });
  return json(Array.isArray(body) ? responses : responses[0]);

  async function handle(req: RpcRequest): Promise<unknown> {
    switch (req.method) {
      case "initialize":
        return {
          protocolVersion: (req.params?.protocolVersion as string) ?? PROTOCOL_VERSION,
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: "relay-memory", version: "0.1.0" },
          instructions: "Save the user's goals, needs, and offers with add_memory. Relay finds people and places that can help.",
        };
      case "ping":
        return {};
      case "tools/list":
        return { tools: TOOLS };
      case "tools/call": {
        const name = req.params?.name as string;
        const args = (req.params?.arguments ?? {}) as { text?: string; source?: string };
        if (name === "add_memory") {
          if (!args.text || args.text.trim().length < 20) {
            return { isError: true, content: [{ type: "text", text: "text must be at least a sentence" }] };
          }
          const ids = await ctx.runAction(internal.intentions.ingestMemory, {
            sessionId,
            text: args.text.slice(0, 8000),
            source: (args.source ?? "MCP agent").slice(0, 40),
          });
          const found = `Saved. Relay found ${ids.length} ${ids.length === 1 ? "intention" : "intentions"} and is looking for ways forward.`;
          const app = process.env.APP_URL;
          return { content: [{ type: "text", text: app ? `${found} See them at ${app}` : found }] };
        }
        if (name === "list_memories") {
          const rows = await ctx.runQuery(internal.intentions.listMemoriesForMcp, { sessionId });
          return { content: [{ type: "text", text: JSON.stringify(rows, null, 2) }] };
        }
        throw new Error(`Unknown tool ${name}`);
      }
      default:
        throw new Error(`Method not found: ${req.method}`);
    }
  }
});

const http = httpRouter();
http.route({ path: "/mcp", method: "POST", handler: mcp });
http.route({ path: "/mcp", method: "OPTIONS", handler: httpAction(async () => new Response(null, { status: 204, headers: CORS })) });
http.route({
  path: "/mcp",
  method: "GET",
  handler: httpAction(async () => new Response("Relay memory MCP: send JSON-RPC with POST", { status: 405, headers: { Allow: "POST", ...CORS } })),
});
export default http;
