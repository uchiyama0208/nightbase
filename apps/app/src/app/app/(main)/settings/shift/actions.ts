"use server";

import { createServerClient } from "@/lib/supabaseServerClient";
import { revalidatePath } from "next/cache";

interface ShiftSettings {
    default_cast_start_time: string;
    default_cast_end_time: string;
    default_staff_start_time: string;
    default_staff_end_time: string;
    automation: {
        enabled: boolean;
        target_roles: string[];
        period_type: "week" | "half_month" | "month";
        send_day_offset: number;
        send_hour: number;
        reminder_enabled: boolean;
        reminder_day_offset: number;
        reminder_hour: number;
    };
}

export async function updateShiftSettings(storeId: string, settings: ShiftSettings) {
    const supabase = await createServerClient() as any;

    // Update store defaults
    const { error: storeError } = await supabase
        .from("stores")
        .update({
            default_cast_start_time: settings.default_cast_start_time,
            default_cast_end_time: settings.default_cast_end_time,
            default_staff_start_time: settings.default_staff_start_time,
            default_staff_end_time: settings.default_staff_end_time,
        })
        .eq("id", storeId);

    if (storeError) {
        console.error("Failed to update store defaults:", storeError);
        return { success: false, error: storeError.message };
    }

    // Upsert automation settings
    const { error: automationError } = await supabase
        .from("shift_automation_settings")
        .upsert({
            store_id: storeId,
            enabled: settings.automation.enabled,
            target_roles: settings.automation.target_roles,
            period_type: settings.automation.period_type,
            send_day_offset: settings.automation.send_day_offset,
            send_hour: settings.automation.send_hour,
            reminder_enabled: settings.automation.reminder_enabled,
            reminder_day_offset: settings.automation.reminder_day_offset,
            reminder_hour: settings.automation.reminder_hour,
            updated_at: new Date().toISOString(),
        }, {
            onConflict: "store_id",
        });

    if (automationError) {
        console.error("Failed to update automation settings:", automationError);
        return { success: false, error: automationError.message };
    }

    revalidatePath("/app/settings/shift");
    revalidatePath("/app/shifts");

    return { success: true };
}
