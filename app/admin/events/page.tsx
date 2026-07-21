"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Plus, Star, Ticket as TicketIcon, Trash2, Download, Send, X } from "lucide-react";

const EMPTY = {
  title: "", slug: "", description: "", venue: "", starts_at: "", status: "upcoming",
  ticket_price: "", ticket_currency: "KES", capacity: "",
};

export default function AdminEventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [form, setForm] = useState<any>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [ticketsEvent, setTicketsEvent] = useState<any | null>(null);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase.from("events").select("*, tickets(count)").order("starts_at", { ascending: false });
    setEvents(data || []);
  }
  useEffect(() => { load(); }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const payload = {
      ...form,
      slug: form.slug || form.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
      ticket_price: form.ticket_price ? Number(form.ticket_price) : null,
      capacity: form.capacity ? Number(form.capacity) : null,
    };

    if (editingId) {
      await supabase.from("events").update(payload).eq("id", editingId);
    } else {
      await supabase.from("events").insert(payload);
    }
    setForm(EMPTY);
    setEditingId(null);
    setSaving(false);
    load();
  }

  async function setPinnedCurrent(id: string) {
    const supabase = createClient();
    // Demote any existing current event first (unique index allows only one).
    await supabase.from("events").update({ status: "upcoming" }).eq("status", "current");
    await supabase.from("events").update({ status: "current" }).eq("id", id);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this event and all its tickets?")) return;
    const supabase = createClient();
    await supabase.from("events").delete().eq("id", id);
    load();
  }

  return (
    <div className="p-8 sm:p-10">
      <h1 className="heading-display text-3xl mb-8">Events &amp; Ticketing</h1>

      <div className="grid lg:grid-cols-[1fr_1.4fr] gap-8">
        <form onSubmit={handleSave} className="card-elegant p-6 space-y-3 h-fit">
          <h2 className="font-display text-lg mb-1">{editingId ? "Edit event" : "New event"}</h2>
          <input required placeholder="Title" value={form.title} onChange={(e) => setForm((f: any) => ({ ...f, title: e.target.value }))} className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm" />
          <textarea required rows={3} placeholder="Description" value={form.description} onChange={(e) => setForm((f: any) => ({ ...f, description: e.target.value }))} className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm resize-none" />
          <input required placeholder="Venue" value={form.venue} onChange={(e) => setForm((f: any) => ({ ...f, venue: e.target.value }))} className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm" />
          <input required type="datetime-local" value={form.starts_at} onChange={(e) => setForm((f: any) => ({ ...f, starts_at: e.target.value }))} className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm" />
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Ticket price (KES)" type="number" value={form.ticket_price} onChange={(e) => setForm((f: any) => ({ ...f, ticket_price: e.target.value }))} className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm" />
            <input placeholder="Capacity" type="number" value={form.capacity} onChange={(e) => setForm((f: any) => ({ ...f, capacity: e.target.value }))} className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm" />
          </div>
          <select value={form.status} onChange={(e) => setForm((f: any) => ({ ...f, status: e.target.value }))} className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm">
            <option value="draft">Draft</option>
            <option value="upcoming">Upcoming</option>
            <option value="current">Current (pinned)</option>
            <option value="past">Past</option>
          </select>
          <button type="submit" disabled={saving} className="btn-gold w-full !py-3 disabled:opacity-60">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <><Plus className="size-4" /> {editingId ? "Save changes" : "Create event"}</>}
          </button>
        </form>

        <div className="space-y-3">
          {events.map((e) => (
            <div key={e.id} className="card-elegant p-5 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {e.status === "current" && <Star className="size-3.5 text-gold fill-gold" />}
                  <h3 className="font-display text-lg">{e.title}</h3>
                </div>
                <p className="text-xs text-ink/50 mb-1">{e.venue} · {new Date(e.starts_at).toLocaleString()}</p>
                <p className="text-xs uppercase tracking-wider text-gold-deep">{e.status} · {e.tickets?.[0]?.count ?? 0} tickets</p>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <button onClick={() => setTicketsEvent(e)} className="text-xs px-3 py-1.5 rounded-full border border-gold/30 text-gold-deep hover:bg-gold/10 flex items-center gap-1">
                  <TicketIcon className="size-3" /> Tickets
                </button>
                <button onClick={() => setPinnedCurrent(e.id)} className="text-xs px-3 py-1.5 rounded-full border border-gold/30 text-gold-deep hover:bg-gold/10">Pin current</button>
                <button onClick={() => { setForm({ ...e, ticket_price: e.ticket_price || "", capacity: e.capacity || "" }); setEditingId(e.id); }} className="text-xs px-3 py-1.5 rounded-full border border-black/10 hover:bg-black/5">Edit</button>
                <button onClick={() => remove(e.id)} className="text-xs px-3 py-1.5 rounded-full border border-red-200 text-red-600 hover:bg-red-50 flex items-center gap-1"><Trash2 className="size-3" /> Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {ticketsEvent && <TicketsPanel event={ticketsEvent} onClose={() => setTicketsEvent(null)} />}
    </div>
  );
}

function TicketsPanel({ event, onClose }: { event: any; onClose: () => void }) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [resending, setResending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("tickets").select("*").eq("event_id", event.id).order("created_at", { ascending: false })
      .then(({ data }) => setTickets(data || []));
  }, [event.id]);

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    const paidIds = tickets.filter((t) => t.status === "paid").map((t) => t.id);
    setSelected(selected.size === paidIds.length ? new Set() : new Set(paidIds));
  }

  function exportCsv() {
    const rows = [
      ["ticket_number", "buyer_name", "buyer_email", "buyer_phone", "amount", "status", "mpesa_receipt", "created_at"],
      ...tickets.map((t) => [t.ticket_number || "", t.buyer_name, t.buyer_email, t.buyer_phone, t.amount, t.status, t.mpesa_receipt || "", t.created_at]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${event.slug}-tickets.csv`;
    a.click();
  }

  async function bulkResend() {
    if (selected.size === 0) return;
    setResending(true);
    setResult(null);
    const res = await fetch("/api/daraja/resend-ticket", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketIds: Array.from(selected) }),
    });
    const data = await res.json();
    setResult(res.ok ? `Resent ${data.sent} gate pass(es).${data.failed ? ` ${data.failed} failed.` : ""}` : data.error);
    setResending(false);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-cream rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-black/5">
          <div>
            <h2 className="font-display text-xl">{event.title} — Tickets</h2>
            <p className="text-xs text-ink/50">{tickets.length} total · {tickets.filter((t) => t.status === "paid").length} paid</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full"><X className="size-4" /></button>
        </div>

        <div className="flex items-center gap-2 p-4 border-b border-black/5">
          <button onClick={toggleAll} className="text-xs px-3 py-1.5 rounded-full border border-black/10 hover:bg-black/5">
            {selected.size > 0 ? "Deselect all" : "Select all paid"}
          </button>
          <button onClick={bulkResend} disabled={resending || selected.size === 0} className="text-xs px-3 py-1.5 rounded-full bg-gold-foil text-ink shadow-gold flex items-center gap-1 disabled:opacity-50">
            {resending ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />} Resend gate pass ({selected.size})
          </button>
          <button onClick={exportCsv} className="text-xs px-3 py-1.5 rounded-full border border-black/10 hover:bg-black/5 flex items-center gap-1 ml-auto">
            <Download className="size-3" /> Export CSV
          </button>
        </div>

        {result && <p className="px-4 pt-3 text-sm text-ink/70">{result}</p>}

        <div className="overflow-y-auto flex-1">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-ink/45 border-b border-black/5 sticky top-0 bg-cream">
              <tr>
                <th className="px-4 py-2 w-8"></th>
                <th className="px-4 py-2">Ticket #</th>
                <th className="px-4 py-2">Buyer</th>
                <th className="px-4 py-2">Phone</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {tickets.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-2">
                    {t.status === "paid" && (
                      <input type="checkbox" checked={selected.has(t.id)} onChange={() => toggle(t.id)} className="accent-[#C9A227]" />
                    )}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{t.ticket_number || "—"}</td>
                  <td className="px-4 py-2">{t.buyer_name}<br /><span className="text-xs text-ink/45">{t.buyer_email}</span></td>
                  <td className="px-4 py-2 text-xs">{t.buyer_phone}</td>
                  <td className="px-4 py-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      t.status === "paid" ? "bg-emerald-50 text-emerald-700" : t.status === "failed" ? "bg-red-50 text-red-600" : "bg-black/5 text-ink/50"
                    }`}>{t.status}</span>
                  </td>
                </tr>
              ))}
              {tickets.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-ink/40">No tickets sold yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
