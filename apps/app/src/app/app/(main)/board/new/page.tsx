import type { Metadata } from "next";
import { NewPostWrapper } from "./new-post-wrapper";

export const metadata: Metadata = {
    title: "新規投稿",
};

export default function NewBoardPostPage() {
    return <NewPostWrapper />;
}
