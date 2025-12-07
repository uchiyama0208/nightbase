"use client";

import { CmsEditor } from "../../components/cms-editor";

export default function NewBlogPage() {
    return (
        <CmsEditor
            entry={null}
            type="blog"
            typeLabel="ブログ記事"
            backUrl="/admin/cms/blog"
        />
    );
}
