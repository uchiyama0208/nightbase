import { Suspense } from "react";
import { redirect } from "next/navigation";
import { InvitationList } from "./invitation-list";
import { getInvitationsData } from "./actions";
import { PageTitle } from "@/components/page-title";

function InvitationsSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="h-8 w-1/3 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
    );
}

export default async function InvitationsPage() {
    const response = await getInvitationsData();

    if (response.redirect) {
        redirect(response.redirect);
    }

    if (!response.data) {
        return null;
    }

    const { invitations, uninvitedProfiles, roles } = response.data;

    return (
        <div className="space-y-6">
            <PageTitle
                title="招待"
                description="スタッフやキャストを招待し、参加申請を管理します。"
                backTab="user"
            />
            <InvitationList
                initialInvitations={invitations}
                uninvitedProfiles={uninvitedProfiles}
                roles={roles}
            />
        </div>
    );
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
