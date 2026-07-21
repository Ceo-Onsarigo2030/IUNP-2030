"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Menu, X, CalendarDays, LogOut, LayoutDashboard, ShieldCheck } from "lucide-react";
import { NAV } from "@/lib/constants";
import { cn } from "@/lib/utils";

// Swap this stub for real Supabase auth state (useAuth hook) once wired.
function useSessionStub() {
  return { user: null as null | { id: string }, isAdmin: false };
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { user, isAdmin } = useSessionStub();

  return (
    <header className="sticky top-0 z-50 surface-ink border-b border-gold/15">
      <div className="container flex h-[76px] items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2.5 shrink-0" aria-label="UniNexus Connect home">
          <Image
            src="/logos/inter-uni-logo.webp"
            alt="Inter-Universities Nexus Platform"
            width={44}
            height={44}
            className="h-11 w-11 rounded-md object-contain bg-white p-0.5"
            priority
          />
          <div className="hidden sm:block leading-tight">
            <div className="font-display text-[15px] font-semibold text-gold tracking-wide">UniNexus Connect</div>
            <div className="text-[9px] uppercase tracking-[0.2em] text-cream/60">Inter-Universities Nexus Platform</div>
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="btn-ghost-cream !px-3 !py-2">
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-2.5">
          <Link href="/programs" className="btn-outline-gold !py-2.5">
            <CalendarDays className="size-4" />
            Events &amp; Programs
          </Link>

          {user ? (
            <>
              <Link href="/dashboard" className="btn-ghost-cream !px-3">
                <LayoutDashboard className="size-4" /> Dashboard
              </Link>
              {isAdmin && (
                <Link href="/admin" className="btn-ghost-cream !px-3 !text-gold">
                  <ShieldCheck className="size-4" /> Admin
                </Link>
              )}
            </>
          ) : (
            <Link href="/auth" className="btn-gold !py-2.5">
              Join UniNexus
            </Link>
          )}
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="lg:hidden text-cream p-2 -mr-2"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>

      <div
        className={cn(
          "lg:hidden overflow-hidden border-t border-gold/10 transition-[max-height] duration-300 ease-out",
          open ? "max-h-[28rem]" : "max-h-0 border-t-0"
        )}
      >
        <div className="container py-4 flex flex-col gap-1">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="px-2 py-2.5 text-cream/85 hover:text-gold">
              {n.label}
            </Link>
          ))}
          <Link href="/programs" onClick={() => setOpen(false)} className="px-2 py-2.5 text-gold font-medium flex items-center gap-2">
            <CalendarDays className="size-4" /> Events &amp; Programs
          </Link>
          <div className="pt-2">
            {user ? (
              <Link href="/dashboard" onClick={() => setOpen(false)} className="btn-gold w-full">Dashboard</Link>
            ) : (
              <Link href="/auth" onClick={() => setOpen(false)} className="btn-gold w-full">Join UniNexus</Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
