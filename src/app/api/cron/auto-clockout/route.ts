"use server";

import { createServiceRoleClient } from "@/lib/supabaseServiceClient";
import { NextResponse } from "next/server";

/**
 * Auto clock-out function to be called at day cutoff time
 * This should be triggered by a cron job or scheduled function
 */
export async function GET() {
    try {
        const results = (await processAutoClockOut()) ?? [];
        return NextResponse.json({
            success: true,
            processed: results.length,
            results
        });
    } catch (error) {
        console.error("Auto clock-out error:", error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error"
        }, { status: 500 });
    }
}

async function processAutoClockOut() {
    const supabase = createServiceRoleClient();

    // Get all stores with auto clock-out enabled
    const { data } = await supabase
        .from("stores")
        .select("id, day_switch_time, time_rounding_enabled, time_rounding_method, time_rounding_minutes, auto_clockout_enabled")
        .eq("auto_clockout_enabled", true);

    const stores = (data ?? []) as any[];

    if (stores.length === 0) {
        console.log("No stores with auto clock-out enabled");
        return [];
    }

    const now = new Date();
    const currentHour = now.getHours();
    const results = [];

    for (const store of stores) {
        // Get the cutoff time for this store (day_switch_time from stores table)
        const switchTime = store.day_switch_time as string | null;
        const cutoffTime = switchTime || "05:00:00";
        const [cutoffHourString, cutoffMinuteString] = cutoffTime.split(":");
        const cutoffHour = parseInt(cutoffHourString, 10);
        const cutoffMinute = parseInt(cutoffMinuteString || "0", 10);

        // If cutoff hour is invalid, skip this store
        if (Number.isNaN(cutoffHour)) {
            continue;
        }

        // Process this store only when the current hour matches its cutoff hour
        if (currentHour !== cutoffHour) {
            continue;
        }

        // Calculate the cutoff datetime for this store
        const cutoffDate = new Date(now);
        cutoffDate.setHours(cutoffHour, cutoffMinute, 0, 0);

        // With an hourly cron, we always process the previous business day
        const targetDate = new Date(now);
        targetDate.setDate(targetDate.getDate() - 1);
        const workDate = targetDate.toISOString().split("T")[0];

        // Find all time cards that are still clocked in (no clock_out) for this work_date
        const { data: openTimeCards } = await supabase
            .from("time_cards")
            .select("id, user_id, clock_in, profiles(store_id)")
            .eq("work_date", workDate)
            .is("clock_out", null);

        if (!openTimeCards || openTimeCards.length === 0) {
            continue;
        }

        // Filter to only this store's time cards
        const storeTimeCards = openTimeCards.filter((tc: any) => {
            const profile = tc.profiles as any;
            return profile?.store_id === store.id;
        });

        // Auto clock-out each card at the cutoff time
        for (const raw of storeTimeCards as any[]) {
            const timeCard = raw as any;
            let clockOutTime = new Date(cutoffDate);

            // Apply time rounding if enabled
            if (store.time_rounding_enabled) {
                clockOutTime = roundTime(
                    clockOutTime,
                    store.time_rounding_method || "round",
                    store.time_rounding_minutes || 15
                );
            }

            const scheduledEndTime = store.time_rounding_enabled ? clockOutTime.toISOString() : null;

            await (supabase.from("time_cards") as any)
                .update({
                    clock_out: cutoffDate.toISOString(),
                    scheduled_end_time: scheduledEndTime,
                    forgot_clockout: true,
                })
                .eq("id", timeCard.id);

            results.push({
                timeCardId: timeCard.id,
                userId: timeCard.user_id,
                storeId: store.id,
                workDate,
                clockOutTime: cutoffDate.toISOString(),
            });
        }
    }

    console.log(`Auto clock-out processed ${results.length} time cards`);
    return results;
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
