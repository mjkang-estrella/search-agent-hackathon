import { Building2, Globe, GraduationCap, Users } from "lucide-react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C } from "../theme";
import { cue } from "../timing";
import { Appear, Card, clamp, Eyebrow, fillCenter, Phase, Tag } from "../ui";

const c = (phrase: string, offset = 0) => cue("business", phrase, offset);

function Market() {
  return (
    <AbsoluteFill style={fillCenter}>
      <Appear at={0}><Eyebrow style={{ fontSize: 28 }}>Where we start</Eyebrow></Appear>
      <div style={{ display: "flex", gap: 40, marginTop: 40 }}>
        {[
          { icon: <GraduationCap size={64} color={C.purpleStrong} />, title: "Universities", at: c("universities", -6) },
          { icon: <Globe size={64} color={C.purpleStrong} />, title: "Exchange communities", at: c("exchange communities", -6) },
        ].map((x) => (
          <Appear key={x.title} at={x.at} dy={40}>
            <Card style={{ width: 600, height: 300, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 24 }}>
              {x.icon}
              <div style={{ fontSize: 46, fontWeight: 800 }}>{x.title}</div>
            </Card>
          </Appear>
        ))}
      </div>
      <div style={{ display: "flex", gap: 20, marginTop: 40 }}>
        <Appear at={c("language practice", -4)}><Tag style={{ fontSize: 28, padding: "12px 26px" }}>Language practice</Tag></Appear>
        <Appear at={c("settling into", -4)}><Tag style={{ fontSize: 28, padding: "12px 26px" }}>Settling into a new place</Tag></Appear>
      </div>
    </AbsoluteFill>
  );
}

function Subscription() {
  return (
    <AbsoluteFill style={fillCenter}>
      <Appear at={0} scale={0.94}>
        <Card style={{ width: 900, padding: 60, textAlign: "center" }}>
          <Building2 size={70} color={C.purpleStrong} />
          <div style={{ fontSize: 56, fontWeight: 800, marginTop: 20 }}>Community subscription</div>
          <div style={{ fontSize: 32, color: C.inkMuted, marginTop: 12 }}>for community organizers</div>
          <div style={{ marginTop: 30 }}>
            <Tag color={C.peachInk} bg={C.peachSoft} style={{ fontSize: 26 }}>Initial business hypothesis</Tag>
          </div>
        </Card>
      </Appear>
    </AbsoluteFill>
  );
}

/** Day one runs on public evidence; member matches add up as people join. */
function Growth({ start }: { start: number }) {
  const frame = useCurrentFrame();
  const join = c("as more members join") - start;
  const dots = Math.floor(interpolate(frame, [join, join + 70], [0, 36], clamp));
  return (
    <AbsoluteFill style={fillCenter}>
      <div style={{ display: "flex", gap: 40, alignItems: "stretch" }}>
        <Appear at={0}>
          <Card style={{ width: 640, height: 520 }}>
            <Eyebrow>Day one</Eyebrow>
            <div style={{ fontSize: 46, fontWeight: 800, marginTop: 14 }}>Public evidence</div>
            <div style={{ fontSize: 28, color: C.inkMuted, marginTop: 8 }}>Telem search works before the network grows</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 40 }}>
              {["Public posts", "Pages read", "Quotes with sources"].map((t) => (
                <Tag key={t} style={{ fontSize: 24 }}>{t}</Tag>
              ))}
            </div>
          </Card>
        </Appear>
        <Appear at={join - 6}>
          <Card style={{ width: 640, height: 520 }}>
            <Eyebrow>As members join</Eyebrow>
            <div style={{ fontSize: 46, fontWeight: 800, marginTop: 14 }}>+ Member matches</div>
            <div style={{ fontSize: 28, color: C.inkMuted, marginTop: 8 }}>More intentions to connect</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 14, marginTop: 40 }}>
              {Array.from({ length: 36 }, (_, i) => (
                <div key={i} style={{ width: 30, height: 30, borderRadius: "50%", background: i % 3 === 0 ? C.peach : C.purple, opacity: i < dots ? 1 : 0.15, transform: `scale(${i < dots ? 1 : 0.6})` }} />
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 26, fontSize: 24, color: C.inkMuted }}>
              <Users size={26} /> Illustration, not measured growth
            </div>
          </Card>
        </Appear>
      </div>
    </AbsoluteFill>
  );
}

// Memory titles from the sample persona, as the board shows them.
const RANGE = [
  { title: "Turn poem into song", kind: "Creative", word: "creative" },
  { title: "Fix unsafe crossing", kind: "Community", word: "neighborhood" },
  { title: "Start teen coding club", kind: "Community", word: "neighborhood" },
  { title: "Lead front desk team", kind: "Work", word: "projects" },
  { title: "Run with company", kind: "Health", word: "projects" },
];

function Range({ start }: { start: number }) {
  return (
    <AbsoluteFill style={fillCenter}>
      <Appear at={0}><Eyebrow style={{ fontSize: 28 }}>Same flow, any intention</Eyebrow></Appear>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 24, marginTop: 40, width: 1500 }}>
        {RANGE.map((r, i) => (
          <Appear key={r.title} at={c(r.word, -6) - start + i * 3} dy={30}>
            <Card style={{ padding: "26px 34px", width: 440, borderRadius: 22 }}>
              <div style={{ fontSize: 32, fontWeight: 700 }}>{r.title}</div>
              <div style={{ fontSize: 22, color: C.inkMuted, marginTop: 6 }}>{r.kind} · Sample</div>
            </Card>
          </Appear>
        ))}
      </div>
    </AbsoluteFill>
  );
}

export function Business({ duration }: { duration: number }) {
  const tSub = c("our initial business", -6);
  const tGrow = c("telems public search", -6);
  const tRange = c("the same approach", -6);
  return (
    <AbsoluteFill>
      <Phase from={0} to={tSub}><Market /></Phase>
      <Phase from={tSub} to={tGrow}><Subscription /></Phase>
      <Phase from={tGrow} to={tRange}><Growth start={tGrow} /></Phase>
      <Phase from={tRange} to={duration}><Range start={tRange} /></Phase>
    </AbsoluteFill>
  );
}
