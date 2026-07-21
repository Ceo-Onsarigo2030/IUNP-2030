"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8 bg-cream">
      <div className="text-center max-w-md">
        <p className="eyebrow mb-3">UniNexus Connect</p>
        <h1 className="heading-display text-3xl text-ink mb-3">Something went wrong</h1>
        <p className="text-ink/60 text-sm mb-6">
          We&apos;ve logged the issue and the team has been notified. Please try again.
        </p>
        <button onClick={reset} className="btn-gold">Try again</button>
      </div>
    </div>
  );
}
