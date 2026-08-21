"use client";

import { useEffect, useState } from "react";
import { Copy, Check, Download } from "lucide-react";

/**
 * Generic shareable-link + QR code widget. Originally this file only rendered
 * the sign-up link card; it's now a reusable component so the same block can
 * show a QR for the sign-up page AND a separate one for the whole website
 * homepage, without duplicating the QR-generation logic.
 */
function ShareLinkCard({
  path, title, description, filename,
}: { path: string; title: string; description: string; filename: string }) {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    // Built from the browser's own origin so this always matches whatever domain
    // is actually serving the admin panel right now — no env var to keep in sync.
    const fullUrl = `${window.location.origin}${path}`;
    setUrl(fullUrl);

    import("qrcode").then((QRCode) => {
      QRCode.toDataURL(fullUrl, { width: 320, margin: 1, color: { dark: "#0A0A0B", light: "#FAF7EF" } }).then(setQrDataUrl);
    });
  }, [path]);

  function copyLink() {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadQr() {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = filename;
    a.click();
  }

  return (
    <div className="card-elegant p-6 flex flex-col sm:flex-row items-center gap-6">
      <div className="shrink-0 bg-cream rounded-xl p-3 border border-black/5">
        {qrDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qrDataUrl} alt={`${title} QR code`} className="size-32" />
        ) : (
          <div className="size-32 bg-black/5 animate-pulse rounded" />
        )}
      </div>
      <div className="flex-1 w-full">
        <h2 className="font-display text-lg mb-1">{title}</h2>
        <p className="text-sm text-ink/50 mb-4">{description}</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input readOnly value={url} className="flex-1 rounded-lg border border-black/10 px-3 py-2 text-sm bg-black/[0.02] font-mono" />
          <button onClick={copyLink} className="text-xs px-4 py-2 rounded-lg border border-black/10 hover:bg-black/5 flex items-center justify-center gap-1.5 whitespace-nowrap">
            {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />} {copied ? "Copied" : "Copy link"}
          </button>
          <button onClick={downloadQr} disabled={!qrDataUrl} className="text-xs px-4 py-2 rounded-lg bg-gold-foil text-ink shadow-gold flex items-center justify-center gap-1.5 whitespace-nowrap disabled:opacity-50">
            <Download className="size-3.5" /> Download QR
          </button>
        </div>
      </div>
    </div>
  );
}

export function SignupShareCard() {
  return (
    <div className="grid gap-4">
      <ShareLinkCard
        path="/auth"
        title="Share sign-up link"
        description="Print this QR code on posters/banners, or share the link directly — both take people straight to sign up or sign in."
        filename="uninexus-signup-qr.png"
      />
      <ShareLinkCard
        path="/"
        title="Share the website"
        description="A QR code for the whole website homepage — good for general posters, business cards, or anywhere you want people to land on the site itself rather than straight into sign-up."
        filename="uninexus-website-qr.png"
      />
    </div>
  );
}
