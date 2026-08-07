import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8 bg-cream">
      <div className="text-center max-w-md">
        <p className="eyebrow mb-3">404</p>
        <h1 className="heading-display text-3xl text-ink mb-3">Page not found</h1>
        <p className="text-ink/60 text-sm mb-6">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
        <Link href="/" className="btn-gold">Back to home</Link>
      </div>
    </div>
  );
}
