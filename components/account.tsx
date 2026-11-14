"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useOauth, useSignInWithGoogle } from "@convex-dev/auth/methods/google/react";
import { Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { forgetSession } from "@/components/providers";
import { errorText } from "@/lib/format";
import { cn } from "@/lib/utils";

const FLOW_ERROR = {
  ACCESS_DENIED: "Google sign-in was cancelled",
  EXPIRED: "Sign-in took too long. Try again.",
  INVALID_FLOW: "Sign-in didn't finish. Try again.",
  OTHER_ERROR: "Could not sign in with Google",
} as const;

/** Starts Google sign-in. Google sends the person back to the page they started on. */
export function SignInButton({ className, label = "Sign in" }: { className?: string; label?: string }) {
  const { signIn } = useSignInWithGoogle(api.auth);
  const [busy, setBusy] = useState(false);
  return (
    <Button
      className={cn("h-9 rounded-full px-4 font-bold", className)}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const result = await signIn().catch((e: unknown) => ({ status: "error" as const, message: errorText(e) }));
        // A successful start navigates to Google, so only failures land here.
        if (result.status === "error") {
          toast.error("message" in result ? result.message : FLOW_ERROR.OTHER_ERROR);
          setBusy(false);
        }
      }}
    >
      {busy ? <Loader2 className="size-4 animate-spin" /> : null}
      {label}
    </Button>
  );
}

/** The header control: sign in, or the signed-in person's picture with a sign-out menu. */
export function Account() {
  const viewer = useQuery(api.sessions.viewer);
  const { signOut } = useAuthActions();
  const { flowError } = useOauth();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (flowError) toast.error(FLOW_ERROR[flowError.error]);
  }, [flowError]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (viewer === undefined) return null;
  if (viewer === null) return <SignInButton className="bg-white text-foreground shadow-sm hover:bg-white/80" />;

  const initial = (viewer.name ?? viewer.email ?? "?").slice(0, 1).toUpperCase();
  return (
    <div ref={root} className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label="Account"
        className="flex size-9 items-center justify-center overflow-hidden rounded-full bg-[var(--airmail)] text-[14px] font-bold text-white shadow-sm"
      >
        {viewer.image ? (
          // Google profile pictures come from many hosts, so a plain img avoids next/image host config.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={viewer.image} alt="" referrerPolicy="no-referrer" className="size-full object-cover" />
        ) : (
          initial
        )}
      </button>
      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-[min(280px,calc(100vw-40px))] rounded-2xl bg-white p-4 shadow-lg">
          {viewer.name ? <span className="block truncate text-[15px] font-bold">{viewer.name}</span> : null}
          {viewer.email ? <span className="block truncate text-[13px] text-muted-foreground">{viewer.email}</span> : null}
          <Button
            variant="outline"
            className="mt-3 h-9 w-full rounded-full font-bold"
            onClick={async () => {
              forgetSession();
              await signOut();
            }}
          >
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      ) : null}
    </div>
  );
}
