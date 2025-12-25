"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { FloorSettingsForm } from "./floor-settings-form";
import { getFloorSettingsPageData } from "../actions";
import { useAuthHelpers } from "@/app/app/hooks";

function FloorSettingsSkeleton() {
    return (
        <div className="max-w-2xl mx-auto space-y-4 animate-pulse">
            <div className="flex items-center gap-4">
                <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
            <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="space-y-2">
                        <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                        <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded-lg" />
                    </div>
                ))}
            </div>
        </div>
    );
}

export function FloorSettingsWrapper() {
    const { isLoading: isAuthLoading, hasAccess } = useAuthHelpers();

    const { data, isLoading: isDataLoading } = useQuery({
        queryKey: ["settings", "floor", "pageData"],
        queryFn: getFloorSettingsPageData,
        staleTime: 60 * 1000,
    });

    // リダイレクト処理
    if (data && "redirect" in data && data.redirect) {
        window.location.href = data.redirect;
        return <FloorSettingsSkeleton />;
    }

    if (isAuthLoading || isDataLoading || !data || !("data" in data) || !data.data) {
        return <FloorSettingsSkeleton />;
    }

    if (!hasAccess("settings")) {
        window.location.href = "/app/me";
        return <FloorSettingsSkeleton />;
    }

    const { store } = data.data;

    return (
        <div className="max-w-2xl mx-auto space-y-4">
            <div className="flex items-center gap-4">
                <Link
                    href="/app/settings"
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-10 w-10"
                >
                    <ChevronLeft className="h-5 w-5" />
                </Link>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                    フロア設定
                </h1>
            </div>

            <FloorSettingsForm store={store} />
        </div>
    );
}
