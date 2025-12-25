"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabaseServiceClient";

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

function getTodayDate() {
  return new Date().toLocaleDateString("ja-JP", {
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

  // Get or create pickup destination if needed
  let pickupDestinationId: string | null = null;
  if (pickupRequired && pickupDestination) {
    pickupDestinationId = await getOrCreatePickupDestination(supabase, storeId, pickupDestination);
  }

  const payload: any = {
    profile_id: profileId,
    store_id: storeId,
    work_date: workDate,
    clock_in: now.toISOString(),
    scheduled_start_time: scheduledStartTime,
    status: "working",
    source: "timecard",
    pickup_required: pickupRequired,
    pickup_destination_id: pickupDestinationId,
  };

  const { data, error } = await supabase.from("work_records").insert(payload).select("id").single();

  if (error) {
    console.error("Error inserting work record:", error);
  }

  // Save question answers if provided
  if (data?.id) {
    // Get all question answers from formData
    const questionAnswers: { questionId: string; value: string }[] = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("question_") && typeof value === "string") {
        const questionId = key.replace("question_", "");
        if (value.trim()) {
          questionAnswers.push({ questionId, value: value.trim() });
        }
      }
    }

    // Save each answer
    for (const answer of questionAnswers) {
      await supabase.from("timecard_question_answers").upsert(
        {
          work_record_id: data.id,
          question_id: answer.questionId,
          value: answer.value,
          timing: "clock_in",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "work_record_id,question_id,timing" }
      );
    }
  }

  // ダッシュボードの出勤中人数カードを更新
  revalidatePath("/app/dashboard");
  revalidatePath("/app/attendance");
}

export async function tabletDeletePickupDestination(
  storeId: string,
  profileId: string,
  destinationName: string
): Promise<void> {
  if (!storeId || !profileId || !destinationName) {
    return;
  }

  const supabase = createServiceRoleClient() as any;

  // Verify the profile belongs to this store
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, store_id")
    .eq("id", profileId)
    .maybeSingle();

  if (!profile || profile.store_id !== storeId) {
    return;
  }

  // Find the pickup destination by name
  const { data: destination } = await supabase
    .from("pickup_destinations")
    .select("id")
    .eq("store_id", storeId)
    .eq("name", destinationName)
    .maybeSingle();

  if (!destination) {
    return;
  }

  // Clear this destination from user's work_records (only their own)
  await supabase
    .from("work_records")
    .update({ pickup_destination_id: null, pickup_required: false })
    .eq("profile_id", profileId)
    .eq("pickup_destination_id", destination.id);

  revalidatePath(`/tablet/timecard/${storeId}`);
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

    // Save question answers if provided
    const questionAnswers: { questionId: string; value: string }[] = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("question_") && typeof value === "string") {
        const questionId = key.replace("question_", "");
        if (value.trim()) {
          questionAnswers.push({ questionId, value: value.trim() });
        }
      }
    }

    // Save each answer
    for (const answer of questionAnswers) {
      await supabase.from("timecard_question_answers").upsert(
        {
          work_record_id: record.id,
          question_id: answer.questionId,
          value: answer.value,
          timing: "clock_out",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "work_record_id,question_id,timing" }
      );
    }
  }

  // ダッシュボードの出勤中人数カードを更新
  revalidatePath("/app/dashboard");
  if (record) {
    revalidatePath("/app/attendance");
  }
}
