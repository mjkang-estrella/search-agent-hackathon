import type { Doc } from "@/convex/_generated/dataModel";

export const CATEGORY_LABELS: Record<Doc<"intentions">["category"], string> = {
  startup: "Startup",
  career: "Career",
  creative: "Creative",
  technical: "Technical",
  learning: "Learning",
  community: "Community",
  personal: "Personal",
  other: "Other",
};

export const SEEKING_LABELS: Record<Doc<"intentions">["seeking"], string> = {
  people: "Looking for people",
  opportunities: "Looking for opportunities",
  both: "People and opportunities",
};

export function Chip({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "accent" | "ok" | "warn";
}) {
  const tones = {
    neutral: "border-border text-muted",
    accent: "border-transparent bg-accent-soft text-accent",
    ok: "border-transparent bg-ok-soft text-ok",
    warn: "border-transparent bg-warn-soft text-warn",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function SharingChips({ intention }: { intention: Doc<"intentions"> }) {
  if (!intention.shareWithNetwork && !intention.allowWebSearch) {
    return <Chip>Private</Chip>;
  }
  return (
    <>
      {intention.shareWithNetwork && <Chip tone="ok">Shared with network</Chip>}
      {intention.allowWebSearch && <Chip tone="ok">Web search on</Chip>}
    </>
  );
}

export function StatusChip({ status }: { status: Doc<"intentions">["status"] }) {
  if (status === "active") return <Chip tone="accent">Active</Chip>;
  if (status === "paused") return <Chip tone="warn">Paused</Chip>;
  return <Chip>Done</Chip>;
}

export function timeAgo(ms: number): string {
  const s = Math.round((Date.now() - ms) / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return new Date(ms).toLocaleDateString();
}
