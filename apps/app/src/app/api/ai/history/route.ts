import { createServerClient } from "@/lib/supabaseServerClient";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const supabase = await createServerClient() as any;

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get current profile
        const { data: appUser } = await supabase
            .from("users")
            .select("current_profile_id")
            .eq("id", user.id)
            .maybeSingle();

        if (!appUser?.current_profile_id) {
            return NextResponse.json({ error: "No profile selected" }, { status: 400 });
        }

        const { data: profile } = await supabase
            .from("profiles")
            .select("id, store_id, role")
            .eq("id", appUser.current_profile_id)
            .maybeSingle();

        if (!profile?.store_id) {
            return NextResponse.json({ error: "No store found" }, { status: 400 });
        }

        // Check if user has admin or staff role
        if (!["admin", "staff"].includes(profile.role)) {
            return NextResponse.json({ error: "Permission denied" }, { status: 403 });
        }

        // Get chat history
        const { data: messages, error } = await supabase
            .from("ai_chat_messages")
            .select("id, role, content, created_at")
            .eq("store_id", profile.store_id)
            .order("created_at", { ascending: true })
            .limit(50);

        if (error) {
            console.error("Error fetching chat history:", error);
            return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
        }

        return NextResponse.json({ messages: messages || [] });
    } catch (error) {
        console.error("Chat history error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// Clear chat history
export async function DELETE() {
    try {
        const supabase = await createServerClient() as any;

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get current profile
        const { data: appUser } = await supabase
            .from("users")
            .select("current_profile_id")
            .eq("id", user.id)
            .maybeSingle();

        if (!appUser?.current_profile_id) {
            return NextResponse.json({ error: "No profile selected" }, { status: 400 });
        }

        const { data: profile } = await supabase
            .from("profiles")
            .select("id, store_id, role")
            .eq("id", appUser.current_profile_id)
            .maybeSingle();

        if (!profile?.store_id) {
            return NextResponse.json({ error: "No store found" }, { status: 400 });
        }

        // Check if user has admin or staff role
        if (!["admin", "staff"].includes(profile.role)) {
            return NextResponse.json({ error: "Permission denied" }, { status: 403 });
        }

        // Delete all chat messages for this store
        const { error } = await supabase
            .from("ai_chat_messages")
            .delete()
            .eq("store_id", profile.store_id);

        if (error) {
            console.error("Error clearing chat history:", error);
            return NextResponse.json({ error: "Failed to clear history" }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Clear history error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
