"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Plus, Star, Ticket as TicketIcon, Trash2, Download, Send, X, Link2, ImagePlus } from "lucide-react";

const EMPTY = {
  title: "", slug: "", description: "", venue: "", starts_at: "", status: "upcoming",
  ticket_price: "", ticket_currency: "KES", capacity: "", map_url: "", cover_image_url: "",
};

export default function AdminEventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [form, setForm] = useState<any>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [ticketsEvent, setTicketsEvent] = useState<any | null>(null);
  const [tiersEvent, setTiersEvent] = useState<any | null>(null);

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

  function copyEventLink(slug: string) {
    const url = `${location.origin}/programs/${slug}`;
    navigator.clipboard.writeText(url);
    alert(`Copied ticket link for this event:\n${url}`);
  }

  async function uploadCoverImage(file: File) {
    if (!editingId) return;
    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const path = `${editingId}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from("event-media").upload(path, file, { upsert: true });
    if (uploadErr) {
      alert(`Couldn't upload image: ${uploadErr.message}`);
      return;
    }
    const { data: pub } = supabase.storage.from("event-media").getPublicUrl(path);
    await supabase.from("events").update({ cover_image_url: pub.publicUrl }).eq("id", editingId);
    setForm((f: any) => ({ ...f, cover_image_url: pub.publicUrl }));
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
          <input placeholder="Google Maps link (paste from Share > Copy link)" value={form.map_url} onChange={(e) => setForm((f: any) => ({ ...f, map_url: e.target.value }))} className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm" />

          {editingId ? (
            <div>
              <label className="text-xs text-ink/50 block mb-1.5">Event logo / cover image (optional)</label>
              <div className="flex items-center gap-3">
                <div className="size-14 rounded-lg bg-black/5 border border-black/10 overflow-hidden shrink-0 flex items-center justify-center">
                  {form.cover_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.cover_image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <ImagePlus className="size-5 text-ink/25" />
                  )}
                </div>
                <label className="text-xs px-3 py-2 rounded-lg border border-gold/30 text-gold-deep hover:bg-gold/10 cursor-pointer">
                  {form.cover_image_url ? "Replace image" : "Upload image"}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) uploadCoverImage(file);
                  }} />
                </label>
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-ink/40">Save this event first, then click Edit on it to add a logo/cover image.</p>
          )}
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
              <div className="flex items-start gap-3">
                {e.cover_image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={e.cover_image_url} alt="" className="size-14 rounded-lg object-cover shrink-0" />
                )}
                <div>
                <div className="flex items-center gap-2 mb-1">
                  {e.status === "current" && <Star className="size-3.5 text-gold fill-gold" />}
                  <h3 className="font-display text-lg">{e.title}</h3>
                </div>
                <p className="text-xs text-ink/50 mb-1">{e.venue} · {new Date(e.starts_at).toLocaleString()}</p>
                <p className="text-xs uppercase tracking-wider text-gold-deep">{e.status} · {e.tickets?.[0]?.count ?? 0} tickets</p>
                </div>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <button onClick={() => copyEventLink(e.slug)} className="text-xs px-3 py-1.5 rounded-full border border-gold/30 text-gold-deep hover:bg-gold/10 flex items-center gap-1">
                  <Link2 className="size-3" /> Copy ticket link
                </button>
                <button onClick={() => setTicketsEvent(e)} className="text-xs px-3 py-1.5 rounded-full border border-gold/30 text-gold-deep hover:bg-gold/10 flex items-center gap-1">
                  <TicketIcon className="size-3" /> Tickets
                </button>
                <button onClick={() => setTiersEvent(e)} className="text-xs px-3 py-1.5 rounded-full border border-gold/30 text-gold-deep hover:bg-gold/10">
                  Ticket Tiers
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
      {tiersEvent && <TiersPanel event={tiersEvent} onClose={() => setTiersEvent(null)} />}
    </div>
  );
}

function TiersPanel({ event, onClose }: { event: any; onClose: () => void }) {
  const [tiers, setTiers] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", price: "", description: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase.from("event_ticket_tiers").select("*").eq("event_id", event.id).order("sort_order", { ascending: true });
    setTiers(data || []);
  }
  useEffect(() => { load(); }, [event.id]);

  async function saveTier(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const payload = { name: form.name, price: Number(form.price), description: form.description || null };

    const { error: err } = editingId
      ? await supabase.from("event_ticket_tiers").update(payload).eq("id", editingId)
      : await supabase.from("event_ticket_tiers").insert({ ...payload, event_id: event.id, sort_order: tiers.length });

    if (err) setError(err.message);
    else {
      setForm({ name: "", price: "", description: "" });
      setEditingId(null);
    }
    setSaving(false);
    load();
  }

  function startEdit(t: any) {
    setForm({ name: t.name, price: String(t.price), description: t.description || "" });
    setEditingId(t.id);
    setError(null);
  }

  function cancelEdit() {
    setForm({ name: "", price: "", description: "" });
    setEditingId(null);
    setError(null);
  }

  async function toggleActive(t: any) {
    const supabase = createClient();
    await supabase.from("event_ticket_tiers").update({ is_active: !t.is_active }).eq("id", t.id);
    load();
  }

  async function removeTier(id: string) {
    if (!confirm("Remove this ticket tier?")) return;
    const supabase = createClient();
    const { error: err } = await supabase.from("event_ticket_tiers").delete().eq("id", id);
    if (err) {
      // Previously a failed delete did nothing visible at all — an admin trying to
      // remove a tier that already has real paid tickets against it (blocked on
      // purpose, to protect sales history) would just see... nothing happen, with
      // no explanation. Now it says exactly why, and points to the actual fix.
      if (err.code === "23503") {
        alert("Can't delete this tier — tickets have already been sold under it, so removing it would break that sales record. Use the archive toggle instead to hide it from new purchases while keeping the history intact.");
      } else {
        alert(`Couldn't delete this tier: ${err.message}`);
      }
      return;
    }
    load();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-cream rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-black/5">
          <h2 className="font-display text-xl">{event.title} — Ticket Tiers</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { navigator.clipboard.writeText(`${location.origin}/programs/${event.slug}`); alert("Ticket link copied!"); }}
              className="text-xs px-3 py-1.5 rounded-full border border-gold/30 text-gold-deep hover:bg-gold/10 flex items-center gap-1"
            >
              <Link2 className="size-3" /> Copy link
            </button>
            <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full"><X className="size-4" /></button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}

          <form onSubmit={saveTier} className="card-elegant p-4 space-y-2">
            <p className="text-xs font-semibold text-ink/50">{editingId ? "Editing tier" : "New tier"}</p>
            <input required placeholder="Tier name e.g. Regular, VIP, VVIP" value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm" />
            <input required type="number" placeholder="Price (KES)" value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm" />
            <input placeholder="What's included (optional)" value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm" />
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="btn-gold flex-1 !py-2.5 disabled:opacity-60">
                {saving ? <Loader2 className="size-4 animate-spin" /> : editingId ? "Save changes" : <><Plus className="size-4" /> Add tier</>}
              </button>
              {editingId && (
                <button type="button" onClick={cancelEdit} className="text-xs px-4 rounded-lg border border-black/10">Cancel</button>
              )}
            </div>
          </form>

          <div className="space-y-2">
            {tiers.map((t) => (
              <div key={t.id} className={`rounded-lg bg-white border border-black/5 p-3 flex items-center justify-between ${!t.is_active ? "opacity-50" : ""}`}>
                <div>
                  <p className="text-sm font-semibold">
                    {t.name} — KES {Number(t.price).toLocaleString()}
                    {!t.is_active && <span className="ml-2 text-[10px] uppercase tracking-wider text-ink/40">Archived</span>}
                  </p>
                  {t.description && <p className="text-xs text-ink/50">{t.description}</p>}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button onClick={() => startEdit(t)} className="text-xs text-ink/50 hover:text-ink">Edit</button>
                  <button onClick={() => toggleActive(t)} className="text-xs text-gold-deep hover:text-gold">
                    {t.is_active ? "Archive" : "Unarchive"}
                  </button>
                  <button onClick={() => removeTier(t.id)} className="text-red-500 hover:text-red-700"><Trash2 className="size-3.5" /></button>
                </div>
              </div>
            ))}
            {tiers.length === 0 && <p className="text-sm text-ink/40 text-center">No tiers yet — add Regular, VIP, VVIP above.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function TicketsPanel({ event, onClose }: { event: any; onClose: () => void }) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [resending, setResending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  // Default view is successful payments only — that's what admins need day to day
  // (who paid, their gate pass number, whether they've received it). Failed/pending
  // attempts are one tab away, not mixed into the main table.
  const [view, setView] = useState<"successful" | "all">("successful");

  useEffect(() => {
    const supabase = createClient();
    supabase.from("tickets").select("*").eq("event_id", event.id).order("created_at", { ascending: false })
      .then(
        ({ data }) => setTickets(data || []),
        () => setTickets([])
      );
  }, [event.id]);

  const visibleTickets = view === "successful" ? tickets.filter((t) => t.status === "paid") : tickets;
  const paidCount = tickets.filter((t) => t.status === "paid").length;

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
      ["gate_pass_number", "buyer_name", "buyer_email", "buyer_phone", "amount", "status", "mpesa_receipt", "gate_pass_received", "created_at"],
      ...visibleTickets.map((t) => [
        t.ticket_number || "",
        t.buyer_name,
        t.buyer_email,
        t.buyer_phone,
        t.amount,
        t.status,
        t.mpesa_receipt || "",
        t.gate_pass_sent_at ? "Yes" : "No",
        t.created_at,
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${event.slug}-${view === "successful" ? "successful-payments" : "all-tickets"}.csv`;
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
      <div className="bg-cream rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-black/5">
          <div>
            <h2 className="font-display text-xl">{event.title} — Tickets sold</h2>
            <p className="text-xs text-ink/50">{tickets.length} total attempts · {paidCount} successful payments</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full"><X className="size-4" /></button>
        </div>

        <div className="flex items-center gap-2 p-4 border-b border-black/5 flex-wrap">
          <div className="inline-flex rounded-full border border-black/10 p-1">
            <button onClick={() => setView("successful")} className={`text-xs px-3 py-1.5 rounded-full ${view === "successful" ? "bg-gold-foil text-ink shadow-gold" : "text-ink/50"}`}>
              Successful payments ({paidCount})
            </button>
            <button onClick={() => setView("all")} className={`text-xs px-3 py-1.5 rounded-full ${view === "all" ? "bg-gold-foil text-ink shadow-gold" : "text-ink/50"}`}>
              All attempts ({tickets.length})
            </button>
          </div>
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
                <th className="px-4 py-2">Gate pass #</th>
                <th className="px-4 py-2">Buyer</th>
                <th className="px-4 py-2">Phone</th>
                <th className="px-4 py-2">Amount</th>
                <th className="px-4 py-2">M-Pesa receipt</th>
                <th className="px-4 py-2">Gate pass received</th>
                {view === "all" && <th className="px-4 py-2">Status</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {visibleTickets.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-2">
                    {t.status === "paid" && (
                      <input type="checkbox" checked={selected.has(t.id)} onChange={() => toggle(t.id)} className="accent-[#C9A227]" />
                    )}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{t.ticket_number || "—"}</td>
                  <td className="px-4 py-2">{t.buyer_name}<br /><span className="text-xs text-ink/45">{t.buyer_email}</span></td>
                  <td className="px-4 py-2 text-xs">{t.buyer_phone}</td>
                  <td className="px-4 py-2 text-xs">KES {Number(t.amount).toLocaleString()}</td>
                  <td className="px-4 py-2 font-mono text-xs">{t.mpesa_receipt || "—"}</td>
                  <td className="px-4 py-2">
                    {t.status === "paid" ? (
                      <span className={`text-xs px-2 py-1 rounded-full ${t.gate_pass_sent_at ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                        {t.gate_pass_sent_at ? `Received ${new Date(t.gate_pass_sent_at).toLocaleDateString()}` : "Not yet sent"}
                      </span>
                    ) : (
                      <span className="text-xs text-ink/30">—</span>
                    )}
                  </td>
                  {view === "all" && (
                    <td className="px-4 py-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        t.status === "paid" ? "bg-emerald-50 text-emerald-700" : t.status === "failed" ? "bg-red-50 text-red-600" : "bg-black/5 text-ink/50"
                      }`}>{t.status}</span>
                    </td>
                  )}
                </tr>
              ))}
              {visibleTickets.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-ink/40">
                  {view === "successful" ? "No successful payments yet." : "No tickets sold yet."}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
