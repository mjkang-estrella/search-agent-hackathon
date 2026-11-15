import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { C } from "../theme";
import { cue } from "../timing";
import { Appear, Card, fillCenter, Tag, useIn } from "../ui";

// The Seoul memory, verbatim from convex/fixtures/persona.ts, with the phrases the narration points at.
const PARAGRAPHS: { text: string; mark?: string }[][] = [
  [
    { text: "My first trip to Seoul is booked for April, about ten days. I spent last night saving restaurants, then realized " },
    { text: "I couldn't tell which dishes were vegetarian.", mark: "cant tell whats vegetarian" },
    { text: " The subway map is still open in another tab." },
  ],
  [
    { text: "I've kept up my Korean app lessons, but " },
    { text: "when I tried saying a simple order out loud, my mind went blank.", mark: "speaking is harder" },
    { text: " Reading the answer is much easier than saying it. " },
    { text: "There's no room in my trip budget for tutoring.", mark: "cant afford a tutor" },
    { text: " Most evenings I'm home after 7pm." },
  ],
];

function Mark({ text, phrase }: { text: string; phrase: string }) {
  const p = useIn(cue("memory", phrase, -4), 14);
  return (
    <span style={{ backgroundImage: `linear-gradient(${C.peach}, ${C.peach})`, backgroundRepeat: "no-repeat", backgroundSize: `${p * 100}% 100%`, borderRadius: 6, padding: "2px 2px", color: C.ink }}>
      {text}
    </span>
  );
}

const INTENTIONS = [
  { phrase: "vegetarian food", title: "Find vegetarian Seoul dishes", aim: "Identify which saved Seoul restaurants have vegetarian-friendly dishes for an upcoming trip in April." },
  { phrase: "free speaking practice", title: "Practice Korean speaking", aim: "Get help speaking simple Korean orders out loud for an upcoming trip." },
];

export function Memory() {
  const frame = useCurrentFrame();
  const tLooking = cue("memory", "relay starts looking");
  const tTwo = cue("memory", "it finds two intentions");
  const shift = useIn(tTwo - 10, 24);

  return (
    <AbsoluteFill style={fillCenter}>
      {/* The memory arrives through the MCP tool call. */}
      <Appear at={3} style={{ position: "absolute", top: 64, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 22, fontSize: 26, fontWeight: 600 }}>
          <Tag bg={C.form} color={C.ink} style={{ fontSize: 26, padding: "12px 24px", boxShadow: "0 6px 20px rgba(87,73,110,.12)" }}>
            <Sparkles size={24} color={C.purpleStrong} /> Your AI
          </Tag>
          <ArrowRight size={30} color={C.inkMuted} />
          <code style={{ fontFamily: "ui-monospace, monospace", fontSize: 26, background: C.ink, color: "#fff", padding: "10px 18px", borderRadius: 12 }}>add_memory</code>
          <ArrowRight size={30} color={C.inkMuted} />
          <Tag bg={C.form} color={C.ink} style={{ fontSize: 26, padding: "12px 24px", boxShadow: "0 6px 20px rgba(87,73,110,.12)" }}>
            <Img src={staticFile("brand/relay-icon-512.png")} style={{ width: 30, height: 30 }} /> Relay memory MCP
          </Tag>
        </div>
      </Appear>

      <div style={{ position: "absolute", top: 190, left: 470 - 330 * shift, width: 980 }}>
        <Appear at={cue("memory", "heres a sample", -6)}>
          <Card style={{ padding: 44 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <Tag>Sample memory</Tag>
              <span style={{ fontSize: 22, color: C.inkMuted, fontWeight: 600 }}>Saved by a personal agent</span>
            </div>
            {PARAGRAPHS.map((para, i) => (
              <p key={i} style={{ fontSize: 31, lineHeight: 1.55, margin: "22px 0 0", color: C.inkMuted }}>
                {para.map((seg, j) => (seg.mark ? <Mark key={j} text={seg.text} phrase={seg.mark} /> : <span key={j}>{seg.text}</span>))}
              </p>
            ))}
          </Card>
        </Appear>
        <Appear at={tLooking} style={{ marginTop: 26, display: "flex", justifyContent: "center" }}>
          <Tag style={{ fontSize: 26, padding: "12px 24px", background: C.purple }}>
            <Loader2 size={26} style={{ transform: `rotate(${frame * 12}deg)` }} /> Looking for people & opportunities
          </Tag>
        </Appear>
      </div>

      <div style={{ position: "absolute", top: 250, right: 120, width: 640, display: "flex", flexDirection: "column", gap: 26 }}>
        <Appear at={tTwo}>
          <div style={{ fontSize: 30, fontWeight: 700, color: C.inkMuted }}>What you want</div>
        </Appear>
        {INTENTIONS.map((it) => (
          <Appear key={it.title} at={cue("memory", it.phrase, -6)} dx={50} dy={0}>
            <Card style={{ background: C.lavender, padding: 34, boxShadow: "0 18px 40px rgba(87,73,110,.14)" }}>
              <div style={{ fontSize: 38, fontWeight: 700, lineHeight: 1.2 }}>{it.title}</div>
              <div style={{ fontSize: 24, color: C.inkMuted, marginTop: 8, fontWeight: 600 }}>You need</div>
              <div style={{ fontSize: 25, color: C.inkMuted, marginTop: 14, lineHeight: 1.4 }}>{it.aim}</div>
            </Card>
          </Appear>
        ))}
      </div>
    </AbsoluteFill>
  );
}
