"use client";

import { useState } from "react";
import { BellRing, Check } from "lucide-react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function PushOptIn() {
  const [status, setStatus] = useState<"idle" | "loading" | "enabled" | "denied">("idle");

  async function enable() {
    setStatus("loading");
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return setStatus("denied");

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ""),
      });

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      setStatus("enabled");
    } catch {
      setStatus("denied");
    }
  }

  if (status === "enabled") {
    return <span className="flex items-center gap-1.5 text-xs text-gold"><Check className="size-3.5" /> Notifications on</span>;
  }

  return (
    <button onClick={enable} disabled={status === "loading"} className="flex items-center gap-1.5 text-xs text-cream/70 hover:text-gold transition-colors">
      <BellRing className="size-3.5" /> {status === "denied" ? "Notifications blocked" : "Enable notifications"}
    </button>
  );
}
