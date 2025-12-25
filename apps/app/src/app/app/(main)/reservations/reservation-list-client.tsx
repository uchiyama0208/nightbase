"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthHelpers } from "@/app/app/hooks";
import { ReservationList } from "./reservation-list";
import { getReservationsPageData } from "./actions";

function ReservationsSkeleton() {
    return (
        <div className="space-y-4 animate-pulse p-4">
            <div className="flex items-center justify-between">
                <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="flex gap-2">
                    <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
                    <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
                </div>
            </div>
            <div className="grid gap-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded-full" />
                            <div className="flex-1 space-y-2">
                                <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function ReservationListClient() {
    const { isLoading: isAuthLoading, canEdit, hasAccess } = useAuthHelpers();

    const { data, isLoading: isDataLoading, error } = useQuery({
        queryKey: ["reservations", "pageData"],
        queryFn: getReservationsPageData,
        staleTime: 60 * 1000,
    });

    if (isAuthLoading || isDataLoading) {
        return <ReservationsSkeleton />;
    }

    if (error || !data) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center">
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                    データの読み込みに失敗しました
                </p>
                <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    再読み込み
                </button>
            </div>
        );
    }

    if (!hasAccess("reservations")) {
        window.location.href = "/app/me";
        return <ReservationsSkeleton />;
    }

    return (
        <ReservationList
            reservations={data.reservations}
            storeId={data.storeId}
            storeName={data.storeName}
            settings={data.settings}
            daySwitchTime={data.daySwitchTime}
            canEdit={canEdit("reservations")}
        />
    );
}
