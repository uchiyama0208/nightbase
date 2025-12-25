"use server";

import { getAuthContext, getAuthContextForPage } from "@/lib/auth-helpers";
import { createServiceRoleClient } from "@/lib/supabaseServiceClient";
import { revalidatePath } from "next/cache";
import type { AttendanceRecord, AttendanceDataResult, AttendanceRoleFilter, AttendancePayload } from "./types";

// ============================================
// タイムカード質問関連の型
// ============================================

export interface TimecardQuestion {
    id: string;
    label: string;
    field_type: string;
    options: string[] | null;
    is_required: boolean;
    target_role: string;
    timing: string;
    sort_order: number;
}

export interface TimecardQuestionAnswer {
    question_id: string;
    value: string;
    timing: string;
}

// Helper to get or create a pickup destination
async function getOrCreatePickupDestination(
    supabase: any,
    storeId: string,
    destinationName: string
): Promise<string | null> {
    if (!destinationName || !destinationName.trim()) {
        return null;
    }

    const name = destinationName.trim();

    // Check if destination already exists
    const { data: existing } = await supabase
        .from("pickup_destinations")
        .select("id")
        .eq("store_id", storeId)
        .eq("name", name)
        .maybeSingle();

    if (existing) {
        return existing.id;
    }

    // Create new destination
    const { data: newDest, error } = await supabase
        .from("pickup_destinations")
        .insert({
            store_id: storeId,
            name: name,
        })
        .select("id")
        .single();

    if (error) {
        console.error("Error creating pickup destination:", error);
        return null;
    }

    return newDest.id;
}

// ============================================
// ユーティリティ関数
// ============================================

/**
 * HH:MM または HH:MM:SS 形式の時刻を ISO 文字列に変換
 * @param timeStr 時刻文字列
 * @param dateStr 日付文字列（YYYY-MM-DD）
 * @returns ISO形式のタイムスタンプ または null
 */
function timeToISO(timeStr: string | null, dateStr: string): string | null {
    if (!timeStr) return null;
    const normalized = /^\d{2}:\d{2}$/.test(timeStr) ? `${timeStr}:00` : timeStr;
    // JST (+09:00) として解釈
    return new Date(`${dateStr}T${normalized}+09:00`).toISOString();
}

/**
 * 時刻文字列を正規化（HH:MM または HH:MM:SS）
 */
function normalizeTime(value: string | undefined): string | null {
    const v = (value || "").trim();
    if (!v) return null;
    if (/^\d{2}:\d{2}$/.test(v)) return `${v}:00`;
    if (/^\d{2}:\d{2}:\d{2}$/.test(v)) return v;
    return null;
}

/**
 * ISO 文字列を HH:MM 形式に変換
 */
function formatTimeStr(isoStr: string | null): string | null {
    if (!isoStr) return null;
    const date = new Date(isoStr);
    return date.toLocaleTimeString("ja-JP", {
        timeZone: "Asia/Tokyo",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
}

// ============================================
// 勤怠作成・更新・削除
// ============================================

/**
 * 勤怠レコードを作成
 */
export async function createAttendance(formData: FormData): Promise<{ success: boolean; workRecordId?: string }> {
    const { supabase, storeId, profileId: currentProfileId } = await getAuthContext();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const serviceSupabase = createServiceRoleClient() as any;

    const targetProfileId = (formData.get("profileId") as string | null) ?? currentProfileId;

    // profileIdが空の場合はエラー
    if (!targetProfileId) {
        throw new Error("メンバーを選択してください");
    }

    // 対象プロフィールが同じ店舗に属しているか確認
    const { data: targetProfile } = await supabase
        .from("profiles")
        .select("id, store_id")
        .eq("id", targetProfileId)
        .maybeSingle();

    if (!targetProfile || targetProfile.store_id !== storeId) {
        throw new Error("選択されたプロフィールはこの店舗に所属していません");
    }

    const date = formData.get("date") as string;
    const status = formData.get("status") as string;
    const startTime = formData.get("startTime") as string;
    const endTime = formData.get("endTime") as string;
    const pickupDestination = formData.get("pickup_destination") as string;

    // Get or create pickup destination
    const pickupDestinationId = pickupDestination
        ? await getOrCreatePickupDestination(supabase, storeId, pickupDestination)
        : null;

    // ペイロードを作成
    const payload: AttendancePayload = {
        profile_id: targetProfileId,
        store_id: storeId,
        work_date: date,
        pickup_destination_id: pickupDestinationId,
        pickup_required: !!pickupDestination,
        clock_in: null,
        clock_out: null,
        source: "timecard",
    };

    // 開始時刻の設定
    if (startTime) {
        const clockInTime = timeToISO(startTime, date);
        payload.clock_in = clockInTime;
        // scheduled_start_time は time型なので HH:MM:SS 形式で渡す
        payload.scheduled_start_time = normalizeTime(startTime);
        payload.status = "working";
    } else if (status === "working" || status === "finished") {
        const clockInTime = new Date(`${date}T00:00:00+09:00`).toISOString();
        payload.clock_in = clockInTime;
        payload.scheduled_start_time = "00:00:00";
        payload.status = "working";
    } else {
        payload.clock_in = null;
        payload.scheduled_start_time = null;
        payload.status = "scheduled";
    }

    // 終了時刻の設定
    if (endTime) {
        const clockOutTime = timeToISO(endTime, date);
        payload.clock_out = clockOutTime;
        // scheduled_end_time は time型なので HH:MM:SS 形式で渡す
        payload.scheduled_end_time = normalizeTime(endTime);
        payload.status = "completed";
    } else if (status === "finished") {
        const clockOutTime = new Date(`${date}T23:59:59+09:00`).toISOString();
        payload.clock_out = clockOutTime;
        payload.scheduled_end_time = "23:59:59";
        payload.status = "completed";
    } else {
        payload.clock_out = null;
        payload.scheduled_end_time = null;
    }

    // Service Role Clientを使用してRLSをバイパス（管理者が他のメンバーの勤怠を作成するため）
    const { data, error } = await serviceSupabase.from("work_records").insert(payload).select("id").single();

    if (error) {
        console.error("Error creating work record:", error);
        throw new Error(`勤怠の作成に失敗しました: ${error.message}`);
    }

    revalidatePath("/app/attendance");
    return { success: true, workRecordId: data?.id };
}

/**
 * 勤怠レコードを更新
 */
export async function updateAttendance(formData: FormData): Promise<{ success: boolean }> {
    const { supabase, storeId, profileId: currentProfileId } = await getAuthContext();
    const serviceSupabase = createServiceRoleClient();

    const id = formData.get("id") as string;
    const profileId = formData.get("profileId") as string;
    const date = formData.get("date") as string;
    const startTime = formData.get("startTime") as string;
    const endTime = formData.get("endTime") as string;
    const pickupDestination = formData.get("pickup_destination") as string;

    if (!id) {
        throw new Error("勤怠IDが必要です");
    }

    // 対象プロフィールが同じ店舗に属しているか確認
    if (profileId) {
        const { data: targetProfile } = await supabase
            .from("profiles")
            .select("id, store_id")
            .eq("id", profileId)
            .maybeSingle();

        if (!targetProfile || targetProfile.store_id !== storeId) {
            throw new Error("選択されたプロフィールはこの店舗に所属していません");
        }
    }

    // Get or create pickup destination
    const pickupDestinationId = pickupDestination
        ? await getOrCreatePickupDestination(supabase, storeId, pickupDestination)
        : null;

    // ペイロードを作成
    const payload: Partial<AttendancePayload> = {
        profile_id: profileId || currentProfileId,
        work_date: date,
        pickup_destination_id: pickupDestinationId,
        pickup_required: !!pickupDestination,
        clock_in: startTime ? timeToISO(startTime, date) : null,
        clock_out: endTime ? timeToISO(endTime, date) : null,
    };

    if (startTime) {
        // scheduled_start_time は time型なので HH:MM:SS 形式で渡す
        payload.scheduled_start_time = normalizeTime(startTime);
    } else {
        payload.scheduled_start_time = null;
    }

    if (endTime) {
        // scheduled_end_time は time型なので HH:MM:SS 形式で渡す
        payload.scheduled_end_time = normalizeTime(endTime);
        payload.status = "completed";
    } else if (startTime) {
        payload.status = "working";
    } else {
        payload.scheduled_end_time = null;
    }

    const { error } = await (serviceSupabase as any)
        .from("work_records")
        .update(payload)
        .eq("id", id);

    if (error) {
        console.error("Error updating work record:", error);
        throw new Error(`勤怠の更新に失敗しました: ${error.message}`);
    }

    revalidatePath("/app/attendance");
    return { success: true };
}

/**
 * 勤怠レコードを削除
 */
export async function deleteAttendance(id: string): Promise<{ success: boolean }> {
    const { supabase, storeId } = await getAuthContext();

    if (!id) {
        throw new Error("勤怠IDが必要です");
    }

    // 勤務記録を取得
    const { data: workRecord } = await supabase
        .from("work_records")
        .select("profile_id")
        .eq("id", id)
        .maybeSingle();

    if (!workRecord) {
        throw new Error("勤怠レコードが見つかりません");
    }

    // 対象プロフィールが同じ店舗に属しているか確認
    const { data: targetProfile } = await supabase
        .from("profiles")
        .select("store_id")
        .eq("id", workRecord.profile_id)
        .maybeSingle();

    if (!targetProfile || targetProfile.store_id !== storeId) {
        throw new Error("他の店舗の勤怠を削除することはできません");
    }

    const { error } = await supabase
        .from("work_records")
        .delete()
        .eq("id", id);

    if (error) {
        console.error("Error deleting work record:", error);
        throw new Error("勤怠の削除に失敗しました");
    }

    revalidatePath("/app/attendance");
    return { success: true };
}

// ============================================
// CSVインポート
// ============================================

export interface AttendanceImportResult {
    success: boolean;
    imported: number;
    skipped: number;
    duplicates: number;
    errors: { row: number; field: string; message: string }[];
}

/**
 * CSVから勤怠データをインポート
 */
export async function importAttendanceFromCsv(formData: FormData): Promise<AttendanceImportResult> {
    const file = formData.get("file") as File | null;
    if (!file) {
        return { success: false, imported: 0, skipped: 0, duplicates: 0, errors: [{ row: 0, field: "", message: "CSVファイルが指定されていません" }] };
    }

    const roleFilter = (formData.get("attendanceRole") as string | null) ?? null;
    const mappingsJson = formData.get("mappings") as string | null;
    const { supabase, storeId } = await getAuthContext();

    // 店舗のプロフィールを取得(名前 -> ID のマップを作成)
    const { data: storeProfiles } = await supabase
        .from("profiles")
        .select("id, display_name, role")
        .eq("store_id", storeId);

    const nameToProfileId = new Map<string, string | null>();
    for (const p of storeProfiles || []) {
        const displayName = ((p.display_name as string) || "").trim().toLowerCase();
        if (!displayName) continue;

        const role = p.role as string | null;
        if (roleFilter === "cast" && role !== "cast") continue;
        if (roleFilter === "staff" && role !== "staff") continue;

        if (!nameToProfileId.has(displayName)) {
            nameToProfileId.set(displayName, p.id as string);
        } else {
            nameToProfileId.set(displayName, null); // 重複は null
        }
    }

    // CSVをパース
    const text = await file.text();
    // Remove BOM if present
    const cleanText = text.replace(/^\uFEFF/, "");
    const lines = cleanText.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0);
    if (lines.length < 2) {
        return { success: false, imported: 0, skipped: 0, duplicates: 0, errors: [{ row: 0, field: "", message: "CSVに有効なデータ行がありません" }] };
    }

    const header = lines[0].split(",").map((h) => h.trim());

    // Use mappings if provided, otherwise fall back to direct column names
    let colIndex: Record<string, number>;
    if (mappingsJson) {
        const mappings = JSON.parse(mappingsJson) as Record<string, string>;
        colIndex = {
            display_name: mappings.display_name ? header.indexOf(mappings.display_name) : -1,
            date: mappings.date ? header.indexOf(mappings.date) : -1,
            status: mappings.status ? header.indexOf(mappings.status) : -1,
            start_time: mappings.start_time ? header.indexOf(mappings.start_time) : -1,
            end_time: mappings.end_time ? header.indexOf(mappings.end_time) : -1,
        };
    } else {
        colIndex = {
            display_name: header.indexOf("display_name"),
            date: header.indexOf("date"),
            status: header.indexOf("status"),
            start_time: header.indexOf("start_time"),
            end_time: header.indexOf("end_time"),
        };
    }

    if (colIndex.display_name === -1 || colIndex.date === -1 || colIndex.status === -1) {
        const missing: string[] = [];
        if (colIndex.display_name === -1) missing.push("ユーザー名");
        if (colIndex.date === -1) missing.push("日付");
        if (colIndex.status === -1) missing.push("ステータス");
        return { success: false, imported: 0, skipped: 0, duplicates: 0, errors: [{ row: 0, field: "", message: `必須項目がマッピングされていません: ${missing.join(", ")}` }] };
    }

    const toInsert: AttendancePayload[] = [];
    const errors: { row: number; field: string; message: string }[] = [];
    let skipped = 0;
    let notFound = 0;

    for (let i = 1; i < lines.length; i++) {
        const columns = lines[i].split(",");
        const nameRaw = (columns[colIndex.display_name] || "").trim();
        const date = (columns[colIndex.date] || "").trim();
        const status = (columns[colIndex.status] || "").trim();

        if (!nameRaw) {
            skipped++;
            errors.push({ row: i + 1, field: "display_name", message: "ユーザー名が空です" });
            continue;
        }
        if (!date) {
            skipped++;
            errors.push({ row: i + 1, field: "date", message: "日付が空です" });
            continue;
        }
        if (!status) {
            skipped++;
            errors.push({ row: i + 1, field: "status", message: "ステータスが空です" });
            continue;
        }

        const key = nameRaw.toLowerCase();
        const profileId = nameToProfileId.get(key);
        if (!profileId) {
            notFound++;
            errors.push({ row: i + 1, field: "display_name", message: `ユーザー "${nameRaw}" が見つかりません` });
            continue;
        }

        const startTime = colIndex.start_time !== -1 ? columns[colIndex.start_time] : undefined;
        const endTime = colIndex.end_time !== -1 ? columns[colIndex.end_time] : undefined;

        const payload: AttendancePayload = {
            profile_id: profileId,
            store_id: storeId,
            work_date: date,
            pickup_destination_id: null,
            clock_in: null,
            clock_out: null,
            source: "timecard",
            status: "scheduled",
        };

        if (status === "working" || status === "finished") {
            const normalizedStart = normalizeTime(startTime);
            payload.clock_in = normalizedStart
                ? new Date(`${date}T${normalizedStart}`).toISOString()
                : new Date(`${date}T00:00:00`).toISOString();
            payload.status = "working";
        }

        if (status === "finished") {
            const normalizedEnd = normalizeTime(endTime);
            payload.clock_out = normalizedEnd
                ? new Date(`${date}T${normalizedEnd}`).toISOString()
                : new Date(`${date}T23:59:59`).toISOString();
            payload.status = "completed";
        }

        toInsert.push(payload);
    }

    if (toInsert.length === 0) {
        revalidatePath("/app/attendance");
        return { success: true, imported: 0, skipped, duplicates: notFound, errors };
    }

    const { error } = await supabase.from("work_records").insert(toInsert);

    if (error) {
        console.error("Error importing work records from CSV:", error);
        return { success: false, imported: 0, skipped, duplicates: notFound, errors: [{ row: 0, field: "", message: "CSVのインポート中にエラーが発生しました" }] };
    }

    revalidatePath("/app/attendance");
    return { success: true, imported: toInsert.length, skipped, duplicates: notFound, errors };
}

// ============================================
// データ取得
// ============================================

/**
 * プロフィールの勤怠履歴を取得
 */
export async function getAttendanceRecords(profileId: string) {
    // 勤怠閲覧はスタッフ/管理者のみ許可し、同一店舗のプロフィールに限定する
    const { supabase, storeId, role } = await getAuthContext({ requireStaff: true });

    // 対象プロフィールが同一店舗か確認
    const { data: targetProfile } = await supabase
        .from("profiles")
        .select("id, store_id")
        .eq("id", profileId)
        .maybeSingle();

    if (!targetProfile || targetProfile.store_id !== storeId) {
        throw new Error("アクセス権限がありません");
    }

    const { data: records, error } = await supabase
        .from("work_records")
        .select("*")
        .eq("profile_id", profileId)
        .neq("status", "cancelled")
        .order("work_date", { ascending: false });

    if (error) {
        console.error("Error fetching attendance records:", error);
        throw new Error("勤怠履歴の取得に失敗しました");
    }

    return records;
}

/**
 * 勤怠一覧ページ用のデータを取得
 */
export async function getAttendanceData(
    roleParam?: string
): Promise<AttendanceDataResult> {
    const result = await getAuthContextForPage({ requireStaff: true });

    if ("redirect" in result) {
        return { redirect: result.redirect };
    }

    const { context } = result;
    const { supabase, storeId } = context;

    // 店舗設定を確認
    const { data: settings } = await supabase
        .from("store_settings")
        .select("show_attendance")
        .eq("store_id", storeId)
        .single();

    if (settings && settings.show_attendance === false) {
        return { redirect: "/app/timecard" };
    }

    const roleFilter: AttendanceRoleFilter = roleParam === "staff" ? "staff" : "cast";

    // 店舗のプロフィールを取得
    const { data: storeProfiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, display_name, real_name, role, store_id")
        .eq("store_id", storeId);

    if (profilesError) {
        console.error("Error fetching store profiles:", profilesError);
    }

    const allProfiles = storeProfiles || [];
    const profileMap: Record<string, any> = {};
    const profileIds: string[] = [];

    for (const p of allProfiles) {
        profileMap[p.id] = p;
        profileIds.push(p.id);
    }

    // 過去30日間の勤務記録を取得
    const serviceSupabase = createServiceRoleClient();
    const today = new Date();
    const from = new Date();
    from.setDate(today.getDate() - 30);
    const fromStr = from.toISOString().split("T")[0];

    let allRecords: AttendanceRecord[] = [];

    if (profileIds.length > 0) {
        const { data: workRecordRows, error: workRecordsError } = await (serviceSupabase as any)
            .from("work_records")
            .select("id, profile_id, work_date, clock_in, clock_out, scheduled_start_time, scheduled_end_time, forgot_clockout, pickup_destination_id, status, pickup_destinations(id, name)")
            .in("profile_id", profileIds)
            .gte("work_date", fromStr)
            .order("work_date", { ascending: false });

        if (workRecordsError) {
            console.error("Error fetching work records for attendance:", workRecordsError);
        } else {
            const workRecords = (workRecordRows || []) as any[];

            allRecords = workRecords.map((wr) => {
                let status: AttendanceRecord["status"] = "scheduled";
                if (wr.forgot_clockout) {
                    status = "forgot_clockout";
                } else if (wr.clock_out || wr.status === "completed") {
                    status = "finished";
                } else if (wr.clock_in || wr.status === "working") {
                    status = "working";
                }

                const prof = profileMap[wr.profile_id];

                return {
                    id: wr.id,
                    profile_id: wr.profile_id,
                    date: wr.work_date,
                    name: prof ? prof.display_name : "不明",
                    status,
                    start_time: formatTimeStr(wr.clock_in) || wr.scheduled_start_time?.slice(0, 5) || null,
                    end_time: formatTimeStr(wr.clock_out) || wr.scheduled_end_time?.slice(0, 5) || null,
                    clock_in: formatTimeStr(wr.clock_in),
                    clock_out: formatTimeStr(wr.clock_out),
                    pickup_destination: wr.pickup_destinations?.name || null,
                };
            });

            // 日付・時刻で降順ソート
            allRecords.sort((a, b) => {
                if (a.date !== b.date) return b.date.localeCompare(a.date);
                const aTime = a.clock_in || "";
                const bTime = b.clock_in || "";
                return bTime.localeCompare(aTime);
            });
        }
    }

    return {
        data: {
            allRecords,
            allProfiles,
            roleFilter,
        }
    };
}

/**
 * 勤怠ページ用の初期データを取得（クライアントサイドフェッチ用）
 */
export async function getAttendancePageData() {
    const result = await getAuthContextForPage({ requireStaff: true });

    if ("redirect" in result) {
        return { redirect: result.redirect };
    }

    const { context } = result;
    const { supabase, storeId, role } = context;

    // 店舗設定を確認
    const { data: settings } = await supabase
        .from("store_settings")
        .select("show_attendance, day_switch_time, pickup_enabled_cast, pickup_enabled_staff, show_break_columns")
        .eq("store_id", storeId)
        .single();

    if (settings && settings.show_attendance === false) {
        return { redirect: "/app/timecard" };
    }

    const daySwitchTime = settings?.day_switch_time || "05:00";
    const pickupEnabledCast = settings?.pickup_enabled_cast ?? false;
    const pickupEnabledStaff = settings?.pickup_enabled_staff ?? false;
    const showBreakColumns = settings?.show_break_columns ?? false;

    // 店舗のプロフィールを取得（在籍中・体入のみ）
    const { data: storeProfiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, display_name, display_name_kana, real_name, role, status")
        .eq("store_id", storeId)
        .in("status", ["在籍中", "体入"])
        .order("display_name");

    if (profilesError) {
        console.error("Error fetching store profiles:", profilesError);
    }

    const allProfiles = storeProfiles || [];
    const profileMap: Record<string, any> = {};
    const profileIds: string[] = [];

    for (const p of allProfiles) {
        profileMap[p.id] = p;
        profileIds.push(p.id);
    }

    // 勤務記録を取得
    const serviceSupabase = createServiceRoleClient();

    let allRecords: AttendanceRecord[] = [];

    // 承認済みシフト予定を取得（work_recordsに未登録のもの）
    // まず今日以降のシフト提出で承認済みのものを取得
    const today = new Date().toISOString().split("T")[0];

    const { data: approvedShifts } = await (serviceSupabase as any)
        .from("shift_submissions")
        .select(`
            id,
            profile_id,
            status,
            approved_start_time,
            approved_end_time,
            preferred_start_time,
            preferred_end_time,
            shift_request_dates!inner(
                target_date,
                default_start_time,
                default_end_time,
                shift_requests!inner(
                    store_id
                )
            )
        `)
        .eq("status", "approved")
        .eq("shift_request_dates.shift_requests.store_id", storeId)
        .gte("shift_request_dates.target_date", today);

    // 既存のwork_recordsを取得して、どの日付・プロフィールが既に登録済みか確認するためのセット
    const existingWorkRecordKeys = new Set<string>();

    if (profileIds.length > 0) {
        const { data: workRecordRows, error: workRecordsError } = await (serviceSupabase as any)
            .from("work_records")
            .select("id, profile_id, work_date, clock_in, clock_out, scheduled_start_time, scheduled_end_time, forgot_clockout, pickup_destination_id, status, pickup_destinations(id, name)")
            .in("profile_id", profileIds)
            .neq("status", "cancelled")
            .order("work_date", { ascending: false })
            .order("clock_in", { ascending: false });

        if (workRecordsError) {
            console.error("Error fetching work records for attendance:", workRecordsError);
        } else {
            const workRecords = (workRecordRows || []) as any[];

            // Fetch break counts for all work records (if showBreakColumns is enabled)
            let breakCountMap = new Map<string, number>();
            if (showBreakColumns && workRecords.length > 0) {
                try {
                    const workRecordIds = workRecords.map((wr: any) => wr.id);
                    const { data: breaksData, error: breaksError } = await (serviceSupabase as any)
                        .from("work_record_breaks")
                        .select("work_record_id")
                        .in("work_record_id", workRecordIds);

                    if (breaksError) {
                        console.error("Error fetching breaks:", breaksError);
                    } else if (breaksData) {
                        for (const b of breaksData) {
                            const count = breakCountMap.get(b.work_record_id) || 0;
                            breakCountMap.set(b.work_record_id, count + 1);
                        }
                    }
                } catch (error) {
                    console.error("Exception fetching breaks:", error);
                }
            }

            // 現在のJST日時を取得して営業日を計算
            const now = new Date();
            const jstNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
            const currentHour = jstNow.getHours();
            const currentMinute = jstNow.getMinutes();

            const [switchHour, switchMinute] = daySwitchTime.split(":").map(Number);

            let todayBusinessDate = new Date(jstNow);
            if (currentHour < switchHour || (currentHour === switchHour && currentMinute < switchMinute)) {
                todayBusinessDate.setDate(todayBusinessDate.getDate() - 1);
            }
            const todayBusinessDateStr = todayBusinessDate.toLocaleDateString("ja-JP", {
                timeZone: "Asia/Tokyo",
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
            }).replace(/\//g, "-");

            allRecords = workRecords.map((wr) => {
                // 既存のwork_recordsのキーを記録
                existingWorkRecordKeys.add(`${wr.profile_id}_${wr.work_date}`);

                let status: AttendanceRecord["status"] = "scheduled";
                if (wr.clock_in && !wr.clock_out) {
                    if (wr.work_date < todayBusinessDateStr) {
                        status = "forgot_clockout";
                    } else {
                        status = "working";
                    }
                } else if (wr.clock_in && wr.clock_out) {
                    status = "finished";
                }

                const prof = profileMap[wr.profile_id];

                return {
                    id: wr.id,
                    profile_id: wr.profile_id,
                    date: wr.work_date,
                    name: prof ? prof.display_name : "不明",
                    status,
                    start_time: formatTimeStr(wr.clock_in) || wr.scheduled_start_time?.slice(0, 5) || null,
                    end_time: formatTimeStr(wr.clock_out) || wr.scheduled_end_time?.slice(0, 5) || null,
                    clock_in: formatTimeStr(wr.clock_in),
                    clock_out: formatTimeStr(wr.clock_out),
                    pickup_destination: wr.pickup_destinations?.name || null,
                    break_count: breakCountMap.get(wr.id) || 0,
                };
            });
        }
    }

    // 承認済みシフト予定をAttendanceRecordに変換（work_recordsに未登録のもののみ）
    if (approvedShifts && approvedShifts.length > 0) {
        for (const shift of approvedShifts) {
            const targetDate = shift.shift_request_dates?.target_date;
            const profileId = shift.profile_id;

            if (!targetDate || !profileId) continue;

            // 既にwork_recordsに登録済みの場合はスキップ
            const key = `${profileId}_${targetDate}`;
            if (existingWorkRecordKeys.has(key)) continue;

            // プロフィールが対象リストにない場合はスキップ
            const prof = profileMap[profileId];
            if (!prof) continue;

            // 開始・終了時刻を決定（承認時刻 > 希望時刻 > デフォルト時刻）
            const startTime = shift.approved_start_time
                || shift.preferred_start_time
                || shift.shift_request_dates?.default_start_time;
            const endTime = shift.approved_end_time
                || shift.preferred_end_time
                || shift.shift_request_dates?.default_end_time;

            allRecords.push({
                id: `shift_${shift.id}`, // シフト予定を示すプレフィックス
                profile_id: profileId,
                date: targetDate,
                name: prof.display_name || "不明",
                status: "scheduled",
                start_time: startTime?.slice(0, 5) || null,
                end_time: endTime?.slice(0, 5) || null,
                clock_in: null,
                clock_out: null,
                pickup_destination: null,
            });
        }

        // 日付で降順ソート
        allRecords.sort((a, b) => {
            if (a.date !== b.date) return b.date.localeCompare(a.date);
            const aTime = a.start_time || "";
            const bTime = b.start_time || "";
            return aTime.localeCompare(bTime);
        });
    }

    // 編集権限チェック
    const canEdit = role === "admin" || role === "staff";

    // ページ権限を取得（pagePermissions）
    const { data: profileData } = await supabase
        .from("profiles")
        .select("role_id")
        .eq("id", context.profileId)
        .maybeSingle();

    let permissions: Record<string, string> | null = null;
    if (profileData?.role_id) {
        const { data: storeRole } = await supabase
            .from("store_roles")
            .select("permissions")
            .eq("id", profileData.role_id)
            .maybeSingle();
        permissions = storeRole?.permissions || null;
    }

    const checkPermission = (pageKey: string) => {
        if (role === "admin") return true;
        if (!permissions) return role === "staff";
        const level = permissions[pageKey];
        return level === "view" || level === "edit";
    };

    const pagePermissions = {
        bottles: checkPermission("bottles"),
        resumes: checkPermission("resumes"),
        salarySystems: checkPermission("salary-systems"),
        attendance: checkPermission("attendance"),
        personalInfo: checkPermission("users-personal-info"),
    };

    return {
        data: {
            allRecords,
            allProfiles,
            canEdit,
            pagePermissions,
            pickupEnabledCast,
            pickupEnabledStaff,
            showBreakColumns,
        }
    };
}

// ============================================
// タイムカード質問関連
// ============================================

/**
 * 勤怠ページ用のタイムカード質問を取得
 */
export async function getTimecardQuestionsForAttendance(
    role: string,
    timing: "clock_in" | "clock_out" | "both"
): Promise<TimecardQuestion[]> {
    const { supabase, storeId } = await getAuthContext();

    const { data, error } = await supabase
        .from("timecard_questions")
        .select("id, label, field_type, options, is_required, target_role, timing, sort_order")
        .eq("store_id", storeId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

    if (error) {
        console.error("Error fetching timecard questions:", error);
        return [];
    }

    // Filter by role and timing
    const filtered = (data || []).filter((q: any) => {
        // Role check
        if (q.target_role !== "both" && q.target_role !== role) {
            return false;
        }
        // Timing check
        if (timing === "both") {
            return true;
        }
        if (q.timing !== "both" && q.timing !== timing) {
            return false;
        }
        return true;
    });

    return filtered as TimecardQuestion[];
}

/**
 * 勤怠レコードに紐づく質問回答を取得
 */
export async function getTimecardQuestionAnswers(
    workRecordId: string
): Promise<TimecardQuestionAnswer[]> {
    // Use service role client to bypass RLS (staff need to read other users' answers)
    const serviceSupabase = createServiceRoleClient() as any;

    const { data, error } = await serviceSupabase
        .from("timecard_question_answers")
        .select("question_id, value, timing")
        .eq("work_record_id", workRecordId);

    if (error) {
        console.error("Error fetching timecard question answers:", error);
        return [];
    }

    return (data || []) as TimecardQuestionAnswer[];
}

/**
 * 勤怠レコードの質問回答を保存
 */
export async function saveTimecardQuestionAnswers(
    workRecordId: string,
    answers: Record<string, string>,
    timing: "clock_in" | "clock_out"
): Promise<void> {
    // Use service role client to bypass RLS (staff need to save answers for any user)
    const serviceSupabase = createServiceRoleClient() as any;

    for (const [questionId, value] of Object.entries(answers)) {
        if (!value || !value.trim()) continue;

        await serviceSupabase.from("timecard_question_answers").upsert(
            {
                work_record_id: workRecordId,
                question_id: questionId,
                value: value.trim(),
                timing,
                updated_at: new Date().toISOString(),
            },
            { onConflict: "work_record_id,question_id,timing" }
        );
    }
}

// ============================================
// 休憩関連
// ============================================

export interface BreakRecord {
    id: string;
    break_start: string;
    break_end: string | null;
}

/**
 * 勤怠レコードに紐づく休憩を取得
 */
export async function getBreaksForWorkRecord(workRecordId: string): Promise<BreakRecord[]> {
    const serviceSupabase = createServiceRoleClient() as any;

    const { data, error } = await serviceSupabase
        .from("work_record_breaks")
        .select("id, break_start, break_end")
        .eq("work_record_id", workRecordId)
        .order("break_start", { ascending: true });

    if (error) {
        console.error("Error fetching breaks:", error);
        return [];
    }

    return (data || []) as BreakRecord[];
}

/**
 * 勤怠レコードの休憩を保存（既存の休憩を全て削除して新規作成）
 */
export async function saveBreaksForWorkRecord(
    workRecordId: string,
    workDate: string,
    breaks: { breakStart: string; breakEnd: string }[]
): Promise<void> {
    const serviceSupabase = createServiceRoleClient() as any;

    // 既存の休憩を削除
    await serviceSupabase
        .from("work_record_breaks")
        .delete()
        .eq("work_record_id", workRecordId);

    // 新しい休憩を挿入
    if (breaks.length > 0) {
        const breakRecords = breaks
            .filter(b => b.breakStart) // breakStartが必須
            .map(b => ({
                work_record_id: workRecordId,
                break_start: timeToISO(b.breakStart, workDate),
                break_end: b.breakEnd ? timeToISO(b.breakEnd, workDate) : null,
            }));

        if (breakRecords.length > 0) {
            const { error } = await serviceSupabase
                .from("work_record_breaks")
                .insert(breakRecords);

            if (error) {
                console.error("Error saving breaks:", error);
                throw new Error("休憩の保存に失敗しました");
            }
        }
    }
}
