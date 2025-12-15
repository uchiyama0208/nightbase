import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAppDataWithPermissionCheck, getAccessDeniedRedirectUrl } from "../../data-access";
import { getAllOrders, getTableCalls } from "./actions";
import { OrdersContent } from "./orders-content";

export const metadata: Metadata = {
    title: "注文一覧",
};

export default async function OrdersPage() {
    const { user, profile, hasAccess } = await getAppDataWithPermissionCheck("orders", "view");

    if (!user) {
        redirect("/login");
    }

    if (!profile?.store_id) {
        redirect("/onboarding/store-info");
    }

    if (!hasAccess) {
        redirect(getAccessDeniedRedirectUrl("orders"));
    }

    const [orders, tableCalls] = await Promise.all([
        getAllOrders(),
        getTableCalls(),
    ]);

    return <OrdersContent initialOrders={orders} initialTableCalls={tableCalls} storeId={profile.store_id} />;
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
