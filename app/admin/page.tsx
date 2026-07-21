import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Users, CalendarDays, Ticket, Mail } from "lucide-react";

async function getSnapshot() {
  const supabase = createClient();
  const [{ count: members }, { count: events }, { count: paidTickets }, { count: subs }] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("events").select("id", { count: "exact", head: true }),
    supabase.from("tickets").select("id", { count: "exact", head: true }).eq("status", "paid"),
    supabase.from("newsletter_subscribers").select("id", { count: "exact", head: true }).eq("is_active", true),
  ]);
  return { members: members || 0, events: events || 0, paidTickets: paidTickets || 0, subs: subs || 0 };
}

export default async function AdminOverviewPage() {
  const s = await getSnapshot();
  const cards = [
    { label: "Registered members", value: s.members, icon: Users, href: "/admin/members" },
    { label: "Events & programs", value: s.events, icon: CalendarDays, href: "/admin/events" },
    { label: "Tickets sold", value: s.paidTickets, icon: Ticket, href: "/admin/events" },
    { label: "Newsletter subscribers", value: s.subs, icon: Mail, href: "/admin/newsletter" },
  ];

  return (
    <div className="p-8 sm:p-10">
      <h1 className="heading-display text-3xl mb-8">Overview</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="card-elegant p-6 hover:shadow-gold transition-shadow">
            <c.icon className="size-6 text-gold-deep mb-4" />
            <p className="font-display text-3xl font-semibold">{c.value.toLocaleString()}</p>
            <p className="text-xs uppercase tracking-wider text-ink/50 mt-1">{c.label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
