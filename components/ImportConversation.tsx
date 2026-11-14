"use client";

import { useState } from "react";

export function ImportConversation() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function loadDemo() {
    const res = await fetch("/api/demo-conversation");
    setText(await res.text());
    setMessage(null);
  }

  async function read() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: text }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setMessage(`Found ${json.ids.length} intention${json.ids.length === 1 ? "" : "s"}. Saved privately below.`);
      setText("");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-border bg-surface p-5">
      <div>
        <h2 className="font-semibold">Bring in your conversations</h2>
        <p className="text-sm text-muted">
          Paste chats with your AI assistant. Claude notices what you&apos;re working toward, even what you never
          asked for, and saves it privately. The text is sent to Claude for this step only.
        </p>
      </div>
      <textarea
        className="h-40 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs outline-none focus:border-accent"
        placeholder="Paste a conversation…"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={read}
          disabled={busy || !text.trim()}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {busy ? "Reading…" : "Read conversation"}
        </button>
        <button onClick={loadDemo} disabled={busy} className="rounded-lg border border-border px-4 py-2 text-sm">
          Load demo conversation
        </button>
        <span className="text-xs text-muted">Demo: Sam, a fictional person</span>
      </div>
      {message && <p className="text-sm">{message}</p>}
    </section>
  );
}
