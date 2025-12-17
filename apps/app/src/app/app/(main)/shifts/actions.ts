"use server";

import { createServerClient } from "@/lib/supabaseServerClient";
import { revalidatePath } from "next/cache";

// =====================================================
// 型定義
// =====================================================

export interface WorkRecord {
    id: string;
    profile_id: string;
    store_id: string;
    work_date: string;
    scheduled_start_time: string | null;
    scheduled_end_time: string | null;
    shift_request_id: string | null;
    clock_in: string | null;
    clock_out: string | null;
    break_start: string | null;
    break_end: string | null;
    status: "scheduled" | "working" | "completed" | "absent" | "cancelled";
    source: "shift_request" | "manual";
    approved_by: string | null;
    approved_at: string | null;
    note: string | null;
    pickup_required: boolean;
    pickup_destination: string | null;
    forgot_clockout: boolean;
    created_at: string;
    updated_at: string;
    profiles?: {
        id: string;
        display_name: string | null;
        avatar_url: string | null;
        role: string;
        line_is_friend?: boolean;
    };
}

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
    line_notification_sent_at: string | null;
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

export interface ShiftRequestWithDates extends ShiftRequest {
    shift_request_dates: ShiftRequestDate[];
}

// 旧インターフェースとの互換用
export interface ShiftSubmission {
    id: string;
    profile_id: string;
    store_id: string;
    work_date: string;
    scheduled_start_time: string | null;
    scheduled_end_time: string | null;
    shift_request_id: string | null;
    shift_request_date_id?: string;
    clock_in: string | null;
    clock_out: string | null;
    break_start: string | null;
    break_end: string | null;
    status: "scheduled" | "working" | "completed" | "absent" | "cancelled" | "pending" | "approved" | "rejected" | "not_submitted";
    source: "shift_request" | "manual";
    approved_by: string | null;
    approved_at: string | null;
    note: string | null;
    pickup_required: boolean;
    pickup_destination: string | null;
    forgot_clockout: boolean;
    created_at: string | null;
    updated_at: string | null;
    profiles?: {
        id: string;
        display_name: string | null;
        avatar_url: string | null;
        role: string;
        line_is_friend?: boolean;
    };
    // 旧互換フィールド
    availability?: "available" | "unavailable" | null;
    preferred_start_time?: string | null;
    preferred_end_time?: string | null;
}

// =====================================================
// シフト募集関連（既存機能）
// =====================================================

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

    return data?.map((d: any) => d.target_date) || [];
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

// =====================================================
// work_records（出勤記録）関連 - 新規
// =====================================================

// 日付ごとの出勤記録を取得
export async function getWorkRecordsForDate(storeId: string, date: string) {
    const supabase = await createServerClient() as any;

    const { data, error } = await supabase
        .from("work_records")
        .select("*, profiles:profile_id(id, display_name, display_name_kana, avatar_url, role, line_is_friend)")
        .eq("store_id", storeId)
        .eq("work_date", date)
        .neq("status", "cancelled")
        .order("scheduled_start_time", { ascending: true });

    if (error) {
        console.error("Error fetching work records:", error);
        return [];
    }

    return data as WorkRecord[];
}

// シフト（出勤予定）を作成
export async function createWorkRecord(data: {
    profileId: string;
    storeId: string;
    workDate: string;
    scheduledStartTime: string;
    scheduledEndTime: string;
    shiftRequestId?: string;
    approvedBy?: string;
}) {
    const supabase = await createServerClient() as any;

    const { data: record, error } = await supabase
        .from("work_records")
        .insert({
            profile_id: data.profileId,
            store_id: data.storeId,
            work_date: data.workDate,
            scheduled_start_time: data.scheduledStartTime,
            scheduled_end_time: data.scheduledEndTime,
            shift_request_id: data.shiftRequestId || null,
            source: data.shiftRequestId ? "shift_request" : "manual",
            status: "scheduled",
            approved_by: data.approvedBy || null,
            approved_at: data.approvedBy ? new Date().toISOString() : null,
        })
        .select()
        .single();

    if (error) {
        console.error("Error creating work record:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/app/shifts");
    return { success: true, record };
}

// 特定のユーザーの特定日の提出データを取得
export async function getUserSubmissionForDate(requestDateId: string, profileId: string) {
    const supabase = await createServerClient() as any;

    const { data, error } = await supabase
        .from("shift_submissions")
        .select("id, status, availability, preferred_start_time, preferred_end_time")
        .eq("request_date_id", requestDateId)
        .eq("profile_id", profileId)
        .single();

    if (error && error.code !== "PGRST116") {
        console.error("Error fetching user submission:", error);
        return null;
    }

    return data;
}

// シフトを更新
export async function updateWorkRecord(
    recordId: string,
    updates: {
        scheduledStartTime?: string;
        scheduledEndTime?: string;
        status?: string;
        note?: string;
    }
) {
    const supabase = await createServerClient() as any;

    const updateData: any = { updated_at: new Date().toISOString() };
    if (updates.scheduledStartTime) updateData.scheduled_start_time = updates.scheduledStartTime;
    if (updates.scheduledEndTime) updateData.scheduled_end_time = updates.scheduledEndTime;
    if (updates.status) updateData.status = updates.status;
    if (updates.note !== undefined) updateData.note = updates.note;

    const { error } = await supabase
        .from("work_records")
        .update(updateData)
        .eq("id", recordId);

    if (error) {
        console.error("Error updating work record:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/app/shifts");
    return { success: true };
}

// シフトをキャンセル
export async function cancelWorkRecord(recordId: string) {
    const supabase = await createServerClient() as any;

    const { error } = await supabase
        .from("work_records")
        .update({
            status: "cancelled",
            updated_at: new Date().toISOString(),
        })
        .eq("id", recordId);

    if (error) {
        console.error("Error cancelling work record:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/app/shifts");
    return { success: true };
}

// シフトを削除
export async function deleteWorkRecord(recordId: string) {
    const supabase = await createServerClient() as any;

    const { error } = await supabase
        .from("work_records")
        .delete()
        .eq("id", recordId);

    if (error) {
        console.error("Error deleting work record:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/app/shifts");
    return { success: true };
}

// =====================================================
// カレンダー表示用
// =====================================================

// カレンダー用: 日付ごとのシフト人数を取得
export async function getCalendarData(storeId: string, year: number, month: number) {
    const supabase = await createServerClient() as any;

    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const endDate = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

    const [
        // work_records から出勤予定を取得
        { data: workRecords },
        // shift_submissions から不可を含む提出を取得
        { data: shiftSubmissions },
    ] = await Promise.all([
        supabase
            .from("work_records")
            .select("*, profiles:profile_id(role)")
            .eq("store_id", storeId)
            .gte("work_date", startDate)
            .lt("work_date", endDate)
            .neq("status", "cancelled"),
        supabase
            .from("shift_submissions")
            .select(`
                id,
                availability,
                status,
                request_date_id,
                shift_request_dates!inner(target_date, shift_requests!inner(store_id)),
                profiles:profile_id(role)
            `)
            .eq("shift_request_dates.shift_requests.store_id", storeId)
            .gte("shift_request_dates.target_date", startDate)
            .lt("shift_request_dates.target_date", endDate),
    ]);

    // 募集日付も取得（募集中・募集終了の表示用）
    const { data: requestDates } = await supabase
        .from("shift_request_dates")
        .select(`
            id,
            target_date,
            shift_requests!inner(store_id, status)
        `)
        .eq("shift_requests.store_id", storeId)
        .in("shift_requests.status", ["open", "closed"])
        .gte("target_date", startDate)
        .lt("target_date", endDate);

    // 日付ごとにデータを集計
    const calendarData = new Map<string, {
        hasRequest: boolean;
        requestClosed: boolean;
        castCount: number;
        staffCount: number;
        requestDateId?: string;
        castConfirmed: number;
        castSubmitted: number;
        castNotSubmitted: number;
        staffConfirmed: number;
        staffSubmitted: number;
        staffNotSubmitted: number;
    }>();

    // 募集日付を先に登録
    if (requestDates) {
        for (const rd of requestDates) {
            const isOpen = (rd.shift_requests as any)?.status === "open";
            calendarData.set(rd.target_date, {
                hasRequest: isOpen,
                requestClosed: !isOpen,
                castCount: 0,
                staffCount: 0,
                requestDateId: rd.id,
                castConfirmed: 0,
                castSubmitted: 0,
                castNotSubmitted: 0,
                staffConfirmed: 0,
                staffSubmitted: 0,
                staffNotSubmitted: 0,
            });
        }
    }

    // work_records をカウント
    if (workRecords) {
        for (const record of workRecords) {
            const date = record.work_date;
            const role = record.profiles?.role;
            const isCast = role === "cast";
            const isStaff = role === "staff" || role === "admin";

            if (!calendarData.has(date)) {
                calendarData.set(date, {
                    hasRequest: false,
                    requestClosed: false,
                    castCount: 0,
                    staffCount: 0,
                    castConfirmed: 0,
                    castSubmitted: 0,
                    castNotSubmitted: 0,
                    staffConfirmed: 0,
                    staffSubmitted: 0,
                    staffNotSubmitted: 0,
                });
            }

            const existing = calendarData.get(date)!;
            const status = record.status;

            // pending = 提出済み（未確認）、scheduled/working/completed = 確定済み
            if (status === "pending") {
                // 提出済み（未確認）
                if (isCast) {
                    existing.castSubmitted++;
                } else if (isStaff) {
                    existing.staffSubmitted++;
                }
            } else {
                // 確定済み（scheduled/working/completed）
                if (isCast) {
                    existing.castCount++;
                    existing.castConfirmed++;
                } else if (isStaff) {
                    existing.staffCount++;
                    existing.staffConfirmed++;
                }
            }
        }
    }

    // shift_submissions（不可も含む）をカウント
    if (shiftSubmissions) {
        for (const submission of shiftSubmissions) {
            const date = (submission.shift_request_dates as any)?.target_date;
            if (!date) continue;

            const role = submission.profiles?.role;
            const isCast = role === "cast";
            const isStaff = role === "staff" || role === "admin";

            if (!calendarData.has(date)) {
                calendarData.set(date, {
                    hasRequest: true,
                    requestClosed: false,
                    castCount: 0,
                    staffCount: 0,
                    castConfirmed: 0,
                    castSubmitted: 0,
                    castNotSubmitted: 0,
                    staffConfirmed: 0,
                    staffSubmitted: 0,
                    staffNotSubmitted: 0,
                });
            }

            const existing = calendarData.get(date)!;

            // availability が available なら既存ロジック同様に提出済み扱い
            const isAvailable = submission.availability === "available";
            if (isAvailable) {
                if (isCast) {
                    existing.castSubmitted++;
                } else if (isStaff) {
                    existing.staffSubmitted++;
                }
            } else {
                // 不可回答も提出済みとしてカウント（不可は confirmed には加算しない）
                if (isCast) {
                    existing.castSubmitted++;
                } else if (isStaff) {
                    existing.staffSubmitted++;
                }
            }
        }
    }

    return Object.fromEntries(calendarData);
}

// 日付の出勤記録を取得（詳細モーダル用）
export async function getDateSubmissions(requestDateId: string) {
    const supabase = await createServerClient() as any;

    // 募集日付から日付と店舗を取得
    const { data: requestDate } = await supabase
        .from("shift_request_dates")
        .select(`
            id,
            target_date,
            shift_requests!inner(id, store_id, target_roles, target_profile_ids)
        `)
        .eq("id", requestDateId)
        .single();

    if (!requestDate) {
        return [];
    }

    const request = requestDate.shift_requests as any;
    const date = requestDate.target_date;

    // その日の出勤記録を取得
    const [{ data: workRecords }, { data: shiftSubmissions }] = await Promise.all([
        supabase
            .from("work_records")
            .select("*, profiles:profile_id(id, display_name, display_name_kana, avatar_url, role, line_is_friend)")
            .eq("store_id", request.store_id)
            .eq("work_date", date)
            .neq("status", "cancelled")
            .order("scheduled_start_time", { ascending: true }),
        supabase
            .from("shift_submissions")
            .select(`
                id,
                availability,
                status,
                request_date_id,
                shift_request_dates!inner(target_date, shift_requests!inner(store_id)),
                profiles:profile_id(id, display_name, display_name_kana, avatar_url, role, line_is_friend)
            `)
            .eq("shift_request_dates.target_date", date)
            .eq("shift_request_dates.shift_requests.store_id", request.store_id),
    ]);

    // 対象プロフィールを取得（未登録者の表示用）
    let profilesQuery = supabase
        .from("profiles")
        .select("id, display_name, display_name_kana, avatar_url, role, line_is_friend")
        .eq("store_id", request.store_id);

    if (request.target_profile_ids && request.target_profile_ids.length > 0) {
        profilesQuery = profilesQuery.in("id", request.target_profile_ids);
    } else if (request.target_roles && request.target_roles.length > 0) {
        const rolesFilter = request.target_roles.includes("staff")
            ? [...request.target_roles, "admin"]
            : request.target_roles;
        profilesQuery = profilesQuery.in("role", rolesFilter);
    }

    const { data: targetProfiles } = await profilesQuery;

    // 登録済みのプロフィールIDを取得（work_records だけでなく shift_submissions も）
    const registeredProfileIds = new Set([
        ...(workRecords?.map((r: any) => r.profile_id) || []),
        ...(shiftSubmissions?.map((s: any) => (s.profiles as any)?.id) || []),
    ]);

    // 未登録者を仮想的なレコードとして追加
    const notRegisteredProfiles = (targetProfiles || []).filter(
        (p: any) => !registeredProfileIds.has(p.id)
    );

    const notRegisteredRecords = notRegisteredProfiles.map((p: any) => ({
        id: `not_registered_${p.id}`,
        profile_id: p.id,
        store_id: request.store_id,
        work_date: date,
        scheduled_start_time: null,
        scheduled_end_time: null,
        shift_request_id: request.id,
        clock_in: null,
        clock_out: null,
        break_start: null,
        break_end: null,
        status: "not_submitted" as const,
        source: "shift_request" as const,
        approved_by: null,
        approved_at: null,
        note: null,
        pickup_required: false,
        pickup_destination: null,
        forgot_clockout: false,
        created_at: null,
        updated_at: null,
        profiles: {
            id: p.id,
            display_name: p.display_name,
            avatar_url: p.avatar_url,
            role: p.role,
            line_is_friend: p.line_is_friend,
        },
        // 旧インターフェース互換
        availability: null,
        preferred_start_time: null,
        preferred_end_time: null,
    }));

    // 既存レコードを旧インターフェースに変換
    const convertedRecords = (workRecords || []).map((r: any) => {
        // ステータス変換:
        // - pending = 提出済み（未確認）
        // - rejected = 否認
        // - scheduled/working/completed = 確定済み
        let convertedStatus: string;
        if (r.status === "pending") {
            convertedStatus = "pending"; // 提出済み
        } else if (r.status === "rejected") {
            convertedStatus = "rejected"; // 否認
        } else if (r.status === "scheduled" || r.status === "working" || r.status === "completed") {
            convertedStatus = "approved"; // 確定済み
        } else {
            convertedStatus = "pending"; // その他 = 提出済みとして扱う
        }

        return {
            ...r,
            // 旧インターフェース互換フィールド
            availability: "available",
            preferred_start_time: r.scheduled_start_time,
            preferred_end_time: r.scheduled_end_time,
            status: convertedStatus,
            shift_request_date_id: requestDateId,
        };
    });

    // shift_submissions から「不可」など work_records にない提出も表示（旧インターフェースに合わせる）
    const submissionRecords = (shiftSubmissions || [])
        .filter((s: any) => !(workRecords || []).some((r: any) => r.profile_id === (s.profiles as any)?.id))
        .map((s: any) => {
            const profile = s.profiles as any;
            return {
                id: `submission_${s.id}`,
                profile_id: profile?.id,
                store_id: request.store_id,
                work_date: date,
                scheduled_start_time: null,
                scheduled_end_time: null,
                shift_request_id: request.id,
                clock_in: null,
                clock_out: null,
                break_start: null,
                break_end: null,
                status: s.status === "rejected" ? "rejected" : "pending",
                source: "shift_request" as const,
                approved_by: null,
                approved_at: null,
                note: null,
                pickup_required: false,
                pickup_destination: null,
                forgot_clockout: false,
                created_at: null,
                updated_at: null,
                profiles: {
                    id: profile?.id,
                    display_name: profile?.display_name,
                    display_name_kana: profile?.display_name_kana,
                    avatar_url: profile?.avatar_url,
                    role: profile?.role,
                    line_is_friend: profile?.line_is_friend,
                },
                // 旧インターフェース互換
                availability: s.availability || "unavailable",
                preferred_start_time: null,
                preferred_end_time: null,
                shift_request_date_id: requestDateId,
            };
        });

    return [...convertedRecords, ...submissionRecords, ...notRegisteredRecords];
}

// 複数の募集日付の提出状況カウントを取得
export async function getRequestDateCounts(requestDateIds: string[]): Promise<{
    [dateId: string]: {
        pendingCount: number;
        notSubmittedCount: number;
        confirmedCount: number;
    };
}> {
    if (requestDateIds.length === 0) return {};

    const supabase = await createServerClient() as any;

    // 各日付の情報を取得
    const { data: requestDates } = await supabase
        .from("shift_request_dates")
        .select(`
            id,
            target_date,
            shift_requests!inner(id, store_id, target_roles, target_profile_ids)
        `)
        .in("id", requestDateIds);

    if (!requestDates || requestDates.length === 0) return {};

    const results: { [dateId: string]: { pendingCount: number; notSubmittedCount: number; confirmedCount: number } } = {};

    for (const rd of requestDates) {
        const request = rd.shift_requests as any;
        const date = rd.target_date;

        // 出勤記録を取得
        const { data: workRecords } = await supabase
            .from("work_records")
            .select("id, profile_id, status")
            .eq("store_id", request.store_id)
            .eq("work_date", date)
            .neq("status", "cancelled");

        // 対象プロフィール取得
        let profilesQuery = supabase
            .from("profiles")
            .select("id, role")
            .eq("store_id", request.store_id)
            .in("status", ["在籍中", "体入"]);

        if (request.target_roles && request.target_roles.length > 0) {
            profilesQuery = profilesQuery.in("role", request.target_roles);
        }
        if (request.target_profile_ids && request.target_profile_ids.length > 0) {
            profilesQuery = profilesQuery.in("id", request.target_profile_ids);
        }

        const { data: profiles } = await profilesQuery;

        const workRecordProfileIds = new Set((workRecords || []).map((r: any) => r.profile_id));

        let pendingCount = 0;
        let confirmedCount = 0;
        let notSubmittedCount = 0;

        // 出勤記録のステータスをカウント
        for (const r of workRecords || []) {
            if (r.status === "pending") {
                pendingCount++;
            } else if (r.status === "scheduled" || r.status === "working" || r.status === "completed") {
                confirmedCount++;
            }
        }

        // 未提出（出勤記録がないプロフィール）をカウント
        for (const p of profiles || []) {
            if (!workRecordProfileIds.has(p.id)) {
                notSubmittedCount++;
            }
        }

        results[rd.id] = { pendingCount, notSubmittedCount, confirmedCount };
    }

    return results;
}

// シフト（出勤予定）を承認・作成
export async function approveSubmission(
    submissionId: string,
    approvedBy: string,
    startTime?: string,
    endTime?: string
) {
    // submissionId が "not_registered_" で始まる場合は新規作成
    if (submissionId.startsWith("not_registered_")) {
        return { success: false, error: "未登録ユーザーへの直接承認はできません" };
    }

    const supabase = await createServerClient() as any;

    // work_record のステータスと時間を更新
    const { error } = await supabase
        .from("work_records")
        .update({
            status: "scheduled",
            scheduled_start_time: startTime || null,
            scheduled_end_time: endTime || null,
            approved_by: approvedBy,
            approved_at: new Date().toISOString(),
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

// シフトを却下（否認）
export async function rejectSubmission(submissionId: string, approvedBy: string) {
    const supabase = await createServerClient() as any;

    const { error } = await supabase
        .from("work_records")
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

// シフトを提出済み（pending）に戻す
export async function revertSubmissionToPending(submissionId: string) {
    const supabase = await createServerClient() as any;

    const { error } = await supabase
        .from("work_records")
        .update({
            status: "pending",
            approved_by: null,
            approved_at: null,
            updated_at: new Date().toISOString(),
        })
        .eq("id", submissionId);

    if (error) {
        console.error("Error reverting submission to pending:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/app/shifts");
    return { success: true };
}

// 一括承認
export async function approveAllSubmissions(requestDateId: string, approvedBy: string) {
    const supabase = await createServerClient() as any;

    // 募集日付から日付と店舗を取得
    const { data: requestDate } = await supabase
        .from("shift_request_dates")
        .select(`
            id,
            target_date,
            shift_requests!inner(id, store_id)
        `)
        .eq("id", requestDateId)
        .single();

    if (!requestDate) {
        return { success: false, error: "Request date not found" };
    }

    const request = requestDate.shift_requests as any;
    const date = requestDate.target_date;

    // その日の未承認work_recordsを取得
    const { data: records } = await supabase
        .from("work_records")
        .select("id")
        .eq("store_id", request.store_id)
        .eq("work_date", date)
        .is("approved_at", null)
        .neq("status", "cancelled");

    if (!records || records.length === 0) {
        return { success: true, count: 0 };
    }

    // 一括承認
    const { error } = await supabase
        .from("work_records")
        .update({
            approved_by: approvedBy,
            approved_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .in("id", records.map((r: any) => r.id));

    if (error) {
        console.error("Error approving all submissions:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/app/shifts");
    return { success: true, count: records.length };
}

// シフト時間を更新
export async function updateSubmissionTime(
    submissionId: string,
    startTime: string,
    endTime: string
) {
    const supabase = await createServerClient() as any;

    const { error } = await supabase
        .from("work_records")
        .update({
            scheduled_start_time: startTime,
            scheduled_end_time: endTime,
            updated_at: new Date().toISOString(),
        })
        .eq("id", submissionId);

    if (error) {
        console.error("Error updating submission time:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/app/shifts");
    return { success: true };
}

// 既存の募集との重複をチェック
export async function checkExistingRequestConflicts(
    storeId: string,
    profileIds: string[],
    dates: string[]
) {
    const supabase = await createServerClient() as any;

    // 指定されたプロフィールIDと日付で既にwork_recordsがあるかチェック
    const { data, error } = await supabase
        .from("work_records")
        .select(`
            profile_id,
            work_date,
            profiles:profile_id(display_name)
        `)
        .eq("store_id", storeId)
        .in("profile_id", profileIds)
        .in("work_date", dates)
        .neq("status", "cancelled");

    if (error) {
        console.error("Error checking conflicts:", error);
        return { conflicts: [], error: error.message };
    }

    // 重複しているプロフィールと日付の組み合わせを返す
    const conflicts = (data || []).map((d: any) => ({
        profileId: d.profile_id,
        profileName: d.profiles?.display_name || "名前なし",
        date: d.work_date,
    }));
    return { conflicts };
}

// =====================================================
// 店舗設定
// =====================================================

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

// =====================================================
// 自動化設定
// =====================================================

export async function getAutomationSettings(storeId: string) {
    const supabase = await createServerClient() as any;

    const { data, error } = await supabase
        .from("stores")
        .select(`
            shift_automation_enabled,
            shift_automation_target_roles,
            shift_automation_period_type,
            shift_automation_send_day_offset,
            shift_automation_send_hour,
            shift_automation_reminder_enabled,
            shift_automation_reminder_day_offset,
            shift_automation_reminder_hour
        `)
        .eq("id", storeId)
        .single();

    if (error) {
        console.error("Error fetching automation settings:", error);
        return null;
    }

    return {
        enabled: data?.shift_automation_enabled ?? false,
        target_roles: data?.shift_automation_target_roles ?? ["cast", "staff"],
        period_type: data?.shift_automation_period_type ?? "week",
        send_day_offset: data?.shift_automation_send_day_offset ?? 7,
        send_hour: data?.shift_automation_send_hour ?? 10,
        reminder_enabled: data?.shift_automation_reminder_enabled ?? false,
        reminder_day_offset: data?.shift_automation_reminder_day_offset ?? 1,
        reminder_hour: data?.shift_automation_reminder_hour ?? 10,
    };
}

export async function updateAutomationSettings(
    storeId: string,
    settings: {
        enabled: boolean;
        target_roles: string[];
        period_type: "week" | "half_month" | "month";
        send_day_offset: number;
        send_hour: number;
        reminder_enabled: boolean;
        reminder_day_offset: number;
        reminder_hour: number;
    }
) {
    const supabase = await createServerClient() as any;

    const { error } = await supabase
        .from("stores")
        .update({
            shift_automation_enabled: settings.enabled,
            shift_automation_target_roles: settings.target_roles,
            shift_automation_period_type: settings.period_type,
            shift_automation_send_day_offset: settings.send_day_offset,
            shift_automation_send_hour: settings.send_hour,
            shift_automation_reminder_enabled: settings.reminder_enabled,
            shift_automation_reminder_day_offset: settings.reminder_day_offset,
            shift_automation_reminder_hour: settings.reminder_hour,
            updated_at: new Date().toISOString(),
        })
        .eq("id", storeId);

    if (error) {
        console.error("Error updating automation settings:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/app/shifts");
    return { success: true };
}

// =====================================================
// LINE通知
// =====================================================

export async function getLineTargetProfiles(
    storeId: string,
    targetRoles: string[],
    targetProfileIds?: string[]
) {
    const supabase = await createServerClient() as any;

    let query = supabase
        .from("profiles")
        .select("id, display_name, avatar_url, role, line_user_id, line_is_friend")
        .eq("store_id", storeId);

    if (targetProfileIds && targetProfileIds.length > 0) {
        query = query.in("id", targetProfileIds);
    } else if (targetRoles && targetRoles.length > 0) {
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
    const linkedProfiles = profiles.filter((p: any) => p.line_is_friend === true);
    const unlinkedProfiles = profiles.filter((p: any) => p.line_is_friend !== true);

    return {
        profiles,
        linkedProfiles,
        unlinkedProfiles,
        linkedCount: linkedProfiles.length,
        unlinkedCount: unlinkedProfiles.length,
    };
}

export async function sendLineNotification(requestId: string, storeName: string) {
    const supabase = await createServerClient() as any;

    const { data: request, error: requestError } = await supabase
        .from("shift_requests")
        .select("*, shift_request_dates(*)")
        .eq("id", requestId)
        .single();

    if (requestError || !request) {
        return { success: false, error: "Shift request not found" };
    }

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

    const deadline = new Date(request.deadline);
    const deadlineText = deadline.toLocaleString("ja-JP", {
        timeZone: "Asia/Tokyo",
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

    const message = `【${storeName}】シフト募集

${request.title}

対象期間: ${dateRangeText}
提出期限: ${deadlineText}

アプリからシフト希望を提出してください。`;

    try {
        const response = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/line-send-message`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                },
                body: JSON.stringify({ lineUserIds, message }),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error("LINE send error:", errorText);
            return { success: false, error: errorText, unlinkedProfiles };
        }

        await supabase
            .from("shift_requests")
            .update({
                line_notification_sent: true,
                line_notification_sent_at: new Date().toISOString()
            })
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

// =====================================================
// グリッド表示用
// =====================================================

export interface GridCellData {
    status: "scheduled" | "working" | "completed" | "absent" | "cancelled" | "pending" | "rejected" | "none";
    startTime: string | null;
    endTime: string | null;
    recordId: string | null;
}

export interface GridData {
    profiles: Array<{
        id: string;
        display_name: string | null;
        avatar_url: string | null;
        role: string;
        status: string | null;
    }>;
    dates: string[];
    cells: Record<string, Record<string, GridCellData>>; // cells[profileId][date]
    requestDateIds: Record<string, string>; // requestDateIds[date] = requestDateId
}

// グリッド表示用のデータを取得
export async function getGridData(
    storeId: string,
    year: number,
    month: number,
    roleFilter?: "cast" | "staff" | "all"
): Promise<GridData> {
    const supabase = await createServerClient() as any;

    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    // 日付リストを生成
    const dates: string[] = [];
    for (let d = 1; d <= lastDay; d++) {
        dates.push(`${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
    }

    // プロフィールを取得（在籍中・体入のみ）
    let profileQuery = supabase
        .from("profiles")
        .select("id, display_name, avatar_url, role, status")
        .eq("store_id", storeId)
        .in("status", ["在籍中", "体入"])
        .in("role", ["cast", "staff", "admin"])
        .order("role", { ascending: true })
        .order("display_name", { ascending: true });

    if (roleFilter === "cast") {
        profileQuery = supabase
            .from("profiles")
            .select("id, display_name, avatar_url, role, status")
            .eq("store_id", storeId)
            .in("status", ["在籍中", "体入"])
            .eq("role", "cast")
            .order("display_name", { ascending: true });
    } else if (roleFilter === "staff") {
        profileQuery = supabase
            .from("profiles")
            .select("id, display_name, avatar_url, role, status")
            .eq("store_id", storeId)
            .in("status", ["在籍中", "体入"])
            .in("role", ["staff", "admin"])
            .order("display_name", { ascending: true });
    }

    const { data: profiles } = await profileQuery;

    // work_records を取得
    const { data: workRecords } = await supabase
        .from("work_records")
        .select("id, profile_id, work_date, scheduled_start_time, scheduled_end_time, status")
        .eq("store_id", storeId)
        .gte("work_date", startDate)
        .lte("work_date", endDate)
        .neq("status", "cancelled");

    // セルデータを構築
    const cells: Record<string, Record<string, GridCellData>> = {};

    for (const profile of profiles || []) {
        cells[profile.id] = {};
        for (const date of dates) {
            cells[profile.id][date] = {
                status: "none",
                startTime: null,
                endTime: null,
                recordId: null,
            };
        }
    }

    for (const record of workRecords || []) {
        if (cells[record.profile_id] && cells[record.profile_id][record.work_date]) {
            cells[record.profile_id][record.work_date] = {
                status: record.status,
                startTime: record.scheduled_start_time,
                endTime: record.scheduled_end_time,
                recordId: record.id,
            };
        }
    }

    // shift_request_dates を取得してマッピングを作成
    const { data: requestDates } = await supabase
        .from("shift_request_dates")
        .select("id, target_date, shift_requests!inner(store_id)")
        .eq("shift_requests.store_id", storeId)
        .gte("target_date", startDate)
        .lte("target_date", endDate);

    const requestDateIds: Record<string, string> = {};
    for (const rd of requestDates || []) {
        requestDateIds[rd.target_date] = rd.id;
    }

    return {
        profiles: profiles || [],
        dates,
        cells,
        requestDateIds,
    };
}
