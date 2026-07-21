import Link from "next/link";
import {
  LayoutDashboard, CalendarDays, Newspaper, MessageSquare, Mail, BellRing, Users, Settings,
} from "lucide-react";

const LINKS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/events", label: "Events & Ticketing", icon: CalendarDays },
  { href: "/admin/articles", label: "Articles & Announcements", icon: Newspaper },
  { href: "/admin/feedback", label: "Feedback Wall", icon: MessageSquare },
  { href: "/admin/newsletter", label: "Newsletter", icon: Mail },
  { href: "/admin/campaigns", label: "Email Campaigns", icon: Mail },
  { href: "/admin/push", label: "Push Notifications", icon: BellRing },
  { href: "/admin/members", label: "Members", icon: Users },
  { href: "/admin/settings", label: "Site Settings", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream-dim flex">
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
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
