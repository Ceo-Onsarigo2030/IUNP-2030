import Link from "next/link";
import Image from "next/image";

export function MinimalTopBar() {
  return (
    <div className="surface-ink border-b border-gold/15">
      <div className="container flex items-center h-16">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Back to UniNexus Connect home">
          <Image
            src="/logos/inter-uni-logo.webp"
            alt="UniNexus Connect"
            width={36}
            height={36}
            className="h-9 w-9 rounded bg-white p-0.5"
          />
          <span className="font-display text-sm font-semibold text-gold tracking-wide">UniNexus Connect</span>
        </Link>
      </div>
    </div>
  );
}
