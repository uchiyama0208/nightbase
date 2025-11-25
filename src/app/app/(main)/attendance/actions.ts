"use server";

import { createServerClient } from "@/lib/supabaseServerClient";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createServiceRoleClient } from "@/lib/supabaseServiceClient";

export async function createAttendance(formData: FormData) {
    const supabase = await createServerClient();
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

    const targetProfileId = (formData.get("profileId") as string | null) ?? appUser.current_profile_id;

    // Ensure target profile belongs to the same store as current profile
    const { data: currentProfile } = await supabase
        .from("profiles")
        .select("id, store_id")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    if (!currentProfile || !currentProfile.store_id) {
        throw new Error("Current profile has no store");
    }

    const { data: targetProfile } = await supabase
        .from("profiles")
        .select("id, store_id")
        .eq("id", targetProfileId)
        .maybeSingle();

    if (!targetProfile || targetProfile.store_id !== currentProfile.store_id) {
        throw new Error("Selected profile does not belong to current store");
    }

    const date = formData.get("date") as string;
    const status = formData.get("status") as string;
    const startTime = formData.get("startTime") as string;
    const endTime = formData.get("endTime") as string;

    // Convert HH:MM or HH:MM:SS to ISO string for the given date
    const timeToISO = (timeStr: string | null, dateStr: string): string | null => {
        if (!timeStr) return null;
        const normalized = /^\d{2}:\d{2}$/.test(timeStr) ? `${timeStr}:00` : timeStr;
        return new Date(`${dateStr}T${normalized}`).toISOString();
    };

    // Prepare time_cards payload based on status
    const payload: any = {
        user_id: targetProfileId,
        work_date: date,
    };

    // Map status to clock_in/clock_out and scheduled times
    if (status === "working" || status === "finished") {
        const clockInTime = timeToISO(startTime, date) || new Date(`${date}T00:00:00`).toISOString();
        payload.clock_in = clockInTime;
        payload.scheduled_start_time = clockInTime;
    } else {
        payload.clock_in = null;
        payload.scheduled_start_time = null;
    }

    // Save end time if provided, regardless of status
    if (endTime) {
        const clockOutTime = timeToISO(endTime, date);
        payload.clock_out = clockOutTime;
        payload.scheduled_end_time = clockOutTime;
    } else if (status === "finished") {
        // If no end time but status is finished, use end of day
        const clockOutTime = new Date(`${date}T23:59:59`).toISOString();
        payload.clock_out = clockOutTime;
        payload.scheduled_end_time = clockOutTime;
    } else {
        // Clear end time for working/scheduled/absent statuses when no end time provided
        payload.clock_out = null;
        payload.scheduled_end_time = null;
    }

    const { error } = await supabase.from("time_cards").insert(payload);

    if (error) {
        console.error("Error creating time card:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        throw new Error(`Failed to create time card: ${error.message || JSON.stringify(error)}`);
    }

    console.log("Time card created successfully!");

    revalidatePath("/app/attendance");
    return { success: true };
}

export async function updateAttendance(formData: FormData) {
    const supabase = await createServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("User not authenticated");
    }

    const id = formData.get("id") as string;
    const profileId = formData.get("profileId") as string;
    const date = formData.get("date") as string;
    const status = formData.get("status") as string;
    const startTime = formData.get("startTime") as string;
    const endTime = formData.get("endTime") as string;

    if (!id) {
        throw new Error("Time card id is required");
    }

    // Resolve current profile and store
    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    if (!appUser?.current_profile_id) {
        throw new Error("No active profile found for current user");
    }

    const { data: currentProfile } = await supabase
        .from("profiles")
        .select("id, store_id")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    if (!currentProfile || !currentProfile.store_id) {
        throw new Error("Current profile has no store");
    }

    // Ensure selected profile belongs to the same store
    if (profileId) {
        const { data: targetProfile } = await supabase
            .from("profiles")
            .select("id, store_id")
            .eq("id", profileId)
            .maybeSingle();

        if (!targetProfile || targetProfile.store_id !== currentProfile.store_id) {
            throw new Error("Selected profile does not belong to current store");
        }
    }

    // Convert HH:MM or HH:MM:SS to ISO string for the given date
    const timeToISO = (timeStr: string | null, dateStr: string): string | null => {
        if (!timeStr) return null;
        const normalized = /^\d{2}:\d{2}$/.test(timeStr) ? `${timeStr}:00` : timeStr;
        return new Date(`${dateStr}T${normalized}`).toISOString();
    };

    // Prepare update payload
    const payload: any = {
        user_id: profileId || appUser.current_profile_id,
        work_date: date,
    };

    // Map status to clock_in/clock_out and scheduled times
    if (status === "working" || status === "finished") {
        const clockInTime = timeToISO(startTime, date) || new Date(`${date}T00:00:00`).toISOString();
        payload.clock_in = clockInTime;
        payload.scheduled_start_time = clockInTime;
    } else {
        payload.clock_in = null;
        payload.scheduled_start_time = null;
    }

    // Save end time if provided, regardless of status
    if (endTime) {
        const clockOutTime = timeToISO(endTime, date);
        payload.clock_out = clockOutTime;
        payload.scheduled_end_time = clockOutTime;
    } else if (status === "finished") {
        // If no end time but status is finished, use end of day
        const clockOutTime = new Date(`${date}T23:59:59`).toISOString();
        payload.clock_out = clockOutTime;
        payload.scheduled_end_time = clockOutTime;
    } else {
        // Clear end time for working/scheduled/absent statuses when no end time provided
        payload.clock_out = null;
        payload.scheduled_end_time = null;
    }

    const { error } = await supabase
        .from("time_cards")
        .update(payload)
        .eq("id", id);

    if (error) {
        console.error("Error updating time card:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        throw new Error(`Failed to update time card: ${error.message || JSON.stringify(error)}`);
    }

    revalidatePath("/app/attendance");
    return { success: true };
}

export async function importAttendanceFromCsv(formData: FormData) {
    const file = formData.get("file") as File | null;
    if (!file) {
        throw new Error("CSVファイルが指定されていません");
    }

    const roleFilter = (formData.get("attendanceRole") as string | null) ?? null; // "cast" | "staff"

    const supabase = await createServerClient();
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

    const { data: currentProfile } = await supabase
        .from("profiles")
        .select("store_id")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    if (!currentProfile?.store_id) {
        throw new Error("Current profile has no store");
    }

    // Build name -> profile map for the selected role in this store
    const { data: storeProfiles } = await supabase
        .from("profiles")
        .select("id, display_name, role")
        .eq("store_id", currentProfile.store_id);

    const nameToProfileId = new Map<string, string | null>();
    for (const p of storeProfiles || []) {
        const displayName = (p.display_name as string | null)?.trim().toLowerCase();
        if (!displayName) continue;

        const role = p.role as string | null;
        if (roleFilter === "cast" && role !== "cast") continue;
        if (roleFilter === "staff" && role !== "staff") continue;

        if (!nameToProfileId.has(displayName)) {
            nameToProfileId.set(displayName, p.id as string);
        } else {
            // ambiguous
            nameToProfileId.set(displayName, null);
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
        date: header.indexOf("date"),
        status: header.indexOf("status"),
        start_time: header.indexOf("start_time"),
        end_time: header.indexOf("end_time"),
    };

    if (colIndex.display_name === -1 || colIndex.date === -1 || colIndex.status === -1) {
        throw new Error("CSVヘッダーに display_name, date, status カラムが必要です");
    }

    const normalizeTime = (value: string | undefined): string | null => {
        const v = (value || "").trim();
        if (!v) return null;
        if (/^\d{2}:\d{2}$/.test(v)) return `${v}:00`;
        if (/^\d{2}:\d{2}:\d{2}$/.test(v)) return v;
        return null;
    };

    const toInsert: any[] = [];

    for (let i = 1; i < lines.length; i++) {
        const columns = lines[i].split(",");
        const nameRaw = (columns[colIndex.display_name] || "").trim();
        const date = (columns[colIndex.date] || "").trim();
        const status = (columns[colIndex.status] || "").trim();

        if (!nameRaw || !date || !status) continue;

        const key = nameRaw.toLowerCase();
        const profileId = nameToProfileId.get(key);
        if (!profileId) continue; // 不明・曖昧ならスキップ

        const startTime = colIndex.start_time !== -1 ? columns[colIndex.start_time] : undefined;
        const endTime = colIndex.end_time !== -1 ? columns[colIndex.end_time] : undefined;

        // Convert to time_cards format
        const payload: any = {
            user_id: profileId,
            work_date: date,
        };

        // Map status to clock_in/clock_out
        if (status === "working" || status === "finished") {
            const normalizedStart = normalizeTime(startTime);
            payload.clock_in = normalizedStart
                ? new Date(`${date}T${normalizedStart}`).toISOString()
                : new Date(`${date}T00:00:00`).toISOString();
        } else {
            payload.clock_in = null;
        }

        if (status === "finished") {
            const normalizedEnd = normalizeTime(endTime);
            payload.clock_out = normalizedEnd
                ? new Date(`${date}T${normalizedEnd}`).toISOString()
                : new Date(`${date}T23:59:59`).toISOString();
        } else {
            payload.clock_out = null;
        }

        toInsert.push(payload);
    }

    if (toInsert.length === 0) {
        revalidatePath("/app/attendance");
        return;
    }

    const { error } = await supabase.from("time_cards").insert(toInsert);

    if (error) {
        console.error("Error importing time cards from CSV:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        throw new Error("CSVのインポート中にエラーが発生しました");
    }

    revalidatePath("/app/attendance");
}

export async function getAttendanceRecords(profileId: string) {
    const supabase = await createServerClient();

    // Basic auth check
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("User not authenticated");
    }

    // Fetch time cards for the profile
    // Order by work_date desc
    const { data: records, error } = await supabase
        .from("time_cards")
        .select("*")
        .eq("user_id", profileId)
        .order("work_date", { ascending: false });

    if (error) {
        console.error("Error fetching attendance records:", error);
        throw new Error("勤怠履歴の取得に失敗しました");
    }

    return records;
}

export async function getAttendanceData(roleParam?: string) {
    const supabase = await createServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

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

    // Fetch current profile to get store and role
    const { data: currentProfile } = await supabase
        .from("profiles")
        .select("id, store_id, role, stores(*)")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    if (!currentProfile || !currentProfile.store_id) {
        return { redirect: "/app/me" };
    }

    const store = currentProfile.stores as any;
    if (store && store.show_attendance === false) {
        return { redirect: "/app/timecard" };
    }

    // Role check
    if (currentProfile.role !== "staff") {
        return { redirect: "/app/timecard" };
    }

    const roleFilter: "staff" | "cast" = roleParam === "staff" ? "staff" : "cast";

    // Fetch all profiles for the current store
    const { data: storeProfiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, display_name, real_name, role, store_id")
        .eq("store_id", currentProfile.store_id);

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

    // Fetch time_cards for the last 30 days
    const serviceSupabase = createServiceRoleClient();
    const today = new Date();
    const from = new Date();
    from.setDate(today.getDate() - 30);
    const fromStr = from.toISOString().split("T")[0];

    let allRecords: any[] = [];

    if (profileIds.length > 0) {
        const { data: timeCardRows, error: timeCardsError } = await serviceSupabase
            .from("time_cards")
            .select("id, user_id, work_date, clock_in, clock_out, scheduled_start_time, scheduled_end_time, forgot_clockout")
            .in("user_id", profileIds)
            .gte("work_date", fromStr)
            .order("work_date", { ascending: false });

        if (timeCardsError) {
            console.error("Error fetching time cards for attendance:", timeCardsError);
        } else {
            const timeCards = (timeCardRows || []) as any[];

            allRecords = timeCards.map((tc) => {
                let status = "scheduled";
                if (tc.forgot_clockout) {
                    status = "forgot_clockout";
                } else if (tc.clock_out) {
                    status = "finished";
                } else if (tc.clock_in) {
                    status = "working";
                }

                // Format times for display (HH:MM)
                const formatTimeStr = (isoStr: string | null) => {
                    if (!isoStr) return null;
                    const date = new Date(isoStr);
                    const hours = String(date.getHours()).padStart(2, "0");
                    const minutes = String(date.getMinutes()).padStart(2, "0");
                    return `${hours}:${minutes}`;
                };

                const prof = profileMap[tc.user_id];

                return {
                    id: tc.id,
                    user_id: tc.user_id,
                    date: tc.work_date,
                    name: prof ? prof.display_name : "不明",
                    status,
                    // Use scheduled times if available, otherwise fall back to actual clock times
                    start_time: formatTimeStr(tc.scheduled_start_time || tc.clock_in),
                    end_time: formatTimeStr(tc.scheduled_end_time || tc.clock_out),
                    clock_in: formatTimeStr(tc.clock_in),
                    clock_out: formatTimeStr(tc.clock_out),
                };
            });

            // Sort by date desc, then time desc
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

export async function deleteAttendance(id: string) {
    const supabase = await createServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("User not authenticated");
    }

    if (!id) {
        throw new Error("Time card id is required");
    }

    // Resolve current profile and store
    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    if (!appUser?.current_profile_id) {
        throw new Error("No active profile found for current user");
    }

    const { data: currentProfile } = await supabase
        .from("profiles")
        .select("id, store_id")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    if (!currentProfile || !currentProfile.store_id) {
        throw new Error("Current profile has no store");
    }

    // Verify the time card belongs to a user in the same store
    // Fetch the time card first
    const { data: timeCard } = await supabase
        .from("time_cards")
        .select("user_id")
        .eq("id", id)
        .maybeSingle();

    if (!timeCard) {
        throw new Error("Time card not found");
    }

    const { data: targetProfile } = await supabase
        .from("profiles")
        .select("store_id")
        .eq("id", timeCard.user_id)
        .maybeSingle();

    if (!targetProfile || targetProfile.store_id !== currentProfile.store_id) {
        throw new Error("Cannot delete time card from another store");
    }

    const { error } = await supabase
        .from("time_cards")
        .delete()
        .eq("id", id);

    if (error) {
        console.error("Error deleting time card:", error);
        throw new Error("Failed to delete time card");
    }

    revalidatePath("/app/attendance");
    return { success: true };
}
