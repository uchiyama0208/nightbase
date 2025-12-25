"use client";

import { useRef, useState, useEffect, ReactNode } from "react";

export interface Tab {
    key: string;
    label: string;
    count?: number;
    badge?: ReactNode;
}

interface VercelTabsProps {
    tabs: Tab[];
    value: string;
    onChange: (value: string) => void;
    className?: string;
    fullWidth?: boolean;
}

export function VercelTabs({ tabs, value, onChange, className = "", fullWidth = false }: VercelTabsProps) {
    const tabsRef = useRef<{ [key: string]: HTMLButtonElement | null }>({});
    const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

    useEffect(() => {
        const activeButton = tabsRef.current[value];
        if (activeButton) {
            setIndicatorStyle({
                left: activeButton.offsetLeft,
                width: activeButton.offsetWidth,
            });
        }
    }, [value]);

    // Handle resize to recalculate indicator position
    useEffect(() => {
        const handleResize = () => {
            const activeButton = tabsRef.current[value];
            if (activeButton) {
                setIndicatorStyle({
                    left: activeButton.offsetLeft,
                    width: activeButton.offsetWidth,
                });
            }
        };

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [value]);

    return (
        <div className={`relative ${fullWidth ? "w-full" : ""} ${className}`}>
            <div className="flex border-b border-gray-200 dark:border-gray-700">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        ref={(el) => { tabsRef.current[tab.key] = el; }}
                        type="button"
                        onClick={() => onChange(tab.key)}
                        className={`flex-1 px-1 py-2 text-sm font-medium transition-colors duration-200 whitespace-nowrap ${
                            value === tab.key
                                ? "text-gray-900 dark:text-white"
                                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                        }`}
                    >
                        {tab.label}
                        {tab.count !== undefined && tab.count > 0 && (
                            <span className="ml-2 inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 text-xs font-medium">
                                {tab.count}
                            </span>
                        )}
                        {tab.badge}
                    </button>
                ))}
            </div>
            <span
                className="absolute bottom-0 h-0.5 bg-gray-900 dark:bg-white transition-all duration-300 ease-out"
                style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
            />
        </div>
    );
}
