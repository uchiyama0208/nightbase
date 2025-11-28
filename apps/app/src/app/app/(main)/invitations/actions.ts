"use server";

import { createServerClient } from "@/lib/supabaseServerClient";
import { revalidatePath } from "next/cache";
import crypto from "crypto";
import { getRoles } from "../roles/actions";

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
        real_name?: string;
        avatar_url: string | null;
        role: string;
    };
    role?: {
        name: string;
    };
}

export async function getInvitations(filters?: { status?: string; search?: string; role?: string }, storeId?: string) {
    const supabase = await createServerClient();

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
            real_name,
            avatar_url
        `)
        .eq("store_id", storeId)
        .in("invite_status", ["pending", "accepted", "canceled"]); // Fetch all invitation statuses

    // Apply status filter if specified
    if (filters?.status) {
        query = query.eq("invite_status", filters.status);
    }

    // Only apply these constraints for pending/active invitations
    if (filters?.status === "pending") {
        query = query
            .not("invite_token", "is", null)
            .not("invite_expires_at", "is", null);
    }

    if (filters?.role) {
        query = query.eq("role", filters.role);
    }

    const { data: profiles, error } = await query;

    if (error) {
        console.error("Error fetching invitations:", error);
        return [];
    }

    // Map profiles to Invitation interface
    let invitations: Invitation[] = profiles
        .filter(p => {
            // Filter out invalid pending invitations (pending but no expiration)
            // This prevents showing uninvited profiles as "expired" invitations
            if (p.invite_status === 'pending' && !p.invite_expires_at) {
                return false;
            }
            return true;
        })
        .map(p => ({
            id: p.id, // Using profile ID as invitation ID
            token: p.id, // Use Profile ID as token
            store_id: p.store_id,
            profile_id: p.id,
            role_id: null, // Role is directly on profile now
            status: p.invite_status as any,
            expires_at: p.invite_expires_at,
            created_at: p.created_at,
            profile: {
                display_name: p.display_name,
                real_name: p.real_name,
                avatar_url: p.avatar_url,
                role: p.role
            }
        }));

    // Client-side filtering for search
    if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        invitations = invitations.filter((inv) =>
            (inv.profile?.display_name || inv.profile?.real_name || "").toLowerCase().includes(searchLower)
        );
    }

    return invitations;
}

export async function acceptInvitation(token: string) {
    const supabase = await createServerClient();
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

    // Update profile to link user and clear invite
    const { error } = await supabase
        .from("profiles")
        .update({
            user_id: user.id,
            invite_status: "accepted",
            invite_token: null, // Clear token
            invite_expires_at: null
        })
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
    const supabase = await createServerClient();
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

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + data.expiresInDays);

    // Simple password hashing (SHA-256) if password provided
    let passwordHash = null;
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
    const supabase = await createServerClient();

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
    const supabase = await createServerClient();

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
    const supabase = await createServerClient();

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

    // Get all profiles for the store
    const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, display_name_kana, role, avatar_url")
        .eq("store_id", storeId)
        .is("user_id", null); // Only profiles not yet linked to a user? 
    // Wait, the requirement is "invite profiles". Usually this means profiles that exist but don't have a user account yet?
    // Or just any profile? The prompt says "profilesデータのユーザーを招待できるようにして".
    // "profiles data's user" -> invite a user TO a profile.
    // So we should filter profiles that `user_id` is NULL.

    return profiles || [];
}

export async function getInvitationsData() {
    const supabase = await createServerClient();
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

    // Role check
    if (currentProfile.role !== "staff") {
        return { redirect: "/app/timecard" };
    }

    const storeId = currentProfile.store_id;

    // Parallelize independent fetches
    const [invitations, uninvitedProfiles, roles, joinRequests] = await Promise.all([
        getInvitations(undefined, storeId),
        getUninvitedProfiles(storeId),
        getRoles(storeId),
        supabase
            .from("profiles")
            .select("id, display_name, real_name, role, created_at, approval_status")
            .eq("store_id", storeId)
            .eq("approval_status", "pending")
            .order("created_at", { ascending: false })
            .then(res => res.data || [])
    ]);

    const joinRequestsCount = joinRequests.length;

    return {
        data: {
            invitations,
            uninvitedProfiles,
            roles,
            joinRequestsCount,
            joinRequests,
        }
    };
}

export async function getJoinRequestsData() {
    const supabase = await createServerClient();
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

    if (currentProfile.role !== "staff") {
        return { redirect: "/app/timecard" };
    }

    const { data: joinRequests } = await supabase
        .from("profiles")
        .select("id, display_name, real_name, role, created_at, approval_status")
        .eq("store_id", currentProfile.store_id)
        .eq("approval_status", "pending")
        .order("created_at", { ascending: false });

    return {
        data: {
            joinRequests: joinRequests || [],
        }
    };
}
