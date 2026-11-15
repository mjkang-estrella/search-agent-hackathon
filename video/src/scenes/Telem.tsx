import { Check, FileText, HelpCircle, Search } from "lucide-react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { PostCard } from "../cards";
import { HELPERS, KOREAN_QUERIES, PAGE_QUOTE, PAGES_READ, POSTS, PROVIDERS, UNIQUE_URLS } from "../data";
import { C } from "../theme";
import { cue } from "../timing";
import { Appear, Card, clamp, Eyebrow, fillCenter, Phase, Ring, Shot, Stamp, Tag, Typed, useIn } from "../ui";

const c = (phrase: string, offset = 0) => cue("telem", phrase, offset);

function Queries() {
  return (
    <AbsoluteFill style={fillCenter}>
      <div style={{ display: "flex", gap: 70, alignItems: "flex-start", width: 1640 }}>
        <Appear at={0} style={{ width: 520, flexShrink: 0 }}>
          <Card style={{ background: C.lavender }}>
            <Eyebrow>Intention</Eyebrow>
            <div style={{ fontSize: 44, fontWeight: 800, marginTop: 10, lineHeight: 1.15 }}>Practice Korean speaking</div>
            <div style={{ fontSize: 25, color: C.inkMuted, marginTop: 16, lineHeight: 1.4 }}>Reading is easier than speaking, and budget leaves no room for tutoring.</div>
            <div style={{ marginTop: 28 }}>
              <Stamp top="INFERRED" bottom="LLM" at={14} />
            </div>
          </Card>
        </Appear>
        <div style={{ flex: 1 }}>
          <Appear at={4}>
            <Eyebrow>Searches</Eyebrow>
          </Appear>
          <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 20 }}>
            {KOREAN_QUERIES.map((q, i) => (
              <Appear key={q} at={10 + i * 12} dx={30} dy={0}>
                <Card style={{ padding: "18px 26px", borderRadius: 18, display: "flex", alignItems: "center", gap: 18 }}>
                  <Search size={26} color={C.purpleStrong} />
                  <span style={{ fontSize: 28, fontWeight: 500 }}>
                    &ldquo;<Typed text={q} at={12 + i * 12} cps={70} />&rdquo;
                  </span>
                </Card>
              </Appear>
            ))}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

function FanOut({ start }: { start: number }) {
  const frame = useCurrentFrame();
  const tSocial = c("social search") - start;
  const tPages = c("reads the most promising") - start;
  const hub = { x: 960, y: 500 };
  const qY = (i: number) => 250 + i * 104;
  const pY = (i: number) => 170 + i * 82;
  const draw = (at: number) => interpolate(frame, [at, at + 14], [1, 0], clamp);
  const social = useIn(tSocial, 14);
  return (
    <AbsoluteFill style={fillCenter}>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {KOREAN_QUERIES.map((_, i) => (
          <path key={i} d={`M 650 ${qY(i) + 34} C 760 ${qY(i) + 34}, 760 ${hub.y}, ${hub.x - 120} ${hub.y}`} stroke={C.purpleStrong} strokeOpacity={0.35} strokeWidth={3} fill="none" pathLength={1} strokeDasharray={1} strokeDashoffset={draw(4 + i * 2)} />
        ))}
        {PROVIDERS.map((p, i) => (
          <path key={p.name} d={`M ${hub.x + 120} ${hub.y} C 1180 ${hub.y}, 1180 ${pY(i) + 30}, 1300 ${pY(i) + 30}`} stroke={p.social ? C.facebook : C.purpleStrong} strokeOpacity={p.social ? 0.25 + 0.5 * social : 0.35} strokeWidth={p.social ? 3 + 3 * social : 3} fill="none" pathLength={1} strokeDasharray={1} strokeDashoffset={draw(18 + i * 4)} />
        ))}
      </svg>

      {KOREAN_QUERIES.map((q, i) => (
        <div key={q} style={{ position: "absolute", left: 90, top: qY(i), width: 560, background: C.form, borderRadius: 16, padding: "14px 20px", fontSize: 21, lineHeight: 1.3, boxShadow: "0 8px 24px rgba(87,73,110,.1)" }}>
          &ldquo;{q}&rdquo;
        </div>
      ))}

      <div style={{ position: "absolute", left: hub.x - 120, top: hub.y - 120, width: 240, height: 240, borderRadius: "50%", background: C.ink, color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: `0 0 0 ${14 + 6 * Math.sin(frame / 6)}px rgba(87,73,110,.14)` }}>
        <div style={{ fontSize: 50, fontWeight: 800 }}>Telem</div>
        <div style={{ fontSize: 20, opacity: 0.75, marginTop: 4 }}>search + fetch</div>
      </div>

      {PROVIDERS.map((p, i) => {
        const on = useIn(22 + i * 4, 12);
        return (
          <div key={p.name} style={{ position: "absolute", left: 1300, top: pY(i), width: 420, height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 22px", borderRadius: 14, background: p.social ? `rgba(24,119,242,${0.06 + 0.1 * social})` : C.form, border: `2px solid ${p.social && social > 0.5 ? C.facebook : C.line}`, opacity: 0.25 + 0.75 * on, fontSize: 25, fontWeight: 600 }}>
            <span style={{ fontFamily: "ui-monospace, monospace" }}>{p.name}</span>
            <span style={{ color: p.social ? C.facebook : C.purpleStrong, fontWeight: 800 }}>{p.social ? "social · " : ""}{Math.round(p.count * on)}</span>
          </div>
        );
      })}

      <Appear at={tPages - 4} style={{ position: "absolute", left: 0, right: 0, top: 860, display: "flex", justifyContent: "center", gap: 18, alignItems: "center" }}>
        <span style={{ fontSize: 26, fontWeight: 700, color: C.inkMuted, marginRight: 6 }}>{UNIQUE_URLS} unique URLs → read</span>
        {PAGES_READ.map((d, i) => (
          <Appear key={d} at={tPages + i * 5} dy={14}>
            <Tag bg={C.form} color={C.ink} style={{ fontSize: 23, padding: "10px 18px", boxShadow: "0 6px 18px rgba(87,73,110,.12)" }}>
              <FileText size={22} color={C.purpleStrong} /> {d} <Check size={22} color={C.green} />
            </Tag>
          </Appear>
        ))}
      </Appear>
    </AbsoluteFill>
  );
}

function Posts({ start }: { start: number }) {
  const at = (phrase: string, o = 0) => c(phrase, o) - start;
  return (
    <AbsoluteFill style={fillCenter}>
      <Appear at={0} style={{ position: "absolute", top: 90, display: "flex", alignItems: "center", gap: 16 }}>
        <Eyebrow style={{ fontSize: 26 }}>Public posts · Telem social search</Eyebrow>
      </Appear>
      <div style={{ display: "flex", gap: 50, alignItems: "flex-start", marginTop: 40 }}>
        {[
          { key: "boredmom" as const, at: at("a traveler back", -6) },
          { key: "edinburgh" as const, at: at("someone sharing", -6) },
        ].map(({ key, at: t }) => (
          <Appear key={key} at={t} dy={50}>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.inkMuted, marginBottom: 12 }}>for &ldquo;{POSTS[key].intention}&rdquo;</div>
            <PostCard post={POSTS[key]} width={780} verifiedAt={at("every quote")} linkAt={at("link to the original")} />
          </Appear>
        ))}
      </div>
    </AbsoluteFill>
  );
}

function Split({ start }: { start: number }) {
  const at = (phrase: string, o = 0) => c(phrase, o) - start;
  const evidence = [
    { source: "Facebook · Learn.korean.edinburgh", quote: POSTS.edinburgh.quote },
    { source: "Facebook · Memonadri", quote: POSTS.memonadri.quote },
    { source: `${PAGE_QUOTE.source} · page read`, quote: PAGE_QUOTE.quote },
  ];
  return (
    <AbsoluteFill style={fillCenter}>
      <div style={{ display: "flex", gap: 50, width: 1640 }}>
        <Appear at={0} style={{ flex: 1 }}>
          <Card style={{ height: 680, padding: 44 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 40, fontWeight: 800 }}>What could help</div>
              <Stamp top="INFERRED" bottom="LLM" at={6} />
            </div>
            <div style={{ fontSize: 24, color: C.inkMuted, marginTop: 6 }}>Helpers to look for · hypotheses</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 36 }}>
              {HELPERS.map((h, i) => (
                <Appear key={h} at={10 + i * 6} dy={14}>
                  <div style={{ fontSize: 28, lineHeight: 1.4, padding: "16px 22px", border: `2px dashed ${C.line}`, borderRadius: 16 }}>{h}</div>
                </Appear>
              ))}
            </div>
          </Card>
        </Appear>
        <Appear at={at("telem retrieves", -6)} style={{ flex: 1 }}>
          <Card style={{ height: 680, padding: 44 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 40, fontWeight: 800 }}>Public evidence</div>
              <Stamp top="RETRIEVED" bottom="TELEM" at={at("telem retrieves")} rotate={5} color={C.purpleStrong} />
            </div>
            <div style={{ fontSize: 24, color: C.inkMuted, marginTop: 6 }}>Quotes with their sources</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 36 }}>
              {evidence.map((e, i) => (
                <Appear key={e.quote} at={at("telem retrieves") + 8 + i * 6} dy={14}>
                  <div style={{ background: C.soft, borderRadius: 16, padding: "16px 22px" }}>
                    <div style={{ fontSize: 26, lineHeight: 1.35 }}>&ldquo;{e.quote}&rdquo;</div>
                    <div style={{ fontSize: 20, color: C.inkMuted, marginTop: 6, fontWeight: 600 }}>{e.source}</div>
                  </div>
                </Appear>
              ))}
            </div>
          </Card>
        </Appear>
      </div>
    </AbsoluteFill>
  );
}

function Lead({ start }: { start: number }) {
  const tOpen = c("whether that person") - start;
  return (
    <AbsoluteFill style={fillCenter}>
      <div style={{ display: "flex", alignItems: "center", gap: 60 }}>
        <Appear at={0} scale={0.96}>
          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            <Tag>Public lead</Tag>
          </div>
          <PostCard post={POSTS.edinburgh} width={820} />
        </Appear>
        <Appear at={tOpen - 4} dx={40} dy={0} style={{ width: 520 }}>
          <Card style={{ background: C.peachSoft, padding: 44 }}>
            <HelpCircle size={56} color={C.peachInk} />
            <div style={{ fontSize: 40, fontWeight: 800, marginTop: 18, lineHeight: 1.2 }}>Wants to connect?</div>
            <div style={{ marginTop: 22 }}>
              <Tag color={C.peachInk} bg={C.form} style={{ fontSize: 24 }}>Availability unknown</Tag>
            </div>
            <div style={{ fontSize: 25, color: C.peachInk, marginTop: 22, lineHeight: 1.4 }}>A public post is a lead, not a yes.</div>
          </Card>
        </Appear>
      </div>
    </AbsoluteFill>
  );
}

export function Telem({ duration }: { duration: number }) {
  const tModel = c("the model turns", -6);
  const tTelem = c("telem runs", -6);
  const tFinds = c("it finds public posts", -6);
  const tProposes = c("the model proposes", -6);
  const tLead = c("a relevant post gives", -6);
  return (
    <AbsoluteFill>
      <Phase from={0} to={tModel}>
        <Shot src="dash-kor" pageH={2065} keys={[{ at: 0, box: [0, 0, 1600, 900] }, { at: 50, box: [870, 270, 600, 640], move: 34 }]}>
          <Ring box={[906, 603, 514, 248]} at={64} />
        </Shot>
      </Phase>
      <Phase from={tModel} to={tTelem}>
        <Queries />
      </Phase>
      <Phase from={tTelem} to={tFinds}>
        <FanOut start={tTelem} />
      </Phase>
      <Phase from={tFinds} to={tProposes}>
        <Posts start={tFinds} />
      </Phase>
      <Phase from={tProposes} to={tLead}>
        <Split start={tProposes} />
      </Phase>
      <Phase from={tLead} to={duration}>
        <Lead start={tLead} />
      </Phase>
    </AbsoluteFill>
  );
}
