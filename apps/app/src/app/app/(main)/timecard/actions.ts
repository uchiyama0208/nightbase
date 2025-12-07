"use server";

import { createServerClient } from "@/lib/supabaseServerClient";
import { revalidatePath } from "next/cache";

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
    const ms = 1000 * 60 * minutes; // milliseconds in the rounding interval
    const time = rounded.getTime();

    if (method === "floor") {
        // Round down
        return new Date(Math.floor(time / ms) * ms);
    } else if (method === "ceil") {
        // Round up
        return new Date(Math.ceil(time / ms) * ms);
    } else {
        // Round (四捨五入)
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

    // Resolve current profile via users.current_profile_id
    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    if (!appUser?.current_profile_id) {
        throw new Error("No active profile found for current user");
    }

    // Get current profile with store info
    const { data: profile } = await supabase
        .from("profiles")
        .select("store_id, stores(time_rounding_enabled, time_rounding_method, time_rounding_minutes)")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    const now = new Date();
    // Use JST for work_date
    const workDate = getJSTDateString(now);

    // Calculate scheduled start time
    const store = profile?.stores as any;
    let scheduledStartTime: string;
    if (store?.time_rounding_enabled) {
        // If rounding is enabled, use rounded time
        const rounded = roundTime(
            now,
            store.time_rounding_method || "round",
            store.time_rounding_minutes || 15
        );
        scheduledStartTime = rounded.toISOString();
    } else {
        // If rounding is disabled, use actual clock_in time
        scheduledStartTime = now.toISOString();
    }

    const { error } = await supabase.from("time_cards").insert({
        user_id: appUser.current_profile_id,
        work_date: workDate,
        clock_in: now.toISOString(),
        scheduled_start_time: scheduledStartTime,
        pickup_required: pickupRequired ?? false,
        pickup_destination: pickupDestination || null,
    });

    if (error) {
        console.error("Error clocking in:", JSON.stringify(error, null, 2));
        throw new Error(`Failed to clock in: ${error.message || error.code}`);
    }

    revalidatePath("/app/timecard");
    revalidatePath("/app/attendance");
}

export async function clockOut(timeCardId: string) {
    const supabase = await createServerClient() as any;

    // Get the time card to find the user and apply rounding settings
    const { data: timeCard } = await supabase
        .from("time_cards")
        .select("user_id, profiles(store_id, stores(time_rounding_enabled, time_rounding_method, time_rounding_minutes))")
        .eq("id", timeCardId)
        .maybeSingle();

    const now = new Date();

    // Calculate scheduled end time
    let scheduledEndTime: string;
    if (timeCard) {
        const profile = timeCard.profiles as any;
        const store = profile?.stores as any;
        if (store?.time_rounding_enabled) {
            // If rounding is enabled, use rounded time
            const rounded = roundTime(
                now,
                store.time_rounding_method || "round",
                store.time_rounding_minutes || 15
            );
            scheduledEndTime = rounded.toISOString();
        } else {
            // If rounding is disabled, use actual clock_out time
            scheduledEndTime = now.toISOString();
        }
    } else {
        // Fallback if timeCard is not found
        scheduledEndTime = now.toISOString();
    }

    const { error } = await supabase
        .from("time_cards")
        .update({
            clock_out: now.toISOString(),
            scheduled_end_time: scheduledEndTime
        })
        .eq("id", timeCardId);

    if (error) {
        console.error("Error clocking out:", error);
        throw new Error("Failed to clock out");
    }

    revalidatePath("/app/timecard");
    revalidatePath("/app/attendance");
}

export async function startBreak(timeCardId: string) {
    const supabase = await createServerClient() as any;
    const now = new Date();

    const { error } = await supabase
        .from("time_cards")
        .update({ break_start: now.toISOString() })
        .eq("id", timeCardId);

    if (error) {
        console.error("Error starting break:", error);
        throw new Error("Failed to start break");
    }

    revalidatePath("/app/timecard");
}

export async function endBreak(timeCardId: string) {
    const supabase = await createServerClient() as any;
    const now = new Date();

    const { error } = await supabase
        .from("time_cards")
        .update({ break_end: now.toISOString() })
        .eq("id", timeCardId);

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
            // 同じ名前が複数存在する場合は曖昧として無効扱いにする
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
        // "HH:MM" または "YYYY-MM-DD HH:MM" を想定
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
        if (!profileId) {
            // 対応するユーザーが不明・曖昧な場合はスキップ
            continue;
        }

        const clockIn = colIndex.clock_in !== -1 ? columns[colIndex.clock_in] : undefined;
        const clockOut = colIndex.clock_out !== -1 ? columns[colIndex.clock_out] : undefined;
        const breakStart = colIndex.break_start !== -1 ? columns[colIndex.break_start] : undefined;
        const breakEnd = colIndex.break_end !== -1 ? columns[colIndex.break_end] : undefined;

        const record: any = {
            user_id: profileId,
            work_date: workDate,
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

    const { error } = await supabase.from("time_cards").insert(toInsert);

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

    // Resolve current profile via users.current_profile_id
    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    if (!appUser?.current_profile_id) {
        return { redirect: "/app/me" };
    }

    // Fetch time cards for the current profile
    const { data: timeCards, error } = await supabase
        .from("time_cards")
        .select("*")
        .eq("user_id", appUser.current_profile_id)
        .order("work_date", { ascending: false })
        .order("clock_in", { ascending: false });

    if (error) {
        throw new Error(`Failed to fetch timecards: ${error.message}`);
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("*, stores(show_break_columns, show_timecard, location_check_enabled, latitude, longitude, location_radius)")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    const store = profile?.stores as any;
    if (store && store.show_timecard === false) {
        return { redirect: "/login" };
    }

    const showBreakColumns = store ? (store.show_break_columns ?? false) : false;

    // Get today's latest time card (use JST)
    const today = getJSTDateString();
    const latestTimeCard = timeCards?.find((card) => card.work_date === today) || null;

    // Fetch pickup history
    const { data: pickupRows } = await supabase
        .from("time_cards")
        .select("pickup_destination")
        .eq("user_id", appUser.current_profile_id)
        .not("pickup_destination", "is", null);

    const pickupHistory = Array.from(new Set(
        (pickupRows || [])
            .map((row: any) => row.pickup_destination)
            .filter((dest: string | null) => dest && dest.trim() !== "")
    )) as string[];

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
            latestTimeCard,
            pickupHistory,
        }
    };
}
