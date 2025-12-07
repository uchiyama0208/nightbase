"use server";

import { createServerClient } from "@/lib/supabaseServerClient";
import { revalidatePath } from "next/cache";

// 型定義
export interface ShiftRequest {
    id: string;
    store_id: string;
    title: string;
    description: string | null;
    deadline: string;
    status: "open" | "closed";
    target_roles: string[];
    target_profile_ids: string[] | null;
    line_notification_sent: boolean;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

export interface ShiftRequestDate {
    id: string;
    shift_request_id: string;
    target_date: string;
    default_start_time: string | null;
    default_end_time: string | null;
    created_at: string;
}

export interface ShiftSubmission {
    id: string;
    shift_request_id: string;
    shift_request_date_id: string;
    profile_id: string;
    availability: "available" | "unavailable";
    preferred_start_time: string | null;
    preferred_end_time: string | null;
    note: string | null;
    status: "pending" | "approved" | "rejected";
    approved_start_time: string | null;
    approved_end_time: string | null;
    approved_by: string | null;
    approved_at: string | null;
    created_at: string;
    updated_at: string;
    profiles?: {
        id: string;
        display_name: string | null;
        avatar_url: string | null;
        role: string;
    };
}

export interface ShiftRequestWithDates extends ShiftRequest {
    shift_request_dates: ShiftRequestDate[];
    submission_count?: number;
    target_count?: number;
}

// シフト募集一覧を取得
export async function getShiftRequests(storeId: string) {
    const supabase = await createServerClient() as any;

    const { data, error } = await supabase
        .from("shift_requests")
        .select(`
            *,
            shift_request_dates(*)
        `)
        .eq("store_id", storeId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching shift requests:", error);
        return [];
    }

    return data as ShiftRequestWithDates[];
}

// 特定のシフト募集を取得
export async function getShiftRequest(requestId: string) {
    const supabase = await createServerClient() as any;

    const { data, error } = await supabase
        .from("shift_requests")
        .select(`
            *,
            shift_request_dates(*)
        `)
        .eq("id", requestId)
        .single();

    if (error) {
        console.error("Error fetching shift request:", error);
        return null;
    }

    return data as ShiftRequestWithDates;
}

// 既存の募集日付を取得（openステータスのもの）
export async function getExistingRequestDates(storeId: string): Promise<string[]> {
    const supabase = await createServerClient() as any;

    const { data, error } = await supabase
        .from("shift_request_dates")
        .select(`
            target_date,
            shift_requests!inner(store_id, status)
        `)
        .eq("shift_requests.store_id", storeId)
        .eq("shift_requests.status", "open");

    if (error) {
        console.error("Error fetching existing request dates:", error);
        return [];
    }

    return data?.map((d) => d.target_date) || [];
}

// シフト募集を作成
export async function createShiftRequest(data: {
    storeId: string;
    profileId: string;
    title: string;
    description?: string;
    deadline: string;
    targetRoles: string[];
    targetProfileIds?: string[];
    dates: { date: string; startTime: string; endTime: string }[];
}) {
    const supabase = await createServerClient() as any;

    // 募集を作成
    const { data: request, error: requestError } = await supabase
        .from("shift_requests")
        .insert({
            store_id: data.storeId,
            title: data.title,
            description: data.description || null,
            deadline: data.deadline,
            target_roles: data.targetRoles,
            target_profile_ids: data.targetProfileIds || null,
            created_by: data.profileId,
        })
        .select()
        .single();

    if (requestError) {
        console.error("Error creating shift request:", requestError);
        return { success: false, error: requestError.message };
    }

    // 日付を作成
    const datesToInsert = data.dates.map((d) => ({
        shift_request_id: request.id,
        target_date: d.date,
        default_start_time: d.startTime,
        default_end_time: d.endTime,
    }));

    const { error: datesError } = await supabase
        .from("shift_request_dates")
        .insert(datesToInsert);

    if (datesError) {
        console.error("Error creating shift request dates:", datesError);
        // ロールバック
        await supabase.from("shift_requests").delete().eq("id", request.id);
        return { success: false, error: datesError.message };
    }

    revalidatePath("/app/shifts");
    return { success: true, requestId: request.id };
}

// シフト募集をクローズ
export async function closeShiftRequest(requestId: string) {
    const supabase = await createServerClient() as any;

    const { error } = await supabase
        .from("shift_requests")
        .update({ status: "closed", updated_at: new Date().toISOString() })
        .eq("id", requestId);

    if (error) {
        console.error("Error closing shift request:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/app/shifts");
    return { success: true };
}

// シフト募集を削除
export async function deleteShiftRequest(requestId: string) {
    const supabase = await createServerClient() as any;

    const { error } = await supabase
        .from("shift_requests")
        .delete()
        .eq("id", requestId);

    if (error) {
        console.error("Error deleting shift request:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/app/shifts");
    return { success: true };
}

// 提出状況を取得
export async function getSubmissionStatus(requestId: string) {
    const supabase = await createServerClient() as any;

    // 募集情報を取得
    const { data: request } = await supabase
        .from("shift_requests")
        .select("*, shift_request_dates(*)")
        .eq("id", requestId)
        .single();

    if (!request) {
        return null;
    }

    // 対象プロフィールを取得
    let profilesQuery = supabase
        .from("profiles")
        .select("id, display_name, avatar_url, role, line_user_id")
        .eq("store_id", request.store_id);

    if (request.target_profile_ids && request.target_profile_ids.length > 0) {
        profilesQuery = profilesQuery.in("id", request.target_profile_ids);
    } else if (request.target_roles && request.target_roles.length > 0) {
        profilesQuery = profilesQuery.in("role", request.target_roles);
    }

    const { data: profiles } = await profilesQuery;

    // 提出を取得
    const { data: submissions } = await supabase
        .from("shift_submissions")
        .select("*, profiles(id, display_name, avatar_url, role)")
        .eq("shift_request_id", requestId);

    return {
        request,
        profiles: profiles || [],
        submissions: submissions || [],
    };
}

// 日付ごとの提出・確定シフトを取得
export async function getDateSubmissions(requestDateId: string) {
    const supabase = await createServerClient() as any;

    const { data, error } = await supabase
        .from("shift_submissions")
        .select("*, profiles(id, display_name, avatar_url, role)")
        .eq("shift_request_date_id", requestDateId)
        .order("created_at", { ascending: true });

    if (error) {
        console.error("Error fetching date submissions:", error);
        return [];
    }

    return data as ShiftSubmission[];
}

// 希望シフトを承認
export async function approveSubmission(
    submissionId: string,
    approvedBy: string,
    startTime?: string,
    endTime?: string
) {
    const supabase = await createServerClient() as any;

    const { error } = await supabase
        .from("shift_submissions")
        .update({
            status: "approved",
            approved_by: approvedBy,
            approved_at: new Date().toISOString(),
            approved_start_time: startTime || null,
            approved_end_time: endTime || null,
            updated_at: new Date().toISOString(),
        })
        .eq("id", submissionId);

    if (error) {
        console.error("Error approving submission:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/app/shifts");
    return { success: true };
}

// 希望シフトを却下
export async function rejectSubmission(submissionId: string, approvedBy: string) {
    const supabase = await createServerClient() as any;

    const { error } = await supabase
        .from("shift_submissions")
        .update({
            status: "rejected",
            approved_by: approvedBy,
            approved_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .eq("id", submissionId);

    if (error) {
        console.error("Error rejecting submission:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/app/shifts");
    return { success: true };
}

// 一括承認
export async function approveAllSubmissions(
    requestDateId: string,
    approvedBy: string
) {
    const supabase = await createServerClient() as any;

    const { error } = await supabase
        .from("shift_submissions")
        .update({
            status: "approved",
            approved_by: approvedBy,
            approved_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .eq("shift_request_date_id", requestDateId)
        .eq("availability", "available")
        .eq("status", "pending");

    if (error) {
        console.error("Error approving all submissions:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/app/shifts");
    return { success: true };
}

// 店舗のデフォルト出退勤時間を取得
export async function getStoreShiftDefaults(storeId: string) {
    const supabase = await createServerClient() as any;

    const { data, error } = await supabase
        .from("stores")
        .select("default_cast_start_time, default_cast_end_time, default_staff_start_time, default_staff_end_time")
        .eq("id", storeId)
        .single();

    if (error) {
        console.error("Error fetching store shift defaults:", error);
        return null;
    }

    return data;
}

// 店舗のデフォルト出退勤時間を更新
export async function updateStoreShiftDefaults(
    storeId: string,
    defaults: {
        default_cast_start_time: string;
        default_cast_end_time: string;
        default_staff_start_time: string;
        default_staff_end_time: string;
    }
) {
    const supabase = await createServerClient() as any;

    const { error } = await supabase
        .from("stores")
        .update({
            ...defaults,
            updated_at: new Date().toISOString(),
        })
        .eq("id", storeId);

    if (error) {
        console.error("Error updating store shift defaults:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/app/shifts");
    return { success: true };
}

// カレンダー用: 日付ごとの確定シフト人数を取得
export async function getCalendarData(storeId: string, year: number, month: number) {
    const supabase = await createServerClient() as any;

    // 月の最初と最後の日を計算
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;

    // その月の募集日付を取得
    const { data: requestDates } = await supabase
        .from("shift_request_dates")
        .select(`
            id,
            target_date,
            shift_requests!inner(id, store_id, status)
        `)
        .eq("shift_requests.store_id", storeId)
        .gte("target_date", startDate)
        .lt("target_date", endDate);

    // 確定シフト（承認済み提出）を取得
    const { data: approvedSubmissions } = await supabase
        .from("shift_submissions")
        .select(`
            id,
            shift_request_date_id,
            profile_id,
            profiles(role),
            shift_request_dates!inner(target_date, shift_requests!inner(store_id))
        `)
        .eq("shift_request_dates.shift_requests.store_id", storeId)
        .eq("status", "approved")
        .eq("availability", "available")
        .gte("shift_request_dates.target_date", startDate)
        .lt("shift_request_dates.target_date", endDate);

    // 日付ごとにデータを集計
    const calendarData = new Map<string, {
        hasRequest: boolean;
        castCount: number;
        staffCount: number;
        requestDateId?: string;
    }>();

    // 募集日付をマップに追加
    if (requestDates) {
        for (const rd of requestDates) {
            const date = rd.target_date;
            if (!calendarData.has(date)) {
                calendarData.set(date, {
                    hasRequest: true,
                    castCount: 0,
                    staffCount: 0,
                    requestDateId: rd.id,
                });
            }
        }
    }

    // 確定シフトをカウント
    if (approvedSubmissions) {
        for (const sub of approvedSubmissions) {
            const date = (sub.shift_request_dates as any)?.target_date;
            if (date) {
                const existing = calendarData.get(date) || {
                    hasRequest: false,
                    castCount: 0,
                    staffCount: 0,
                };
                const role = (sub.profiles as any)?.role;
                if (role === "cast") {
                    existing.castCount++;
                } else if (role === "staff" || role === "admin") {
                    existing.staffCount++;
                }
                calendarData.set(date, existing);
            }
        }
    }

    return Object.fromEntries(calendarData);
}

// 自動化設定を取得
export async function getAutomationSettings(storeId: string) {
    const supabase = await createServerClient() as any;

    const { data, error } = await supabase
        .from("shift_automation_settings")
        .select("*")
        .eq("store_id", storeId)
        .maybeSingle();

    if (error) {
        console.error("Error fetching automation settings:", error);
        return null;
    }

    return data;
}

// 自動化設定を更新
export async function updateAutomationSettings(
    storeId: string,
    settings: {
        enabled: boolean;
        target_roles: string[];
        period_type: string;
        send_day_offset: number;
        send_hour: number;
        reminder_enabled: boolean;
        reminder_day_offset: number;
        reminder_hour: number;
    }
) {
    const supabase = await createServerClient() as any;

    // upsert（存在すれば更新、なければ作成）
    const { error } = await supabase
        .from("shift_automation_settings")
        .upsert(
            {
                store_id: storeId,
                ...settings,
                updated_at: new Date().toISOString(),
            },
            { onConflict: "store_id" }
        );

    if (error) {
        console.error("Error updating automation settings:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/app/shifts");
    return { success: true };
}

// LINE送信用のプロフィール情報を取得
export async function getLineTargetProfiles(
    storeId: string,
    targetRoles: string[],
    targetProfileIds?: string[]
) {
    const supabase = await createServerClient() as any;

    let query = supabase
        .from("profiles")
        .select("id, display_name, avatar_url, role, line_user_id")
        .eq("store_id", storeId);

    if (targetProfileIds && targetProfileIds.length > 0) {
        query = query.in("id", targetProfileIds);
    } else if (targetRoles && targetRoles.length > 0) {
        // staff ロールは admin も含む
        const rolesFilter = targetRoles.includes("staff")
            ? [...targetRoles, "admin"]
            : targetRoles;
        query = query.in("role", rolesFilter);
    }

    const { data, error } = await query;

    if (error) {
        console.error("Error fetching profiles for LINE:", error);
        return { profiles: [], error: error.message };
    }

    const profiles = data || [];
    const linkedProfiles = profiles.filter((p) => p.line_user_id);
    const unlinkedProfiles = profiles.filter((p) => !p.line_user_id);

    return {
        profiles,
        linkedProfiles,
        unlinkedProfiles,
        linkedCount: linkedProfiles.length,
        unlinkedCount: unlinkedProfiles.length,
    };
}

// LINE通知を送信
export async function sendLineNotification(
    requestId: string,
    storeName: string
) {
    const supabase = await createServerClient() as any;

    // 募集情報を取得
    const { data: request, error: requestError } = await supabase
        .from("shift_requests")
        .select("*, shift_request_dates(*)")
        .eq("id", requestId)
        .single();

    if (requestError || !request) {
        return { success: false, error: "Shift request not found" };
    }

    // 対象プロフィールを取得
    const targetResult = await getLineTargetProfiles(
        request.store_id,
        request.target_roles || [],
        request.target_profile_ids
    );

    const linkedProfiles = targetResult.linkedProfiles || [];
    const unlinkedProfiles = targetResult.unlinkedProfiles || [];

    if (linkedProfiles.length === 0) {
        return {
            success: false,
            error: "No LINE-linked users found",
            unlinkedProfiles,
        };
    }

    const lineUserIds = linkedProfiles.map((p: any) => p.line_user_id);

    // 日付範囲を計算
    const dates = request.shift_request_dates || [];
    const sortedDates = [...dates].sort((a: any, b: any) =>
        a.target_date.localeCompare(b.target_date)
    );
    const dateRangeText =
        sortedDates.length > 0
            ? sortedDates.length === 1
                ? formatDateJP(sortedDates[0].target_date)
                : `${formatDateJP(sortedDates[0].target_date)}〜${formatDateJP(sortedDates[sortedDates.length - 1].target_date)}`
            : "";

    // 期限を整形
    const deadline = new Date(request.deadline);
    const deadlineText = deadline.toLocaleString("ja-JP", {
        timeZone: "Asia/Tokyo",
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

    // メッセージを作成
    const message = `【${storeName}】シフト募集

${request.title}

対象期間: ${dateRangeText}
提出期限: ${deadlineText}

アプリからシフト希望を提出してください。`;

    try {
        // Edge Function を呼び出し
        const response = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/line-send-message`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                },
                body: JSON.stringify({
                    lineUserIds,
                    message,
                }),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error("LINE send error:", errorText);
            return { success: false, error: errorText, unlinkedProfiles };
        }

        // 送信済みフラグを更新
        await supabase
            .from("shift_requests")
            .update({ line_notification_sent: true })
            .eq("id", requestId);

        return {
            success: true,
            sentCount: lineUserIds.length,
            unlinkedProfiles,
        };
    } catch (error) {
        console.error("LINE send error:", error);
        return {
            success: false,
            error: (error as Error).message,
            unlinkedProfiles,
        };
    }
}

function formatDateJP(dateStr: string): string {
    const [year, month, day] = dateStr.split("-").map(Number);
    return `${month}/${day}`;
}

// 既存募集と重複するメンバーを確認
export async function checkExistingRequestConflicts(
    storeId: string,
    profileIds: string[],
    dates: string[]
) {
    const supabase = await createServerClient() as any;

    // 指定した日付で開いている募集の対象者を取得
    const { data: existingRequests, error } = await supabase
        .from("shift_request_dates")
        .select(`
            target_date,
            shift_requests!inner(
                id,
                store_id,
                status,
                target_profile_ids,
                target_roles
            )
        `)
        .eq("shift_requests.store_id", storeId)
        .eq("shift_requests.status", "open")
        .in("target_date", dates);

    if (error) {
        console.error("Error checking existing requests:", error);
        return { conflicts: [] };
    }

    // 各日付で対象となっているプロフィールを抽出
    const conflicts: {
        profileId: string;
        dates: string[];
    }[] = [];

    // profileIdごとの重複日付を集計
    const profileConflictsMap = new Map<string, Set<string>>();

    for (const rd of existingRequests || []) {
        const request = rd.shift_requests as any;
        const targetDate = rd.target_date;

        // 対象プロフィールを特定
        let targetIds: string[] = [];

        if (request.target_profile_ids && request.target_profile_ids.length > 0) {
            // 特定のプロフィールが指定されている場合
            targetIds = request.target_profile_ids;
        } else {
            // ロールで指定されている場合、そのロールのプロフィールを全て含む
            // この場合、渡されたprofileIdsの中から該当するものを確認
            // (ロール情報がないため、全員対象として扱う)
            targetIds = profileIds;
        }

        // 渡されたprofileIdsと重複するものを確認
        for (const pid of profileIds) {
            if (targetIds.includes(pid)) {
                if (!profileConflictsMap.has(pid)) {
                    profileConflictsMap.set(pid, new Set());
                }
                profileConflictsMap.get(pid)!.add(targetDate);
            }
        }
    }

    // 結果を配列に変換
    for (const [profileId, datesSet] of profileConflictsMap.entries()) {
        conflicts.push({
            profileId,
            dates: Array.from(datesSet),
        });
    }

    return { conflicts };
}
