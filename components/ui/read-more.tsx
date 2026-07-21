"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function ReadMore({
  lines = [],
  visibleCount = 3,
  label = "Read more",
  lessLabel = "Show less",
  className,
}: {
  lines: string[];
  visibleCount?: number;
  label?: string;
  lessLabel?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  if (lines.length <= visibleCount) {
    return (
      <div className={className}>
        {lines.map((l, i) => (
          <p key={i} className="mb-3 last:mb-0 leading-relaxed">{l}</p>
        ))}
      </div>
    );
  }

  const visible = lines.slice(0, visibleCount);
  const rest = lines.slice(visibleCount);

  return (
    <div className={className}>
      {visible.map((l, i) => (
        <p key={i} className="mb-3 last:mb-0 leading-relaxed">{l}</p>
      ))}
      {open && rest.map((l, i) => (
        <p key={`r-${i}`} className="mb-3 last:mb-0 leading-relaxed animate-fade-up">{l}</p>
      ))}
      <button
        onClick={() => setOpen((v) => !v)}
        className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-gold hover:text-gold-deep transition-colors"
      >
        {open ? lessLabel : label}
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
      </button>
    </div>
  );
}
