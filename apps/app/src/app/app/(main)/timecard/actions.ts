"use server";

import { createServerClient } from "@/lib/supabaseServerClient";
import { revalidatePath } from "next/cache";
import { getBusinessDate } from "../queue/utils";
import { sendPushNotification } from "@/lib/notifications/push";

// Timecard Question types
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

// Helper to get pickup destinations for a store
async function getPickupDestinations(supabase: any, storeId: string) {
    const { data } = await supabase
        .from("pickup_destinations")
        .select("id, name")
        .eq("store_id", storeId)
        .eq("is_active", true)
        .order("name");

    return data || [];
}

// Delete a pickup destination from user's history
export async function deletePickupDestination(destinationName: string) {
    const supabase = await createServerClient() as any;
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("User not authenticated");
    }

    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    if (!appUser?.current_profile_id) {
        throw new Error("No active profile found");
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("store_id")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    if (!profile?.store_id) {
        throw new Error("Store not found");
    }

    // Find the pickup destination by name
    const { data: destination } = await supabase
        .from("pickup_destinations")
        .select("id")
        .eq("store_id", profile.store_id)
        .eq("name", destinationName)
        .maybeSingle();

    if (!destination) {
        throw new Error("Destination not found");
    }

    // Clear this destination from user's work_records
    const { error } = await supabase
        .from("work_records")
        .update({ pickup_destination_id: null, pickup_required: false })
        .eq("profile_id", appUser.current_profile_id)
        .eq("pickup_destination_id", destination.id);

    if (error) {
        console.error("Error deleting pickup destination:", error);
        throw new Error("Failed to delete pickup destination");
    }

    revalidatePath("/app/timecard");
}

// Helper to get JST date string (YYYY-MM-DD)
function getJSTDateString(date: Date = new Date()): string {
    return date.toLocaleDateString("ja-JP", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).replace(/\//g, "-");
}

// Helper function to round time based on settings
function roundTime(date: Date, method: string, minutes: number): Date {
    const rounded = new Date(date);
    const ms = 1000 * 60 * minutes;
    const time = rounded.getTime();

    if (method === "floor") {
        return new Date(Math.floor(time / ms) * ms);
    } else if (method === "ceil") {
        return new Date(Math.ceil(time / ms) * ms);
    } else {
        return new Date(Math.round(time / ms) * ms);
    }
}

export async function clockIn(
    pickupRequired?: boolean,
    pickupDestination?: string,
    questionAnswers?: Record<string, string>
): Promise<string | null> {
    const supabase = await createServerClient() as any;
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("User not authenticated");
    }

    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    if (!appUser?.current_profile_id) {
        throw new Error("No active profile found for current user");
    }

    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("store_id, display_name")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    if (profileError) {
        console.error("Profile fetch error:", profileError);
        throw new Error(`Failed to fetch profile: ${profileError.message}`);
    }

    if (!profile) {
        throw new Error(`Profile not found for id: ${appUser.current_profile_id}`);
    }

    if (!profile.store_id) {
        throw new Error(`Profile ${appUser.current_profile_id} has no store_id`);
    }

    // 店舗設定を取得
    const { data: storeSettings } = await supabase
        .from("store_settings")
        .select("time_rounding_enabled, time_rounding_method, time_rounding_minutes, day_switch_time")
        .eq("store_id", profile.store_id)
        .maybeSingle();

    const now = new Date();
    const daySwitchTime = storeSettings?.day_switch_time || "05:00";
    const workDate = getBusinessDate(daySwitchTime);

    // Calculate scheduled start time
    let scheduledStartTime: string;
    if (storeSettings?.time_rounding_enabled) {
        const rounded = roundTime(
            now,
            storeSettings.time_rounding_method || "round",
            storeSettings.time_rounding_minutes || 15
        );
        scheduledStartTime = rounded.toLocaleTimeString("ja-JP", {
            timeZone: "Asia/Tokyo",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        });
    } else {
        scheduledStartTime = now.toLocaleTimeString("ja-JP", {
            timeZone: "Asia/Tokyo",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        });
    }

    // Get or create pickup destination
    let pickupDestinationId: string | null = null;
    if (pickupRequired && pickupDestination) {
        pickupDestinationId = await getOrCreatePickupDestination(supabase, profile.store_id, pickupDestination);
    }

    // Check if there's already a work record for today
    // working = 勤務中 → すでに出勤中なので何もしない
    // pending/scheduled = シフト予定 → これを出勤に変換
    // completed = 完了 → 新しいレコードを作成（1日複数回出勤可能）
    const { data: existingRecord } = await supabase
        .from("work_records")
        .select("id, status")
        .eq("profile_id", appUser.current_profile_id)
        .eq("work_date", workDate)
        .in("status", ["working", "pending", "scheduled"])
        .maybeSingle();

    let workRecordId: string | null = null;

    if (existingRecord) {
        // すでに勤務中の場合は何もしない（成功として扱う）
        if (existingRecord.status === "working") {
            revalidatePath("/app/timecard");
            revalidatePath("/app/attendance");
            return existingRecord.id; // 既に勤務中なので既存のIDを返す
        }

        // pending/scheduled のシフトレコードを出勤に更新
        // clock_out, break_start, break_end もクリアして新しい勤務として開始
        const { error } = await supabase
            .from("work_records")
            .update({
                clock_in: now.toISOString(),
                clock_out: null,
                break_start: null,
                break_end: null,
                status: "working",
                pickup_required: pickupRequired ?? false,
                pickup_destination_id: pickupDestinationId,
                updated_at: now.toISOString(),
            })
            .eq("id", existingRecord.id);

        if (error) {
            console.error("Error clocking in (update):", JSON.stringify(error, null, 2));
            throw new Error(`Failed to clock in: ${error.message || error.code}`);
        }
        workRecordId = existingRecord.id;
    } else {
        // Create new record (退勤済みでも新規作成で再出勤可能)
        const { data: newRecord, error } = await supabase.from("work_records").insert({
            profile_id: appUser.current_profile_id,
            store_id: profile.store_id,
            work_date: workDate,
            clock_in: now.toISOString(),
            scheduled_start_time: scheduledStartTime,
            status: "working",
            source: "manual",
            pickup_required: pickupRequired ?? false,
            pickup_destination_id: pickupDestinationId,
        }).select("id").single();

        if (error) {
            console.error("Error clocking in (insert):", JSON.stringify(error, null, 2));
            throw new Error(`Failed to clock in: ${error.message || error.code}`);
        }
        workRecordId = newRecord?.id || null;
    }

    // Save question answers if provided
    if (workRecordId && questionAnswers && Object.keys(questionAnswers).length > 0) {
        for (const [questionId, value] of Object.entries(questionAnswers)) {
            if (value === undefined || value === null || value === "") continue;
            await supabase.from("timecard_question_answers").upsert(
                {
                    work_record_id: workRecordId,
                    question_id: questionId,
                    value: value,
                    timing: "clock_in",
                    updated_at: now.toISOString(),
                },
                { onConflict: "work_record_id,question_id,timing" }
            );
        }
    }

    revalidatePath("/app/timecard");
    revalidatePath("/app/attendance");

    // プッシュ通知を送信（出勤者本人を除外）
    try {
        const displayName = profile?.display_name || "メンバー";
        await sendPushNotification({
            storeId: profile.store_id,
            notificationType: "attendance",
            title: "出勤通知",
            body: `${displayName}さんが出勤しました`,
            url: "/app/attendance",
            excludeProfileIds: [appUser.current_profile_id],
        });
    } catch (error) {
        // 通知エラーは無視（出勤処理自体は成功しているため）
        console.error("Failed to send attendance notification:", error);
    }

    return workRecordId;
}

export async function clockOut(
    workRecordId: string,
    questionAnswers?: Record<string, string>
) {
    const supabase = await createServerClient() as any;
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("User not authenticated");
    }

    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    if (!appUser?.current_profile_id) {
        throw new Error("No active profile found for current user");
    }

    const { data: workRecord } = await supabase
        .from("work_records")
        .select("profile_id, store_id")
        .eq("id", workRecordId)
        .maybeSingle();

    // 自分の勤怠以外は更新させない
    if (!workRecord || workRecord.profile_id !== appUser.current_profile_id) {
        throw new Error("Unauthorized to clock out this record");
    }

    // 店舗設定を取得
    const { data: storeSettings } = await supabase
        .from("store_settings")
        .select("time_rounding_enabled, time_rounding_method, time_rounding_minutes")
        .eq("store_id", workRecord.store_id)
        .maybeSingle();

    const now = new Date();

    let scheduledEndTime: string;
    if (storeSettings?.time_rounding_enabled) {
        const rounded = roundTime(
            now,
            storeSettings.time_rounding_method || "round",
            storeSettings.time_rounding_minutes || 15
        );
        scheduledEndTime = rounded.toLocaleTimeString("ja-JP", {
            timeZone: "Asia/Tokyo",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        });
    } else {
        scheduledEndTime = now.toLocaleTimeString("ja-JP", {
            timeZone: "Asia/Tokyo",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        });
    }

    const { error } = await supabase
        .from("work_records")
        .update({
            clock_out: now.toISOString(),
            scheduled_end_time: scheduledEndTime,
            status: "completed",
            updated_at: now.toISOString(),
        })
        .eq("id", workRecordId);

    if (error) {
        console.error("Error clocking out:", error);
        throw new Error("Failed to clock out");
    }

    // Save question answers if provided
    if (questionAnswers && Object.keys(questionAnswers).length > 0) {
        for (const [questionId, value] of Object.entries(questionAnswers)) {
            if (value === undefined || value === null || value === "") continue;
            await supabase.from("timecard_question_answers").upsert(
                {
                    work_record_id: workRecordId,
                    question_id: questionId,
                    value: value,
                    timing: "clock_out",
                    updated_at: now.toISOString(),
                },
                { onConflict: "work_record_id,question_id,timing" }
            );
        }
    }

    revalidatePath("/app/timecard");
    revalidatePath("/app/attendance");
}

export async function startBreak(workRecordId: string) {
    const supabase = await createServerClient() as any;
    const now = new Date();

    // Check if there's already an active break (no break_end)
    const { data: activeBreak } = await supabase
        .from("work_record_breaks")
        .select("id")
        .eq("work_record_id", workRecordId)
        .is("break_end", null)
        .maybeSingle();

    if (activeBreak) {
        throw new Error("Already on break");
    }

    // Insert new break record
    const { error } = await supabase
        .from("work_record_breaks")
        .insert({
            work_record_id: workRecordId,
            break_start: now.toISOString(),
        });

    if (error) {
        console.error("Error starting break:", error);
        throw new Error("Failed to start break");
    }

    // Also update work_records for backward compatibility
    await supabase
        .from("work_records")
        .update({
            break_start: now.toISOString(),
            break_end: null,
            updated_at: now.toISOString(),
        })
        .eq("id", workRecordId);

    revalidatePath("/app/timecard");
}

export async function endBreak(workRecordId: string) {
    const supabase = await createServerClient() as any;
    const now = new Date();

    // Find the active break (no break_end) and update it
    const { data: activeBreak, error: findError } = await supabase
        .from("work_record_breaks")
        .select("id")
        .eq("work_record_id", workRecordId)
        .is("break_end", null)
        .order("break_start", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (findError) {
        console.error("Error finding active break:", findError);
        throw new Error("Failed to find active break");
    }

    if (!activeBreak) {
        throw new Error("No active break to end");
    }

    const { error } = await supabase
        .from("work_record_breaks")
        .update({
            break_end: now.toISOString(),
            updated_at: now.toISOString(),
        })
        .eq("id", activeBreak.id);

    if (error) {
        console.error("Error ending break:", error);
        throw new Error("Failed to end break");
    }

    // Also update work_records for backward compatibility
    await supabase
        .from("work_records")
        .update({
            break_end: now.toISOString(),
            updated_at: now.toISOString(),
        })
        .eq("id", workRecordId);

    revalidatePath("/app/timecard");
}

// Get current break status for a work record
export async function getBreakStatus(workRecordId: string): Promise<{
    isOnBreak: boolean;
    currentBreakId: string | null;
    breaks: { id: string; break_start: string; break_end: string | null }[];
}> {
    const supabase = await createServerClient() as any;

    const { data: breaks, error } = await supabase
        .from("work_record_breaks")
        .select("id, break_start, break_end")
        .eq("work_record_id", workRecordId)
        .order("break_start", { ascending: true });

    if (error) {
        console.error("Error fetching breaks:", error);
        return { isOnBreak: false, currentBreakId: null, breaks: [] };
    }

    const activeBreak = breaks?.find((b: any) => b.break_end === null);

    return {
        isOnBreak: !!activeBreak,
        currentBreakId: activeBreak?.id || null,
        breaks: breaks || [],
    };
}

export async function importTimecardsFromCsv(formData: FormData) {
    const file = formData.get("file") as File | null;
    if (!file) {
        throw new Error("CSVファイルが指定されていません");
    }

    const supabase = await createServerClient() as any;
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("User not authenticated");
    }

    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    if (!appUser?.current_profile_id) {
        throw new Error("No active profile found for current user");
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("store_id")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    if (!profile?.store_id) {
        throw new Error("Store not found for current user");
    }

    const { data: storeProfiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .eq("store_id", profile.store_id);

    const nameToProfileId = new Map<string, string | null>();
    for (const p of storeProfiles || []) {
        const name = (p.display_name as string | null)?.trim().toLowerCase();
        if (!name) continue;
        if (!nameToProfileId.has(name)) {
            nameToProfileId.set(name, p.id as string);
        } else {
            nameToProfileId.set(name, null);
        }
    }

    const text = await file.text();
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0);

    if (lines.length < 2) {
        throw new Error("CSVに有効なデータ行がありません");
    }

    const header = lines[0].split(",").map((h) => h.trim());
    const colIndex = {
        display_name: header.indexOf("display_name"),
        work_date: header.indexOf("work_date"),
        clock_in: header.indexOf("clock_in"),
        clock_out: header.indexOf("clock_out"),
        break_start: header.indexOf("break_start"),
        break_end: header.indexOf("break_end"),
    };

    if (colIndex.display_name === -1 || colIndex.work_date === -1) {
        throw new Error("CSVヘッダーに display_name, work_date カラムが必要です");
    }

    const parseDateTime = (workDate: string, time: string | undefined): string | null => {
        const t = (time || "").trim();
        if (!t) return null;
        let iso: string;
        if (/^\d{2}:\d{2}/.test(t)) {
            iso = new Date(`${workDate}T${t}`).toISOString();
        } else {
            const d = new Date(t);
            if (isNaN(d.getTime())) return null;
            iso = d.toISOString();
        }
        return iso;
    };

    const toInsert: any[] = [];

    for (let i = 1; i < lines.length; i++) {
        const columns = lines[i].split(",");
        const displayNameRaw = (columns[colIndex.display_name] || "").trim();
        const workDate = (columns[colIndex.work_date] || "").trim();

        if (!displayNameRaw || !workDate) continue;

        const key = displayNameRaw.toLowerCase();
        const profileId = nameToProfileId.get(key);
        if (!profileId) continue;

        const clockIn = colIndex.clock_in !== -1 ? columns[colIndex.clock_in] : undefined;
        const clockOut = colIndex.clock_out !== -1 ? columns[colIndex.clock_out] : undefined;
        const breakStart = colIndex.break_start !== -1 ? columns[colIndex.break_start] : undefined;
        const breakEnd = colIndex.break_end !== -1 ? columns[colIndex.break_end] : undefined;

        const record: any = {
            profile_id: profileId,
            store_id: profile.store_id,
            work_date: workDate,
            source: "manual",
            status: clockOut ? "completed" : (clockIn ? "working" : "scheduled"),
        };

        const clockInIso = parseDateTime(workDate, clockIn);
        const clockOutIso = parseDateTime(workDate, clockOut);
        const breakStartIso = parseDateTime(workDate, breakStart);
        const breakEndIso = parseDateTime(workDate, breakEnd);

        if (clockInIso) record.clock_in = clockInIso;
        if (clockOutIso) record.clock_out = clockOutIso;
        if (breakStartIso) record.break_start = breakStartIso;
        if (breakEndIso) record.break_end = breakEndIso;

        toInsert.push(record);
    }

    if (toInsert.length === 0) {
        revalidatePath("/app/timecard");
        return;
    }

    const { error } = await supabase.from("work_records").insert(toInsert);

    if (error) {
        console.error("Error importing timecards from CSV:", error);
        throw new Error("CSVのインポート中にエラーが発生しました");
    }

    revalidatePath("/app/timecard");
}

export async function getTimecardData() {
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

    // Fetch work records for the current profile
    // タイムカードには出勤済みの記録（working/completed）を表示
    // pending/scheduled はシフト希望であり、まだ出勤していないので除外
    const { data: workRecords, error } = await supabase
        .from("work_records")
        .select("*, pickup_destinations(id, name)")
        .eq("profile_id", appUser.current_profile_id)
        .in("status", ["working", "completed"])
        .order("work_date", { ascending: false })
        .order("clock_in", { ascending: false });

    if (error) {
        console.error("Work records fetch error:", error);
        throw new Error(`Failed to fetch work records: ${error.message}`);
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("*, stores(latitude, longitude)")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    // 店舗設定を取得
    const { data: storeSettings } = await supabase
        .from("store_settings")
        .select("show_break_columns, show_timecard, location_check_enabled, location_radius, day_switch_time, pickup_enabled_cast, pickup_enabled_staff")
        .eq("store_id", profile?.store_id)
        .maybeSingle();

    if (storeSettings?.show_timecard === false) {
        return { redirect: "/login" };
    }

    const showBreakColumns = storeSettings?.show_break_columns ?? false;

    // Determine if pickup is enabled based on role
    const userRole = profile?.role;
    const pickupEnabled = userRole === "cast"
        ? (storeSettings?.pickup_enabled_cast ?? false)
        : (storeSettings?.pickup_enabled_staff ?? false);

    // Get today's latest work record
    const daySwitchTime = storeSettings?.day_switch_time || "05:00";
    const businessDate = getBusinessDate(daySwitchTime);
    const latestWorkRecord = workRecords?.find((record: any) => record.work_date === businessDate) || null;

    // Fetch breaks for the latest work record
    let latestBreaks: { id: string; break_start: string; break_end: string | null }[] = [];
    let isOnBreak = false;
    if (latestWorkRecord) {
        try {
            const { data: breaks, error: breaksError } = await supabase
                .from("work_record_breaks")
                .select("id, break_start, break_end")
                .eq("work_record_id", latestWorkRecord.id)
                .order("break_start", { ascending: true });
            if (breaksError) {
                console.error("Error fetching latest breaks:", breaksError);
            } else {
                latestBreaks = breaks || [];
                isOnBreak = latestBreaks.some(b => b.break_end === null);
            }
        } catch (error) {
            console.error("Exception fetching latest breaks:", error);
        }
    }

    // Fetch pickup history for the current profile (only their own history)
    const { data: pickupRows } = await supabase
        .from("work_records")
        .select("pickup_destination_id, pickup_destinations(id, name)")
        .eq("profile_id", appUser.current_profile_id)
        .not("pickup_destination_id", "is", null);

    const pickupHistory = Array.from(new Set(
        (pickupRows || [])
            .map((row: any) => row.pickup_destinations?.name)
            .filter((name: string | null) => name && name.trim() !== "")
    )) as string[];

    // Fetch all breaks for the user's work records
    const workRecordIds = workRecords?.map((r: any) => r.id) || [];
    let allBreaks: { work_record_id: string; id: string; break_start: string; break_end: string | null }[] = [];
    if (workRecordIds.length > 0) {
        try {
            const { data: breaksData, error: breaksError } = await supabase
                .from("work_record_breaks")
                .select("work_record_id, id, break_start, break_end")
                .in("work_record_id", workRecordIds)
                .order("break_start", { ascending: true });
            if (breaksError) {
                console.error("Error fetching breaks:", breaksError);
            } else {
                allBreaks = breaksData || [];
            }
        } catch (error) {
            console.error("Exception fetching breaks:", error);
        }
    }

    // Group breaks by work_record_id
    const breaksByRecordId = new Map<string, typeof allBreaks>();
    for (const b of allBreaks) {
        if (!breaksByRecordId.has(b.work_record_id)) {
            breaksByRecordId.set(b.work_record_id, []);
        }
        breaksByRecordId.get(b.work_record_id)!.push(b);
    }

    // Convert to old timeCards format for compatibility
    const timeCards = workRecords?.map((r: any) => ({
        id: r.id,
        user_id: r.profile_id,
        work_date: r.work_date,
        clock_in: r.clock_in,
        clock_out: r.clock_out,
        break_start: r.break_start,
        break_end: r.break_end,
        breaks: breaksByRecordId.get(r.id)?.map(b => ({
            id: b.id,
            break_start: b.break_start,
            break_end: b.break_end,
        })) || [],
        scheduled_start_time: r.scheduled_start_time,
        scheduled_end_time: r.scheduled_end_time,
        pickup_required: r.pickup_required,
        pickup_destination: r.pickup_destinations?.name || null,
        forgot_clockout: r.forgot_clockout,
        created_at: r.created_at,
        updated_at: r.updated_at,
    })) || [];

    const store = profile?.stores as any;
    return {
        data: {
            timeCards,
            profile,
            storeSettings: {
                location_check_enabled: storeSettings?.location_check_enabled,
                latitude: store?.latitude,
                longitude: store?.longitude,
                location_radius: storeSettings?.location_radius,
            },
            showBreakColumns,
            pickupEnabled,
            latestTimeCard: latestWorkRecord ? {
                id: latestWorkRecord.id,
                user_id: latestWorkRecord.profile_id,
                work_date: latestWorkRecord.work_date,
                clock_in: latestWorkRecord.clock_in,
                clock_out: latestWorkRecord.clock_out,
                break_start: latestWorkRecord.break_start,
                break_end: latestWorkRecord.break_end,
                scheduled_start_time: latestWorkRecord.scheduled_start_time,
                scheduled_end_time: latestWorkRecord.scheduled_end_time,
                pickup_required: latestWorkRecord.pickup_required,
                pickup_destination: latestWorkRecord.pickup_destinations?.name || null,
                forgot_clockout: latestWorkRecord.forgot_clockout,
                breaks: latestBreaks,
                isOnBreak,
            } : null,
            pickupHistory,
        }
    };
}

// Get active timecard questions for the current user
export async function getActiveTimecardQuestions(
    timing: "clock_in" | "clock_out"
): Promise<TimecardQuestion[]> {
    const supabase = await createServerClient() as any;
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return [];
    }

    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    if (!appUser?.current_profile_id) {
        return [];
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("store_id, role")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    if (!profile?.store_id) {
        return [];
    }

    const role = profile.role || "staff";

    // Fetch questions that match the role and timing
    const { data: questions, error } = await supabase
        .from("timecard_questions")
        .select("id, label, field_type, options, is_required, target_role, timing, sort_order")
        .eq("store_id", profile.store_id)
        .eq("is_active", true)
        .or(`target_role.eq.both,target_role.eq.${role}`)
        .or(`timing.eq.both,timing.eq.${timing}`)
        .order("sort_order", { ascending: true });

    if (error) {
        console.error("Error fetching timecard questions:", error);
        return [];
    }

    return questions || [];
}

// Get timecard detail with question answers
export interface TimecardDetail {
    id: string;
    work_date: string;
    clock_in: string | null;
    clock_out: string | null;
    break_start: string | null;
    break_end: string | null;
    breaks: { id: string; break_start: string; break_end: string | null }[];
    pickup_required: boolean;
    pickup_destination: string | null;
    status: string;
    questions: {
        id: string;
        label: string;
        timing: string;
        value: string;
    }[];
}

export async function getTimecardDetail(workRecordId: string): Promise<TimecardDetail | null> {
    const supabase = await createServerClient() as any;
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return null;
    }

    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    if (!appUser?.current_profile_id) {
        return null;
    }

    // Fetch work record with pickup destination
    const { data: workRecord, error } = await supabase
        .from("work_records")
        .select("*, pickup_destinations(name)")
        .eq("id", workRecordId)
        .eq("profile_id", appUser.current_profile_id)
        .maybeSingle();

    if (error || !workRecord) {
        console.error("Error fetching work record:", error);
        return null;
    }

    // Fetch breaks from work_record_breaks table
    const { data: breaks } = await supabase
        .from("work_record_breaks")
        .select("id, break_start, break_end")
        .eq("work_record_id", workRecordId)
        .order("break_start", { ascending: true });

    // Fetch question answers for this work record
    const { data: answers } = await supabase
        .from("timecard_question_answers")
        .select("question_id, value, timing, timecard_questions(label)")
        .eq("work_record_id", workRecordId);

    const questions = (answers || []).map((a: any) => ({
        id: a.question_id,
        label: a.timecard_questions?.label || "",
        timing: a.timing,
        value: a.value,
    }));

    return {
        id: workRecord.id,
        work_date: workRecord.work_date,
        clock_in: workRecord.clock_in,
        clock_out: workRecord.clock_out,
        break_start: workRecord.break_start,
        break_end: workRecord.break_end,
        breaks: breaks || [],
        pickup_required: workRecord.pickup_required || false,
        pickup_destination: workRecord.pickup_destinations?.name || null,
        status: workRecord.status,
        questions,
    };
}

// Save timecard question answers
export async function saveTimecardQuestionAnswers(
    workRecordId: string,
    answers: Record<string, string>,
    timing: "clock_in" | "clock_out"
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createServerClient() as any;
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: "Not authenticated" };
    }

    // Verify the work record belongs to the user
    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    if (!appUser?.current_profile_id) {
        return { success: false, error: "No profile found" };
    }

    const { data: workRecord } = await supabase
        .from("work_records")
        .select("profile_id")
        .eq("id", workRecordId)
        .maybeSingle();

    if (!workRecord || workRecord.profile_id !== appUser.current_profile_id) {
        return { success: false, error: "Unauthorized" };
    }

    // Save each answer
    for (const [questionId, value] of Object.entries(answers)) {
        if (value === undefined || value === null) continue;

        const { error } = await supabase
            .from("timecard_question_answers")
            .upsert(
                {
                    work_record_id: workRecordId,
                    question_id: questionId,
                    value: value,
                    timing: timing,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: "work_record_id,question_id,timing" }
            );

        if (error) {
            console.error("Error saving timecard answer:", error);
            return { success: false, error: error.message };
        }
    }

    return { success: true };
}
