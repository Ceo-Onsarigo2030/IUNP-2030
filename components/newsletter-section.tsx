"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Send, CheckCircle2, Mail } from "lucide-react";

export function NewsletterSection() {
  return (
    <section className="surface-ink py-20">
      <div className="container">
        <div className="max-w-2xl mx-auto text-center reveal">
          <div className="size-12 rounded-full border border-gold/30 flex items-center justify-center mx-auto mb-5 text-gold">
            <Mail className="size-5" />
          </div>
          <p className="eyebrow mb-3">Stay in the loop</p>
          <h2 className="heading-display text-3xl sm:text-4xl text-cream mb-3">
            News, events &amp; opportunities in your inbox
          </h2>
          <p className="text-cream/65 mb-8">
            One email, whenever it matters. No spam — managed and sent by the UniNexus Connect team.
          </p>
          <div className="max-w-sm mx-auto">
            <NewsletterForm variant="footer" />
          </div>
        </div>
      </div>
    </section>
  );
}

export function NewsletterForm({ variant = "section" }: { variant?: "section" | "footer" }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error();
      setStatus("done");
      setEmail("");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className={cn("flex items-center gap-2 text-sm", variant === "footer" ? "text-gold" : "text-gold")}>
        <CheckCircle2 className="size-4" /> You&apos;re subscribed. Welcome aboard.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        className={cn(
          "flex-1 rounded-full px-4 py-2.5 text-sm outline-none",
          variant === "footer"
            ? "bg-white/5 border border-gold/25 text-cream placeholder:text-cream/40 focus:border-gold"
            : "bg-ivory border border-black/10 text-ink placeholder:text-ink/40 focus:border-gold"
        )}
      />
      <button
        type="submit"
        disabled={status === "loading"}
        aria-label="Subscribe"
        className="size-10 shrink-0 rounded-full bg-gold-foil text-ink flex items-center justify-center shadow-gold disabled:opacity-60"
      >
        <Send className="size-4" />
      </button>
    </form>
  );
}
