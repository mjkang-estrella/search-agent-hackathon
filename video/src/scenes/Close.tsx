import { ArrowRight } from "lucide-react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C } from "../theme";
import { cue } from "../timing";
import { Appear, clamp, fillCenter, Logo, Tag } from "../ui";

const STEPS = ["Memory", "Intention", "People & evidence", "Next step"];

export function Close() {
  const frame = useCurrentFrame();
  const tRelay = cue("close", "relay turns", -8);
  const flowOut = interpolate(frame, [tRelay - 6, tRelay + 6], [1, 0], clamp);
  return (
    <AbsoluteFill style={fillCenter}>
      <AbsoluteFill style={{ ...fillCenter, opacity: flowOut }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {STEPS.map((s, i) => (
            <Appear key={s} at={6 + i * 10} dx={-20} dy={0} style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <div style={{ padding: "26px 36px", borderRadius: 22, background: i === STEPS.length - 1 ? C.purple : C.form, fontSize: 38, fontWeight: 800, boxShadow: "0 10px 30px rgba(87,73,110,.12)" }}>{s}</div>
              {i < STEPS.length - 1 ? <ArrowRight size={36} color={C.inkMuted} /> : null}
            </Appear>
          ))}
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={fillCenter}>
        <Appear at={tRelay} scale={0.92} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <Logo width={600} />
          <div style={{ fontSize: 44, fontWeight: 600, color: C.purpleStrong, marginTop: 40, textAlign: "center", lineHeight: 1.3 }}>
            What your AI remembers → people, opportunities,<br />and something you can do next
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 50 }}>
            <Tag bg={C.form} color={C.ink} style={{ fontSize: 24 }}>Telem</Tag>
            <Tag bg={C.form} color={C.ink} style={{ fontSize: 24 }}>Convex</Tag>
            <Tag bg={C.form} color={C.ink} style={{ fontSize: 24 }}>OpenAI</Tag>
            <Tag bg={C.form} color={C.ink} style={{ fontSize: 24 }}>Next.js</Tag>
          </div>
        </Appear>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
