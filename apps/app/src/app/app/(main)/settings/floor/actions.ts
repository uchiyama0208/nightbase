"use server";

import { getAuthContext } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";

/**
 * フロア設定を更新
 */
export async function updateFloorSettings(formData: FormData): Promise<void> {
    const { supabase, storeId } = await getAuthContext();

    const rotationTime = formData.get("rotation_time");
    const rotationTimeValue = rotationTime ? parseInt(rotationTime as string) : null;

    const { error } = await supabase
        .from("stores")
        .update({
            rotation_time: rotationTimeValue,
        })
        .eq("id", storeId);

    if (error) {
        console.error("Error updating floor settings:", error);
        throw new Error(`Failed to update floor settings: ${error.message || JSON.stringify(error)}`);
    }

    revalidatePath("/app/settings/floor");
}
