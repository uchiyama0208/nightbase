"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { SlipSettingsForm } from "./slip-settings-form";
import { getSlipSettingsPageData } from "../actions";
import { useAuthHelpers } from "@/app/app/hooks";

function SlipSettingsSkeleton() {
    return (
        <div className="max-w-2xl mx-auto space-y-4 animate-pulse">
            <div className="flex items-center space-x-4">
                <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                <div className="h-7 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
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

export function SlipSettingsWrapper() {
    const { isLoading: isAuthLoading, hasAccess } = useAuthHelpers();

    const { data, isLoading: isDataLoading } = useQuery({
        queryKey: ["settings", "slip", "pageData"],
        queryFn: getSlipSettingsPageData,
        staleTime: 60 * 1000,
    });

    // リダイレクト処理
    if (data && "redirect" in data && data.redirect) {
        window.location.href = data.redirect;
        return <SlipSettingsSkeleton />;
    }

    if (isAuthLoading || isDataLoading || !data || !("data" in data) || !data.data) {
        return <SlipSettingsSkeleton />;
    }

    if (!hasAccess("settings")) {
        window.location.href = "/app/me";
        return <SlipSettingsSkeleton />;
    }

    const { store } = data.data;

    return (
        <div className="max-w-2xl mx-auto space-y-4">
            <div className="flex items-center space-x-4">
                <Link
                    href="/app/settings"
                    className="p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                    <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </Link>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">伝票設定</h1>
            </div>

            <SlipSettingsForm store={store} />
        </div>
    );
}
