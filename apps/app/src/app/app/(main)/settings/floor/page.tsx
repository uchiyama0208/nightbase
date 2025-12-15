import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { FloorSettingsForm } from "./floor-settings-form";
import { getAppDataWithPermissionCheck, getAccessDeniedRedirectUrl } from "@/app/app/data-access";

export const metadata: Metadata = {
    title: "フロア設定",
};

export default async function FloorSettingsPage() {
    const { user, profile, hasAccess } = await getAppDataWithPermissionCheck("settings", "edit");

    if (!user) {
        redirect("/login");
    }

    if (!profile || !profile.store_id) {
        redirect("/app/me");
    }

    if (!hasAccess) {
        redirect(getAccessDeniedRedirectUrl("settings"));
    }

    const store = profile.stores as any;

    if (!store) {
        redirect("/app/settings");
    }

    return (
        <div className="max-w-2xl mx-auto space-y-4">
            <div className="flex items-center gap-4">
                <Link
                    href="/app/settings"
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-10 w-10"
                >
                    <ChevronLeft className="h-4 w-4" />
                </Link>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                    フロア設定
                </h1>
            </div>

            <FloorSettingsForm store={store} />
        </div>
    );
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
