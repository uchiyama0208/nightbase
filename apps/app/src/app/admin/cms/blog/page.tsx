"use client";

import { CmsList } from "../components/cms-list";

export default function BlogListPage() {
    return (
        <CmsList
            type="blog"
            typeLabel="ブログ"
            description="NightbaseのLPに表示されるブログ記事を管理します"
            basePath="/admin/cms/blog"
        />
    );
}
