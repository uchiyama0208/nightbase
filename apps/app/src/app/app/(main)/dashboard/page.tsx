import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Suspense } from "react";
import { getAppData, type PagePermissions } from "../../data-access";
import { TabMenuCards } from "./tab-menu-cards";
import { getDashboardData } from "./actions";

export const metadata: Metadata = {
    title: "ダッシュボード",
};

interface DashboardPageProps {
    searchParams: Promise<{ denied?: string }>;
}

// Server Component (default export)
export default async function DashboardPage({ searchParams }: DashboardPageProps) {
    const params = await searchParams;
    const accessDeniedMessage = params.denied ? decodeURIComponent(params.denied) : null;
    const { user, profile, permissions } = await getAppData();

    if (!user) {
        redirect("/login");
    }

    if (!profile) {
        redirect("/onboarding/choice");
    }

    if (!profile.store_id) {
        redirect("/onboarding/store-info");
    }

    const store = profile.stores;
    if (store?.show_dashboard === false) {
        redirect("/app/timecard");
    }

    // タイムカード情報を取得
    const dashboardResult = await getDashboardData();

    const timecardInfo = dashboardResult.data ? {
        isWorking: !!dashboardResult.data.currentUserTimeCard,
        clockInTime: dashboardResult.data.currentUserTimeCard?.clock_in || null,
        lastWorkDate: dashboardResult.data.lastClockIn?.work_date || null,
    } : {
        isWorking: false,
        clockInTime: null,
        lastWorkDate: null,
    };

    const attendanceInfo = dashboardResult.data ? {
        castCount: dashboardResult.data.activeCastCount,
        staffCount: dashboardResult.data.activeStaffCount,
    } : {
        castCount: 0,
        staffCount: 0,
    };

    const shiftInfo = dashboardResult.data ? {
        scheduledCastCount: dashboardResult.data.scheduledCastCount,
        scheduledStaffCount: dashboardResult.data.scheduledStaffCount,
    } : {
        scheduledCastCount: 0,
        scheduledStaffCount: 0,
    };

    const myShiftInfo = dashboardResult.data ? {
        nextShiftDate: dashboardResult.data.nextShiftDate,
        unsubmittedCount: dashboardResult.data.unsubmittedShiftRequestCount,
    } : {
        nextShiftDate: null,
        unsubmittedCount: 0,
    };

    const pickupInfo = dashboardResult.data ? {
        requestCount: dashboardResult.data.pickupRequestCount,
        unassignedCount: dashboardResult.data.unassignedPickupCount,
    } : {
        requestCount: 0,
        unassignedCount: 0,
    };

    // User tab
    const userInfo = dashboardResult.data ? {
        castCount: dashboardResult.data.castCount,
        staffCount: dashboardResult.data.staffCount,
        guestCount: dashboardResult.data.guestCount,
        partnerCount: dashboardResult.data.partnerCount,
    } : { castCount: 0, staffCount: 0, guestCount: 0, partnerCount: 0 };

    const rolesInfo = dashboardResult.data ? {
        count: dashboardResult.data.rolesCount,
    } : { count: 0 };

    const invitationsInfo = dashboardResult.data ? {
        pendingCount: dashboardResult.data.pendingInvitationsCount,
        joinRequestsCount: dashboardResult.data.pendingJoinRequestsCount,
    } : { pendingCount: 0, joinRequestsCount: 0 };

    const resumesInfo = dashboardResult.data ? {
        pendingCount: dashboardResult.data.pendingResumesCount,
    } : { pendingCount: 0 };

    // Floor tab
    const floorInfo = dashboardResult.data ? {
        activeTableCount: dashboardResult.data.activeTableCount,
        activeGuestCount: dashboardResult.data.activeGuestCount,
    } : { activeTableCount: 0, activeGuestCount: 0 };

    const seatsInfo = dashboardResult.data ? {
        count: dashboardResult.data.tablesCount,
    } : { count: 0 };

    const slipsInfo = dashboardResult.data ? {
        unpaidCount: dashboardResult.data.unpaidSlipsCount,
    } : { unpaidCount: 0 };

    const menusInfo = dashboardResult.data ? {
        count: dashboardResult.data.menusCount,
    } : { count: 0 };

    const bottlesInfo = dashboardResult.data ? {
        activeCount: dashboardResult.data.activeBottleKeepsCount,
    } : { activeCount: 0 };

    const queueInfo = dashboardResult.data ? {
        waitingCount: dashboardResult.data.waitingQueueCount,
    } : { waitingCount: 0 };

    const reservationInfo = dashboardResult.data ? {
        todayCount: dashboardResult.data.todayReservationsCount,
    } : { todayCount: 0 };

    const shoppingInfo = dashboardResult.data ? {
        lowStockCount: dashboardResult.data.lowStockCount,
    } : { lowStockCount: 0 };

    // Salary tab
    const salesInfo = dashboardResult.data ? {
        todaySales: dashboardResult.data.todaySales,
    } : { todaySales: 0 };

    const payrollInfo = dashboardResult.data ? {
        todayPayroll: dashboardResult.data.todayPayroll,
    } : { todayPayroll: 0 };

    const rankingInfo = dashboardResult.data ? {
        top3: dashboardResult.data.rankingTop3,
    } : { top3: [] };

    // Community tab
    const boardInfo = dashboardResult.data ? {
        postsCount: dashboardResult.data.postsCount,
        manualsCount: dashboardResult.data.manualsCount,
        unreadPostsCount: dashboardResult.data.unreadPostsCount,
        unreadManualsCount: dashboardResult.data.unreadManualsCount,
    } : { postsCount: 0, manualsCount: 0, unreadPostsCount: 0, unreadManualsCount: 0 };

    const snsInfo = dashboardResult.data ? {
        todayCount: dashboardResult.data.todaySnsPostsCount,
        scheduledCount: dashboardResult.data.scheduledSnsPostsCount,
    } : { todayCount: 0, scheduledCount: 0 };

    const aiCreateInfo = dashboardResult.data ? {
        credits: dashboardResult.data.aiCredits,
    } : { credits: 0 };

    return (
        <Suspense fallback={<div className="h-40 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse"></div>}>
            <TabMenuCards
                timecardInfo={timecardInfo}
                attendanceInfo={attendanceInfo}
                shiftInfo={shiftInfo}
                myShiftInfo={myShiftInfo}
                pickupInfo={pickupInfo}
                userInfo={userInfo}
                rolesInfo={rolesInfo}
                invitationsInfo={invitationsInfo}
                resumesInfo={resumesInfo}
                floorInfo={floorInfo}
                seatsInfo={seatsInfo}
                slipsInfo={slipsInfo}
                menusInfo={menusInfo}
                bottlesInfo={bottlesInfo}
                queueInfo={queueInfo}
                reservationInfo={reservationInfo}
                shoppingInfo={shoppingInfo}
                salesInfo={salesInfo}
                payrollInfo={payrollInfo}
                rankingInfo={rankingInfo}
                boardInfo={boardInfo}
                snsInfo={snsInfo}
                aiCreateInfo={aiCreateInfo}
                userRole={profile.role}
                userRoleId={profile.role_id}
                permissions={permissions ?? null}
                accessDeniedMessage={accessDeniedMessage}
            />
        </Suspense>
    );
}

// Force dynamic rendering (no static generation)
export const dynamic = 'force-dynamic';
export const revalidate = 0;
