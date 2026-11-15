// Scene lengths and cue points come from the ElevenLabs word timings, so visuals land on the spoken words.
import hook from "../public/audio/hook.json";
import memory from "../public/audio/memory.json";
import telem from "../public/audio/telem.json";
import member from "../public/audio/member.json";
import action from "../public/audio/action.json";
import business from "../public/audio/business.json";
import close from "../public/audio/close.json";

export type Word = { text: string; start: number; end: number };
export type Clip = { duration: number; words: Word[] };

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
/** Silence before each narration clip starts, and after it ends. */
const LEAD = 0.45;
const TAIL = 0.6;
const EXTRA_TAIL: Partial<Record<SceneId, number>> = { close: 1.8 };

export const ORDER = ["hook", "memory", "telem", "member", "action", "business", "close"] as const;
export type SceneId = (typeof ORDER)[number];
const CLIPS: Record<SceneId, Clip> = { hook, memory, telem, member, action, business, close };

export const LEAD_FRAMES = Math.round(LEAD * FPS);
export const clip = (id: SceneId) => CLIPS[id];
export const sceneFrames = (id: SceneId) => Math.ceil((LEAD + CLIPS[id].duration + TAIL + (EXTRA_TAIL[id] ?? 0)) * FPS);
export const TOTAL_FRAMES = ORDER.reduce((n, id) => n + sceneFrames(id), 0);

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Frame (relative to the scene start) where `phrase` begins in the narration. Throws if the phrase isn't spoken. */
export function cue(id: SceneId, phrase: string, offset = 0): number {
  const words = CLIPS[id].words;
  const spoken = words.map((w) => norm(w.text));
  const target = phrase.split(/\s+/).map(norm).filter(Boolean);
  for (let i = 0; i <= spoken.length - target.length; i++) {
    if (target.every((t, j) => spoken[i + j] === t)) return Math.round((LEAD + words[i].start) * FPS) + offset;
  }
  throw new Error(`Cue not found in ${id}: "${phrase}"`);
}
