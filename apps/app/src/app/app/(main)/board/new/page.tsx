import { redirect } from "next/navigation";
import { getAppData } from "../../../data-access";
import { PostEditor } from "../PostEditor";

export default async function NewBoardPostPage() {
    const { user, profile } = await getAppData();

    if (!user) {
        redirect("/login");
    }

    if (!profile || !profile.store_id) {
        redirect("/app/me");
    }

    const isStaff = profile.role === "staff" || profile.role === "admin";

    if (!isStaff) {
        redirect("/app/board");
    }

    return (
        <div className="max-w-3xl mx-auto px-0 sm:px-4">
            <PostEditor post={null} storeId={profile.store_id} />
        </div>
    );
}
