import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getAICreatePageData } from "./actions";
import { AICreateContent } from "./ai-create-content";
import { getAppDataWithPermissionCheck } from "../../data-access";

export const metadata: Metadata = {
    title: "AIクリエイト",
};

export default async function AICreatePage() {
    const { user, profile, hasAccess } = await getAppDataWithPermissionCheck("ai-create", "view");

    if (!user) {
        redirect("/login");
    }

    if (!profile || !profile.store_id) {
        redirect("/app/me");
    }

    if (!hasAccess) {
        redirect("/app/dashboard?denied=" + encodeURIComponent("AIクリエイトページへのアクセス権限がありません"));
    }

    const result = await getAICreatePageData();

    if ("redirect" in result) {
        redirect(result.redirect);
    }

    const { credits, images, templates, sizePresets } = result.data;

    return (
        <AICreateContent
            initialCredits={credits}
            initialImages={images}
            templates={templates}
            sizePresets={sizePresets}
        />
    );
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
