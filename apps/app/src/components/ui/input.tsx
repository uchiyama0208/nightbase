"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type = "text", onClick, ...props }, ref) => {
        const shouldOpenPicker = ["date", "time", "datetime-local", "month"].includes(type);

        // Only add onClick handler if needed
        const inputProps = shouldOpenPicker || onClick
            ? {
                onClick: (event: React.MouseEvent<HTMLInputElement>) => {
                    onClick?.(event);
                    if (shouldOpenPicker) {
                        event.currentTarget.showPicker?.();
                    }
                },
            }
            : {};

        return (
            <input
                type={type}
                className={cn(
                    "flex h-10 w-full rounded-full border border-slate-300 bg-white px-4 py-2 text-base text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-950 dark:text-slate-50 dark:border-slate-800 dark:placeholder:text-slate-400",
                    className,
                )}
                ref={ref}
                {...inputProps}
                {...props}
            />
        );
    },
);
Input.displayName = "Input";

export { Input };
