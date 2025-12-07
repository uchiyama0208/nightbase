import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Suspense } from "react";
import { getAppData } from "../../data-access";
import { TabMenuCards } from "./tab-menu-cards";
import { getDashboardData } from "./actions";

export const metadata: Metadata = {
    title: "ダッシュボード",
};

// Server Component (default export)
export default async function DashboardPage() {
    const { user, profile } = await getAppData();

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
    } : { pendingCount: 0 };

    const joinRequestsInfo = dashboardResult.data ? {
        pendingCount: dashboardResult.data.pendingJoinRequestsCount,
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

    // Salary tab
    const pricingInfo = dashboardResult.data ? {
        count: dashboardResult.data.pricingSystemsCount,
    } : { count: 0 };

    const salaryInfo = dashboardResult.data ? {
        count: dashboardResult.data.salarySystemsCount,
    } : { count: 0 };

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

    const featuresInfo = dashboardResult.data ? {
        enabledCount: dashboardResult.data.enabledFeaturesCount,
        disabledCount: dashboardResult.data.disabledFeaturesCount,
    } : { enabledCount: 0, disabledCount: 0 };

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
                joinRequestsInfo={joinRequestsInfo}
                floorInfo={floorInfo}
                seatsInfo={seatsInfo}
                slipsInfo={slipsInfo}
                menusInfo={menusInfo}
                bottlesInfo={bottlesInfo}
                pricingInfo={pricingInfo}
                salaryInfo={salaryInfo}
                boardInfo={boardInfo}
                snsInfo={snsInfo}
                featuresInfo={featuresInfo}
            />
        </Suspense>
    );
}

// Force dynamic rendering (no static generation)
export const dynamic = 'force-dynamic';
export const revalidate = 0;
