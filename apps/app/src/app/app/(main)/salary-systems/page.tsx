import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SalarySystemsList } from "./salary-systems-list";
import { getSalarySystems } from "./actions";
import { getAppDataWithPermissionCheck, getAccessDeniedRedirectUrl } from "../../data-access";

export const metadata: Metadata = {
    title: "給与システム",
};

function SalarySystemsSkeleton() {
    return (
        <div className="space-y-4 animate-pulse">
            <div className="h-8 w-1/3 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
    );
}

export default async function SalarySystemsPage({
    searchParams,
}: {
    searchParams: Promise<{ type?: string }>;
}) {
    const { user, profile, hasAccess } = await getAppDataWithPermissionCheck("salary-systems", "view");

    if (!user) {
        redirect("/login");
    }

    if (!profile || !profile.store_id) {
        redirect("/app/me");
    }

    if (!hasAccess) {
        redirect(getAccessDeniedRedirectUrl("salary-systems"));
    }

    const store = profile.stores as any;
    const storeShowBreakColumns = store?.show_break_columns ?? false;
    const storeTimeRoundingEnabled = store?.time_rounding_enabled ?? false;
    const storeTimeRoundingMinutes = store?.time_rounding_minutes ?? 15;

    const params = await searchParams;
    const typeFilter = params.type || "cast";

    const salarySystems = await getSalarySystems();

    return (
        <Suspense fallback={<SalarySystemsSkeleton />}>
            <SalarySystemsList
                initialSystems={salarySystems}
                typeFilter={typeFilter}
                storeShowBreakColumns={storeShowBreakColumns}
                storeTimeRoundingEnabled={storeTimeRoundingEnabled}
                storeTimeRoundingMinutes={storeTimeRoundingMinutes}
            />
        </Suspense>
    );
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
