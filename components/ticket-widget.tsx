"use client";

import { useState } from "react";
import { Loader2, Smartphone, CheckCircle2, XCircle, Ticket, ChevronLeft } from "lucide-react";

type Tier = { id: string; name: string; price: number; currency: string; description: string | null };
type Phase = "tier" | "form" | "prompting" | "success" | "failed";

export function TicketWidget({ eventId, tiers }: { eventId: string; tiers: Tier[] }) {
  const [phase, setPhase] = useState<Phase>(tiers.length > 1 ? "tier" : "form");
  const [tier, setTier] = useState<Tier | null>(tiers.length === 1 ? tiers[0] : null);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [error, setError] = useState<string | null>(null);

  function chooseTier(t: Tier) {
    setTier(t);
    setPhase("form");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tier) return;
    setError(null);
    setPhase("prompting");

    try {
      const res = await fetch("/api/daraja/stk-push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, tierId: tier.id, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not start payment prompt.");

      const checkoutRequestId = data.checkoutRequestId;
      const started = Date.now();
      const poll = async (): Promise<void> => {
        const statusRes = await fetch(`/api/daraja/status?checkout_request_id=${checkoutRequestId}`);
        const statusData = await statusRes.json();
        if (statusData.status === "paid") return setPhase("success");
        if (statusData.status === "failed") {
          setError("Payment was not completed. You can try again.");
          return setPhase("failed");
        }
        if (Date.now() - started > 90_000) {
          setError("We didn't receive confirmation in time. Check your M-Pesa messages, or try again.");
          return setPhase("failed");
        }
        setTimeout(poll, 3000);
      };
      poll();
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
      setPhase("failed");
    }
  }

  if (tiers.length === 0) {
    return (
      <div className="card-elegant p-8 text-center text-ink/50">
        Ticketing isn&apos;t set up for this event yet.
      </div>
    );
  }

  if (phase === "tier") {
    return (
      <div className="card-elegant p-6 sm:p-8">
        <div className="flex items-center gap-2 mb-5 text-gold">
          <Ticket className="size-5" />
          <span className="text-xs font-semibold uppercase tracking-wider">Choose your ticket</span>
        </div>
        <div className="space-y-3">
          {tiers.map((t) => (
            <button
              key={t.id}
              onClick={() => chooseTier(t)}
              className="w-full text-left rounded-lg border border-black/10 p-4 hover:border-gold transition-colors flex items-center justify-between gap-3"
            >
              <div>
                <p className="font-display text-lg">{t.name}</p>
                {t.description && <p className="text-xs text-ink/50 mt-0.5">{t.description}</p>}
              </div>
              <p className="font-display text-lg text-gold-deep shrink-0">{t.currency} {Number(t.price).toLocaleString()}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (phase === "success") {
    return (
      <div className="card-elegant p-8 text-center">
        <CheckCircle2 className="size-12 text-gold mx-auto mb-4" />
        <h3 className="heading-display text-2xl mb-2">Payment received</h3>
        <p className="text-ink/65 text-sm">
          Your {tier?.name} gate pass with QR code is on its way to <strong>{form.email}</strong>. Check your inbox (and spam folder) in the next minute.
        </p>
      </div>
    );
  }

  if (phase === "prompting") {
    return (
      <div className="card-elegant p-8 text-center">
        <Loader2 className="size-10 text-gold mx-auto mb-4 animate-spin" />
        <h3 className="heading-display text-2xl mb-2">Check your phone</h3>
        <p className="text-ink/65 text-sm">
          We&apos;ve sent an M-Pesa prompt to <strong>{form.phone}</strong>. Enter your PIN to complete the {tier?.currency} {tier?.price.toLocaleString()} payment.
        </p>
      </div>
    );
  }

  return (
    <div className="card-elegant p-6 sm:p-8">
      {tiers.length > 1 && (
        <button onClick={() => setPhase("tier")} className="flex items-center gap-1 text-xs text-ink/45 hover:text-gold-deep mb-4">
          <ChevronLeft className="size-3.5" /> Change ticket
        </button>
      )}
      <div className="flex items-center gap-2 mb-1 text-gold">
        <Ticket className="size-5" />
        <span className="text-xs font-semibold uppercase tracking-wider">{tier?.name} ticket</span>
      </div>
      <p className="font-display text-2xl mb-5">{tier?.currency} {tier?.price.toLocaleString()}</p>

      {phase === "failed" && error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          <XCircle className="size-4 mt-0.5 shrink-0" /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          required
          placeholder="Full name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="w-full rounded-lg border border-black/10 px-4 py-3 text-sm focus:border-gold outline-none"
        />
        <input
          required
          type="email"
          placeholder="Email — your gate pass goes here"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          className="w-full rounded-lg border border-black/10 px-4 py-3 text-sm focus:border-gold outline-none"
        />
        <div className="relative">
          <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-ink/40" />
          <input
            required
            placeholder="M-Pesa phone e.g. 0712345678"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            className="w-full rounded-lg border border-black/10 pl-10 pr-4 py-3 text-sm focus:border-gold outline-none"
          />
        </div>
        <button type="submit" className="btn-gold w-full !py-3.5">
          Pay {tier?.currency} {tier?.price.toLocaleString()} with M-Pesa
        </button>
        <p className="text-[11px] text-ink/45 text-center">
          Payment first, then your ticket and QR gate pass are emailed instantly.
        </p>
      </form>
    </div>
  );
}
