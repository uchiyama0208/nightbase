"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { ChevronLeft, Users, Clock } from "lucide-react";
import { MenuImportSection } from "./menu-import-section";
import { CsvImportCard } from "./csv-import-card";
import { USER_FIELDS, ATTENDANCE_FIELDS } from "./field-definitions";
import { importUsersFromCsv } from "../../users/actions";
import { importAttendanceFromCsv } from "../../attendance/actions";
import { importMenusFromCsv } from "../../menus/actions";
import { getImportSettingsPageData } from "../actions";
import { useAuthHelpers } from "@/app/app/hooks";

function ImportSettingsSkeleton() {
    return (
        <div className="max-w-2xl mx-auto space-y-4 animate-pulse">
            <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
            <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-xl" />
                            <div className="space-y-2 flex-1">
                                <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
                                <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded" />
                            </div>
                        </div>
                        <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded-lg" />
                    </div>
                ))}
            </div>
        </div>
    );
}

export function ImportSettingsWrapper() {
    const { isLoading: isAuthLoading, hasAccess } = useAuthHelpers();
    const queryClient = useQueryClient();

    const { data, isLoading: isDataLoading } = useQuery({
        queryKey: ["settings", "import", "pageData"],
        queryFn: getImportSettingsPageData,
        staleTime: 60 * 1000,
    });

    if (data && "redirect" in data && data.redirect) {
        window.location.href = data.redirect;
        return <ImportSettingsSkeleton />;
    }

    if (isAuthLoading || isDataLoading || !data || !("data" in data) || !data.data) {
        return <ImportSettingsSkeleton />;
    }

    if (!hasAccess("settings")) {
        window.location.href = "/app/me";
        return <ImportSettingsSkeleton />;
    }

    const { menuCategories } = data.data;

    const handleImportComplete = () => {
        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: ["users"] });
        queryClient.invalidateQueries({ queryKey: ["attendance"] });
        queryClient.invalidateQueries({ queryKey: ["menus"] });
    };

    return (
        <div className="max-w-2xl mx-auto space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Link
                    href="/app/settings"
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                    <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </Link>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    CSVインポート
                </h1>
            </div>

            <div className="space-y-4">
                {/* Users CSV Import */}
                <CsvImportCard
                    icon={<Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
                    iconBg="bg-blue-100 dark:bg-blue-900/30"
                    title="ユーザーインポート"
                    description="CSVからユーザーを一括登録"
                    fields={USER_FIELDS}
                    importAction={importUsersFromCsv}
                    onImportComplete={handleImportComplete}
                    additionalFields={
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-600 dark:text-gray-400">
                                ロール:
                            </label>
                            <select
                                name="userRole"
                                defaultValue="cast"
                                className="h-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="cast">キャスト</option>
                                <option value="staff">スタッフ</option>
                                <option value="guest">ゲスト</option>
                            </select>
                        </div>
                    }
                />

                {/* Attendance CSV Import */}
                <CsvImportCard
                    icon={<Clock className="h-5 w-5 text-green-600 dark:text-green-400" />}
                    iconBg="bg-green-100 dark:bg-green-900/30"
                    title="勤怠インポート"
                    description="CSVから勤怠データを一括登録"
                    fields={ATTENDANCE_FIELDS}
                    importAction={importAttendanceFromCsv}
                    onImportComplete={handleImportComplete}
                    additionalFields={
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-600 dark:text-gray-400">
                                対象:
                            </label>
                            <select
                                name="attendanceRole"
                                defaultValue="cast"
                                className="h-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="cast">キャスト</option>
                                <option value="staff">スタッフ</option>
                            </select>
                        </div>
                    }
                />

                {/* Menu CSV Import */}
                <MenuImportSection
                    categories={menuCategories}
                    importAction={importMenusFromCsv}
                    onImportComplete={handleImportComplete}
                />
            </div>
        </div>
    );
}
