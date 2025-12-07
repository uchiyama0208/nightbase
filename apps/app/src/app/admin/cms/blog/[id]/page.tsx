"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { CmsEditor, CmsEntry } from "../../components/cms-editor";

export default function EditBlogPage() {
    const params = useParams();
    const [entry, setEntry] = useState<CmsEntry | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadEntry = async () => {
            try {
                const res = await fetch(`/api/admin/cms/${params.id}`);
                if (!res.ok) {
                    throw new Error("Entry not found");
                }
                const data = await res.json();
                setEntry(data.entry);
            } catch (err: any) {
                setError(err.message || "Failed to load entry");
            } finally {
                setIsLoading(false);
            }
        };

        if (params.id) {
            loadEntry();
        }
    }, [params.id]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        );
    }

    if (error || !entry) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
                    {error || "記事が見つかりません"}
                </p>
            </div>
        );
    }

    return (
        <CmsEditor
            entry={entry}
            type="blog"
            typeLabel="ブログ記事"
            backUrl="/admin/cms/blog"
        />
    );
}
