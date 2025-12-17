import { redirect } from "next/navigation";
import { getSnsPageData } from "./actions";
import { SnsClient } from "./SnsClient";
import { getAppDataWithPermissionCheck, getAccessDeniedRedirectUrl } from "../../data-access";

export default async function SnsPage() {
    const { user, profile, hasAccess, canEdit } = await getAppDataWithPermissionCheck("sns", "view");

    if (!user) {
        redirect("/login");
    }

    if (!profile || !profile.store_id) {
        redirect("/app/me");
    }

    if (!hasAccess) {
        redirect(getAccessDeniedRedirectUrl("sns"));
    }

    const result = await getSnsPageData();

    if ("redirect" in result) {
        redirect(result.redirect);
    }

    const { data } = result;

    return (
        <SnsClient
            storeId={data.storeId}
            storeName={data.storeName}
            accounts={data.accounts}
            templates={data.templates}
            scheduledPosts={data.scheduledPosts}
            postHistory={data.postHistory}
            recurringSchedules={data.recurringSchedules}
            canEdit={canEdit}
        />
    );
}
