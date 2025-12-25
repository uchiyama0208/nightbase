"use client";

import { useMemo, useState } from "react";
import { Input, type InputProps } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface FilterSuggestionInputProps extends Omit<InputProps, "value"> {
    value: string;
    onValueChange: (value: string) => void;
    suggestions?: string[];
    onChange?: InputProps["onChange"];
}

export function FilterSuggestionInput({
    value,
    onValueChange,
    suggestions = [],
    className,
    onFocus,
    onBlur,
    onChange,
    ...props
}: FilterSuggestionInputProps) {
    const [open, setOpen] = useState(false);

    const normalizedSuggestions = useMemo(
        () => Array.from(new Set(suggestions.map((s) => s?.trim()).filter(Boolean))) as string[],
        [suggestions],
    );

    const matchedSuggestions = useMemo(() => {
        const query = value.trim().toLowerCase();
        const pool = query
            ? normalizedSuggestions.filter((item) => item.toLowerCase().includes(query))
            : normalizedSuggestions;
        return pool.slice(0, 8);
    }, [normalizedSuggestions, value]);

    const closeWithDelay = () => {
        window.setTimeout(() => setOpen(false), 120);
    };

    return (
        <Popover open={open && matchedSuggestions.length > 0} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Input
                    {...props}
                    value={value}
                    onChange={(event) => {
                        onValueChange(event.target.value);
                        onChange?.(event);
                        setOpen(true);
                    }}
                    onClick={(event) => {
                        // Prevent default date picker behavior for text inputs
                        event.preventDefault();
                        setOpen(true);
                    }}
                    onFocus={(event) => {
                        onFocus?.(event);
                        setOpen(true);
                    }}
                    onBlur={(event) => {
                        onBlur?.(event);
                        closeWithDelay();
                    }}
                    className={className}
                />
            </PopoverTrigger>
            <PopoverContent
                align="start"
                className="w-[var(--radix-popper-anchor-width)] p-0 border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"
            >
                <ScrollArea className="max-h-64">
                    <ul className="py-1">
                        {matchedSuggestions.map((item, index) => (
                            <li key={`${item}-${index}`}>
                                <button
                                    type="button"
                                    className={cn(
                                        "w-full px-3 py-2 text-left text-sm text-gray-900 hover:bg-gray-50",
                                        "dark:text-white dark:hover:bg-gray-700",
                                    )}
                                    onMouseDown={(event) => event.preventDefault()}
                                    onClick={() => {
                                        onValueChange(item);
                                        setOpen(false);
                                    }}
                                >
                                    {item}
                                </button>
                            </li>
                        ))}
                    </ul>
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}
