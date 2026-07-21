import webpush from "web-push";

let configured = false;

export function ensureWebPushConfigured() {
  if (configured) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:uninexusplatformke@gmail.com",
    process.env.VAPID_PUBLIC_KEY || "",
    process.env.VAPID_PRIVATE_KEY || ""
  );
  configured = true;
}

export { webpush };
