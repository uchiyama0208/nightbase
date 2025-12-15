// @ts-nocheck
import { createServerClient as createClient } from "@/lib/supabaseServerClient";
import { redirect } from "next/navigation";
import { ResumesClient } from "./resumes-client";
import { getAppDataWithPermissionCheck } from "../../data-access";

export default async function ResumesPage() {
    const { user, profile, hasAccess } = await getAppDataWithPermissionCheck("resumes", "view");

    if (!user) {
        redirect("/login");
    }

    if (!profile) {
        redirect("/app/dashboard");
    }

    if (!hasAccess) {
        redirect("/app/dashboard?denied=" + encodeURIComponent("履歴書ページへのアクセス権限がありません"));
    }

    const supabase = await createClient();

    // Get all submissions for this store
    const { data: submissions, error: subError } = await supabase
        .from("resume_submissions")
        .select(`
            *,
            resume_templates (
                id,
                name,
                target_role
            )
        `)
        .eq("store_id", profile.store_id)
        .in("status", ["submitted", "rejected"])
        .order("submitted_at", { ascending: false });

    if (subError) {
        console.error("Failed to fetch submissions:", subError);
    }

    // Get all templates for this store
    const { data: templates, error: tplError } = await supabase
        .from("resume_templates")
        .select(`
            id,
            name,
            is_active,
            target_role,
            visible_fields,
            created_at,
            resume_template_fields (
                id,
                field_type,
                label,
                options,
                is_required,
                sort_order
            )
        `)
        .eq("store_id", profile.store_id)
        .order("created_at", { ascending: false });

    if (tplError) {
        console.error("Failed to fetch templates:", tplError);
    }

    // Count submitted submissions per template
    const templatesWithCount = (templates || []).map((template: any) => {
        const count = (submissions || []).filter(
            (s: any) => s.template_id === template.id
        ).length;
        return {
            ...template,
            resume_submissions: [{ count }],
        };
    });

    return (
        <div className="space-y-4">
            <ResumesClient
                submissions={submissions || []}
                templates={templatesWithCount}
                storeId={profile.store_id}
            />
        </div>
    );
}
