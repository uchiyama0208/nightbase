import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getAppDataWithPermissionCheck, getAccessDeniedRedirectUrl } from "../../data-access";
import { getReservations, getReservationSettings } from "./actions";
import { ReservationList } from "./reservation-list";

export const metadata: Metadata = {
    title: "予約管理",
};

export default async function ReservationsPage() {
    const { user, profile, hasAccess, canEdit } = await getAppDataWithPermissionCheck("reservations", "view");

    if (!user) {
        redirect("/login");
    }

    if (!profile) {
        redirect("/onboarding/choice");
    }

    if (!profile.store_id) {
        redirect("/onboarding/store-info");
    }

    if (!hasAccess) {
        redirect(getAccessDeniedRedirectUrl("reservations"));
    }

    const store = profile.stores;
    const storeId = profile.store_id;

    // 予約エントリと設定を取得
    const [reservationsResult, settingsResult] = await Promise.all([
        getReservations(storeId),
        getReservationSettings(storeId),
    ]);

    return (
        <ReservationList
            reservations={reservationsResult.reservations}
            storeId={storeId}
            storeName={store?.name || ""}
            settings={settingsResult.settings}
            daySwitchTime={store?.day_switch_time || "05:00"}
            canEdit={canEdit}
        />
    );
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
