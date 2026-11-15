import React, { createContext, useContext } from "react";
import { AbsoluteFill, Easing, Img, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT } from "./theme";
import { clip, type SceneId } from "./timing";

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.bezier(0.33, 0, 0.2, 1);

/** 0 → 1 spring that starts at `at`. */
export function useIn(at: number, durationInFrames = 20) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - at, fps, durationInFrames, config: { damping: 200 } });
}

export function Background() {
  return (
    <AbsoluteFill style={{ background: C.ground }}>
      <div style={{ position: "absolute", width: 900, height: 900, left: -300, top: -380, borderRadius: "50%", background: C.purple, opacity: 0.45, filter: "blur(120px)" }} />
      <div style={{ position: "absolute", width: 900, height: 900, right: -320, bottom: -420, borderRadius: "50%", background: C.peach, opacity: 0.5, filter: "blur(120px)" }} />
    </AbsoluteFill>
  );
}

/** Fades and lifts children in at `at`. */
export function Appear({ at, dy = 28, dx = 0, scale = 1, style, children }: { at: number; dy?: number; dx?: number; scale?: number; style?: React.CSSProperties; children: React.ReactNode }) {
  const p = useIn(at);
  return (
    <div style={{ ...style, opacity: p, transform: `translate(${(1 - p) * dx}px, ${(1 - p) * dy}px) scale(${scale + (1 - scale) * p})` }}>
      {children}
    </div>
  );
}

/** Shows children between `from` and `to` (scene frames), with a short crossfade at both ends. Children see local frames. */
export function Phase({ from, to, fade = 9, children }: { from: number; to: number; fade?: number; children: React.ReactNode }) {
  const frame = useCurrentFrame();
  const opacity = Math.min(interpolate(frame, [from, from + fade], [0, 1], clamp), interpolate(frame, [to - fade, to], [1, 0], clamp));
  return (
    <Sequence from={from} durationInFrames={to - from} layout="none">
      <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>
    </Sequence>
  );
}

export function Card({ style, children }: { style?: React.CSSProperties; children: React.ReactNode }) {
  return (
    <div style={{ background: C.form, borderRadius: 28, boxShadow: "0 1px 2px rgba(36,40,51,.06), 0 18px 48px rgba(87,73,110,.12)", padding: 36, ...style }}>
      {children}
    </div>
  );
}

export function Tag({ children, color = C.purpleStrong, bg = C.soft, style }: { children: React.ReactNode; color?: string; bg?: string; style?: React.CSSProperties }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 999, padding: "6px 16px", fontSize: 22, fontWeight: 700, color, background: bg, whiteSpace: "nowrap", ...style }}>
      {children}
    </span>
  );
}

export function Eyebrow({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: C.inkMuted, ...style }}>{children}</div>;
}

/** The app's dashed "INFERRED · LLM" stamp. */
export function Stamp({ top, bottom, at, rotate = -6, color = C.inkMuted, style }: { top: string; bottom: string; at: number; rotate?: number; color?: string; style?: React.CSSProperties }) {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [at, at + 8, at + 12], [0, 1.08, 1], clamp);
  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", border: `3px dashed ${color}`, borderRadius: 999, padding: "8px 26px", color, opacity: Math.min(1, p) * 0.9, transform: `rotate(${rotate}deg) scale(${p === 0 ? 1.3 : p})`, ...style }}>
      <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: "0.14em" }}>{top}</span>
      <span style={{ width: 60, height: 2, background: color, margin: "4px 0" }} />
      <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "0.14em" }}>{bottom}</span>
    </div>
  );
}

/** Reveals `text` character by character from `at`. */
export function Typed({ text, at, cps = 40, caret = false }: { text: string; at: number; cps?: number; caret?: boolean }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = Math.max(0, Math.floor(((frame - at) / fps) * cps));
  const done = n >= text.length;
  return (
    <>
      {text.slice(0, n)}
      {caret && (!done || Math.floor(frame / 15) % 2 === 0) ? <span style={{ color: C.purpleStrong, fontWeight: 400 }}>|</span> : null}
    </>
  );
}

/** Burned-in captions grouped into short phrases. */
export function Captions({ id, offset }: { id: SceneId; offset: number }) {
  const frame = useCurrentFrame();
  const t = (frame - offset) / 30;
  const words = clip(id).words;
  // Split into sentences, then split long sentences into even pieces of at most 8 words.
  const sentences: (typeof words)[] = [[]];
  words.forEach((w, i) => {
    sentences[sentences.length - 1].push(w);
    if (/[.:?!]["”]?$/.test(w.text) && i < words.length - 1) sentences.push([]);
  });
  const chunks: { text: string; start: number; end: number }[] = [];
  for (const s of sentences) {
    const size = Math.ceil(s.length / Math.ceil(s.length / 8));
    for (let i = 0; i < s.length; i += size) {
      const part = s.slice(i, i + size);
      chunks.push({ text: part.map((w) => w.text).join(" "), start: part[0].start, end: part[part.length - 1].end });
    }
  }
  // Hold each chunk until the next one starts, so captions don't flicker between words.
  chunks.forEach((ch, i) => (ch.end = chunks[i + 1]?.start ?? ch.end + 0.5));
  const c = chunks.find((x) => t >= x.start - 0.05 && t < x.end);
  if (!c) return null;
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 34, pointerEvents: "none" }}>
      <div style={{ maxWidth: 1500, background: "rgba(36,40,51,.86)", color: "#fff", fontFamily: FONT, fontSize: 34, fontWeight: 500, lineHeight: 1.35, padding: "10px 26px", borderRadius: 14, textAlign: "center" }}>
        {c.text.replace(/^["“]|["”]$/g, "")}
      </div>
    </AbsoluteFill>
  );
}

// ---------- App screenshots with a moving camera ----------

export type Box = [x: number, y: number, w: number, h: number];
export type CameraKey = { at: number; box: Box; move?: number };
const ScaleContext = createContext(1);

const VIEW_W = 1760;
const VIEW_H = 990;

function cameraAt(frame: number, keys: CameraKey[]) {
  const toCam = ([x, y, w, h]: Box) => ({ cx: x + w / 2, cy: y + h / 2, ls: Math.log(Math.min(VIEW_W / w, VIEW_H / h)) });
  let cam = toCam(keys[0].box);
  for (const k of keys.slice(1)) {
    const move = k.move ?? 26;
    if (frame <= k.at - move) break;
    const p = ease(interpolate(frame, [k.at - move, k.at], [0, 1], clamp));
    const next = toCam(k.box);
    cam = { cx: cam.cx + (next.cx - cam.cx) * p, cy: cam.cy + (next.cy - cam.cy) * p, ls: cam.ls + (next.ls - cam.ls) * p };
    if (p < 1) break;
  }
  return cam;
}

/** A 1600px-wide app screenshot (2x PNG) in a window frame, framed by camera keys in page CSS pixels. */
export function Shot({ src, pageH, keys, children, drift = 0.025 }: { src: string; pageH: number; keys: CameraKey[]; children?: React.ReactNode; drift?: number }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const cam = cameraAt(frame, keys);
  const s = Math.exp(cam.ls) * (1 + drift * (frame / durationInFrames));
  const tx = VIEW_W / 2 - cam.cx * s;
  const ty = VIEW_H / 2 - cam.cy * s;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "relative", width: VIEW_W, height: VIEW_H, overflow: "hidden", borderRadius: 22, background: C.ground, boxShadow: "0 2px 4px rgba(36,40,51,.08), 0 30px 80px rgba(87,73,110,.22)", border: `1px solid ${C.line}` }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: 1600, height: pageH, transformOrigin: "0 0", transform: `translate(${tx}px, ${ty}px) scale(${s})` }}>
          <Img src={staticFile(`shots/${src}.png`)} style={{ width: 1600, height: pageH, display: "block" }} />
          <ScaleContext.Provider value={s}>{children}</ScaleContext.Provider>
        </div>
      </div>
    </AbsoluteFill>
  );
}

/** A highlight ring around a page-space box inside a Shot. */
export function Ring({ box, at, pad = 8, radius = 20 }: { box: Box; at: number; pad?: number; radius?: number }) {
  const s = useContext(ScaleContext);
  const p = useIn(at, 16);
  const [x, y, w, h] = box;
  return (
    <div style={{ position: "absolute", left: x - pad, top: y - pad, width: w + pad * 2, height: h + pad * 2, borderRadius: radius, border: `${4 / s}px solid ${C.purpleStrong}`, boxShadow: `0 0 0 ${10 / s}px rgba(87,73,110,.14)`, opacity: p, transform: `scale(${1.04 - 0.04 * p})` }} />
  );
}

/** A pointer that glides between page-space points inside a Shot; `click` adds a ripple when it arrives. */
export function Cursor({ points }: { points: { at: number; x: number; y: number; click?: boolean }[] }) {
  const frame = useCurrentFrame();
  const s = useContext(ScaleContext);
  let x = points[0].x;
  let y = points[0].y;
  for (const pt of points.slice(1)) {
    const p = ease(interpolate(frame, [pt.at - 18, pt.at], [0, 1], clamp));
    x += (pt.x - x) * p;
    y += (pt.y - y) * p;
    if (p < 1) break;
  }
  const visible = interpolate(frame, [points[0].at - 6, points[0].at], [0, 1], clamp);
  return (
    <>
      {points.filter((p) => p.click).map((p) => {
        const r = interpolate(frame, [p.at, p.at + 14], [0, 1], clamp);
        if (frame < p.at || r >= 1) return null;
        return <div key={p.at} style={{ position: "absolute", left: p.x - (30 * r) / s, top: p.y - (30 * r) / s, width: (60 * r) / s, height: (60 * r) / s, borderRadius: "50%", background: C.purpleStrong, opacity: 0.35 * (1 - r) }} />;
      })}
      <svg width={30 / s} height={30 / s} viewBox="0 0 24 24" style={{ position: "absolute", left: x - 3 / s, top: y - 2 / s, opacity: visible, filter: "drop-shadow(0 2px 3px rgba(0,0,0,.3))" }}>
        <path d="M4 2 L4 19 L8.5 15 L11.5 22 L14.5 20.7 L11.6 14 L18 14 Z" fill="#111" stroke="#fff" strokeWidth={1.6} strokeLinejoin="round" />
      </svg>
    </>
  );
}

export function Logo({ width = 520, style }: { width?: number; style?: React.CSSProperties }) {
  return <Img src={staticFile("brand/relay-logo.png")} style={{ width, height: "auto", ...style }} />;
}

export function Portrait({ name, size = 96 }: { name: string; size?: number }) {
  return <Img src={staticFile(`portraits/${name}.webp`)} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />;
}

export const fillCenter: React.CSSProperties = { alignItems: "center", justifyContent: "center", fontFamily: FONT, color: C.ink };
