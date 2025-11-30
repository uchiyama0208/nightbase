"use server";

import { createServerClient } from "@/lib/supabaseServerClient";
import { TableSession, CastAssignment, Order } from "@/types/floor";
import { revalidatePath } from "next/cache";

export async function getActiveSessions() {
    const supabase = await createServerClient();

    // まずセッションを取得
    const { data: sessions, error: sessionsError } = await supabase
        .from("table_sessions")
        .select(`*, orders(*)`)
        .is("end_time", null);

    if (sessionsError) {
        console.error("Error fetching sessions:", sessionsError);
        return [];
    }

    // 各セッションのcast_assignmentsを取得
    const sessionsWithAssignments = await Promise.all(
        (sessions || []).map(async (session) => {
            const { data: assignments, error: assignmentsError } = await supabase
                .from("cast_assignments")
                .select("*")
                .eq("table_session_id", session.id);

            if (assignmentsError) {
                console.error("Error fetching assignments:", assignmentsError);
                return { ...session, cast_assignments: [] };
            }

            // 各assignmentのprofilesを取得
            const assignmentsWithProfiles = await Promise.all(
                (assignments || []).map(async (assignment) => {
                    const { data: castProfile } = await supabase
                        .from("profiles")
                        .select("*")
                        .eq("id", assignment.cast_id)
                        .single();

                    let guestProfile = null;
                    if (assignment.guest_id) {
                        if (assignment.guest_id === assignment.cast_id) {
                            // If it's a guest assignment, use the cast profile (which is the guest profile)
                            guestProfile = castProfile;
                        } else {
                            // If it's a cast assignment linked to a guest, fetch the guest profile
                            const { data } = await supabase
                                .from("profiles")
                                .select("*")
                                .eq("id", assignment.guest_id)
                                .single();
                            guestProfile = data;
                        }
                    }

                    return {
                        ...assignment,
                        profiles: castProfile,
                        guest_profile: guestProfile
                    };
                })
            );

            return { ...session, cast_assignments: assignmentsWithProfiles };
        })
    );

    return sessionsWithAssignments;
}

export async function createSession(tableId?: string | null, mainGuestId?: string, pricingSystemId?: string) {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: profile } = await supabase
        .from("profiles")
        .select("store_id")
        .eq("user_id", user.id)
        .single();

    if (!profile?.store_id) throw new Error("No store found");

    const { data, error } = await supabase
        .from("table_sessions")
        .insert({
            store_id: profile.store_id,
            table_id: tableId || null,
            guest_count: 1,
            main_guest_id: mainGuestId,
            pricing_system_id: pricingSystemId || null,
            status: 'active'
        })
        .select()
        .single();

    if (error) throw error;
    revalidatePath("/app/floor");
    revalidatePath("/app/slips");
    return data;
}

export async function assignCast(
    sessionId: string,
    castId: string,
    status: string,
    guestId?: string | null,
    gridX?: number,
    gridY?: number,
    startTime?: string,
    endTime?: string | null
) {
    const supabase = await createServerClient();

    const { data, error } = await supabase
        .from("cast_assignments")
        .insert({
            table_session_id: sessionId,
            cast_id: castId,
            guest_id: guestId,
            status: status,
            grid_x: gridX,
            grid_y: gridY,
            start_time: startTime || new Date().toISOString(),
            end_time: endTime || null
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function createOrder(
    sessionId: string,
    items: { menuId: string; quantity: number; amount: number }[],
    guestId?: string | null,
    castId?: string | null
) {
    const supabase = await createServerClient();

    const orders = items.map(item => ({
        table_session_id: sessionId,
        menu_id: item.menuId,
        quantity: item.quantity,
        amount: item.amount,
        guest_id: guestId,
        cast_id: castId,
        status: 'pending'
    }));

    const { error } = await supabase
        .from("orders")
        .insert(orders);

    if (error) throw error;
    return { success: true };
}

export async function endAssignment(assignmentId: string) {
    const supabase = await createServerClient();

    const { error } = await supabase
        .from("cast_assignments")
        .update({ end_time: new Date().toISOString() })
        .eq("id", assignmentId);

    if (error) throw error;
    revalidatePath("/app/floor");
    return { success: true };
}

export async function checkoutSession(sessionId: string) {
    const supabase = await createServerClient();

    // 1. Close all active cast assignments
    await supabase
        .from("cast_assignments")
        .update({ end_time: new Date().toISOString() })
        .eq("table_session_id", sessionId)
        .is("end_time", null);

    // 2. Close the session
    const { error } = await supabase
        .from("table_sessions")
        .update({
            end_time: new Date().toISOString(),
            status: 'closed'
        })
        .eq("id", sessionId);

    if (error) throw error;
    revalidatePath("/app/floor");
    return { success: true };
}

export async function closeSession(sessionId: string) {
    return checkoutSession(sessionId);
}

export async function removeCastAssignment(assignmentId: string) {
    const supabase = await createServerClient();

    const { error } = await supabase
        .from("cast_assignments")
        .delete()
        .eq("id", assignmentId);

    if (error) throw error;
    revalidatePath("/app/floor");
    return { success: true };
}

export async function updateCastAssignmentStatus(assignmentId: string, status: string) {
    const supabase = await createServerClient();

    const { error } = await supabase
        .from("cast_assignments")
        .update({ status })
        .eq("id", assignmentId);

    if (error) throw error;
    revalidatePath("/app/floor");
    return { success: true };
}

export async function getMenus() {
    const supabase = await createServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: profile } = await supabase
        .from("profiles")
        .select("store_id")
        .eq("user_id", user.id)
        .single();

    if (!profile?.store_id) return [];

    const { data: menus, error } = await supabase
        .from("menus")
        .select("*, menu_categories(*)")
        .eq("store_id", profile.store_id)
        .order("created_at", { ascending: true });

    if (error) {
        console.error("Error fetching menus:", error);
        return [];
    }

    return menus;
}

export async function getMenuCategories() {
    const supabase = await createServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: profile } = await supabase
        .from("profiles")
        .select("store_id")
        .eq("user_id", user.id)
        .single();

    if (!profile?.store_id) return [];

    const { data: categories, error } = await supabase
        .from("menu_categories")
        .select("*")
        .eq("store_id", profile.store_id)
        .order("sort_order", { ascending: true });

    if (error) {
        console.error("Error fetching menu categories:", error);
        return [];
    }

    return categories;
}

export async function getWaitingCasts() {
    const supabase = await createServerClient();

    // Get current user's store_id
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: profile } = await supabase
        .from("profiles")
        .select("store_id")
        .eq("user_id", user.id)
        .single();

    if (!profile?.store_id) return [];

    // Get all casts who are clocked in but not currently assigned to any active session
    const { data: activeCasts } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .eq("store_id", profile.store_id)
        .eq("role", "cast");

    if (!activeCasts) return [];

    // Get currently assigned cast IDs
    const { data: activeAssignments } = await supabase
        .from("cast_assignments")
        .select("cast_id, table_sessions!inner(status)")
        .is("end_time", null);

    const assignedCastIds = new Set(
        activeAssignments?.map((a: { cast_id: string }) => a.cast_id) || []
    );

    // Filter out assigned casts
    return activeCasts.filter((cast: { id: string }) => !assignedCastIds.has(cast.id));
}
