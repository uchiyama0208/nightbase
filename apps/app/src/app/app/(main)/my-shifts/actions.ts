"use server";

import { createServerClient } from "@/lib/supabaseServerClient";
import { revalidatePath } from "next/cache";

// 自分宛のシフト募集を取得
export async function getMyShiftRequests(profileId: string, storeId: string, role: string) {
    const supabase = await createServerClient() as any;

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

// 自分の提出（work_records）を取得
export async function getMySubmissions(profileId: string, requestId: string) {
    const supabase = await createServerClient() as any;

    const { data, error } = await supabase
        .from("work_records")
        .select(`
            id,
            work_date,
            scheduled_start_time,
            scheduled_end_time,
            status,
            note,
            shift_request_id,
            shift_request_dates!inner(id, target_date)
        `)
        .eq("profile_id", profileId)
        .eq("shift_request_id", requestId)
        .neq("status", "cancelled");

    if (error) {
        console.error("Error fetching my submissions:", error);
        return [];
    }

    // 旧形式に変換して返す
    return (data || []).map((record: any) => ({
        id: record.id,
        profile_id: profileId,
        shift_request_id: requestId,
        shift_request_date_id: record.shift_request_dates?.id,
        availability: "available",
        preferred_start_time: record.scheduled_start_time,
        preferred_end_time: record.scheduled_end_time,
        note: record.note,
        status: record.status,
        shift_request_dates: record.shift_request_dates,
    }));
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
    const supabase = await createServerClient() as any;

    // プロフィールの店舗IDを取得
    const { data: profile } = await supabase
        .from("profiles")
        .select("store_id")
        .eq("id", profileId)
        .single();

    if (!profile?.store_id) {
        return { success: false, error: "Store not found" };
    }

    // 日付情報を取得
    const { data: requestDates } = await supabase
        .from("shift_request_dates")
        .select("id, target_date")
        .eq("shift_request_id", requestId);

    const dateMap = new Map((requestDates || []).map((d: any) => [d.id, d.target_date]));

    // 既存のwork_recordsを削除（このリクエストに関連するもの）
    await supabase
        .from("work_records")
        .delete()
        .eq("profile_id", profileId)
        .eq("shift_request_id", requestId);

    // 新しいwork_recordsを作成（availableのもののみ）
    // status: "pending" = 提出済み（未確認）、管理者が承認すると "scheduled" になる
    const recordsToInsert = submissions
        .filter((s) => s.availability === "available")
        .map((s) => {
            const targetDate = dateMap.get(s.dateId);
            return {
                profile_id: profileId,
                store_id: profile.store_id,
                work_date: targetDate,
                scheduled_start_time: s.startTime || null,
                scheduled_end_time: s.endTime || null,
                shift_request_id: requestId,
                shift_request_date_id: s.dateId,
                status: "pending",
                source: "shift_request",
                note: s.note || null,
            };
        });

    if (recordsToInsert.length > 0) {
        const { error } = await supabase
            .from("work_records")
            .insert(recordsToInsert);

        if (error) {
            console.error("Error submitting shift preferences:", error);
            return { success: false, error: error.message };
        }
    }

    revalidatePath("/app/my-shifts");
    revalidatePath("/app/shifts");
    return { success: true };
}

// 店舗のデフォルト出退勤時間を取得
export async function getStoreDefaults(storeId: string) {
    const supabase = await createServerClient() as any;

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

// 提出済みのシフトリクエストIDを取得
export async function getSubmittedRequestIds(profileId: string, requestIds: string[]) {
    if (requestIds.length === 0) return new Set<string>();

    const supabase = await createServerClient() as any;

    const { data, error } = await supabase
        .from("work_records")
        .select("shift_request_id")
        .eq("profile_id", profileId)
        .in("shift_request_id", requestIds)
        .neq("status", "cancelled");

    if (error) {
        console.error("Error fetching submitted request ids:", error);
        return new Set<string>();
    }

    // ユニークなrequest_idのSetを返す
    return new Set((data || []).map((s: any) => s.shift_request_id));
}

// 承認済みのシフト（出勤予定）を取得
export async function getApprovedShifts(profileId: string, storeId: string) {
    const supabase = await createServerClient() as any;

    // 今日以降の承認済みシフトを取得
    const today = new Date().toLocaleDateString("ja-JP", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).replace(/\//g, "-");

    const { data, error } = await supabase
        .from("work_records")
        .select(`
            id,
            work_date,
            scheduled_start_time,
            scheduled_end_time,
            status
        `)
        .eq("profile_id", profileId)
        .eq("store_id", storeId)
        .eq("source", "shift_request")
        .in("status", ["scheduled", "working", "completed"])
        .not("approved_at", "is", null)
        .gte("work_date", today)
        .order("work_date", { ascending: true });

    if (error) {
        console.error("Error fetching approved shifts:", error);
        return [];
    }

    // フラットな形式に変換
    return (data || []).map((record: any) => ({
        id: record.id,
        date: record.work_date,
        startTime: record.scheduled_start_time,
        endTime: record.scheduled_end_time,
    }));
}
