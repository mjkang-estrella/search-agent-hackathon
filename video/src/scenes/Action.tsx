import { ArrowRight, Check, Sparkles } from "lucide-react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { C } from "../theme";
import { cue } from "../timing";
import { Appear, Card, clamp, Cursor, fillCenter, Phase, Ring, Shot, Tag, useIn } from "../ui";

const c = (phrase: string, offset = 0) => cue("action", phrase, offset);

function Mcp({ start }: { start: number }) {
  const demo = c("or from the demo", -6) - start;
  return (
    <AbsoluteFill style={fillCenter}>
      <div style={{ display: "flex", alignItems: "center", gap: 70 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 40, alignItems: "flex-end" }}>
          <Appear at={0} dx={-40} dy={0}>
            <Card style={{ display: "flex", alignItems: "center", gap: 22, padding: "28px 36px" }}>
              <Sparkles size={40} color={C.purpleStrong} />
              <div>
                <div style={{ fontSize: 34, fontWeight: 800 }}>Personal agent</div>
                <code style={{ display: "inline-block", marginTop: 10, fontFamily: "ui-monospace, monospace", fontSize: 24, background: C.ink, color: "#fff", padding: "6px 14px", borderRadius: 10 }}>add_memory</code>
              </div>
            </Card>
          </Appear>
          <Appear at={demo} dx={-40} dy={0}>
            <Card style={{ padding: 18, width: 520 }}>
              <Img src={staticFile("shots/landing.png")} style={{ width: "100%", borderRadius: 14, display: "block" }} />
              <div style={{ fontSize: 24, fontWeight: 700, marginTop: 14, textAlign: "center" }}>Try Dana&rsquo;s sample memories</div>
            </Card>
          </Appear>
        </div>
        <Appear at={6}>
          <ArrowRight size={70} color={C.purpleStrong} />
        </Appear>
        <Appear at={10} scale={0.9}>
          <Card style={{ padding: "50px 60px", display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
            <Img src={staticFile("brand/relay-icon-512.png")} style={{ width: 140, height: 140 }} />
            <div style={{ fontSize: 40, fontWeight: 800 }}>Relay memory MCP</div>
            <Tag style={{ fontSize: 22 }}>Each memory starts discovery</Tag>
          </Card>
        </Appear>
      </div>
    </AbsoluteFill>
  );
}

const STEPS = [
  { label: "Memory", phrase: "memory intention search" },
  { label: "Intention", phrase: "intention search evidence" },
  { label: "Search", phrase: "search evidence and" },
  { label: "Evidence", phrase: "evidence and action" },
  { label: "Action", phrase: "action all work" },
];

export function Pipeline({ start, scene = "action" }: { start: number; scene?: "action" }) {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={fillCenter}>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        {STEPS.map((s, i) => {
          const at = cue(scene, s.phrase, -3) - start;
          const on = interpolate(frame, [at, at + 8], [0, 1], clamp);
          return (
            <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <div style={{ padding: "26px 34px", borderRadius: 22, fontSize: 36, fontWeight: 800, background: on > 0.5 ? C.purple : C.form, color: C.ink, boxShadow: "0 10px 30px rgba(87,73,110,.12)", transform: `scale(${1 + 0.06 * on * (1 - Math.min(1, (frame - at - 8) / 10))})`, display: "flex", alignItems: "center", gap: 12, opacity: 0.4 + 0.6 * on }}>
                {on > 0.5 ? <Check size={30} color={C.green} /> : null}
                {s.label}
              </div>
              {i < STEPS.length - 1 ? <ArrowRight size={34} color={C.inkMuted} style={{ opacity: 0.4 + 0.6 * on }} /> : null}
            </div>
          );
        })}
      </div>
      <Appear at={cue(scene, "end to end", -4) - start} style={{ marginTop: 50 }}>
        <Tag bg={C.greenSoft} color={C.green} style={{ fontSize: 30, padding: "12px 28px" }}>Working end to end</Tag>
      </Appear>
    </AbsoluteFill>
  );
}

export function Action({ duration }: { duration: number }) {
  const tDraft = c("for a public post", -6);
  const tMcp = c("memories can come", -6);
  const tPipe = c("memory intention search", -10);
  const a2 = Math.round(tDraft * 0.4);
  const a3 = Math.round(tDraft * 0.72);
  const sample = useIn(a2, 12);
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Phase from={0} to={a2} fade={6}>
        <Shot src="dash-kor" pageH={2065} keys={[{ at: 0, box: [160, 40, 1300, 731] }]}>
          <Cursor points={[{ at: 6, x: 900, y: 420 }, { at: a2 - 14, x: 1264, y: 169, click: true }]} />
        </Shot>
      </Phase>
      <Phase from={a2} to={a3} fade={6}>
        <Shot src="dash-kor-intro" pageH={900} keys={[{ at: 0, box: [860, 270, 600, 320] }]}>
          <Cursor points={[{ at: 0, x: 1150, y: 450 }, { at: a3 - a2 - 10, x: 1310, y: 516, click: true }]} />
        </Shot>
      </Phase>
      <Phase from={a3} to={tDraft} fade={6}>
        <Shot src="dash-kor-accepted" pageH={900} keys={[{ at: 0, box: [860, 270, 600, 320] }]}>
          <Ring box={[1278, 497, 125, 39]} at={4} pad={6} radius={26} />
        </Shot>
      </Phase>
      <AbsoluteFill style={{ alignItems: "flex-end", padding: "80px 110px", opacity: Math.min(sample, interpolate(frame, [tDraft - 8, tDraft], [1, 0], clamp)) }}>
        <Tag bg={C.peachSoft} color={C.peachInk} style={{ fontSize: 24 }}>Sample member · simulated acceptance</Tag>
      </AbsoluteFill>
      <Phase from={tDraft} to={tMcp}>
        <Shot src="guided-draft" pageH={900} keys={[{ at: 0, box: [380, 150, 840, 470] }]}>
          <Ring box={[440, 374, 720, 141]} at={22} />
          <Cursor points={[{ at: 30, x: 900, y: 600 }, { at: tMcp - tDraft - 22, x: 527, y: 563, click: true }]} />
        </Shot>
      </Phase>
      <Phase from={tMcp} to={tPipe}>
        <Mcp start={tMcp} />
      </Phase>
      <Phase from={tPipe} to={duration}>
        <Pipeline start={tPipe} />
      </Phase>
    </AbsoluteFill>
  );
}
