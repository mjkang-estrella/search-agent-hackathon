import { ConvexError } from "convex/values";

/** The user-facing part of a Convex or network error. */
export function errorText(e: unknown): string {
  if (e instanceof ConvexError && typeof e.data === "string") return e.data;
  const msg = e instanceof Error ? e.message : String(e);
  const m = msg.match(/Uncaught Error: (.*?)(\n|$)/);
  return m ? m[1] : msg.replace(/^\[CONVEX[^\]]*\]\s*/, "").split("\n")[0];
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function seconds(ms: number | null | undefined): string {
  if (ms == null) return "—";
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)} s`;
}

export function ago(at: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 60) return `${s} s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 48 ? `${h} h ago` : `${Math.round(h / 24)} days ago`;
}

export function clockTime(at: number): string {
  return new Date(at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
