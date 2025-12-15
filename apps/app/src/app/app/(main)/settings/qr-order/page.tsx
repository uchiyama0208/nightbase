import { redirect } from "next/navigation";
import { getTablesForQR, getStoreId } from "./actions";
import { QROrderSettings } from "./qr-order-settings";
import { getAppDataWithPermissionCheck, getAccessDeniedRedirectUrl } from "@/app/app/data-access";

export const metadata = {
    title: "QRコード注文設定",
};

export default async function QROrderSettingsPage() {
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

    const [tables, storeId] = await Promise.all([
        getTablesForQR(),
        getStoreId(),
    ]);

    if (!storeId) {
        redirect("/app/me");
    }

    return <QROrderSettings tables={tables} storeId={storeId} />;
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
