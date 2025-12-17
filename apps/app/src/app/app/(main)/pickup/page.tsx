import { redirect } from "next/navigation";
import { getPickupData } from "./actions";
import { PickupClient } from "./PickupClient";
import { getAppDataWithPermissionCheck, getAccessDeniedRedirectUrl } from "../../data-access";

export default async function PickupPage({
    searchParams,
}: {
    searchParams: Promise<{ date?: string }>;
}) {
    const { user, profile, hasAccess, canEdit } = await getAppDataWithPermissionCheck("pickup", "view");

    if (!user) {
        redirect("/login");
    }

    if (!profile || !profile.store_id) {
        redirect("/app/me");
    }

    if (!hasAccess) {
        redirect(getAccessDeniedRedirectUrl("pickup"));
    }

    const params = await searchParams;
    const result = await getPickupData(params.date);

    if ("redirect" in result) {
        redirect(result.redirect);
    }

    const { routes, todayAttendees, staffProfiles, allProfiles, currentProfileId, targetDate, storeId, storeLocation, daySwitchTime } = result.data;

    return (
        <PickupClient
            initialRoutes={routes}
            initialAttendees={todayAttendees}
            staffProfiles={staffProfiles}
            allProfiles={allProfiles}
            currentProfileId={currentProfileId}
            initialDate={targetDate}
            storeId={storeId}
            storeAddress={storeLocation.address || undefined}
            canEdit={canEdit}
            daySwitchTime={daySwitchTime}
        />
    );
}
