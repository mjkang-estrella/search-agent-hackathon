import { v, type Infer } from "convex/values";

// Shared shapes for intentions. The MCP tools, the dashboard, and the
// Convex functions all use these, so a field change happens in one place.

export const category = v.union(
  v.literal("startup"),
  v.literal("career"),
  v.literal("creative"),
  v.literal("technical"),
  v.literal("learning"),
  v.literal("community"),
  v.literal("personal"),
  v.literal("other"),
);

// What the person wants out of discovery.
export const seeking = v.union(
  v.literal("people"),
  v.literal("opportunities"),
  v.literal("both"),
);

export const status = v.union(
  v.literal("active"),
  v.literal("paused"),
  v.literal("done"),
);

// "private" constraints shape matching on the owner's side but are never
// shown to other members or sent to public search.
export const constraint = v.object({
  text: v.string(),
  strength: v.union(v.literal("hard"), v.literal("soft")),
  visibility: v.union(v.literal("network"), v.literal("private")),
});

export const source = v.union(
  v.literal("claude"),
  v.literal("chatgpt"),
  v.literal("dashboard"),
  v.literal("seed"),
);

// Fields a client may set when creating or editing an intention.
export const editableFields = {
  aim: v.string(),
  blocker: v.optional(v.string()),
  contributions: v.array(v.string()),
  timing: v.optional(v.string()),
  location: v.optional(v.string()),
  constraints: v.array(constraint),
  category,
  seeking,
  // Who or what would help, as the agent understood it. Drives search.
  counterpart: v.optional(v.string()),
  // Words from the conversation that support this intention. Private.
  excerpts: v.array(v.string()),
};

export const editablePatch = v.object({
  aim: v.optional(v.string()),
  blocker: v.optional(v.string()),
  contributions: v.optional(v.array(v.string())),
  timing: v.optional(v.string()),
  location: v.optional(v.string()),
  constraints: v.optional(v.array(constraint)),
  category: v.optional(category),
  seeking: v.optional(seeking),
  counterpart: v.optional(v.string()),
  excerpts: v.optional(v.array(v.string())),
});

export type Category = Infer<typeof category>;
export type Seeking = Infer<typeof seeking>;
export type Status = Infer<typeof status>;
export type Constraint = Infer<typeof constraint>;
export type Source = Infer<typeof source>;
export type EditablePatch = Infer<typeof editablePatch>;
