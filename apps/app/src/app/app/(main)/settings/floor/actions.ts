"use server";

import { createServerClient } from "@/lib/supabaseServerClient";
import { revalidatePath } from "next/cache";

export async function updateFloorSettings(formData: FormData) {
    const supabase = await createServerClient() as any;
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("Unauthorized");
    }

    // Get the user's current profile
    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .single();

    if (!appUser?.current_profile_id) {
        throw new Error("Profile not found");
    }

    // Get the profile's store
    const { data: profile } = await supabase
        .from("profiles")
        .select("store_id")
        .eq("id", appUser.current_profile_id)
        .single();

    if (!profile?.store_id) {
        throw new Error("Store not found");
    }

    const rotationTime = formData.get("rotation_time");
    const rotationTimeValue = rotationTime ? parseInt(rotationTime as string) : null;

    const { error } = await supabase
        .from("stores")
        .update({
            rotation_time: rotationTimeValue,
        })
        .eq("id", profile.store_id);

    if (error) {
        console.error("Error updating floor settings:", error);
        throw new Error(`Failed to update floor settings: ${error.message || JSON.stringify(error)}`);
    }

    revalidatePath("/app/settings/floor");
}
