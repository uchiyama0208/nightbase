import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-white focus:ring-primary",
        secondary: "border-transparent bg-secondary text-[#111111] focus:ring-secondary",
        outline: "border-neutral-700/20 bg-transparent text-neutral-200 focus:ring-neutral-500",
        neutral: "border-transparent bg-neutral-100 text-neutral-600 focus:ring-neutral-300",
        success: "border-transparent bg-emerald-500/15 text-emerald-500 focus:ring-emerald-400",
        warning: "border-transparent bg-amber-500/15 text-amber-500 focus:ring-amber-400",
        destructive: "border-transparent bg-red-500/15 text-red-500 focus:ring-red-400"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
