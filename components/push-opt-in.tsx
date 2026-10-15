"use client";

import { useEffect, useState } from "react";
import { BellRing, Check } from "lucide-react";
import { enablePush, isAlreadySubscribed, pushSupport } from "@/lib/push-client";

export function PushOptIn() {
  const [status, setStatus] = useState<"idle" | "loading" | "enabled" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    isAlreadySubscribed().then((on) => on && setStatus("enabled"));
  }, []);

  async function enable() {
    setStatus("loading");
    setMessage(null);
    const res = await enablePush();
    if (res.ok) return setStatus("enabled");
    setStatus("error");
    setMessage(res.message);
  }

  if (status === "enabled") {
    return <span className="flex items-center gap-1.5 text-xs text-gold"><Check className="size-3.5" /> Notifications on</span>;
  }

  return (
    <div>
      <button onClick={enable} disabled={status === "loading"} className="flex items-center gap-1.5 text-xs text-cream/70 hover:text-gold transition-colors disabled:opacity-60">
        <BellRing className="size-3.5" /> {status === "loading" ? "Turning on…" : "Enable notifications"}
      </button>
      {message && <p className="text-[11px] text-red-300 mt-1 max-w-[16rem]">{message}</p>}
    </div>
  );
}

/** Dismissible bottom banner that invites visitors to turn on notifications (shown once, after a short delay). */
export function PushPrompt() {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (pushSupport() !== "supported") return;
    if (Notification.permission !== "default") return;
    try {
      const dismissed = Number(localStorage.getItem("unx_push_dismissed") || 0);
      if (Date.now() - dismissed < 14 * 24 * 60 * 60 * 1000) return;
    } catch {}
    const t = setTimeout(() => setShow(true), 12_000);
    return () => clearTimeout(t);
  }, []);

  function dismiss() {
    try { localStorage.setItem("unx_push_dismissed", String(Date.now())); } catch {}
    setShow(false);
  }

  async function turnOn() {
    setBusy(true);
    const res = await enablePush();
    setBusy(false);
    if (res.ok) return setShow(false);
    setMessage(res.message);
    if (res.reason === "denied") dismiss();
  }

  if (!show) return null;
  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:max-w-sm z-40 surface-ink rounded-xl2 border border-gold/30 shadow-gold p-4 animate-fade-up">
      <div className="flex items-start gap-3">
        <BellRing className="size-5 text-gold shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm text-cream font-medium">Never miss an event or award</p>
          <p className="text-xs text-cream/60 mt-0.5">Get instant alerts for new events, ticket sales and Gala voting.</p>
          {message && <p className="text-xs text-red-300 mt-2">{message}</p>}
          <div className="flex gap-2 mt-3">
            <button onClick={turnOn} disabled={busy} className="btn-gold !py-2 !px-4 text-xs disabled:opacity-60">{busy ? "Turning on…" : "Turn on"}</button>
            <button onClick={dismiss} className="text-xs text-cream/60 hover:text-cream px-3">Not now</button>
          </div>
        </div>
      </div>
    </div>
  );
}
