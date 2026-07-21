"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body className="surface-ink min-h-screen flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <p className="text-gold text-xs uppercase tracking-widest mb-3">UniNexus Connect</p>
          <h1 className="font-display text-3xl text-cream mb-3">Something went wrong</h1>
          <p className="text-cream/60 text-sm mb-6">
            We&apos;ve logged the issue and the team has been notified. Please try again.
          </p>
          <button onClick={reset} className="btn-gold">Try again</button>
        </div>
      </body>
    </html>
  );
}
