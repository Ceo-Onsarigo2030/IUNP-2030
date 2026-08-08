"use client";

import { useRef, useState } from "react";
import { Download, Loader2 } from "lucide-react";

export function MembershipCard({
  fullName, membershipId, category, joinedYear,
}: { fullName: string; membershipId: string; category: string; joinedYear: number }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      // CRITICAL: html2canvas snapshots whatever the DOM looks like at the exact
      // moment it's called. If either logo <img> hasn't finished loading yet
      // (a very real race on a fast phone tap, or a slow connection), html2canvas
      // captures it in a half-loaded/broken state — stretched, cropped, or
      // showing nothing — even though the on-screen card looks completely fine a
      // moment later. Explicitly waiting for every image inside the card to
      // finish decoding before capturing removes that race entirely.
      const images = Array.from(cardRef.current.querySelectorAll("img"));
      await Promise.all(
        images.map((img) =>
          img.complete ? img.decode().catch(() => {}) : new Promise<void>((resolve) => {
            img.addEventListener("load", () => resolve(), { once: true });
            img.addEventListener("error", () => resolve(), { once: true });
          })
        )
      );

      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(cardRef.current, { backgroundColor: null, scale: 3, useCORS: true });
      const link = document.createElement("a");
      link.download = `${membershipId}-uninexus-id.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-5">
      <div
        ref={cardRef}
        className="relative w-full max-w-md aspect-[1.6/1] rounded-2xl overflow-hidden p-6 flex flex-col justify-between"
        style={{ background: "linear-gradient(135deg, #141416 0%, #0A0A0B 60%, #1a1a1d 100%)" }}
      >
        <div className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(circle_at_top_right,white,transparent_60%)]" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded bg-white flex items-center justify-center overflow-hidden shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logos/inter-uni-logo.webp" alt="" width={28} height={28} className="h-full w-full object-contain p-0.5" />
            </div>
            <div className="h-6 w-px bg-gold/30" />
            <div className="h-7 w-7 rounded bg-white flex items-center justify-center overflow-hidden shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logos/ba-connect-logo.webp" alt="" width={28} height={28} className="h-full w-full object-contain p-0.5" />
            </div>
          </div>
          <span className="text-[9px] uppercase tracking-[0.2em] text-gold/70">Member ID</span>
        </div>

        <div className="relative">
          <p className="text-cream/50 text-[10px] uppercase tracking-widest mb-1">UniNexus Connect</p>
          <p className="font-display text-2xl text-cream font-semibold leading-tight">{fullName}</p>
          <p className="text-gold font-mono text-sm mt-1 tracking-wider">{membershipId}</p>
        </div>

        <div className="relative flex items-end justify-between text-[10px] text-cream/50 uppercase tracking-wider">
          <span>{category}</span>
          <span>Member since {joinedYear}</span>
        </div>
      </div>

      <button onClick={handleDownload} disabled={downloading} className="btn-outline-gold disabled:opacity-60">
        {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
        Download membership card
      </button>
    </div>
  );
}
