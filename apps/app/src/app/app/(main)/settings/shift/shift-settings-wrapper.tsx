"use client";

import { useQuery } from "@tanstack/react-query";
import { ShiftSettingsForm } from "./shift-settings-form";
import { getShiftSettingsPageData } from "../actions";
import { useAuthHelpers } from "@/app/app/hooks";

function ShiftSettingsSkeleton() {
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

export function ShiftSettingsWrapper() {
    const { isLoading: isAuthLoading, hasAccess } = useAuthHelpers();

    const { data, isLoading: isDataLoading } = useQuery({
        queryKey: ["settings", "shift", "pageData"],
        queryFn: getShiftSettingsPageData,
        staleTime: 60 * 1000,
    });

    // リダイレクト処理
    if (data && "redirect" in data && data.redirect) {
        window.location.href = data.redirect;
        return <ShiftSettingsSkeleton />;
    }

    if (isAuthLoading || isDataLoading || !data || !("data" in data) || !data.data) {
        return <ShiftSettingsSkeleton />;
    }

    if (!hasAccess("settings")) {
        window.location.href = "/app/me";
        return <ShiftSettingsSkeleton />;
    }

    const { store, automationSettings } = data.data;

    return (
        <ShiftSettingsForm
            store={store}
            automationSettings={automationSettings}
        />
    );
}
