"use server";

import { getAuthContext, getAuthContextForPage } from "@/lib/auth-helpers";
import { createServiceRoleClient } from "@/lib/supabaseServiceClient";
import { revalidatePath } from "next/cache";
import type { AttendanceRecord, AttendanceDataResult, AttendanceRoleFilter, AttendancePayload } from "./types";

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
export async function createAttendance(formData: FormData): Promise<{ success: boolean }> {
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

    // ペイロードを作成
    const payload: AttendancePayload = {
        profile_id: targetProfileId,
        store_id: storeId,
        work_date: date,
        pickup_destination: pickupDestination || null,
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
    const { error } = await serviceSupabase.from("work_records").insert(payload);

    if (error) {
        console.error("Error creating work record:", error);
        throw new Error(`勤怠の作成に失敗しました: ${error.message}`);
    }

    revalidatePath("/app/attendance");
    return { success: true };
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

    // ペイロードを作成
    const payload: Partial<AttendancePayload> = {
        profile_id: profileId || currentProfileId,
        work_date: date,
        pickup_destination: pickupDestination || null,
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

/**
 * CSVから勤怠データをインポート
 */
export async function importAttendanceFromCsv(formData: FormData): Promise<void> {
    const file = formData.get("file") as File | null;
    if (!file) {
        throw new Error("CSVファイルが指定されていません");
    }

    const roleFilter = (formData.get("attendanceRole") as string | null) ?? null;
    const { supabase, storeId } = await getAuthContext();

    // 店舗のプロフィールを取得（名前 → ID のマップを作成）
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
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0);
    if (lines.length < 2) {
        throw new Error("CSVに有効なデータ行がありません");
    }

    const header = lines[0].split(",").map((h) => h.trim());
    const colIndex = {
        display_name: header.indexOf("display_name"),
        date: header.indexOf("date"),
        status: header.indexOf("status"),
        start_time: header.indexOf("start_time"),
        end_time: header.indexOf("end_time"),
    };

    if (colIndex.display_name === -1 || colIndex.date === -1 || colIndex.status === -1) {
        throw new Error("CSVヘッダーに display_name, date, status カラムが必要です");
    }

    const toInsert: AttendancePayload[] = [];

    for (let i = 1; i < lines.length; i++) {
        const columns = lines[i].split(",");
        const nameRaw = (columns[colIndex.display_name] || "").trim();
        const date = (columns[colIndex.date] || "").trim();
        const status = (columns[colIndex.status] || "").trim();

        if (!nameRaw || !date || !status) continue;

        const key = nameRaw.toLowerCase();
        const profileId = nameToProfileId.get(key);
        if (!profileId) continue;

        const startTime = colIndex.start_time !== -1 ? columns[colIndex.start_time] : undefined;
        const endTime = colIndex.end_time !== -1 ? columns[colIndex.end_time] : undefined;

        const payload: AttendancePayload = {
            profile_id: profileId,
            store_id: storeId,
            work_date: date,
            pickup_destination: null,
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
        return;
    }

    const { error } = await supabase.from("work_records").insert(toInsert);

    if (error) {
        console.error("Error importing work records from CSV:", error);
        throw new Error("CSVのインポート中にエラーが発生しました");
    }

    revalidatePath("/app/attendance");
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
            .select("id, profile_id, work_date, clock_in, clock_out, scheduled_start_time, scheduled_end_time, forgot_clockout, pickup_destination, status")
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
                    start_time: formatTimeStr(wr.scheduled_start_time || wr.clock_in),
                    end_time: formatTimeStr(wr.scheduled_end_time || wr.clock_out),
                    clock_in: formatTimeStr(wr.clock_in),
                    clock_out: formatTimeStr(wr.clock_out),
                    pickup_destination: wr.pickup_destination,
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
