import { Suspense } from "react";
import { redirect } from "next/navigation";
import { InvitationList } from "./invitation-list";
import { getInvitationsData } from "./actions";

function InvitationsSkeleton() {
    return (
        <div className="p-2 space-y-6 animate-pulse">
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
        <div className="p-2 space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold tracking-tight">招待管理</h1>
                <p className="text-muted-foreground">
                    スタッフやキャストを招待し、参加申請を管理します。
                </p>
            </div>

            <div className="mt-6">
                <Suspense fallback={<InvitationsSkeleton />}>
                    <InvitationList
                        initialInvitations={invitations}
                        uninvitedProfiles={uninvitedProfiles}
                        roles={roles}
                    />
                </Suspense>
            </div>
        </div>
    );
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
