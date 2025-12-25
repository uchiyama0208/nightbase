"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { SalarySystemsList } from "./salary-systems-list";
import { getSalarySystemsPageData } from "./actions";
import { useAuthHelpers } from "@/app/app/hooks";

function SalarySystemsSkeleton() {
    return (
        <div className="space-y-4 animate-pulse">
            <div className="h-8 w-1/3 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
    );
}

export function SalarySystemsWrapper() {
    const searchParams = useSearchParams();
    const typeFilter = searchParams.get("type") || "cast";
    const { isLoading: isAuthLoading, hasAccess, canEdit } = useAuthHelpers();

    const { data, isLoading: isDataLoading } = useQuery({
        queryKey: ["salary-systems", "pageData"],
        queryFn: getSalarySystemsPageData,
        staleTime: 60 * 1000,
    });

    // リダイレクト処理
    if (data && "redirect" in data && data.redirect) {
        window.location.href = data.redirect;
        return <SalarySystemsSkeleton />;
    }

    if (isAuthLoading || isDataLoading || !data?.data) {
        return <SalarySystemsSkeleton />;
    }

    if (!hasAccess("salary-systems")) {
        window.location.href = "/app/me";
        return <SalarySystemsSkeleton />;
    }

    return (
        <SalarySystemsList
            initialSystems={data.data.salarySystems}
            typeFilter={typeFilter}
            storeShowBreakColumns={data.data.storeShowBreakColumns}
            storeTimeRoundingEnabled={data.data.storeTimeRoundingEnabled}
            storeTimeRoundingMinutes={data.data.storeTimeRoundingMinutes}
            canEdit={canEdit("salary-systems")}
        />
    );
}
