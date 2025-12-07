import { redirect } from "next/navigation";
import { getAppData } from "../../data-access";
import { getBoardPosts, getAllBoardPosts, getManuals, getAllManuals, getManualTags, getPostLikeCounts, getManualLikeCounts, getPostReadStatus, getManualReadStatus } from "./actions";
import { BoardClient } from "./BoardClient";
import { PageTitle } from "@/components/page-title";

export default async function BoardPage() {
    const { user, profile } = await getAppData();

    if (!user) {
        redirect("/login");
    }

    if (!profile || !profile.store_id) {
        redirect("/app/me");
    }

    const isStaff = profile.role === "staff" || profile.role === "admin";

    // Staff can see all posts including drafts, others only see published posts for their role
    const [posts, manuals, tags] = await Promise.all([
        isStaff
            ? getAllBoardPosts(profile.store_id)
            : getBoardPosts(profile.store_id, profile.role),
        isStaff
            ? getAllManuals(profile.store_id)
            : getManuals(profile.store_id, profile.role),
        getManualTags(profile.store_id),
    ]);

    // Fetch like counts and read status for all posts and manuals
    const [postLikeCounts, manualLikeCounts, postReadStatus, manualReadStatus] = await Promise.all([
        getPostLikeCounts(posts.map(p => p.id)),
        getManualLikeCounts(manuals.map(m => m.id)),
        getPostReadStatus(posts.map(p => p.id)),
        getManualReadStatus(manuals.map(m => m.id)),
    ]);

    return (
        <div className="space-y-4">
            <PageTitle
                title="掲示板"
                backTab="community"
            />
            <BoardClient
                posts={posts}
                manuals={manuals}
                tags={tags}
                storeId={profile.store_id}
                isStaff={isStaff}
                userRole={profile.role}
                postLikeCounts={postLikeCounts}
                manualLikeCounts={manualLikeCounts}
                postReadStatus={postReadStatus}
                manualReadStatus={manualReadStatus}
            />
        </div>
    );
}
