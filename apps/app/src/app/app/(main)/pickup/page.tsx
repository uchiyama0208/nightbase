import { redirect } from "next/navigation";
import { getPickupData } from "./actions";
import { PickupClient } from "./PickupClient";
import { PageTitle } from "@/components/page-title";

export default async function PickupPage({
    searchParams,
}: {
    searchParams: Promise<{ date?: string }>;
}) {
    const params = await searchParams;
    const result = await getPickupData(params.date);

    if ("redirect" in result) {
        redirect(result.redirect);
    }

    const { routes, todayAttendees, staffProfiles, targetDate, storeId } = result.data;

    return (
        <div className="space-y-4">
            <PageTitle
                title="送迎管理"
                description="送迎ルートの作成と管理ができます。"
                backTab="shift"
            />
            <PickupClient
                initialRoutes={routes}
                initialAttendees={todayAttendees}
                staffProfiles={staffProfiles}
                initialDate={targetDate}
                storeId={storeId}
            />
        </div>
    );
}
