"use server";

import { createServerClient } from "@/lib/supabaseServerClient";
import { PricingSystem } from "@/types/floor";
import { revalidatePath } from "next/cache";

export async function getPricingSystems() {
    const supabase = await createServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: profile } = await supabase
        .from("profiles")
        .select("store_id")
        .eq("user_id", user.id)
        .single();

    if (!profile?.store_id) return [];

    const { data, error } = await supabase
        .from("pricing_systems")
        .select("*")
        .eq("store_id", profile.store_id)
        .order("created_at", { ascending: true });

    if (error) {
        console.error("Error fetching pricing systems:", error);
        return [];
    }

    return data as PricingSystem[];
}

export async function createPricingSystem(data: Omit<PricingSystem, "id" | "store_id" | "created_at" | "updated_at">) {
    const supabase = await createServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: profile } = await supabase
        .from("profiles")
        .select("store_id")
        .eq("user_id", user.id)
        .single();

    if (!profile?.store_id) throw new Error("No store found");

    // If this is set as default, unset other defaults
    if (data.is_default) {
        await supabase
            .from("pricing_systems")
            .update({ is_default: false })
            .eq("store_id", profile.store_id);
    }

    const { data: result, error } = await supabase
        .from("pricing_systems")
        .insert({
            ...data,
            store_id: profile.store_id,
        })
        .select()
        .single();

    if (error) {
        console.error("Error creating pricing system:", error);
        throw new Error("Failed to create pricing system");
    }

    revalidatePath("/app/pricing-systems");
    return result as PricingSystem;
}

export async function updatePricingSystem(id: string, data: Partial<PricingSystem>) {
    const supabase = await createServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: profile } = await supabase
        .from("profiles")
        .select("store_id")
        .eq("user_id", user.id)
        .single();

    if (!profile?.store_id) throw new Error("No store found");

    // If this is set as default, unset other defaults
    if (data.is_default) {
        await supabase
            .from("pricing_systems")
            .update({ is_default: false })
            .eq("store_id", profile.store_id);
    }

    const { data: result, error } = await supabase
        .from("pricing_systems")
        .update({
            ...data,
            updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

    if (error) {
        console.error("Error updating pricing system:", error);
        throw new Error("Failed to update pricing system");
    }

    revalidatePath("/app/pricing-systems");
    return result as PricingSystem;
}

export async function deletePricingSystem(id: string) {
    const supabase = await createServerClient();

    const { error } = await supabase
        .from("pricing_systems")
        .delete()
        .eq("id", id);

    if (error) {
        console.error("Error deleting pricing system:", error);
        throw new Error("Failed to delete pricing system");
    }

    revalidatePath("/app/pricing-systems");
    return { success: true };
}

export async function setDefaultPricingSystem(id: string) {
    const supabase = await createServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: profile } = await supabase
        .from("profiles")
        .select("store_id")
        .eq("user_id", user.id)
        .single();

    if (!profile?.store_id) throw new Error("No store found");

    // Unset all defaults
    await supabase
        .from("pricing_systems")
        .update({ is_default: false })
        .eq("store_id", profile.store_id);

    // Set new default
    const { error } = await supabase
        .from("pricing_systems")
        .update({ is_default: true })
        .eq("id", id);

    if (error) {
        console.error("Error setting default pricing system:", error);
        throw new Error("Failed to set default pricing system");
    }

    revalidatePath("/app/pricing-systems");
    return { success: true };
}
