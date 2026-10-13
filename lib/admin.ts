import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

/** Set ADMIN_MFA_ENFORCE=false in Vercel only as an emergency switch if two-step login ever locks you out. */
export const MFA_ENFORCED = process.env.ADMIN_MFA_ENFORCE !== "false";

/**
 * Guard for admin-only API routes. Returns the user only if they hold the admin role AND
 * (when enforcement is on) have completed two-step verification for this session.
 */
export async function requireAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const service = createServiceRoleClient();
  const { data: role } = await service
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (!role) return null;

  if (MFA_ENFORCED) {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel !== "aal2") return null;
  }
  return user;
}
