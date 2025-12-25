"use server";

import { createServerClient } from "@/lib/supabaseServerClient";
import { revalidatePath } from "next/cache";
import crypto from "crypto";
import { getRoles } from "../settings/roles/actions";
import { canAddMember } from "@/lib/subscription";

export interface Invitation {
    id: string;
    token: string;
    store_id: string;
    profile_id: string;
    role_id: string | null;
    status: "pending" | "accepted" | "expired" | "canceled";
    expires_at: string;
    created_at: string;
    profile?: {
        display_name: string;
        display_name_kana?: string;
        real_name?: string;
        avatar_url: string | null;
        role: string;
    };
    role?: {
        name: string;
    };
}

export async function getInvitations(filters?: { status?: string; search?: string; role?: string }, storeId?: string) {
    const supabase = await createServerClient() as any;

    if (!storeId) {
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) return [];

        // Get current user's store
        const { data: appUser } = await supabase
            .from("users")
            .select("current_profile_id")
            .eq("id", user.id)
            .maybeSingle();

        if (!appUser?.current_profile_id) return [];

        const { data: currentProfile } = await supabase
            .from("profiles")
            .select("store_id")
            .eq("id", appUser.current_profile_id)
            .maybeSingle();

        if (!currentProfile?.store_id) return [];
        storeId = currentProfile.store_id;
    }

    // Query profiles table for invitations
    // Get all profiles for this store - we'll filter client-side
    let query = supabase
        .from("profiles")
        .select(`
            id,
            invite_token,
            store_id,
            role,
            invite_status,
            invite_expires_at,
            created_at,
            display_name,
            display_name_kana,
            real_name,
            avatar_url,
            user_id
        `)
        .eq("store_id", storeId);

    if (filters?.role) {
        query = query.eq("role", filters.role);
    }

    const { data: profiles, error } = await query;

    if (error) {
        console.error("Error fetching invitations:", error);
        return [];
    }

    // Map profiles to Invitation interface
    // Determine status based on user_id and invite_status
    let invitations: Invitation[] = (profiles || [])
        .map(p => {
            // Determine effective status:
            // - If user_id is set, they have joined (accepted)
            // - If invite_status is pending with valid expiration, they are pending
            // - If invite_status is canceled, they are canceled
            // - Otherwise, skip (uninvited placeholder profiles)
            let effectiveStatus: "pending" | "accepted" | "expired" | "canceled" | null = null;

            if (p.user_id) {
                // Has a linked user account - they are participating
                effectiveStatus = "accepted";
            } else if (p.invite_status === "pending" && p.invite_expires_at) {
                // Has a pending invitation with expiration
                effectiveStatus = "pending";
            } else if (p.invite_status === "canceled") {
                // Invitation was canceled
                effectiveStatus = "canceled";
            } else if (p.invite_status === "accepted") {
                // Legacy: invite_status is accepted
                effectiveStatus = "accepted";
            }
            // If effectiveStatus is still null, this is an uninvited placeholder - skip it

            if (!effectiveStatus) return null;

            return {
                id: p.id, // Using profile ID as invitation ID
                token: p.id, // Use Profile ID as token
                store_id: p.store_id,
                profile_id: p.id,
                role_id: null, // Role is directly on profile now
                status: effectiveStatus,
                expires_at: p.invite_expires_at,
                created_at: p.created_at,
                profile: {
                    display_name: p.display_name,
                    display_name_kana: p.display_name_kana,
                    real_name: p.real_name,
                    avatar_url: p.avatar_url,
                    role: p.role
                }
            };
        })
        .filter((inv): inv is Invitation => inv !== null);

    // Client-side filtering for status
    if (filters?.status) {
        invitations = invitations.filter((inv) => inv.status === filters.status);
    }

    // Client-side filtering for search
    if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        invitations = invitations.filter((inv) => {
            const displayName = inv.profile?.display_name || "";
            const displayNameKana = inv.profile?.display_name_kana || "";
            const realName = inv.profile?.real_name || "";
            return displayName.toLowerCase().includes(searchLower) ||
                   displayNameKana.toLowerCase().includes(searchLower) ||
                   realName.toLowerCase().includes(searchLower);
        });
    }

    return invitations;
}

export async function acceptInvitation(token: string) {
    const supabase = await createServerClient() as any;
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: "Unauthorized" };
    }

    // First get the profile by invite token (which is now profile ID)
    const profile = await getInvitationByToken(token);
    if (!profile) {
        return { success: false, error: "Invitation not found" };
    }

    // Get user's existing profile to copy LINE info (avatar_url, line_user_id)
    const { data: existingProfile } = await supabase
        .from("profiles")
        .select("avatar_url, line_user_id")
        .eq("user_id", user.id)
        .not("avatar_url", "is", null)
        .limit(1)
        .maybeSingle();

    // Update profile to link user and clear invite
    const updateData: Record<string, any> = {
        user_id: user.id,
        invite_status: "accepted",
        invite_token: null, // Clear token
        invite_expires_at: null
    };

    // Copy LINE info from existing profile if available
    if (existingProfile?.avatar_url) {
        updateData.avatar_url = existingProfile.avatar_url;
    }
    if (existingProfile?.line_user_id) {
        updateData.line_user_id = existingProfile.line_user_id;
    }

    const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", profile.profile_id);

    if (error) {
        console.error("Error accepting invitation:", error);
        return { success: false, error: error.message };
    }

    return { success: true };
}

export async function createInvitation(data: {
    profileId: string;
    roleId?: string; // Not used anymore, role is on profile
    expiresInDays: number;
    password?: string;
}) {
    const supabase = await createServerClient() as any;
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    if (!appUser?.current_profile_id) throw new Error("No profile found");

    const { data: currentProfile } = await supabase
        .from("profiles")
        .select("store_id")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    if (!currentProfile?.store_id) throw new Error("No store found");

    // Check member limit
    const canAdd = await canAddMember(currentProfile.store_id);
    if (!canAdd) {
        throw new Error("Member limit reached. Please upgrade your plan.");
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + data.expiresInDays);

    // Simple password hashing (SHA-256) if password provided
    let passwordHash: string | null = null;
    if (data.password) {
        passwordHash = crypto.createHash("sha256").update(data.password).digest("hex");
    }

    // Update profile with invitation details
    // We no longer need to generate a separate invite_token, we use the profile ID.
    // But we still need to set status and expiration.

    const { data: profile, error } = await supabase
        .from("profiles")
        .update({
            invite_status: "pending",
            invite_expires_at: expiresAt.toISOString(),
            invite_password_hash: passwordHash,
            role_id: data.roleId || null,
        })
        .eq("id", data.profileId)
        .select()
        .single();

    if (error) {
        console.error("Error creating invitation:", error);
        throw new Error("Failed to create invitation");
    }

    revalidatePath("/app/invitations");
    // Return structure matching what UI expects (Invitation interface)
    const invitation: Invitation = {
        id: profile.id,
        token: profile.id, // Use Profile ID as token
        store_id: profile.store_id,
        profile_id: profile.id,
        role_id: null,
        status: profile.invite_status,
        expires_at: profile.invite_expires_at,
        created_at: new Date().toISOString(), // Approximation
        profile: {
            display_name: profile.display_name,
            avatar_url: profile.avatar_url,
            role: profile.role
        }
    };

    return { success: true, invitation };
}

export async function cancelInvitation(id: string) {
    const supabase = await createServerClient() as any;

    // 'id' here is the profile_id (since we use profile_id as invitation_id)
    const { error } = await supabase
        .from("profiles")
        .update({
            invite_status: "canceled",
            invite_token: null,
            invite_expires_at: null
        })
        .eq("id", id);

    if (error) {
        console.error("Error canceling invitation:", error);
        throw new Error("Failed to cancel invitation");
    }

    revalidatePath("/app/invitations");
    return { success: true };
}

// Public action to get invitation details
export async function getInvitationByToken(token: string) {
    const supabase = await createServerClient() as any;

    // Use the new RPC function to bypass RLS securely using ID
    // 'token' is now the profile ID
    const { data, error } = await supabase.rpc("get_profile_by_id_for_invite", {
        lookup_id: token
    });

    if (error || !data || data.length === 0) {
        return null;
    }

    // Map to expected structure
    const profile = data[0];
    return {
        id: profile.id, // Invitation ID is Profile ID
        token: token,
        store_id: profile.store_id,
        profile_id: profile.id,
        role_id: null,
        status: profile.invite_status,
        expires_at: profile.invite_expires_at,
        created_at: new Date().toISOString(), // Not available in RPC, but not critical
        password_hash: profile.invite_password_hash,
        store_name: profile.store_name,
        profile_name: profile.profile_name,
        has_password: !!profile.invite_password_hash
    };
}

export async function getUninvitedProfiles(storeId?: string) {
    const supabase = await createServerClient() as any;

    if (!storeId) {
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) return [];

        const { data: appUser } = await supabase
            .from("users")
            .select("current_profile_id")
            .eq("id", user.id)
            .maybeSingle();

        if (!appUser?.current_profile_id) return [];

        const { data: currentProfile } = await supabase
            .from("profiles")
            .select("store_id")
            .eq("id", appUser.current_profile_id)
            .maybeSingle();

        if (!currentProfile?.store_id) return [];
        storeId = currentProfile.store_id;
    }

    // Get profiles that can be invited:
    // - Not yet accepted by the actual person (invite_status != 'accepted')
    // - Not currently being invited (invite_expires_at IS NULL)
    //   Note: When an invitation is canceled, invite_expires_at is set to NULL
    //   So this query returns profiles that are either:
    //   1. Never invited (invite_expires_at is NULL from the start)
    //   2. Invitation was canceled (invite_expires_at set to NULL)
    // Note: We don't filter by user_id because it may be set to the creator's ID
    const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, display_name_kana, role, avatar_url, invite_status")
        .eq("store_id", storeId)
        .neq("invite_status", "accepted")
        .is("invite_expires_at", null);

    return profiles || [];
}

export async function getInvitationsData() {
    const supabase = await createServerClient() as any;
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { redirect: "/login" };
    }

    // Resolve current profile via users.current_profile_id
    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    if (!appUser?.current_profile_id) {
        return { redirect: "/app/me" };
    }

    const { data: currentProfile } = await supabase
        .from("profiles")
        .select("*, stores(*)")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    if (!currentProfile || !currentProfile.store_id) {
        return { redirect: "/app/me" };
    }

    // Role check - staff and admin can access
    if (currentProfile.role !== "staff" && currentProfile.role !== "admin") {
        return { redirect: "/app/timecard" };
    }

    const storeId = currentProfile.store_id;

    // Parallelize independent fetches
    const [invitations, uninvitedProfiles, roles, joinRequests, storeSettings] = await Promise.all([
        getInvitations(undefined, storeId),
        getUninvitedProfiles(storeId),
        getRoles(storeId),
        supabase
            .from("join_requests")
            .select("id, profile_id, display_name, display_name_kana, real_name, real_name_kana, requested_role, status, created_at")
            .eq("store_id", storeId)
            .order("created_at", { ascending: false })
            .then(res => res.data || []),
        supabase
            .from("store_settings")
            .select("store_id, allow_join_requests, allow_join_by_code, allow_join_by_url")
            .eq("store_id", storeId)
            .single()
            .then((res: any) => res.data ? { ...res.data, id: res.data.store_id } : null)
    ]);

    const joinRequestsCount = joinRequests.filter(jr => jr.status === "pending").length;

    return {
        data: {
            invitations,
            uninvitedProfiles,
            roles,
            joinRequestsCount,
            joinRequests,
            storeSettings,
        }
    };
}

export async function getJoinRequestsData() {
    const supabase = await createServerClient() as any;
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { redirect: "/login" };
    }

    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    if (!appUser?.current_profile_id) {
        return { redirect: "/app/me" };
    }

    const { data: currentProfile } = await supabase
        .from("profiles")
        .select("store_id, role")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    if (!currentProfile || !currentProfile.store_id) {
        return { redirect: "/app/me" };
    }

    if (currentProfile.role !== "staff" && currentProfile.role !== "admin") {
        return { redirect: "/app/timecard" };
    }

    // Fetch store settings and join requests in parallel
    const [storeResult, joinRequestsResult] = await Promise.all([
        supabase
            .from("stores")
            .select("id, allow_join_requests, allow_join_by_code, allow_join_by_url")
            .eq("id", currentProfile.store_id)
            .single(),
        supabase
            .from("join_requests")
            .select("id, profile_id, display_name, display_name_kana, real_name, real_name_kana, requested_role, status, created_at")
            .eq("store_id", currentProfile.store_id)
            .order("created_at", { ascending: false })
    ]);

    return {
        data: {
            joinRequests: joinRequestsResult.data || [],
            store: storeResult.data,
        }
    };
}

export async function getJoinRequestSettings() {
    const supabase = await createServerClient() as any;
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { redirect: "/login" };
    }

    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    if (!appUser?.current_profile_id) {
        return { redirect: "/app/me" };
    }

    const { data: currentProfile } = await supabase
        .from("profiles")
        .select("store_id, role")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    if (!currentProfile || !currentProfile.store_id) {
        return { redirect: "/app/me" };
    }

    if (currentProfile.role !== "staff" && currentProfile.role !== "admin") {
        return { redirect: "/app/timecard" };
    }

    const { data: store } = await supabase
        .from("stores")
        .select("id, allow_join_requests, allow_join_by_code, allow_join_by_url")
        .eq("id", currentProfile.store_id)
        .single();

    return {
        data: {
            store,
        }
    };
}

export async function updateJoinRequestSettings(settings: {
    allowJoinRequests: boolean;
    allowJoinByCode: boolean;
    allowJoinByUrl: boolean;
}) {
    const supabase = await createServerClient() as any;
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: "Unauthorized" };
    }

    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    if (!appUser?.current_profile_id) {
        return { success: false, error: "Profile not found" };
    }

    const { data: currentProfile } = await supabase
        .from("profiles")
        .select("store_id, role")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    if (!currentProfile || !currentProfile.store_id || (currentProfile.role !== "staff" && currentProfile.role !== "admin")) {
        return { success: false, error: "Permission denied" };
    }

    const { error } = await supabase
        .from("store_settings")
        .update({
            allow_join_requests: settings.allowJoinRequests,
            allow_join_by_code: settings.allowJoinByCode,
            allow_join_by_url: settings.allowJoinByUrl,
        })
        .eq("store_id", currentProfile.store_id);

    if (error) {
        console.error("Error updating join request settings:", error);
        return { success: false, error: "Failed to update settings" };
    }

    revalidatePath("/app/settings/join-requests");
    return { success: true };
}
