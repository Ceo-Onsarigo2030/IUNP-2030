// Browser-side helpers for web-push opt-in. Client-only.

export type PushSupport = "supported" | "unsupported" | "needs-install";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function pushSupport(): PushSupport {
  if (typeof window === "undefined") return "unsupported";
  const hasApis = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (hasApis) return "supported";
  // iPhones/iPads only allow web push for sites added to the Home Screen.
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  return isIOS ? "needs-install" : "unsupported";
}

export async function isAlreadySubscribed(): Promise<boolean> {
  try {
    if (pushSupport() !== "supported" || Notification.permission !== "granted") return false;
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    return !!(reg && (await reg.pushManager.getSubscription()));
  } catch {
    return false;
  }
}

export async function enablePush(): Promise<{ ok: true } | { ok: false; reason: "denied" | "unsupported" | "error"; message: string }> {
  if (pushSupport() !== "supported") {
    return { ok: false, reason: "unsupported", message: "This browser doesn't support notifications. On iPhone, add the site to your Home Screen first." };
  }
  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapid) return { ok: false, reason: "error", message: "Notifications aren't set up on the server yet." };

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return { ok: false, reason: "denied", message: "Notifications are blocked. Allow them in your browser's site settings, then try again." };
    }
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    const sub =
      (await reg.pushManager.getSubscription()) ||
      (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapid) }));

    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sub.toJSON()),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, reason: "error", message: data.error || "Couldn't save your subscription. Please try again." };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, reason: "error", message: err?.message || "Something went wrong turning on notifications." };
  }
}
