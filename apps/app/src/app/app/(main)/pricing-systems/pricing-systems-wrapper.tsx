"use client";

import { useQuery } from "@tanstack/react-query";
import { PricingSystemsClient } from "./pricing-systems-client";
import { getPricingSystemsPageData } from "./actions";
import { useAuthHelpers } from "@/app/app/hooks";

function PricingSystemsSkeleton() {
    return (
        <div className="space-y-4 animate-pulse">
            <div className="flex justify-end">
                <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 h-48" />
                ))}
            </div>
        </div>
    );
}

export function PricingSystemsWrapper() {
    const { isLoading: isAuthLoading, hasAccess, canEdit } = useAuthHelpers();

    const { data, isLoading: isDataLoading } = useQuery({
        queryKey: ["pricing-systems", "pageData"],
        queryFn: getPricingSystemsPageData,
        staleTime: 60 * 1000,
    });

    if (isAuthLoading || isDataLoading || !data?.data) {
        return <PricingSystemsSkeleton />;
    }

    if (!hasAccess("pricing-systems")) {
        window.location.href = "/app/me";
        return <PricingSystemsSkeleton />;
    }

    return <PricingSystemsClient canEdit={canEdit("pricing-systems")} initialSystems={data.data.systems} />;
}
