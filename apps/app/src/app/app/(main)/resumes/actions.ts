"use server";

import { createServerClient } from "@/lib/supabaseServerClient";
import { revalidatePath } from "next/cache";

export async function getResumes(storeId: string) {
    const supabase = await createServerClient();
    const { data, error } = await supabase
        .from("resumes")
        .select(`
            *,
            profile:profiles!inner(
                id,
                display_name,
                real_name,
                avatar_url
            )
        `)
        .eq("profile.store_id", storeId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching resumes:", error);
        return [];
    }

    return data;
}

export async function getResume(id: string) {
    const supabase = await createServerClient();
    const { data, error } = await supabase
        .from("resumes")
        .select(`
            *,
            profile:profiles(
                id,
                display_name,
                real_name,
                avatar_url,
                emergency_phone_number,
                nearest_station,
                height
            ),
            past_employments(*),
            resume_answers(
                *,
                question:resume_questions(content, order)
            )
        `)
        .eq("id", id)
        .single();

    if (error) {
        console.error("Error fetching resume:", error);
        return null;
    }

    return data;
}

export async function createResume(formData: FormData) {
    const supabase = await createServerClient();

    const profileId = formData.get("profileId") as string;
    const desiredCastName = (formData.get("desiredCastName") as string | null)?.trim() || null;
    const desiredHourlyWage = (formData.get("desiredHourlyWage") as string | null)?.trim() ? parseInt(formData.get("desiredHourlyWage") as string) : null;
    const desiredShiftDays = (formData.get("desiredShiftDays") as string | null)?.trim() || null;
    const remarks = (formData.get("remarks") as string | null)?.trim() || null;

    const pastEmploymentsJson = (formData.get("pastEmployments") as string | null);
    const answersJson = (formData.get("answers") as string | null);

    // 1. Create Resume
    const { data: resume, error: resumeError } = await supabase
        .from("resumes")
        .insert({
            profile_id: profileId,
            desired_cast_name: desiredCastName,
            desired_hourly_wage: desiredHourlyWage,
            desired_shift_days: desiredShiftDays,
            remarks: remarks,
        })
        .select()
        .single();

    if (resumeError) {
        console.error("Error creating resume:", resumeError);
        throw new Error("履歴書の作成に失敗しました");
    }

    const resumeId = resume.id;

    // 2. Create Past Employments
    if (pastEmploymentsJson) {
        try {
            const pastEmployments = JSON.parse(pastEmploymentsJson) as any[];
            const toInsert = pastEmployments.map((e: any) => ({
                resume_id: resumeId,
                store_name: e.store_name,
                period: e.period,
                hourly_wage: e.hourly_wage ? parseInt(e.hourly_wage) : null,
                sales_amount: e.sales_amount ? parseInt(e.sales_amount) : null,
                customer_count: e.customer_count ? parseInt(e.customer_count) : null,
            }));

            if (toInsert.length > 0) {
                await supabase.from("past_employments").insert(toInsert);
            }
        } catch (e) {
            console.error("Error processing past employments:", e);
        }
    }

    // 3. Create Answers
    if (answersJson) {
        try {
            const answers = JSON.parse(answersJson) as any[];
            const toInsert = answers.map((a: any) => ({
                resume_id: resumeId,
                question_id: a.question_id,
                answer: a.answer,
            }));

            if (toInsert.length > 0) {
                await supabase.from("resume_answers").insert(toInsert);
            }
        } catch (e) {
            console.error("Error processing answers:", e);
        }
    }

    revalidatePath("/app/resumes");
    return { success: true, id: resumeId };
}

export async function updateResume(id: string, formData: FormData) {
    const supabase = await createServerClient();

    const desiredCastName = (formData.get("desiredCastName") as string | null)?.trim() || null;
    const desiredHourlyWage = (formData.get("desiredHourlyWage") as string | null)?.trim() ? parseInt(formData.get("desiredHourlyWage") as string) : null;
    const desiredShiftDays = (formData.get("desiredShiftDays") as string | null)?.trim() || null;
    const remarks = (formData.get("remarks") as string | null)?.trim() || null;

    const pastEmploymentsJson = (formData.get("pastEmployments") as string | null);
    const answersJson = (formData.get("answers") as string | null);

    // 1. Update Resume
    const { error: resumeError } = await supabase
        .from("resumes")
        .update({
            desired_cast_name: desiredCastName,
            desired_hourly_wage: desiredHourlyWage,
            desired_shift_days: desiredShiftDays,
            remarks: remarks,
            updated_at: new Date().toISOString(),
        })
        .eq("id", id);

    if (resumeError) {
        console.error("Error updating resume:", resumeError);
        throw new Error("履歴書の更新に失敗しました");
    }

    // 2. Update Past Employments
    if (pastEmploymentsJson) {
        try {
            const pastEmployments = JSON.parse(pastEmploymentsJson) as any[];

            // Get existing
            const { data: existingEmployments } = await supabase
                .from("past_employments")
                .select("id")
                .eq("resume_id", id);

            const existingIds = new Set(existingEmployments?.map(e => e.id) || []);
            const incomingIds = new Set(pastEmployments.filter((e: any) => e.id && !e.id.startsWith('temp_')).map((e: any) => e.id));

            // Delete removed
            const toDelete = Array.from(existingIds).filter(id => !incomingIds.has(id));
            if (toDelete.length > 0) {
                await supabase.from("past_employments").delete().in("id", toDelete);
            }

            // Upsert
            const toUpsert = pastEmployments.map((e: any) => ({
                id: (e.id && !e.id.startsWith('temp_')) ? e.id : undefined,
                resume_id: id,
                store_name: e.store_name,
                period: e.period,
                hourly_wage: e.hourly_wage ? parseInt(e.hourly_wage) : null,
                sales_amount: e.sales_amount ? parseInt(e.sales_amount) : null,
                customer_count: e.customer_count ? parseInt(e.customer_count) : null,
            }));

            if (toUpsert.length > 0) {
                await supabase.from("past_employments").upsert(toUpsert);
            }
        } catch (e) {
            console.error("Error processing past employments:", e);
        }
    }

    // 3. Update Answers
    if (answersJson) {
        try {
            const answers = JSON.parse(answersJson) as any[];

            // For answers, we can just upsert based on resume_id + question_id if we had a constraint, 
            // but we don't. So we should probably delete all and re-insert, or be smarter.
            // Let's try to find existing answers for this resume.

            const { data: existingAnswers } = await supabase
                .from("resume_answers")
                .select("id, question_id")
                .eq("resume_id", id);

            const existingMap = new Map(existingAnswers?.map(a => [a.question_id, a.id]));

            const toUpsert = answers.map((a: any) => ({
                id: existingMap.get(a.question_id), // Use existing ID if available
                resume_id: id,
                question_id: a.question_id,
                answer: a.answer,
            }));

            if (toUpsert.length > 0) {
                await supabase.from("resume_answers").upsert(toUpsert);
            }
        } catch (e) {
            console.error("Error processing answers:", e);
        }
    }

    revalidatePath("/app/resumes");
    return { success: true };
}

export async function deleteResume(id: string) {
    const supabase = await createServerClient();
    const { error } = await supabase.from("resumes").delete().eq("id", id);

    if (error) {
        console.error("Error deleting resume:", error);
        throw new Error("履歴書の削除に失敗しました");
    }

    revalidatePath("/app/resumes");
    return { success: true };
}

export async function getResumeQuestions(storeId: string) {
    const supabase = await createServerClient();
    const { data, error } = await supabase
        .from("resume_questions")
        .select("*")
        .eq("store_id", storeId)
        .order("order", { ascending: true });

    if (error) {
        console.error("Error fetching questions:", error);
        return [];
    }

    return data;
}

export async function updateResumeQuestions(storeId: string, questions: any[]) {
    const supabase = await createServerClient();

    // Get existing
    const { data: existing } = await supabase
        .from("resume_questions")
        .select("id")
        .eq("store_id", storeId);

    const existingIds = new Set(existing?.map(q => q.id) || []);
    const incomingIds = new Set(questions.filter((q: any) => q.id && !q.id.startsWith('temp_')).map((q: any) => q.id));

    // Delete removed
    const toDelete = Array.from(existingIds).filter(id => !incomingIds.has(id));
    if (toDelete.length > 0) {
        await supabase.from("resume_questions").delete().in("id", toDelete);
    }

    // Upsert
    const toUpsert = questions.map((q: any, index: number) => ({
        id: (q.id && !q.id.startsWith('temp_')) ? q.id : undefined,
        store_id: storeId,
        content: q.content,
        order: index,
        is_active: q.is_active ?? true,
    }));

    if (toUpsert.length > 0) {
        const { error } = await supabase.from("resume_questions").upsert(toUpsert);
        if (error) throw error;
    }

    revalidatePath("/app/settings/resume");
    return { success: true };
}
