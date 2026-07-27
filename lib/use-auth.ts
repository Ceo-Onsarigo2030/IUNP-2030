"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function useAuth() {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function checkRole(userId: string) {
      try {
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .eq("role", "admin")
          .maybeSingle();
        if (!cancelled) setIsAdmin(!!data);
      } catch {
        if (!cancelled) setIsAdmin(false);
      }
    }

    async function load() {
      try {
        const { data } = await supabase.auth.getUser();
        if (cancelled) return;
        setUser(data.user ? { id: data.user.id, email: data.user.email } : null);
        if (data.user) await checkRole(data.user.id);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      setUser(session?.user ? { id: session.user.id, email: session.user.email } : null);
      setIsAdmin(false);
      if (session?.user) checkRole(session.user.id);
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
  }

  return { user, isAdmin, loading, signOut };
}
