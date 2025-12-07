import { redirect } from "next/navigation";
import { getAppData } from "../../../../data-access";
import { getManualTags } from "../../actions";
import { ManualEditor } from "../../ManualEditor";

export default async function NewManualPage() {
    const { user, profile } = await getAppData();

    if (!user) {
        redirect("/login");
    }

    if (!profile || !profile.store_id) {
        redirect("/app/me");
    }

    // Only staff can create manuals
    if (profile.role !== "staff" && profile.role !== "admin") {
        redirect("/app/board");
    }

    const tags = await getManualTags(profile.store_id);

    return (
        <ManualEditor
            manual={null}
            storeId={profile.store_id}
            availableTags={tags}
        />
    );
}
