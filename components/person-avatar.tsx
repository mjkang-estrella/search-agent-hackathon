"use client";

import Image from "next/image";
import { UserRound } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function PersonAvatar({ src, name, sample = false, large = false }: { src: string | null; name: string; sample?: boolean; large?: boolean }) {
  return <Portrait key={src} src={src} name={name} sample={sample} large={large} />;
}

function Portrait({ src, name, sample, large }: { src: string | null; name: string; sample: boolean; large: boolean }) {
  const [failed, setFailed] = useState(false);
  const pixels = large ? 56 : 44;
  return (
    <span
      title={sample ? `AI-generated portrait for ${name}, a fictional sample member` : name}
      className={cn("relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--relay-lavender)] text-[var(--relay-purple-strong)]", large ? "size-14" : "size-11")}
    >
      {src && !failed ? (
        <Image src={src} alt="" width={pixels} height={pixels} sizes={`${pixels}px`} unoptimized={!src.startsWith("/")} className="size-full object-cover" onError={() => setFailed(true)} />
      ) : <UserRound aria-hidden className={large ? "size-6" : "size-5"} />}
    </span>
  );
}
