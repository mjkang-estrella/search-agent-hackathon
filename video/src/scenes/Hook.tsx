import { Bookmark, Search, Sparkles } from "lucide-react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C } from "../theme";
import { cue } from "../timing";
import { Appear, Card, clamp, fillCenter, Logo, useIn } from "../ui";

// Lines from the sample Seoul memory in convex/fixtures/persona.ts.
const MESSAGES = [
  { phrase: "going to korea", text: "My first trip to Seoul is booked for April." },
  { phrase: "vegetarian", text: "I couldn't tell which dishes were vegetarian." },
  { phrase: "freeze", text: "When I tried saying a simple order out loud, my mind went blank." },
];
const ATTEMPTS = ["vegetarian restaurants seoul", "free korean speaking practice"];

function SearchAttempts({ at }: { at: number }) {
  const frame = useCurrentFrame();
  const local = frame - at;
  const per = 46;
  const i = Math.min(ATTEMPTS.length - 1, Math.max(0, Math.floor(local / per)));
  const t = local - i * per;
  const text = ATTEMPTS[i];
  const typed = Math.floor(interpolate(t, [0, 22], [0, text.length], clamp));
  const erased = i < ATTEMPTS.length - 1 ? Math.floor(interpolate(t, [32, 42], [0, text.length], clamp)) : 0;
  return (
    <>
      {local < 0 ? "" : text.slice(0, Math.max(0, typed - erased))}
      <span style={{ color: C.purpleStrong, opacity: Math.floor(frame / 14) % 2 ? 1 : 0.2 }}>|</span>
    </>
  );
}

export function Hook() {
  const frame = useCurrentFrame();
  const tSearch = cue("hook", "but when i need help");
  const tRelay = cue("hook", "we built relay");
  const away = useIn(tSearch, 24);
  const out = interpolate(frame, [tRelay - 10, tRelay + 4], [1, 0], clamp);
  const logo = useIn(tRelay, 26);

  return (
    <AbsoluteFill style={fillCenter}>
      <AbsoluteFill style={{ ...fillCenter, opacity: out }}>
        <div style={{ position: "absolute", left: 200 - 120 * away, top: 150, width: 860, transform: `scale(${1 - 0.12 * away})`, transformOrigin: "0 50%", opacity: 1 - 0.55 * away }}>
          <Appear at={2}>
            <Card style={{ padding: 40 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 26, fontWeight: 700, color: C.inkMuted }}>
                <Sparkles size={30} color={C.purpleStrong} /> Your AI
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 26, marginTop: 30 }}>
                {MESSAGES.map((m) => (
                  <Appear key={m.phrase} at={cue("hook", m.phrase, -6)} dx={30} dy={0}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
                      <div style={{ background: C.purple, borderRadius: "26px 26px 6px 26px", padding: "18px 26px", fontSize: 33, lineHeight: 1.35, maxWidth: 700 }}>{m.text}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 20, fontWeight: 600, color: C.inkMuted }}>
                        <Bookmark size={18} /> Saved to memory
                      </div>
                    </div>
                  </Appear>
                ))}
              </div>
            </Card>
          </Appear>
        </div>

        <Appear at={tSearch + 4} dx={60} dy={0} style={{ position: "absolute", right: 150, top: 430, width: 860 }}>
          <Card style={{ display: "flex", alignItems: "center", gap: 22, padding: "30px 36px", borderRadius: 999 }}>
            <Search size={38} color={C.inkMuted} />
            <div style={{ fontSize: 38, fontWeight: 500 }}>
              <SearchAttempts at={tSearch + 18} />
            </div>
          </Card>
          <div style={{ marginTop: 22, textAlign: "center", fontSize: 28, color: C.inkMuted, opacity: useIn(cue("hook", "figure out"), 20) }}>
            What should I even search for?
          </div>
        </Appear>
      </AbsoluteFill>

      <AbsoluteFill style={{ ...fillCenter, opacity: logo }}>
        <div style={{ transform: `scale(${0.9 + 0.1 * logo})`, display: "flex", flexDirection: "column", alignItems: "center", gap: 40 }}>
          <Logo width={620} />
          <Appear at={cue("hook", "useful connections", -4)}>
            <div style={{ fontSize: 44, fontWeight: 600, color: C.purpleStrong }}>Memories → people, opportunities, a next step</div>
          </Appear>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
