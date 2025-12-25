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
                    if (shouldOpenPicker && !props.readOnly && !props.disabled) {
                        event.currentTarget.showPicker?.();
                    }
                },
            }
            : {};

        return (
            <input
                type={type}
                className={cn(
                    "flex h-10 w-full rounded-full border border-gray-300 bg-white px-4 py-2 text-base text-gray-900 placeholder:text-gray-400 shadow-sm transition-all duration-200 ease-out focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:shadow-md focus:shadow-primary/10 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-950 dark:text-gray-50 dark:border-gray-800 dark:placeholder:text-gray-400",
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
