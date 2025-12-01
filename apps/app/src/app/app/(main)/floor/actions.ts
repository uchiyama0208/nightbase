"use server";

import { createServerClient } from "@/lib/supabaseServerClient";
import { TableSession, CastAssignment, Order } from "@/types/floor";
import { revalidatePath } from "next/cache";

export async function getActiveSessions() {
    const supabase = await createServerClient();

    // まずセッションを取得
    const { data: sessions, error: sessionsError } = await supabase
        .from("table_sessions")
        .select(`*, orders(*, menus(*), profiles!orders_cast_id_fkey(display_name), created_at)`)
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

    // If no pricing system is specified, get the default one
    let finalPricingSystemId = pricingSystemId;
    if (!finalPricingSystemId) {
        const { data: defaultPricingSystem } = await supabase
            .from("pricing_systems")
            .select("id")
            .eq("store_id", profile.store_id)
            .eq("is_default", true)
            .single();

        if (defaultPricingSystem) {
            finalPricingSystemId = defaultPricingSystem.id;
        }
    }

    // Get pricing system details for set fee
    let setFeeAmount = 0;
    if (finalPricingSystemId) {
        const { data: pricingSystem } = await supabase
            .from("pricing_systems")
            .select("set_fee")
            .eq("id", finalPricingSystemId)
            .single();

        if (pricingSystem) {
            setFeeAmount = pricingSystem.set_fee;
        }
    }

    const { data, error } = await supabase
        .from("table_sessions")
        .insert({
            store_id: profile.store_id,
            table_id: tableId || null,
            guest_count: 0,
            main_guest_id: mainGuestId,
            pricing_system_id: finalPricingSystemId || null,
            status: 'active'
        })
        .select()
        .single();

    if (error) throw error;

    // Auto-create Set Fee Order
    if (data && finalPricingSystemId) {
        await createOrder(
            data.id,
            [{
                menuId: "set-fee",
                quantity: 0, // Default to 0 people
                amount: setFeeAmount
            }],
            null,
            null
        );
    }

    revalidatePath("/app/floor");
    revalidatePath("/app/slips");
    return data;
}

export async function assignCast(
    sessionId: string,
    castId: string,
    status: string,
    guestId?: string | null,
    gridX?: number | null,
    gridY?: number | null,
    startTime?: string,
    endTime?: string | null
) {
    const supabase = await createServerClient();

    // Calculate start_time and end_time based on rotation_time if not explicitly provided
    let calculatedStartTime = startTime;
    let calculatedEndTime = endTime;

    // Only auto-calculate if startTime is not provided and endTime is not explicitly set (not null, not undefined means it was explicitly set)
    // If endTime is null, it means "unassigned" (skip placement), so we don't auto-calculate
    // If endTime is undefined, it means not provided, so we auto-calculate
    if (!startTime && endTime === undefined && guestId) {
        // Get session to fetch store_id
        const { data: session } = await supabase
            .from("table_sessions")
            .select("store_id")
            .eq("id", sessionId)
            .single();

        if (session?.store_id) {
            // Get rotation_time from stores table
            const { data: store } = await supabase
                .from("stores")
                .select("rotation_time")
                .eq("id", session.store_id)
                .single();

            const rotationTime = store?.rotation_time || 15; // Default to 15 minutes if not set

            // Get existing casts for the same guest (excluding guest entries where cast_id === guest_id), sorted by end_time (descending) to get the latest one
            const { data: existingAssignments } = await supabase
                .from("cast_assignments")
                .select("end_time")
                .eq("table_session_id", sessionId)
                .eq("guest_id", guestId)
                .neq("cast_id", guestId) // Exclude guest entries (cast_id === guest_id)
                .not("end_time", "is", null)
                .order("end_time", { ascending: false })
                .limit(1);

            if (existingAssignments && existingAssignments.length > 0 && existingAssignments[0].end_time) {
                // Subsequent cast: start_time = last cast's end_time
                const lastEndTime = new Date(existingAssignments[0].end_time);
                calculatedStartTime = lastEndTime.toISOString();

                // end_time = start_time + rotation_time minutes
                const newEndTime = new Date(lastEndTime);
                newEndTime.setMinutes(newEndTime.getMinutes() + rotationTime);
                calculatedEndTime = newEndTime.toISOString();
            } else {
                // First cast: start_time = current time
                const now = new Date();
                calculatedStartTime = now.toISOString();

                // end_time = start_time + rotation_time minutes
                const newEndTime = new Date(now);
                newEndTime.setMinutes(newEndTime.getMinutes() + rotationTime);
                calculatedEndTime = newEndTime.toISOString();
            }
        } else {
            // Fallback if store_id is not found
            if (!calculatedStartTime) {
                calculatedStartTime = new Date().toISOString();
            }
            if (calculatedEndTime === undefined) {
                calculatedEndTime = null;
            }
        }
    } else if (!calculatedStartTime) {
        // If startTime is not provided and we didn't auto-calculate, use current time
        calculatedStartTime = new Date().toISOString();
    }

    const { data, error } = await supabase
        .from("cast_assignments")
        .insert({
            table_session_id: sessionId,
            cast_id: castId,
            guest_id: guestId,
            status: status,
            grid_x: gridX ?? null,
            grid_y: gridY ?? null,
            start_time: calculatedStartTime || new Date().toISOString(),
            end_time: calculatedEndTime ?? null
        })
        .select()
        .single();

    if (error) throw error;

    // If this is a guest assignment (castId === guestId), increment guest_count
    if (castId === guestId) {
        const { data: session } = await supabase
            .from("table_sessions")
            .select("guest_count")
            .eq("id", sessionId)
            .single();

        if (session) {
            await supabase
                .from("table_sessions")
                .update({ guest_count: (session.guest_count || 0) + 1 })
                .eq("id", sessionId);
        }
    }

    return data;
}

// Special fee type names
const SPECIAL_FEE_NAMES: Record<string, string> = {
    'set-fee': 'セット料金',
    'nomination-fee': '指名料',
    'companion-fee': '場内料金',
    'extension-fee': '延長料金',
};

export async function createOrder(
    sessionId: string,
    items: { menuId: string; quantity: number; amount: number; name?: string }[],
    guestId?: string | null,
    castId?: string | null
) {
    const supabase = await createServerClient();

    const orders = items.map(item => {
        const isSpecialFee = SPECIAL_FEE_NAMES[item.menuId];
        // Check if it's a temporary item (starts with 'temp-')
        const isTempItem = item.menuId.startsWith('temp-');

        return {
            table_session_id: sessionId,
            // If it's a special fee or temp item, menu_id is null
            menu_id: (isSpecialFee || isTempItem) ? null : item.menuId,
            // If it's a special fee, use predefined name. If temp item, use provided name.
            item_name: isSpecialFee ? SPECIAL_FEE_NAMES[item.menuId] : (isTempItem ? item.name : null),
            quantity: item.quantity,
            amount: item.amount,
            guest_id: guestId,
            cast_id: castId,
            status: 'pending'
        };
    });

    const { error } = await supabase
        .from("orders")
        .insert(orders);

    if (error) throw error;
    revalidatePath("/app/slips");
    return { success: true };
}

export async function updateOrder(
    orderId: string,
    updates: {
        quantity?: number;
        amount?: number;
        status?: string;
    }
) {
    const supabase = await createServerClient();

    const dbUpdates: any = {};
    if (updates.quantity !== undefined) dbUpdates.quantity = updates.quantity;
    if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
    if (updates.status !== undefined) dbUpdates.status = updates.status;

    const { error } = await supabase
        .from("orders")
        .update(dbUpdates)
        .eq("id", orderId);

    if (error) throw error;
    revalidatePath("/app/slips");
    return { success: true };
}

export async function deleteOrder(orderId: string) {
    const supabase = await createServerClient();

    const { error } = await supabase
        .from("orders")
        .delete()
        .eq("id", orderId);

    if (error) throw error;
    revalidatePath("/app/slips");
    revalidatePath("/app/floor");
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

    // Get current session data
    const { data: session } = await supabase
        .from("table_sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

    if (!session) throw new Error("Session not found");

    // Calculate total amount from orders
    const { data: orders } = await supabase
        .from("orders")
        .select("amount")
        .eq("table_session_id", sessionId)
        .neq("status", "cancelled");

    const totalAmount = orders?.reduce((sum, order) => sum + (order.amount || 0), 0) || 0;

    // Update session status and end time
    const { error } = await supabase
        .from("table_sessions")
        .update({
            status: "completed",
            end_time: new Date().toISOString(),
            total_amount: totalAmount
        })
        .eq("id", sessionId);

    if (error) throw error;

    // End all active cast assignments
    await supabase
        .from("cast_assignments")
        .update({ end_time: new Date().toISOString() })
        .eq("table_session_id", sessionId)
        .is("end_time", null);

    revalidatePath("/app/floor");
    return { success: true };
}

export async function getSessionOrders(sessionId: string) {
    const supabase = await createServerClient();

    // Get special fee names to filter out
    const specialFeeNames = Object.values(SPECIAL_FEE_NAMES);

    const { data: orders, error } = await supabase
        .from("orders")
        .select(`
            *,
            menu:menus(name, price),
            cast:profiles!orders_cast_id_fkey(display_name),
            guest:profiles!orders_guest_id_fkey(display_name)
        `)
        .eq("table_session_id", sessionId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching session orders:", error);
        return [];
    }

    // Filter out special fees
    const filteredOrders = orders.filter(order => {
        // If it has a menu_id, it's a regular menu item (keep it)
        if (order.menu_id) return true;

        // If it doesn't have a menu_id, check if it's a special fee
        // If item_name is in specialFeeNames, filter it out
        if (order.item_name && specialFeeNames.includes(order.item_name)) {
            return false;
        }

        // Otherwise (e.g. temporary menu item), keep it
        return true;
    });

    return filteredOrders;
}



export async function closeSession(sessionId: string) {
    return checkoutSession(sessionId);
}

export async function updateSessionTimes(sessionId: string, startTime?: string, endTime?: string | null) {
    const supabase = await createServerClient();

    const updates: any = {};
    if (startTime !== undefined) updates.start_time = startTime;
    if (endTime !== undefined) updates.end_time = endTime;

    const { error } = await supabase
        .from("table_sessions")
        .update(updates)
        .eq("id", sessionId);

    if (error) throw error;
    revalidatePath("/app/floor");
    revalidatePath("/app/slips");
    return { success: true };
}

export async function removeCastAssignment(assignmentId: string) {
    const supabase = await createServerClient();

    // Get assignment to check if it's a guest entry
    const { data: assignment } = await supabase
        .from("cast_assignments")
        .select("table_session_id, cast_id, guest_id")
        .eq("id", assignmentId)
        .single();

    const { error } = await supabase
        .from("cast_assignments")
        .delete()
        .eq("id", assignmentId);

    if (error) throw error;

    // If it was a guest entry, decrement guest_count
    if (assignment && assignment.cast_id === assignment.guest_id && assignment.table_session_id) {
        const { data: session } = await supabase
            .from("table_sessions")
            .select("guest_count")
            .eq("id", assignment.table_session_id)
            .single();

        if (session && session.guest_count > 0) {
            await supabase
                .from("table_sessions")
                .update({ guest_count: session.guest_count - 1 })
                .eq("id", assignment.table_session_id);
        }
    }

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

export async function updateCastAssignmentTimes(
    assignmentId: string,
    startTime?: string,
    endTime?: string | null
) {
    const supabase = await createServerClient();

    const updates: any = {};
    if (startTime !== undefined) updates.start_time = startTime;
    if (endTime !== undefined) updates.end_time = endTime;

    const { error } = await supabase
        .from("cast_assignments")
        .update(updates)
        .eq("id", assignmentId);

    if (error) throw error;
    revalidatePath("/app/floor");
    revalidatePath("/app/slips");
    return { success: true };
}

export async function updateCastAssignmentPosition(
    assignmentId: string,
    gridX: number | null,
    gridY: number | null
) {
    const supabase = await createServerClient();

    const { error } = await supabase
        .from("cast_assignments")
        .update({
            grid_x: gridX,
            grid_y: gridY
        })
        .eq("id", assignmentId);

    if (error) throw error;
    revalidatePath("/app/floor");
    revalidatePath("/app/slips");
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

export async function updateSession(
    sessionId: string,
    updates: {
        tableId?: string;
        guestCount?: number;
        startTime?: string;
        pricingSystemId?: string | null;
        mainGuestId?: string | null;
    }
) {
    const supabase = await createServerClient();

    const dbUpdates: any = {};
    if (updates.tableId) dbUpdates.table_id = updates.tableId;
    if (updates.guestCount !== undefined) dbUpdates.guest_count = updates.guestCount;
    if (updates.startTime) dbUpdates.start_time = updates.startTime;
    if (updates.pricingSystemId !== undefined) dbUpdates.pricing_system_id = updates.pricingSystemId;
    if (updates.mainGuestId !== undefined) dbUpdates.main_guest_id = updates.mainGuestId;

    const { error } = await supabase
        .from("table_sessions")
        .update(dbUpdates)
        .eq("id", sessionId);

    if (error) throw error;
    revalidatePath("/app/floor");
    revalidatePath("/app/slips");
    return { success: true };
}

export async function getCasts() {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: profile } = await supabase
        .from("profiles")
        .select("store_id")
        .eq("user_id", user.id)
        .single();

    if (!profile?.store_id) return [];

    const { data: casts, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("store_id", profile.store_id)
        .eq("role", "cast")
        .order("display_name", { ascending: true });

    if (error) {
        console.error("Error fetching casts:", error);
        return [];
    }

    return casts;
}

export async function getGuests() {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: profile } = await supabase
        .from("profiles")
        .select("store_id")
        .eq("user_id", user.id)
        .single();

    if (!profile?.store_id) return [];

    const { data: guests, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("store_id", profile.store_id)
        .eq("role", "guest")
        .order("display_name", { ascending: true });

    if (error) {
        console.error("Error fetching guests:", error);
        return [];
    }

    return guests;
}

export async function getSessionGuests(sessionId: string) {
    const supabase = await createServerClient();

    // Get all assignments for this session
    const { data: assignments, error } = await supabase
        .from("cast_assignments")
        .select(`
            id,
            cast_id,
            guest_id,
            profiles:guest_id (
                id,
                display_name,
                avatar_url
            )
        `)
        .eq("table_session_id", sessionId);

    if (error) {
        console.error("Error fetching session guests:", error);
        return [];
    }

    // Filter for guest entries where cast_id === guest_id
    const guestEntries = (assignments || []).filter(
        (a: any) => a.cast_id === a.guest_id
    );

    return guestEntries;
}

export async function addGuestToSession(
    sessionId: string,
    guestId: string,
    gridX: number = 0,
    gridY: number = 0
) {
    const supabase = await createServerClient();

    // Create a guest entry in cast_assignments (cast_id === guest_id)
    const { error: assignmentError } = await supabase
        .from("cast_assignments")
        .insert({
            table_session_id: sessionId,
            cast_id: guestId,
            guest_id: guestId,
            status: "waiting",
            grid_x: gridX,
            grid_y: gridY,
        });

    if (assignmentError) {
        console.error("Error adding guest to session:", assignmentError);
        throw assignmentError;
    }

    // Update guest_count in table_sessions
    const { data: session } = await supabase
        .from("table_sessions")
        .select("guest_count")
        .eq("id", sessionId)
        .single();

    if (session) {
        const { error: updateError } = await supabase
            .from("table_sessions")
            .update({ guest_count: (session.guest_count || 0) + 1 })
            .eq("id", sessionId);

        if (updateError) {
            console.error("Error updating guest count:", updateError);
            throw updateError;
        }
    }

    revalidatePath("/app/floor");
    revalidatePath("/app/slips");
}

export async function removeGuestFromSession(assignmentId: string) {
    const supabase = await createServerClient();

    // Get assignment to find session_id and check if it's a guest entry
    const { data: assignment, error: fetchError } = await supabase
        .from("cast_assignments")
        .select("table_session_id, cast_id, guest_id")
        .eq("id", assignmentId)
        .single();

    if (fetchError) {
        console.error("Error fetching assignment:", fetchError);
        throw fetchError;
    }

    // Only update guest_count if this is a guest entry (cast_id === guest_id)
    const isGuestEntry = assignment && assignment.cast_id === assignment.guest_id;

    // Delete the assignment
    const { error } = await supabase
        .from("cast_assignments")
        .delete()
        .eq("id", assignmentId);

    if (error) {
        console.error("Error removing guest from session:", error);
        throw error;
    }

    // Update guest_count if this was a guest entry
    if (isGuestEntry && assignment.table_session_id) {
        const { data: session } = await supabase
            .from("table_sessions")
            .select("guest_count")
            .eq("id", assignment.table_session_id)
            .single();

        if (session && session.guest_count > 0) {
            const { error: updateError } = await supabase
                .from("table_sessions")
                .update({ guest_count: Math.max(0, session.guest_count - 1) })
                .eq("id", assignment.table_session_id);

            if (updateError) {
                console.error("Error updating guest count:", updateError);
                throw updateError;
            }
        }
    }

    revalidatePath("/app/floor");
    revalidatePath("/app/slips");
}


export async function getStoreSettings() {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Get the store the user belongs to
    const { data: profile } = await supabase
        .from("profiles")
        .select("store_id")
        .eq("id", user.id)
        .single();

    if (!profile?.store_id) return null;

    const { data: store } = await supabase
        .from("stores")
        .select("day_switch_time")
        .eq("id", profile.store_id)
        .single();

    return store;
}

export async function rotateCast(currentAssignmentId: string) {
    const supabase = await createServerClient();

    // 1. Get current assignment
    const { data: currentAssignment, error: fetchError } = await supabase
        .from("cast_assignments")
        .select("*")
        .eq("id", currentAssignmentId)
        .single();

    if (fetchError || !currentAssignment) {
        console.error("Error fetching assignment:", fetchError);
        return { success: false, error: "Assignment not found" };
    }

    // Verify it's serving and has end_time passed (or close enough - handled by caller mostly, but good to check)
    if (currentAssignment.status !== 'serving' || !currentAssignment.end_time) {
        return { success: false, error: "Assignment not eligible for rotation" };
    }

    // 2. Get all assignments for this session and guest
    const { data: assignments, error: listError } = await supabase
        .from("cast_assignments")
        .select("*")
        .eq("table_session_id", currentAssignment.table_session_id)
        .eq("guest_id", currentAssignment.guest_id)
        .order("start_time", { ascending: true });

    if (listError || !assignments) {
        console.error("Error listing assignments:", listError);
        return { success: false, error: "Failed to list assignments" };
    }

    // 3. Find current index and next assignment
    const currentIndex = assignments.findIndex(a => a.id === currentAssignmentId);
    if (currentIndex === -1) {
        return { success: false, error: "Current assignment not found in list" };
    }

    const nextAssignment = assignments[currentIndex + 1];

    // 4. Update current assignment to ended
    const { error: updateCurrentError } = await supabase
        .from("cast_assignments")
        .update({ status: 'ended' })
        .eq("id", currentAssignmentId);

    if (updateCurrentError) {
        console.error("Error ending current assignment:", updateCurrentError);
        return { success: false, error: "Failed to end current assignment" };
    }

    // 5. Update next assignment if exists
    if (nextAssignment) {
        const { error: updateNextError } = await supabase
            .from("cast_assignments")
            .update({
                status: 'serving',
                start_time: currentAssignment.end_time // Set start time to previous end time
            })
            .eq("id", nextAssignment.id);

        if (updateNextError) {
            console.error("Error starting next assignment:", updateNextError);
            // Non-critical failure, but good to log
        }
    }

    revalidatePath("/app/floor");
    return { success: true };
}
