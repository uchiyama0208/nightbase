import type { Metadata } from "next";
import { EditPostWrapper } from "./edit-post-wrapper";

export const metadata: Metadata = {
    title: "投稿を編集",
};

export default function EditBoardPostPage() {
    return <EditPostWrapper />;
}
