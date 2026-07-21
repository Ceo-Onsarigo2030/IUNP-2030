import { createClient } from "@/lib/supabase/server";

const DEFAULT_MESSAGE = "This is UniNexus Connect. Let's Interact. Connect & Grow!";

async function getMarqueeText() {
  try {
    const supabase = createClient();
    const { data } = await supabase.from("site_settings").select("value").eq("key", "marquee_text").maybeSingle();
    return data?.value || DEFAULT_MESSAGE;
  } catch {
    return DEFAULT_MESSAGE;
  }
}

export async function MarqueeBanner() {
  const text = await getMarqueeText();
  const items = Array.from({ length: 6 }, () => text);

  return (
    <div className="bg-gold/95 text-ink overflow-hidden py-2 border-b border-gold-deep/30">
      <div className="marquee-track">
        {items.map((t, i) => (
          <span key={i} className="text-xs sm:text-sm font-semibold tracking-wide uppercase">
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
