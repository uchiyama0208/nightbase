import { redirect } from "next/navigation";
import { getPickupData } from "@/app/app/(main)/pickup/actions";
import { getAppDataWithPermissionCheck, getAccessDeniedRedirectUrl } from "@/app/app/data-access";
import { PickupFullscreenMap } from "./PickupFullscreenMap";

export default async function PickupMapPage({
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

    // 送迎先が設定されているキャストだけをフィルタ
    const attendeesWithDestination = todayAttendees.filter(
        (a) => a.pickup_destination
    );

    return (
        <PickupFullscreenMap
            routes={routes}
            storeLocation={storeLocation}
            attendees={attendeesWithDestination}
            allAttendees={todayAttendees}
            staffProfiles={staffProfiles}
            allProfiles={allProfiles}
            currentProfileId={currentProfileId}
            storeId={storeId}
            storeAddress={storeLocation.address || undefined}
            date={targetDate}
            canEdit={canEdit}
            daySwitchTime={daySwitchTime}
        />
    );
}
