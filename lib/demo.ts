// The demo has one requester and no sign-in. Every intention saved through
// MCP or edited in the dashboard belongs to this owner.
export const DEMO_OWNER_ID = process.env.NEXT_PUBLIC_DEMO_OWNER_ID ?? "demo-user";
export const DEMO_OWNER_NAME = process.env.NEXT_PUBLIC_DEMO_OWNER_NAME ?? "You";

export function appUrl(path = ""): string {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}${path}`;
}
