import { redirect, notFound } from "next/navigation";
import { getAppData } from "../../../../../data-access";
import { getManual, getManualTags } from "../../../actions";
import { ManualEditor } from "../../../ManualEditor";

interface EditManualPageProps {
    params: Promise<{ id: string }>;
}

export default async function EditManualPage({ params }: EditManualPageProps) {
    const { id } = await params;
    const { user, profile } = await getAppData();

    if (!user) {
        redirect("/login");
    }

    if (!profile || !profile.store_id) {
        redirect("/app/me");
    }

    // Only staff can edit manuals
    if (profile.role !== "staff" && profile.role !== "admin") {
        redirect("/app/board");
    }

    const [manual, tags] = await Promise.all([
        getManual(id),
        getManualTags(profile.store_id),
    ]);

    if (!manual) {
        notFound();
    }

    return (
        <ManualEditor
            manual={manual}
            storeId={profile.store_id}
            availableTags={tags}
        />
    );
}
