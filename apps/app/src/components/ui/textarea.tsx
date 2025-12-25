import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 placeholder:text-gray-400 shadow-sm transition-all duration-200 ease-out focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:shadow-md focus:shadow-primary/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-500",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
