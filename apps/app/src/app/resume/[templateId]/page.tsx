// @ts-nocheck
import { createServerClient as createClient } from "@/lib/supabaseServerClient";
import { notFound } from "next/navigation";
import { ResumeFormClient } from "./resume-form-client";

interface PageProps {
    params: Promise<{ templateId: string }>;
}

export default async function ResumeFormPage({ params }: PageProps) {
    const { templateId } = await params;
    const supabase = await createClient();

    // Get template by ID
    const { data: template, error: templateError } = await supabase
        .from("resume_templates")
        .select(`
            id,
            name,
            is_active,
            store_id,
            target_role,
            visible_fields,
            resume_template_fields (
                id,
                field_type,
                label,
                options,
                is_required,
                sort_order
            ),
            stores (
                name
            )
        `)
        .eq("id", templateId)
        .single();

    if (templateError || !template) {
        notFound();
    }

    // Check if template is active
    if (!template.is_active) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 max-w-md w-full text-center">
                    <h1 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        このフォームは現在利用できません
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        フォームが無効化されています。お問い合わせください。
                    </p>
                </div>
            </div>
        );
    }

    // Sort fields by sort_order
    const fields = template.resume_template_fields || [];
    fields.sort((a: any, b: any) => a.sort_order - b.sort_order);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4">
            <div className="max-w-2xl mx-auto">
                <ResumeFormClient
                    template={template}
                    fields={fields}
                    storeName={template.stores?.name || ""}
                />
            </div>
        </div>
    );
}
