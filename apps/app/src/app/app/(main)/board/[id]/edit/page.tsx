import { redirect, notFound } from "next/navigation";
import { getAppData } from "../../../../data-access";
import { getBoardPost } from "../../actions";
import { PostEditor } from "../../PostEditor";

interface EditBoardPostPageProps {
    params: Promise<{ id: string }>;
}

export default async function EditBoardPostPage({ params }: EditBoardPostPageProps) {
    const { id } = await params;
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

    const post = await getBoardPost(id);

    if (!post) {
        notFound();
    }

    // Verify the post belongs to the same store
    if (post.store_id !== profile.store_id) {
        redirect("/app/board");
    }

    return (
        <div className="max-w-3xl mx-auto px-0 sm:px-4">
            <PostEditor post={post} storeId={profile.store_id} />
        </div>
    );
}
