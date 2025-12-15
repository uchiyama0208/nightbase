import { redirect } from "next/navigation";
import { TimecardSettingsForm } from "./timecard-settings-form";
import { getAppDataWithPermissionCheck, getAccessDeniedRedirectUrl } from "@/app/app/data-access";

export default async function TimecardSettingsPage() {
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

    return (
        <TimecardSettingsForm store={store} />
    );
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
