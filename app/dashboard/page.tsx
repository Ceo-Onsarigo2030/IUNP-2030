import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MembershipCard } from "@/components/membership-card";
import { ProfileForm } from "@/components/profile-form";
import { ArrowRight } from "lucide-react";

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  const { data: currentEvent } = await supabase.from("events").select("*").eq("status", "current").maybeSingle();

  const categoryLabel =
    profile?.category === "institution" ? profile.institution_name || "Institution Member"
    : profile?.category === "affiliation" ? "Affiliation Member"
    : "Community Member";

  return (
    <div className="bg-cream min-h-screen">
      <section className="surface-ink py-14">
        <div className="container">
          <p className="eyebrow mb-2">Welcome back</p>
          <h1 className="heading-display text-3xl sm:text-4xl text-cream">{profile?.full_name || "Member"}</h1>
        </div>
      </section>

      <section className="container py-12 grid lg:grid-cols-[1fr_1.1fr] gap-10">
        <div>
          <h2 className="font-display text-xl mb-4">Your Membership ID</h2>
          <MembershipCard
            fullName={profile?.full_name || "Member"}
            membershipId={profile?.membership_id || "UniNexus-000"}
            category={categoryLabel}
            joinedYear={profile?.created_at ? new Date(profile.created_at).getFullYear() : new Date().getFullYear()}
          />

          {currentEvent && (
            <div className="card-elegant p-6 mt-8">
              <p className="eyebrow !text-gold-deep mb-2">Current event</p>
              <h3 className="font-display text-xl mb-3">{currentEvent.title}</h3>
              <Link href="/programs" className="text-sm font-semibold text-gold-deep flex items-center gap-1">
                Buy your ticket <ArrowRight className="size-3.5" />
              </Link>
            </div>
          )}
        </div>

        <div>
          <h2 className="font-display text-xl mb-4">Update your details</h2>
          <ProfileForm profile={profile} />
        </div>
      </section>
    </div>
  );
}
