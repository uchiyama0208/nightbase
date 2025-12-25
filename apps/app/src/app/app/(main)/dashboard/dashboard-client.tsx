"use client";

import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuthHelpers } from "@/app/app/hooks";
import { TabMenuCards } from "./tab-menu-cards";
import { getDashboardPageData } from "./actions";

function DashboardSkeleton() {
    return (
        <div className="space-y-4 animate-pulse p-4">
            <div className="flex gap-2 overflow-x-auto">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-10 w-20 bg-gray-200 dark:bg-gray-700 rounded-full flex-shrink-0" />
                ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-3xl p-4 border border-gray-200 dark:border-gray-700 h-32">
                        <div className="space-y-3">
                            <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
                            <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function DashboardClient() {
    const searchParams = useSearchParams();
    const accessDeniedMessage = searchParams.get("denied") ? decodeURIComponent(searchParams.get("denied")!) : null;
    const { isLoading: isAuthLoading } = useAuthHelpers();

    const { data, isLoading: isDataLoading } = useQuery({
        queryKey: ["dashboard", "pageData"],
        queryFn: getDashboardPageData,
        staleTime: 30 * 1000,
    });

    // リダイレクト処理
    if (data && "redirect" in data && data.redirect) {
        window.location.href = data.redirect;
        return <DashboardSkeleton />;
    }

    if (isAuthLoading || isDataLoading || !data) {
        return <DashboardSkeleton />;
    }

    return (
        <TabMenuCards
            timecardInfo={data.timecardInfo}
            attendanceInfo={data.attendanceInfo}
            shiftInfo={data.shiftInfo}
            myShiftInfo={data.myShiftInfo}
            pickupInfo={data.pickupInfo}
            userInfo={data.userInfo}
            invitationsInfo={data.invitationsInfo}
            resumesInfo={data.resumesInfo}
            floorInfo={data.floorInfo}
            seatsInfo={data.seatsInfo}
            slipsInfo={data.slipsInfo}
            menusInfo={data.menusInfo}
            bottlesInfo={data.bottlesInfo}
            queueInfo={data.queueInfo}
            reservationInfo={data.reservationInfo}
            shoppingInfo={data.shoppingInfo}
            salesInfo={data.salesInfo}
            payrollInfo={data.payrollInfo}
            rankingInfo={data.rankingInfo}
            boardInfo={data.boardInfo}
            manualsInfo={data.manualsInfo}
            snsInfo={data.snsInfo}
            aiCreateInfo={data.aiCreateInfo}
            userRole={data.userRole || ""}
            userRoleId={data.userRoleId || null}
            permissions={data.permissions || null}
            storeFeatures={data.storeFeatures || null}
            accessDeniedMessage={accessDeniedMessage}
        />
    );
}
