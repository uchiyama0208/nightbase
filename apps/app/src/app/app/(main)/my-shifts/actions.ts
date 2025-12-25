"use server";

import { createServerClient } from "@/lib/supabaseServerClient";
import { revalidatePath } from "next/cache";

// 月ごとの募集日付と提出状況を取得
export async function getMyShiftDatesForMonth(
    profileId: string,
    storeId: string,
    role: string,
    year: number,
    month: number
) {
    const supabase = await createServerClient() as any;

    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const endDate = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

    // 自分宛ての募集日付を取得
    const { data: requestDates, error } = await supabase
        .from("shift_request_dates")
        .select(`
            id,
            target_date,
            default_start_time,
            default_end_time,
            shift_requests!inner(
                id,
                store_id,
                status,
                deadline,
                target_roles,
                target_profile_ids
            )
        `)
        .eq("shift_requests.store_id", storeId)
        .eq("shift_requests.status", "open")
        .gte("target_date", startDate)
        .lt("target_date", endDate)
        .order("target_date", { ascending: true });

    if (error) {
        console.error("Error fetching shift request dates:", error);
        return [];
    }

    // 自分が対象かフィルタリング
    const filteredDates = (requestDates || []).filter((rd: any) => {
        const request = rd.shift_requests;
        if (request.target_profile_ids && request.target_profile_ids.length > 0) {
            return request.target_profile_ids.includes(profileId);
        }
        if (request.target_roles && request.target_roles.length > 0) {
            if (role === "admin" || role === "staff") {
                return request.target_roles.includes("staff");
            }
            return request.target_roles.includes(role);
        }
        return true;
    });

    // 自分の提出状況を取得
    const dateIds = filteredDates.map((d: any) => d.id);
    let submissions: any[] = [];

    if (dateIds.length > 0) {
        const { data: workRecords } = await supabase
            .from("work_records")
            .select(`
                id,
                work_date,
                scheduled_start_time,
                scheduled_end_time,
                status,
                shift_request_date_id
            `)
            .eq("profile_id", profileId)
            .in("shift_request_date_id", dateIds)
            .neq("status", "cancelled");

        submissions = workRecords || [];
    }

    // 日付ごとにデータをまとめる
    const submissionMap = new Map(submissions.map((s: any) => [s.shift_request_date_id, s]));

    return filteredDates.map((rd: any) => {
        const submission = submissionMap.get(rd.id);
        let submissionStatus: "not_submitted" | "pending" | "approved" | "rejected" = "not_submitted";

        if (submission) {
            if (submission.status === "pending") {
                submissionStatus = "pending";
            } else if (submission.status === "rejected") {
                submissionStatus = "rejected";
            } else if (["scheduled", "working", "completed"].includes(submission.status)) {
                submissionStatus = "approved";
            }
        }

        return {
            id: rd.id,
            date: rd.target_date,
            defaultStartTime: rd.default_start_time,
            defaultEndTime: rd.default_end_time,
            requestId: rd.shift_requests.id,
            deadline: rd.shift_requests.deadline,
            submissionStatus,
            submissionId: submission?.id || null,
            startTime: submission?.scheduled_start_time || null,
            endTime: submission?.scheduled_end_time || null,
        };
    });
}

// 単一日付のシフトを提出
export async function submitSingleShift(
    profileId: string,
    storeId: string,
    dateId: string,
    requestId: string,
    targetDate: string,
    availability: "available" | "unavailable",
    startTime?: string,
    endTime?: string
) {
    const supabase = await createServerClient() as any;

    // 既存の提出を削除
    await supabase
        .from("work_records")
        .delete()
        .eq("profile_id", profileId)
        .eq("shift_request_date_id", dateId);

    // 出勤希望の場合のみ新規作成
    if (availability === "available") {
        const { error } = await supabase
            .from("work_records")
            .insert({
                profile_id: profileId,
                store_id: storeId,
                work_date: targetDate,
                scheduled_start_time: startTime || null,
                scheduled_end_time: endTime || null,
                shift_request_id: requestId,
                shift_request_date_id: dateId,
                status: "pending",
                source: "shift_request",
            });

        if (error) {
            console.error("Error submitting shift:", error);
            return { success: false, error: error.message };
        }
    }

    revalidatePath("/app/my-shifts");
    revalidatePath("/app/shifts");
    return { success: true };
}

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
        .from("store_settings")
        .select("default_cast_start_time, default_cast_end_time, default_staff_start_time, default_staff_end_time, day_switch_time")
        .eq("store_id", storeId)
        .single();

    if (error) {
        console.error("Error fetching store defaults:", error);
        return null;
    }

    return data;
}

// 提出済みのシフトリクエストIDを取得（可/不可問わず）
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

    return new Set(
        (data || [])
            .map((s: any) => s.shift_request_id)
            .filter((id: string | null | undefined): id is string => Boolean(id))
    );
}

// 自分のシフト（確定・提出済み・否認）を取得
export async function getApprovedShifts(profileId: string, storeId: string) {
    const supabase = await createServerClient() as any;

    // 今日以降のシフトを取得（確定・提出済み・否認）
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
            status,
            reservation_type,
            guest_name
        `)
        .eq("profile_id", profileId)
        .eq("store_id", storeId)
        .eq("source", "shift_request")
        .in("status", ["scheduled", "working", "completed", "pending", "rejected"])
        .gte("work_date", today)
        .order("work_date", { ascending: true });

    if (error) {
        console.error("Error fetching shifts:", error);
        return [];
    }

    // フラットな形式に変換（statusも含める）
    return (data || []).map((record: any) => {
        // ステータスを変換
        let displayStatus: "approved" | "pending" | "rejected";
        if (record.status === "pending") {
            displayStatus = "pending";
        } else if (record.status === "rejected") {
            displayStatus = "rejected";
        } else {
            displayStatus = "approved";
        }

        return {
            id: record.id,
            date: record.work_date,
            startTime: record.scheduled_start_time,
            endTime: record.scheduled_end_time,
            status: displayStatus,
            reservationType: record.reservation_type as "douhan" | "shimei" | "none" | null,
            guestName: record.guest_name as string | null,
        };
    });
}

// 同伴・指名情報を更新
export async function updateReservationType(
    workRecordId: string,
    reservationType: "douhan" | "shimei" | "none" | null,
    guestName: string | null
) {
    const supabase = await createServerClient() as any;

    const { error } = await supabase
        .from("work_records")
        .update({
            reservation_type: reservationType,
            guest_name: reservationType === "none" || reservationType === null ? null : guestName,
            updated_at: new Date().toISOString(),
        })
        .eq("id", workRecordId);

    if (error) {
        console.error("Error updating reservation type:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/app/my-shifts");
    return { success: true };
}

// マイシフトページデータ取得（クライアントサイドフェッチ用）
export async function getMyShiftsPageData() {
    const supabase = await createServerClient() as any;
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { redirect: "/login" };
    }

    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    if (!appUser?.current_profile_id) {
        return { redirect: "/app/me" };
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("id, store_id, role")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    if (!profile || !profile.store_id) {
        return { redirect: "/app/me" };
    }

    const [shiftRequests, storeDefaults, approvedShifts] = await Promise.all([
        getMyShiftRequests(profile.id, profile.store_id, profile.role),
        getStoreDefaults(profile.store_id),
        getApprovedShifts(profile.id, profile.store_id),
    ]);

    const requestIds = shiftRequests.map((r: any) => r.id);
    const submittedRequestIdsSet = await getSubmittedRequestIds(profile.id, requestIds);
    const submittedRequestIds = Array.from(submittedRequestIdsSet) as string[];

    return {
        data: {
            shiftRequests,
            profileId: profile.id,
            profileRole: profile.role,
            storeDefaults,
            approvedShifts,
            submittedRequestIds,
        },
    };
}
