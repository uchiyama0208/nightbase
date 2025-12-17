import { redirect } from "next/navigation";
import { StoreSettingsForm } from "./store-settings-form";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getAppDataWithPermissionCheck, getAccessDeniedRedirectUrl } from "@/app/app/data-access";
import { createServerClient } from "@/lib/supabaseServerClient";

export default async function StoreSettingsPage() {
    const { user, profile, hasAccess } = await getAppDataWithPermissionCheck("settings", "edit");

    if (!user) {
        redirect("/login");
    }

    if (!profile) {
        redirect("/app/me");
    }

    if (!hasAccess) {
        redirect(getAccessDeniedRedirectUrl("settings"));
    }

    const store = profile.stores as any;

    // store_settings からも設定を取得
    const supabase = await createServerClient() as any;
    const { data: storeSettings } = await supabase
        .from("store_settings")
        .select("business_start_time, business_end_time, day_switch_time, closed_days, allow_join_requests")
        .eq("store_id", store.id)
        .single();

    // storeオブジェクトにstore_settingsのデータをマージ
    const storeWithSettings = {
        ...store,
        business_start_time: storeSettings?.business_start_time || null,
        business_end_time: storeSettings?.business_end_time || null,
        day_switch_time: storeSettings?.day_switch_time || null,
        closed_days: storeSettings?.closed_days || [],
        allow_join_requests: storeSettings?.allow_join_requests || false,
    };

    return (
        <div className="max-w-2xl mx-auto space-y-4">
            <div className="flex items-center space-x-4">
                <Link
                    href="/app/settings"
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                    <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </Link>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">店舗情報</h1>
            </div>

            <StoreSettingsForm store={storeWithSettings} />
        </div>
    );
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
