"use client";

import { useQuery } from "@tanstack/react-query";
import { InvitationList } from "./invitation-list";
import { getInvitationsData } from "./actions";
import { useAuthHelpers } from "@/app/app/hooks";

function InvitationsSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="h-8 w-1/3 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
    );
}

export function InvitationsWrapper() {
    const { isLoading: isAuthLoading, hasAccess, canEdit } = useAuthHelpers();

    const { data, isLoading: isDataLoading } = useQuery({
        queryKey: ["invitations", "pageData"],
        queryFn: getInvitationsData,
        staleTime: 60 * 1000,
    });

    // リダイレクト処理
    if (data && "redirect" in data && data.redirect) {
        window.location.href = data.redirect;
        return <InvitationsSkeleton />;
    }

    if (isAuthLoading || isDataLoading || !data?.data) {
        return <InvitationsSkeleton />;
    }

    // 各ページの権限をチェック（クライアント側で行う）
    const pagePermissions = {
        bottles: hasAccess("bottles"),
        resumes: hasAccess("resumes"),
        salarySystems: hasAccess("salary-systems"),
        attendance: hasAccess("attendance"),
        personalInfo: hasAccess("users-personal-info"),
    };

    return (
        <div className="space-y-6">
            <InvitationList
                initialInvitations={data.data.invitations}
                uninvitedProfiles={data.data.uninvitedProfiles}
                roles={data.data.roles}
                initialJoinRequests={data.data.joinRequests}
                initialStoreSettings={data.data.storeSettings}
                canEdit={canEdit("invitations")}
                pagePermissions={pagePermissions}
            />
        </div>
    );
}
