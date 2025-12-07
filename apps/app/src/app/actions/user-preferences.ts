"use server";

import { createServerClient } from "@/lib/supabaseServerClient";

export async function updateLineFriendshipPreference(hidePrompt: boolean) {
    const supabase = await createServerClient() as any;

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("User not authenticated");
    }

    const { error } = await (supabase as any)
        .from("users")
        .update({ hide_line_friendship_prompt: hidePrompt })
        .eq("id", user.id);

    if (error) {
        console.error("Error updating LINE friendship preference:", error);
        throw new Error("Failed to update preference");
    }

    return { success: true };
}

export async function getLineFriendshipPreference() {
    const supabase = await createServerClient() as any;

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { hidePrompt: false };
    }

    const { data, error } = await (supabase as any)
        .from("users")
        .select("hide_line_friendship_prompt")
        .eq("id", user.id)
        .maybeSingle();

    if (error) {
        console.error("Error fetching LINE friendship preference:", error);
        return { hidePrompt: false };
    }

    return { hidePrompt: data?.hide_line_friendship_prompt || false };
}
