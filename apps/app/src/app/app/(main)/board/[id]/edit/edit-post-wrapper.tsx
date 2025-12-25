"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { getEditPostPageData } from "../../actions";
import { PostEditor } from "../../PostEditor";

function PostEditorSkeleton() {
    return (
        <div className="max-w-3xl mx-auto px-0 sm:px-4 space-y-6 animate-pulse">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
                    <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
            </div>
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 sm:p-6 space-y-5">
                <div className="space-y-1.5">
                    <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-11 w-full bg-gray-200 dark:bg-gray-700 rounded-lg" />
                </div>
                <div className="space-y-1.5">
                    <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="min-h-[400px] border border-gray-200 dark:border-gray-700 rounded-xl flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    </div>
                </div>
            </div>
        </div>
    );
}

function NotFound() {
    return (
        <div className="max-w-3xl mx-auto px-0 sm:px-4">
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-8 text-center">
                <p className="text-gray-500 dark:text-gray-400">
                    投稿が見つかりませんでした
                </p>
            </div>
        </div>
    );
}

export function EditPostWrapper() {
    const params = useParams();
    const postId = params.id as string;

    const { data, isLoading } = useQuery({
        queryKey: ["board", "edit-post", postId],
        queryFn: () => getEditPostPageData(postId),
        enabled: !!postId,
        staleTime: 60 * 1000,
    });

    if (isLoading || !data) {
        return <PostEditorSkeleton />;
    }

    if ("redirect" in data && data.redirect) {
        if (typeof window !== "undefined") {
            window.location.href = data.redirect;
        }
        return <PostEditorSkeleton />;
    }

    if ("notFound" in data) {
        return <NotFound />;
    }

    if (!("data" in data) || !data.data) {
        return <PostEditorSkeleton />;
    }

    return (
        <div className="max-w-3xl mx-auto px-0 sm:px-4">
            <PostEditor post={data.data.post} storeId={data.data.storeId} />
        </div>
    );
}
