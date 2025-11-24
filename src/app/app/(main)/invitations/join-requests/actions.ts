"use server";

import { createServerClient } from "@/lib/supabaseServerClient";
import { revalidatePath } from "next/cache";

export async function approveJoinRequest(profileId: string, role: string) {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: "Unauthorized" };
    }

    // Update profile to approved status with selected role
    const { error } = await supabase
        .from("profiles")
        .update({
            approval_status: "approved",
            role: role,
        })
        .eq("id", profileId);

    if (error) {
        console.error("Error approving join request:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/app/invitations/join-requests");
    return { success: true };
}

export async function rejectJoinRequest(profileId: string) {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: "Unauthorized" };
    }

    // Update profile to rejected status
    const { error } = await supabase
        .from("profiles")
        .update({
            approval_status: "rejected",
        })
        .eq("id", profileId);

    if (error) {
        console.error("Error rejecting join request:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/app/invitations/join-requests");
    return { success: true };
}
