"use server";

import { createServerClient } from "@/lib/supabaseServerClient";
import { revalidatePath } from "next/cache";

export async function approveJoinRequest(
    joinRequestId: string,
    role: string | null,
    displayName?: string,
    displayNameKana?: string,
    realName?: string,
    realNameKana?: string
) {
    const supabase = await createServerClient() as any;
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: "Unauthorized" };
    }

    // Get join request to find profile_id
    const { data: joinRequest, error: fetchError } = await supabase
        .from("join_requests")
        .select("profile_id, requested_role")
        .eq("id", joinRequestId)
        .single();

    if (fetchError || !joinRequest) {
        console.error("Error fetching join request:", fetchError);
        return { success: false, error: "申請が見つかりません" };
    }

    // Update profile with role and names
    const profileUpdateData: Record<string, any> = {};

    // roleがnullの場合は申請時のroleを使用
    if (role !== null) {
        profileUpdateData.role = role;
    } else {
        profileUpdateData.role = joinRequest.requested_role;
    }

    if (displayName !== undefined) {
        profileUpdateData.display_name = displayName;
    }
    if (displayNameKana !== undefined) {
        profileUpdateData.display_name_kana = displayNameKana;
    }
    if (realName !== undefined) {
        profileUpdateData.real_name = realName;
    }
    if (realNameKana !== undefined) {
        profileUpdateData.real_name_kana = realNameKana;
    }

    // Update profile
    if (Object.keys(profileUpdateData).length > 0) {
        const { error: profileError } = await supabase
            .from("profiles")
            .update(profileUpdateData)
            .eq("id", joinRequest.profile_id);

        if (profileError) {
            console.error("Error updating profile:", profileError);
            return { success: false, error: profileError.message };
        }
    }

    // Update join request status
    const { error: updateError } = await supabase
        .from("join_requests")
        .update({ status: "approved", updated_at: new Date().toISOString() })
        .eq("id", joinRequestId);

    if (updateError) {
        console.error("Error approving join request:", updateError);
        return { success: false, error: updateError.message };
    }

    revalidatePath("/app/invitations");
    return { success: true };
}

export async function rejectJoinRequest(joinRequestId: string) {
    const supabase = await createServerClient() as any;
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: "Unauthorized" };
    }

    // Update join request status to rejected
    const { error } = await supabase
        .from("join_requests")
        .update({ status: "rejected", updated_at: new Date().toISOString() })
        .eq("id", joinRequestId);

    if (error) {
        console.error("Error rejecting join request:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/app/invitations");
    return { success: true };
}

export async function deleteJoinRequest(joinRequestId: string) {
    const supabase = await createServerClient() as any;
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: "Unauthorized" };
    }

    // Get join request to find profile_id
    const { data: joinRequest, error: fetchError } = await supabase
        .from("join_requests")
        .select("profile_id")
        .eq("id", joinRequestId)
        .single();

    if (fetchError || !joinRequest) {
        console.error("Error fetching join request:", fetchError);
        return { success: false, error: "申請が見つかりません" };
    }

    // Delete the join request
    const { error: deleteRequestError } = await supabase
        .from("join_requests")
        .delete()
        .eq("id", joinRequestId);

    if (deleteRequestError) {
        console.error("Error deleting join request:", deleteRequestError);
        return { success: false, error: deleteRequestError.message };
    }

    // Delete the profile as well
    const { error: deleteProfileError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", joinRequest.profile_id);

    if (deleteProfileError) {
        console.error("Error deleting profile:", deleteProfileError);
        // Don't return error since join request was deleted successfully
    }

    revalidatePath("/app/invitations");
    return { success: true };
}
