export function LegalPage({ eyebrow, title, updated, children }: { eyebrow: string; title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="bg-cream">
      <section className="surface-ink py-14 sm:py-20 text-center">
        <div className="container">
          <p className="eyebrow mb-3">{eyebrow}</p>
          <h1 className="heading-display text-4xl sm:text-5xl text-cream">{title}</h1>
          <p className="text-cream/50 text-sm mt-4">Last updated: {updated}</p>
        </div>
      </section>
      <div className="container max-w-3xl py-12 sm:py-16 text-ink/75 leading-relaxed space-y-5 [&_h2]:heading-display [&_h2]:text-2xl [&_h2]:text-ink [&_h2]:mt-10 [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1.5 [&_a]:text-gold-deep [&_a]:underline">
        {children}
      </div>
    </div>
  );
}
