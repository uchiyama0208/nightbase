import * as React from "react";

import { cn } from "@/lib/utils";

type SeparatorOrientation = "horizontal" | "vertical";

type SeparatorProps = React.HTMLAttributes<HTMLDivElement> & {
  orientation?: SeparatorOrientation;
};

const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  ({ className, orientation = "horizontal", ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "bg-gray-800/60",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className
      )}
      role="separator"
      aria-orientation={orientation}
      {...props}
    />
  )
);
Separator.displayName = "Separator";

export { Separator };
