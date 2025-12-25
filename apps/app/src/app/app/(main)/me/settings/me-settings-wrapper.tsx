"use client";

import { useQuery } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { getMeSettingsPageData, signOut } from "../actions";
import { ProfileClient } from "../profile-client";
import { DeleteAccountModal } from "../delete-account-modal";
import { NotificationSettings } from "./notification-settings";

function MeSettingsSkeleton() {
    return (
        <div className="max-w-2xl mx-auto space-y-4 animate-pulse">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="p-4 flex items-center space-x-4">
                        <div className="bg-gray-200 dark:bg-gray-700 p-2 rounded-md w-9 h-9" />
                        <div className="flex-1 space-y-2">
                            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                            <div className="h-3 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function MeSettingsWrapper() {
    const { data, isLoading } = useQuery({
        queryKey: ["me", "settings", "pageData"],
        queryFn: getMeSettingsPageData,
        staleTime: 60 * 1000,
    });

    // リダイレクト処理
    if (data && "redirect" in data && data.redirect) {
        window.location.href = data.redirect;
        return <MeSettingsSkeleton />;
    }

    if (isLoading || !data || !("data" in data) || !data.data) {
        return <MeSettingsSkeleton />;
    }

    const { email, name, identities, userId, lineUserId } = data.data;

    return (
        <div className="max-w-2xl mx-auto space-y-4">
            {/* Settings List */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
                {/* Account Settings Section */}
                <ProfileClient
                    initialEmail={email}
                    initialName={name}
                    identities={identities}
                    userId={userId}
                    lineUserId={lineUserId}
                />

                {/* Notification Settings Section */}
                <NotificationSettings />

                {/* Logout */}
                <form action={signOut}>
                    <button
                        type="submit"
                        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        <div className="flex items-center space-x-4">
                            <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-md">
                                <LogOut className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                            </div>
                            <span className="font-medium text-gray-900 dark:text-white">ログアウト</span>
                        </div>
                    </button>
                </form>

                {/* Delete Account */}
                <DeleteAccountModal />
            </div>
        </div>
    );
}
