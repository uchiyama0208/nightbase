import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabaseServerClient";
import { ShiftSettingsForm } from "./shift-settings-form";
import { getAppDataWithPermissionCheck, getAccessDeniedRedirectUrl } from "@/app/app/data-access";

export default async function ShiftSettingsPage() {
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

    // Get automation settings
    const supabase = await createServerClient() as any;
    const { data: automationSettings } = await supabase
        .from("shift_automation_settings")
        .select("*")
        .eq("store_id", store.id)
        .maybeSingle();

    return (
        <ShiftSettingsForm
            store={store}
            automationSettings={automationSettings}
        />
    );
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
