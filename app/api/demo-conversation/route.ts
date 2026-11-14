import { readFile } from "node:fs/promises";
import path from "node:path";

// Serves the synthetic demo conversation so the dashboard can load it.
export async function GET() {
  const text = await readFile(path.join(process.cwd(), "data/scenarios/voice-cofounder-chat.txt"), "utf8");
  return new Response(text, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
