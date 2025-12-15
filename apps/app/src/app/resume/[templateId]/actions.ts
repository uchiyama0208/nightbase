// @ts-nocheck
"use server";

import { createServerClient as createClient } from "@/lib/supabaseServerClient";
import { nanoid } from "nanoid";

interface SubmitResumeFormData {
    templateId: string;
    storeId: string;
    fixedFields: {
        last_name: string;
        first_name: string;
        last_name_kana: string;
        first_name_kana: string;
        birth_date: string;
        phone_number: string;
        emergency_phone_number: string;
        zip_code: string;
        prefecture: string;
        city: string;
        street: string;
        building: string;
        desired_cast_name: string;
        desired_cast_name_kana: string;
    };
    pastEmployments: {
        store_name: string;
        period: string;
        hourly_wage: string;
        monthly_sales: string;
        customer_count: string;
    }[];
    customAnswers: Record<string, string>;
}

export async function submitResumeForm(data: SubmitResumeFormData) {
    const supabase = await createClient();

    // Create new submission with fixed fields
    const token = nanoid(16);
    const { data: submission, error: insertError } = await (supabase
        .from("resume_submissions") as any)
        .insert({
            template_id: data.templateId,
            store_id: data.storeId,
            token,
            last_name: data.fixedFields.last_name,
            first_name: data.fixedFields.first_name,
            last_name_kana: data.fixedFields.last_name_kana,
            first_name_kana: data.fixedFields.first_name_kana,
            birth_date: data.fixedFields.birth_date || null,
            phone_number: data.fixedFields.phone_number,
            emergency_phone_number: data.fixedFields.emergency_phone_number || null,
            zip_code: data.fixedFields.zip_code || null,
            prefecture: data.fixedFields.prefecture || null,
            city: data.fixedFields.city || null,
            street: data.fixedFields.street || null,
            building: data.fixedFields.building || null,
            desired_cast_name: data.fixedFields.desired_cast_name || null,
            desired_cast_name_kana: data.fixedFields.desired_cast_name_kana || null,
            status: "submitted",
            submitted_at: new Date().toISOString(),
        })
        .select("id")
        .single();

    if (insertError || !submission) {
        console.error("Failed to create submission:", insertError);
        throw new Error("送信に失敗しました");
    }

    const submissionId = submission.id;

    // Insert past employments
    if (data.pastEmployments.length > 0) {
        const employments = data.pastEmployments
            .filter(emp => emp.store_name.trim())
            .map(emp => ({
                submission_id: submissionId,
                store_name: emp.store_name,
                period: emp.period || null,
                hourly_wage: emp.hourly_wage ? parseInt(emp.hourly_wage) : null,
                sales_amount: emp.monthly_sales ? parseInt(emp.monthly_sales) : null,
                customer_count: emp.customer_count ? parseInt(emp.customer_count) : null,
            }));

        if (employments.length > 0) {
            const { error: empError } = await (supabase
                .from("past_employments") as any)
                .insert(employments);

            if (empError) {
                console.error("Failed to insert past employments:", empError);
            }
        }
    }

    // Insert custom answers
    const answerEntries = Object.entries(data.customAnswers).filter(([_, value]) => value.trim());
    if (answerEntries.length > 0) {
        const answers = answerEntries.map(([fieldId, value]) => ({
            submission_id: submissionId,
            field_id: fieldId,
            value,
        }));

        const { error: answerError } = await supabase
            .from("resume_submission_answers")
            .insert(answers);

        if (answerError) {
            console.error("Failed to insert answers:", answerError);
        }
    }

    return { success: true };
}
