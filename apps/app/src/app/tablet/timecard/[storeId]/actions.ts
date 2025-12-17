"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabaseServiceClient";

function getTodayDate() {
  const now = new Date();
  const jstDate = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jstDate.toISOString().split("T")[0];
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

export async function tabletClockIn(formData: FormData) {
  const storeId = (formData.get("store_id") as string | null)?.trim();
  const profileId = (formData.get("profile_id") as string | null)?.trim();
  const pickupRequiredRaw = (formData.get("pickup_required") as string | null)?.trim();
  const pickupPreset = (formData.get("pickup_destination_preset") as string | null)?.trim();
  const pickupCustom = (formData.get("pickup_destination_custom") as string | null)?.trim();

  if (!storeId || !profileId) {
    return;
  }

  const supabase = createServiceRoleClient() as any;

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("id, store_id")
    .eq("id", profileId)
    .maybeSingle();

  const profile = profileRow as { id: string; store_id: string | null } | null;

  if (!profile || profile.store_id !== storeId) {
    return;
  }

  // Get store settings for time rounding
  const { data: settings } = await supabase
    .from("store_settings")
    .select("time_rounding_enabled, time_rounding_method, time_rounding_minutes")
    .eq("store_id", storeId)
    .maybeSingle();

  const now = new Date();
  const workDate = getTodayDate();

  // Calculate scheduled start time if rounding is enabled
  let scheduledStartTime: string | null = null;
  if (settings?.time_rounding_enabled) {
    const rounded = roundTime(
      now,
      settings.time_rounding_method || "round",
      settings.time_rounding_minutes || 15
    );
    scheduledStartTime = rounded.toISOString();
  }

  const pickupRequired = pickupRequiredRaw === "yes";
  const pickupDestination = pickupCustom || pickupPreset || null;

  const payload: any = {
    profile_id: profileId,
    store_id: storeId,
    work_date: workDate,
    clock_in: now.toISOString(),
    scheduled_start_time: scheduledStartTime,
    status: "working",
    source: "timecard",
  };

  if (pickupRequired) {
    payload.pickup_required = true;
    if (pickupDestination) {
      payload.pickup_destination = pickupDestination;
    }
  } else {
    payload.pickup_required = false;
  }

  console.log("Inserting work record:", payload);
  const { data, error } = await supabase.from("work_records").insert(payload).select();

  if (error) {
    console.error("Error inserting work record:", error);
  } else {
    console.log("Work record inserted successfully:", data);
  }

  // ダッシュボードの出勤中人数カードを更新
  revalidatePath("/app/dashboard");
  revalidatePath("/app/attendance");
}

export async function tabletClockOut(formData: FormData) {
  const storeId = (formData.get("store_id") as string | null)?.trim();
  const profileId = (formData.get("profile_id") as string | null)?.trim();

  if (!storeId || !profileId) {
    return;
  }

  const supabase = createServiceRoleClient() as any;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, store_id")
    .eq("id", profileId)
    .maybeSingle();

  if (!profile || profile.store_id !== storeId) {
    return;
  }

  // Get store settings for time rounding
  const { data: settings } = await supabase
    .from("store_settings")
    .select("time_rounding_enabled, time_rounding_method, time_rounding_minutes")
    .eq("store_id", storeId)
    .maybeSingle();

  const today = getTodayDate();
  const yesterdayDate = new Date(new Date(today).getTime() - 24 * 60 * 60 * 1000);
  const yesterday = yesterdayDate.toISOString().split("T")[0];
  const now = new Date();

  // Calculate scheduled end time if rounding is enabled
  let scheduledEndTime: string | null = null;
  if (settings?.time_rounding_enabled) {
    const rounded = roundTime(
      now,
      settings.time_rounding_method || "round",
      settings.time_rounding_minutes || 15
    );
    scheduledEndTime = rounded.toISOString();
  }

  const { data: records } = await supabase
    .from("work_records")
    .select("id, work_date, clock_in, clock_out, created_at")
    .eq("profile_id", profileId)
    .in("work_date", [yesterday, today])
    .is("clock_out", null)
    .order("created_at", { ascending: false })
    .limit(1);

  const typedRecords = (records || []) as { id: string }[];
  const record = typedRecords.length > 0 ? typedRecords[0] : null;

  if (record) {
    await supabase
      .from("work_records")
      .update({
        clock_out: now.toISOString(),
        scheduled_end_time: scheduledEndTime,
        status: "completed",
      } as any)
      .eq("id", record.id);
  }

  // ダッシュボードの出勤中人数カードを更新
  revalidatePath("/app/dashboard");
  if (record) {
    revalidatePath("/app/attendance");
  }
}
