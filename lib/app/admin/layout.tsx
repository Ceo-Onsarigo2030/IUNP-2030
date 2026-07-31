"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, CalendarDays, Newspaper, MessageSquare, Mail, BellRing, Users, Settings, Trophy, Menu, X,
} from "lucide-react";

const LINKS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/events", label: "Events & Ticketing", icon: CalendarDays },
  { href: "/admin/gala", label: "Gala Awards", icon: Trophy },
  { href: "/admin/articles", label: "Articles & Announcements", icon: Newspaper },
  { href: "/admin/feedback", label: "Feedback Wall", icon: MessageSquare },
  { href: "/admin/newsletter", label: "Newsletter", icon: Mail },
  { href: "/admin/campaigns", label: "Email Campaigns", icon: Mail },
  { href: "/admin/push", label: "Push Notifications", icon: BellRing },
  { href: "/admin/members", label: "Members", icon: Users },
  { href: "/admin/settings", label: "Site Settings", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-cream-dim flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 surface-ink flex-col py-8 px-4 sticky top-0 h-screen">
        <p className="eyebrow px-3 mb-6">Admin Panel</p>
        <nav className="flex flex-col gap-0.5">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-cream/70 hover:bg-white/5 hover:text-gold transition-colors">
              <l.icon className="size-4" /> {l.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Mobile top bar + drawer */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 surface-ink flex items-center justify-between px-4 h-14 border-b border-gold/15">
        <p className="eyebrow">Admin Panel</p>
        <button onClick={() => setOpen(true)} className="text-cream p-2 -mr-2" aria-label="Open admin menu">
          <Menu className="size-6" />
        </button>
      </div>

      {open && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/60" onClick={() => setOpen(false)}>
          <nav
            className="absolute top-0 right-0 h-full w-72 surface-ink p-5 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <p className="eyebrow">Admin Panel</p>
              <button onClick={() => setOpen(false)} className="text-cream p-2" aria-label="Close admin menu">
                <X className="size-5" />
              </button>
            </div>
            <div className="flex flex-col gap-0.5">
              {LINKS.map((l) => {
                const active = pathname === l.href;
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                      active ? "bg-gold/10 text-gold" : "text-cream/70 hover:bg-white/5 hover:text-gold"
                    }`}
                  >
                    <l.icon className="size-4" /> {l.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      )}

      <main className="flex-1 min-w-0 pt-14 lg:pt-0">{children}</main>
    </div>
  );
}
