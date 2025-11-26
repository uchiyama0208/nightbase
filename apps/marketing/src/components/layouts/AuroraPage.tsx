import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AuroraVariant = "indigo" | "violet" | "teal" | "amber";

const gradientMap: Record<AuroraVariant, string> = {
  indigo: "bg-gradient-to-br from-[#c7d2fe]/80 via-[#e0f2ff]/70 to-[#c4f1ff]/80",
  violet: "bg-gradient-to-br from-[#e0c3fc]/70 via-[#c1d3ff]/70 to-[#d4fcf7]/60",
  teal: "bg-gradient-to-br from-[#bbf7d0]/70 via-[#bae6fd]/70 to-[#ede9fe]/70",
  amber: "bg-gradient-to-br from-[#ffe4c7]/70 via-[#dbeafe]/60 to-[#e9d5ff]/70",
};

interface AuroraPageProps {
  children: ReactNode;
  className?: string;
  containerClassName?: string;
  variant?: AuroraVariant;
}

export function AuroraPage({
  children,
  className,
  containerClassName,
  variant = "indigo",
}: AuroraPageProps) {
  return (
    <div className={cn("relative isolate overflow-hidden py-20 sm:py-28", className)}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.96),_transparent_65%)]"
      />
      <div aria-hidden className={cn("pointer-events-none absolute inset-0 opacity-80 blur-3xl", gradientMap[variant])} />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-10 h-48 w-[60vw] -translate-x-1/2 rounded-full bg-white/60 blur-[140px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-[radial-gradient(circle_at_bottom,_rgba(95,111,255,0.1),_transparent_60%)]"
      />
      <div className={cn("container relative z-10 space-y-16", containerClassName)}>{children}</div>
    </div>
  );
}
