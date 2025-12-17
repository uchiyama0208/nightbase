import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getAppDataWithPermissionCheck, getAccessDeniedRedirectUrl } from "../../data-access";
import { getQueueEntries, getQueueSettings } from "./actions";
import { QueueList } from "./queue-list";

export const metadata: Metadata = {
    title: "順番待ち管理",
};

export default async function QueuePage() {
    const { user, profile, hasAccess, canEdit } = await getAppDataWithPermissionCheck("queue", "view");

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
        redirect(getAccessDeniedRedirectUrl("queue"));
    }

    const store = profile.stores;
    const storeId = profile.store_id;

    // 順番待ちエントリと設定を取得
    const [entriesResult, settingsResult] = await Promise.all([
        getQueueEntries(storeId),
        getQueueSettings(storeId),
    ]);

    return (
        <QueueList
            entries={entriesResult.entries}
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
