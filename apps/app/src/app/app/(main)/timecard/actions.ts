"use server";

import { createServerClient } from "@/lib/supabaseServerClient";
import { revalidatePath } from "next/cache";
import { getBusinessDate } from "../queue/utils";

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

export async function clockIn(pickupRequired?: boolean, pickupDestination?: string) {
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
        .select("store_id, stores(time_rounding_enabled, time_rounding_method, time_rounding_minutes, day_switch_time)")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    const now = new Date();
    const daySwitchTime = (profile?.stores as any)?.day_switch_time || "05:00";
    const workDate = getBusinessDate(daySwitchTime);
    const store = profile?.stores as any;

    // Calculate scheduled start time
    let scheduledStartTime: string;
    if (store?.time_rounding_enabled) {
        const rounded = roundTime(
            now,
            store.time_rounding_method || "round",
            store.time_rounding_minutes || 15
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

    // Check if there's already a work record for today
    // scheduled = 確定済みシフト、pending = 提出済みシフト → これらは出勤に変換
    // working = 勤務中、completed = 完了 → これらがあれば既に出勤済み
    const { data: existingRecord } = await supabase
        .from("work_records")
        .select("id, status")
        .eq("profile_id", appUser.current_profile_id)
        .eq("work_date", workDate)
        .neq("status", "cancelled")
        .maybeSingle();

    if (existingRecord) {
        // すでに勤務中の場合は何もしない（成功として扱う）
        if (existingRecord.status === "working") {
            revalidatePath("/app/timecard");
            revalidatePath("/app/attendance");
            return; // 既に勤務中なので何もせずに正常終了
        }

        // 完了済みの場合はエラー（再出勤は不可）
        if (existingRecord.status === "completed") {
            throw new Error("Already completed for today");
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
                pickup_destination: pickupDestination || null,
                updated_at: now.toISOString(),
            })
            .eq("id", existingRecord.id);

        if (error) {
            console.error("Error clocking in (update):", JSON.stringify(error, null, 2));
            throw new Error(`Failed to clock in: ${error.message || error.code}`);
        }
    } else {
        // Create new record
        const { error } = await supabase.from("work_records").insert({
            profile_id: appUser.current_profile_id,
            store_id: profile.store_id,
            work_date: workDate,
            clock_in: now.toISOString(),
            scheduled_start_time: scheduledStartTime,
            status: "working",
            source: "manual",
            pickup_required: pickupRequired ?? false,
            pickup_destination: pickupDestination || null,
        });

        if (error) {
            console.error("Error clocking in (insert):", JSON.stringify(error, null, 2));
            throw new Error(`Failed to clock in: ${error.message || error.code}`);
        }
    }

    revalidatePath("/app/timecard");
    revalidatePath("/app/attendance");
}

export async function clockOut(workRecordId: string) {
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
        .select("profile_id, profiles(store_id, stores(time_rounding_enabled, time_rounding_method, time_rounding_minutes))")
        .eq("id", workRecordId)
        .maybeSingle();

    // 自分の勤怠以外は更新させない
    if (!workRecord || workRecord.profile_id !== appUser.current_profile_id) {
        throw new Error("Unauthorized to clock out this record");
    }

    const now = new Date();

    let scheduledEndTime: string;
    if (workRecord) {
        const profile = workRecord.profiles as any;
        const store = profile?.stores as any;
        if (store?.time_rounding_enabled) {
            const rounded = roundTime(
                now,
                store.time_rounding_method || "round",
                store.time_rounding_minutes || 15
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

    revalidatePath("/app/timecard");
    revalidatePath("/app/attendance");
}

export async function startBreak(workRecordId: string) {
    const supabase = await createServerClient() as any;
    const now = new Date();

    const { error } = await supabase
        .from("work_records")
        .update({
            break_start: now.toISOString(),
            updated_at: now.toISOString(),
        })
        .eq("id", workRecordId);

    if (error) {
        console.error("Error starting break:", error);
        throw new Error("Failed to start break");
    }

    revalidatePath("/app/timecard");
}

export async function endBreak(workRecordId: string) {
    const supabase = await createServerClient() as any;
    const now = new Date();

    const { error } = await supabase
        .from("work_records")
        .update({
            break_end: now.toISOString(),
            updated_at: now.toISOString(),
        })
        .eq("id", workRecordId);

    if (error) {
        console.error("Error ending break:", error);
        throw new Error("Failed to end break");
    }

    revalidatePath("/app/timecard");
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
    // タイムカードには実際に出退勤した記録（working/completed）のみ表示
    // pending/scheduled はシフト希望であり、まだ出勤していないので除外
    const { data: workRecords, error } = await supabase
        .from("work_records")
        .select("*")
        .eq("profile_id", appUser.current_profile_id)
        .in("status", ["working", "completed"])
        .order("work_date", { ascending: false })
        .order("clock_in", { ascending: false });

    if (error) {
        throw new Error(`Failed to fetch work records: ${error.message}`);
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("*, stores(show_break_columns, show_timecard, location_check_enabled, latitude, longitude, location_radius, day_switch_time)")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    const store = profile?.stores as any;
    if (store && store.show_timecard === false) {
        return { redirect: "/login" };
    }

    const showBreakColumns = store ? (store.show_break_columns ?? false) : false;

    // Get today's latest work record
    const daySwitchTime = (store as any)?.day_switch_time || "05:00";
    const businessDate = getBusinessDate(daySwitchTime);
    const latestTimeCard = workRecords?.find((record: any) => record.work_date === businessDate) || null;

    // Fetch pickup history
    const { data: pickupRows } = await supabase
        .from("work_records")
        .select("pickup_destination")
        .eq("profile_id", appUser.current_profile_id)
        .not("pickup_destination", "is", null);

    const pickupHistory = Array.from(new Set(
        (pickupRows || [])
            .map((row: any) => row.pickup_destination)
            .filter((dest: string | null) => dest && dest.trim() !== "")
    )) as string[];

    // Convert to old timeCards format for compatibility
    const timeCards = workRecords?.map((r: any) => ({
        id: r.id,
        user_id: r.profile_id,
        work_date: r.work_date,
        clock_in: r.clock_in,
        clock_out: r.clock_out,
        break_start: r.break_start,
        break_end: r.break_end,
        scheduled_start_time: r.scheduled_start_time,
        scheduled_end_time: r.scheduled_end_time,
        pickup_required: r.pickup_required,
        pickup_destination: r.pickup_destination,
        forgot_clockout: r.forgot_clockout,
        created_at: r.created_at,
        updated_at: r.updated_at,
    })) || [];

    return {
        data: {
            timeCards,
            profile,
            storeSettings: {
                location_check_enabled: store?.location_check_enabled,
                latitude: store?.latitude,
                longitude: store?.longitude,
                location_radius: store?.location_radius,
            },
            showBreakColumns,
            latestTimeCard: latestTimeCard ? {
                id: latestTimeCard.id,
                user_id: latestTimeCard.profile_id,
                work_date: latestTimeCard.work_date,
                clock_in: latestTimeCard.clock_in,
                clock_out: latestTimeCard.clock_out,
                break_start: latestTimeCard.break_start,
                break_end: latestTimeCard.break_end,
                scheduled_start_time: latestTimeCard.scheduled_start_time,
                scheduled_end_time: latestTimeCard.scheduled_end_time,
                pickup_required: latestTimeCard.pickup_required,
                pickup_destination: latestTimeCard.pickup_destination,
                forgot_clockout: latestTimeCard.forgot_clockout,
            } : null,
            pickupHistory,
        }
    };
}
