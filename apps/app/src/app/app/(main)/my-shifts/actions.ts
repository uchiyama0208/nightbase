"use server";

import { createServerClient } from "@/lib/supabaseServerClient";
import { revalidatePath } from "next/cache";

// 自分宛のシフト募集を取得
export async function getMyShiftRequests(profileId: string, storeId: string, role: string) {
    const supabase = await createServerClient();

    // 募集を取得（自分のロールが対象か、profile_idsに自分が含まれているか）
    const { data, error } = await supabase
        .from("shift_requests")
        .select(`
            *,
            shift_request_dates(*)
        `)
        .eq("store_id", storeId)
        .eq("status", "open")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching shift requests:", error);
        return [];
    }

    // フィルタリング
    const filtered = (data || []).filter((request: any) => {
        // profile_idsが指定されている場合
        if (request.target_profile_ids && request.target_profile_ids.length > 0) {
            return request.target_profile_ids.includes(profileId);
        }
        // target_rolesが指定されている場合
        if (request.target_roles && request.target_roles.length > 0) {
            if (role === "admin" || role === "staff") {
                return request.target_roles.includes("staff");
            }
            return request.target_roles.includes(role);
        }
        return true;
    });

    return filtered;
}

// 自分の提出を取得
export async function getMySubmissions(profileId: string, requestId: string) {
    const supabase = await createServerClient();

    const { data, error } = await supabase
        .from("shift_submissions")
        .select("*, shift_request_dates(*)")
        .eq("profile_id", profileId)
        .eq("shift_request_id", requestId);

    if (error) {
        console.error("Error fetching my submissions:", error);
        return [];
    }

    return data || [];
}

// 希望シフトを提出（複数日付分）
export async function submitShiftPreferences(
    profileId: string,
    requestId: string,
    submissions: {
        dateId: string;
        availability: "available" | "unavailable";
        startTime?: string;
        endTime?: string;
        note?: string;
    }[]
) {
    const supabase = await createServerClient();

    // 既存の提出を削除
    await supabase
        .from("shift_submissions")
        .delete()
        .eq("profile_id", profileId)
        .eq("shift_request_id", requestId);

    // 新しい提出を作成
    const submissionsToInsert = submissions.map((s) => ({
        shift_request_id: requestId,
        shift_request_date_id: s.dateId,
        profile_id: profileId,
        availability: s.availability,
        preferred_start_time: s.availability === "available" ? s.startTime : null,
        preferred_end_time: s.availability === "available" ? s.endTime : null,
        note: s.note || null,
    }));

    const { error } = await supabase
        .from("shift_submissions")
        .insert(submissionsToInsert);

    if (error) {
        console.error("Error submitting shift preferences:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/app/my-shifts");
    return { success: true };
}

// 店舗のデフォルト出退勤時間を取得
export async function getStoreDefaults(storeId: string) {
    const supabase = await createServerClient();

    const { data, error } = await supabase
        .from("stores")
        .select("default_cast_start_time, default_cast_end_time, default_staff_start_time, default_staff_end_time")
        .eq("id", storeId)
        .single();

    if (error) {
        console.error("Error fetching store defaults:", error);
        return null;
    }

    return data;
}
