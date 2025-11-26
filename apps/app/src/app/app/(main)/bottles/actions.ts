"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabaseServerClient";

export async function getBottleKeeps(filters?: {
    status?: string;
    search?: string;
}) {
    const supabase = await createServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("Unauthorized");
    }

    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    if (!appUser?.current_profile_id) {
        throw new Error("No profile found");
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("store_id")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    if (!profile?.store_id) {
        throw new Error("No store found");
    }

    let query = supabase
        .from("bottle_keeps")
        .select(`
      *,
      menus (
        id,
        name,
        category,
        price
      ),
      bottle_keep_holders (
        profile_id,
        profiles (
          id,
          display_name
        )
      )
    `)
        .eq("store_id", profile.store_id)
        .order("created_at", { ascending: false });

    if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
    }

    const { data, error } = await query;

    if (error) {
        console.error("Error fetching bottle keeps:", error);
        throw error;
    }

    // Filter by search term if provided
    if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        return data?.filter((bottle: any) => {
            const bottleName = bottle.menus?.name?.toLowerCase() || "";
            const guestNames = bottle.bottle_keep_holders
                ?.map((h: any) => h.profiles?.display_name?.toLowerCase() || "")
                .join(" ");
            return bottleName.includes(searchLower) || guestNames.includes(searchLower);
        });
    }

    return data;
}

export async function createBottleKeep(formData: FormData) {
    const supabase = await createServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("Unauthorized");
    }

    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    if (!appUser?.current_profile_id) {
        throw new Error("No profile found");
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("store_id")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    if (!profile?.store_id) {
        throw new Error("No store found");
    }

    const menuId = formData.get("menu_id") as string;
    const remainingAmount = parseInt(formData.get("remaining_amount") as string) || 100;
    const openedAt = formData.get("opened_at") as string;
    const expirationDate = formData.get("expiration_date") as string || null;
    const memo = formData.get("memo") as string || null;
    const profileIdsString = formData.get("profile_ids") as string;
    const profileIds = profileIdsString ? JSON.parse(profileIdsString) : [];

    // Create bottle keep record
    const { data: bottleKeep, error: bottleError } = await supabase
        .from("bottle_keeps")
        .insert({
            store_id: profile.store_id,
            menu_id: menuId,
            remaining_amount: remainingAmount,
            opened_at: openedAt,
            expiration_date: expirationDate,
            memo: memo,
        })
        .select()
        .single();

    if (bottleError) {
        console.error("Error creating bottle keep:", bottleError);
        throw bottleError;
    }

    // Create bottle keep holders (guest associations)
    if (profileIds.length > 0) {
        const holders = profileIds.map((profileId: string) => ({
            bottle_keep_id: bottleKeep.id,
            profile_id: profileId,
        }));

        const { error: holdersError } = await supabase
            .from("bottle_keep_holders")
            .insert(holders);

        if (holdersError) {
            console.error("Error creating bottle keep holders:", holdersError);
            throw holdersError;
        }
    }

    revalidatePath("/app/bottles");
    return { success: true };
}

export async function updateBottleKeep(id: string, formData: FormData) {
    const supabase = await createServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("Unauthorized");
    }

    const remainingAmount = parseInt(formData.get("remaining_amount") as string);
    const status = formData.get("status") as string;
    const expirationDate = formData.get("expiration_date") as string || null;
    const memo = formData.get("memo") as string || null;
    const profileIdsString = formData.get("profile_ids") as string;
    const profileIds = profileIdsString ? JSON.parse(profileIdsString) : [];

    // Update bottle keep
    const { error: updateError } = await supabase
        .from("bottle_keeps")
        .update({
            remaining_amount: remainingAmount,
            status: status,
            expiration_date: expirationDate,
            memo: memo,
            updated_at: new Date().toISOString(),
        })
        .eq("id", id);

    if (updateError) {
        console.error("Error updating bottle keep:", updateError);
        throw updateError;
    }

    // Update holders: delete existing and insert new
    await supabase
        .from("bottle_keep_holders")
        .delete()
        .eq("bottle_keep_id", id);

    if (profileIds.length > 0) {
        const holders = profileIds.map((profileId: string) => ({
            bottle_keep_id: id,
            profile_id: profileId,
        }));

        const { error: holdersError } = await supabase
            .from("bottle_keep_holders")
            .insert(holders);

        if (holdersError) {
            console.error("Error updating bottle keep holders:", holdersError);
            throw holdersError;
        }
    }

    revalidatePath("/app/bottles");
    return { success: true };
}

export async function deleteBottleKeep(id: string) {
    const supabase = await createServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("Unauthorized");
    }

    const { error } = await supabase
        .from("bottle_keeps")
        .delete()
        .eq("id", id);

    if (error) {
        console.error("Error deleting bottle keep:", error);
        throw error;
    }

    revalidatePath("/app/bottles");
    return { success: true };
}
