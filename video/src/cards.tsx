import { ArrowUpRight, Check, User } from "lucide-react";
import { C } from "./theme";
import type { Post } from "./data";
import { Card, Tag, useIn } from "./ui";

/** Mirrors components/public-person-card.tsx at video scale. */
export function PostCard({ post, verifiedAt, linkAt, width = 760 }: { post: Post; verifiedAt?: number; linkAt?: number; width?: number }) {
  const v = useIn(verifiedAt ?? 1e9, 14);
  const l = useIn(linkAt ?? 1e9, 14);
  return (
    <Card style={{ width, padding: 34 }}>
      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: C.lavender, display: "grid", placeItems: "center", flexShrink: 0 }}>
          <User size={32} color={C.purpleStrong} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: 32, fontWeight: 800 }}>{post.author}</span>
            <Tag color={C.facebook} style={{ fontSize: 19, padding: "4px 12px" }}>{post.platform}</Tag>
          </div>
          <div style={{ fontSize: 23, color: C.inkMuted, marginTop: 4, lineHeight: 1.35 }}>{post.about}</div>
        </div>
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, color: C.inkMuted, marginTop: 22 }}>Why this fits</div>
      <div style={{ fontSize: 24, lineHeight: 1.45, marginTop: 4 }}>{post.reason}</div>
      <div style={{ position: "relative", marginTop: 16, background: C.soft, borderRadius: 16, padding: "14px 18px", fontSize: 24, color: C.inkMuted, outline: v > 0 ? `${3 * v}px solid ${C.green}` : undefined }}>
        &ldquo;{post.quote}&rdquo;
        <div style={{ position: "absolute", right: 14, top: -18, opacity: v, transform: `scale(${0.7 + 0.3 * v})` }}>
          <Tag color={C.green} bg={C.greenSoft} style={{ fontSize: 18, padding: "4px 12px" }}><Check size={18} /> Quote in source</Tag>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, fontSize: 20 }}>
        <span style={{ color: C.inkMuted }}>Public post · {post.date}</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 800, color: C.purpleStrong, padding: "4px 10px", borderRadius: 10, background: l > 0 ? `rgba(224,214,245,${l})` : undefined }}>
          View post <ArrowUpRight size={20} />
        </span>
      </div>
    </Card>
  );
}
