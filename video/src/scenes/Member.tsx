import { ArrowLeft, ArrowRight, Check, Database, X } from "lucide-react";
import { AbsoluteFill } from "remotion";
import { MEMBERS } from "../data";
import { C } from "../theme";
import { cue } from "../timing";
import { Appear, Card, Eyebrow, fillCenter, Phase, Portrait, Ring, Shot, Tag } from "../ui";

const c = (phrase: string, offset = 0) => cue("member", phrase, offset);

function Search() {
  return (
    <AbsoluteFill style={fillCenter}>
      <Appear at={0}>
        <Tag bg={C.ink} color="#fff" style={{ fontSize: 28, padding: "14px 28px" }}>
          <Database size={28} /> Convex · member intentions
        </Tag>
      </Appear>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 360px)", gap: 24, marginTop: 50 }}>
        {MEMBERS.map((name, i) => (
          <Appear key={name} at={8 + i * 4} dy={20}>
            <Card style={{ padding: "22px 26px", display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: 20 }}>
              <span style={{ fontSize: 28, fontWeight: 700 }}>{name}</span>
              <Tag style={{ fontSize: 18, padding: "4px 12px" }}>Sample</Tag>
            </Card>
          </Appear>
        ))}
      </div>
      <Appear at={30} style={{ marginTop: 40, fontSize: 28, color: C.inkMuted, fontWeight: 600 }}>8 matched</Appear>
    </AbsoluteFill>
  );
}

function Person({ name, portrait, tag, gives, wants }: { name: string; portrait?: string; tag: string; gives: string; wants: string }) {
  return (
    <Card style={{ width: 560, padding: 38 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
        {portrait ? <Portrait name={portrait} size={104} /> : <div style={{ width: 104, height: 104, borderRadius: "50%", background: C.peach, display: "grid", placeItems: "center", fontSize: 44, fontWeight: 800, color: C.peachInk }}>D</div>}
        <div>
          <div style={{ fontSize: 40, fontWeight: 800 }}>{name}</div>
          <Tag style={{ fontSize: 19, padding: "4px 12px", marginTop: 6 }}>{tag}</Tag>
        </div>
      </div>
      <div style={{ marginTop: 26, fontSize: 25, lineHeight: 1.4 }}>
        <div><b>Can offer</b> <span style={{ color: C.inkMuted }}>{gives}</span></div>
        <div style={{ marginTop: 8 }}><b>Looking for</b> <span style={{ color: C.inkMuted }}>{wants}</span></div>
      </div>
    </Card>
  );
}

function Exchange({ start }: { start: number }) {
  const at = (phrase: string, o = 0) => c(phrase, o) - start;
  const checks = [
    { at: at("the exchange is free", -4), label: "Budget", mine: "No room for tutoring", theirs: "Free exchange, no payment" },
    { at: at("us evenings", -4), label: "Time", mine: "Most evenings after 7pm", theirs: "Mornings in Korea, which are evenings in the US" },
  ];
  return (
    <AbsoluteFill style={fillCenter}>
      <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
        <Appear at={0} dx={-40} dy={0}>
          <Person name="Dana" tag="Sample traveler" gives="English conversation" wants="Korean speaking practice, free" />
        </Appear>
        <div style={{ display: "flex", flexDirection: "column", gap: 34, width: 300, alignItems: "center" }}>
          <Appear at={at("our traveler needs", -4)} dx={30} dy={0}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 25, fontWeight: 700, color: C.purpleStrong }}><ArrowLeft size={34} /> Korean practice</div>
          </Appear>
          <Appear at={at("jiwoo needs english", -4)} dx={-30} dy={0}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 25, fontWeight: 700, color: C.peachInk }}>English practice <ArrowRight size={34} /></div>
          </Appear>
        </div>
        <Appear at={0} dx={40} dy={0}>
          <Person name="Ji-woo P." portrait="jiwoo-korean-exchange" tag="Sample member · AI photo" gives="Native Korean conversation practice" wants="Trade practice: half the call in Korean, half in English" />
        </Appear>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 44, width: 1460 }}>
        {checks.map((k) => (
          <Appear key={k.label} at={k.at} dy={16}>
            <div style={{ display: "flex", alignItems: "center", gap: 22, background: C.form, borderRadius: 18, padding: "18px 26px", fontSize: 26, boxShadow: "0 8px 22px rgba(87,73,110,.08)" }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: C.greenSoft, display: "grid", placeItems: "center" }}><Check size={28} color={C.green} /></div>
              <b style={{ width: 110 }}>{k.label}</b>
              <span style={{ color: C.inkMuted, width: 420 }}>{k.mine}</span>
              <span style={{ color: C.green, fontWeight: 700 }}>{k.theirs}</span>
            </div>
          </Appear>
        ))}
      </div>
    </AbsoluteFill>
  );
}

function Excluded({ start }: { start: number }) {
  const at = (phrase: string, o = 0) => c(phrase, o) - start;
  // Real rejection results from the Korean run's compatibility checks.
  const rows = [
    { at: at("a paid tutor", -4), name: "Min-seo L.", portrait: "minseo-korean-tutor", wants: "Find in-person Korean students", facts: "$40 per hour · weekday afternoons", why: "Budget and schedule conflict" },
    { at: at("kdrama fan", -4), name: "Carla B.", portrait: "carla-kdrama", wants: "Start a K-drama watch party", facts: "In person · Friday nights", why: "Shared interest, no fitting intention" },
  ];
  return (
    <AbsoluteFill style={fillCenter}>
      <Appear at={0}><Eyebrow style={{ fontSize: 26 }}>Check both sides</Eyebrow></Appear>
      <div style={{ display: "flex", flexDirection: "column", gap: 26, marginTop: 34, width: 1300 }}>
        {rows.map((r) => (
          <Appear key={r.name} at={r.at} dx={40} dy={0}>
            <Card style={{ display: "flex", alignItems: "center", gap: 28, padding: "28px 34px" }}>
              <Portrait name={r.portrait} size={92} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 34, fontWeight: 800 }}>{r.name}</span>
                  <Tag style={{ fontSize: 18, padding: "4px 12px" }}>Sample</Tag>
                </div>
                <div style={{ fontSize: 26, marginTop: 6 }}>{r.wants}</div>
                <div style={{ fontSize: 23, color: C.inkMuted, marginTop: 4 }}>{r.facts}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <Tag color={C.danger} bg={C.dangerSoft} style={{ fontSize: 24 }}><X size={24} /> Excluded</Tag>
                <div style={{ fontSize: 22, color: C.inkMuted, marginTop: 10 }}>{r.why}</div>
              </div>
            </Card>
          </Appear>
        ))}
      </div>
    </AbsoluteFill>
  );
}

export function Member({ duration }: { duration: number }) {
  const tJiwoo = c("this is jiwoo", -6);
  const tOut = c("a paid tutor", -8);
  const tShot = c("sharing an interest", -6);
  return (
    <AbsoluteFill>
      <Phase from={0} to={tJiwoo}>
        <Search />
      </Phase>
      <Phase from={tJiwoo} to={tOut}>
        <Exchange start={tJiwoo} />
      </Phase>
      <Phase from={tOut} to={tShot}>
        <Excluded start={tOut} />
      </Phase>
      <Phase from={tShot} to={duration}>
        <Shot src="run-kor-check-full" pageH={1193} keys={[{ at: 0, box: [380, 120, 840, 700] }, { at: 40, box: [400, 470, 800, 340], move: 30 }]}>
          <Ring box={[428, 570, 744, 30]} at={44} pad={6} radius={10} />
        </Shot>
      </Phase>
    </AbsoluteFill>
  );
}
