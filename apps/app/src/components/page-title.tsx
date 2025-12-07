"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";

type TabKey = "shift" | "user" | "floor" | "salary" | "community";

interface PageTitleProps {
    title: string;
    description?: string;
    backTab?: TabKey;
}

export function PageTitle({ title, description, backTab }: PageTitleProps) {
    return (
        <div className="mb-4">
            <div className="flex items-center gap-2">
                {backTab && (
                    <Link
                        href={`/app/dashboard?tab=${backTab}`}
                        className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors lg:hidden"
                    >
                        <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    </Link>
                )}
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    {title}
                </h1>
            </div>
            {description && (
                <p className={`text-sm text-gray-600 dark:text-gray-400 mt-1 ${backTab ? "ml-10 lg:ml-0" : ""}`}>
                    {description}
                </p>
            )}
        </div>
    );
}
