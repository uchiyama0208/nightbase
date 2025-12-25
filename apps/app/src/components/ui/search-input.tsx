"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchInputProps {
    value?: string;
    onChange?: (value: string) => void;
    onSearch?: (value: string) => void;
    placeholder?: string;
    className?: string;
    debounceMs?: number;
    autoFocus?: boolean;
}

/**
 * 検索入力コンポーネント
 * クリアボタン付き、オプションでデバウンス対応
 */
export function SearchInput({
    value: controlledValue,
    onChange,
    onSearch,
    placeholder = "検索...",
    className,
    debounceMs = 0,
    autoFocus = false,
}: SearchInputProps) {
    const [internalValue, setInternalValue] = useState(controlledValue ?? "");
    const value = controlledValue ?? internalValue;

    // デバウンス用
    useEffect(() => {
        if (debounceMs <= 0 || !onSearch) return;

        const timer = setTimeout(() => {
            onSearch(value);
        }, debounceMs);

        return () => clearTimeout(timer);
    }, [value, debounceMs, onSearch]);

    const handleChange = useCallback((newValue: string) => {
        if (controlledValue === undefined) {
            setInternalValue(newValue);
        }
        onChange?.(newValue);

        // デバウンスなしの場合は即座にonSearchを呼ぶ
        if (debounceMs <= 0 && onSearch) {
            onSearch(newValue);
        }
    }, [controlledValue, onChange, onSearch, debounceMs]);

    const handleClear = useCallback(() => {
        handleChange("");
    }, [handleChange]);

    return (
        <div className={cn("relative", className)}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
                type="text"
                value={value}
                onChange={(e) => handleChange(e.target.value)}
                placeholder={placeholder}
                autoFocus={autoFocus}
                className="pl-9 pr-9 h-10 rounded-lg"
            />
            {value && (
                <button
                    type="button"
                    onClick={handleClear}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                    <X className="h-4 w-4" />
                </button>
            )}
        </div>
    );
}

interface SearchInputWithLabelProps extends SearchInputProps {
    label: string;
}

/**
 * ラベル付き検索入力コンポーネント
 */
export function SearchInputWithLabel({
    label,
    ...props
}: SearchInputWithLabelProps) {
    return (
        <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                {label}
            </label>
            <SearchInput {...props} />
        </div>
    );
}
