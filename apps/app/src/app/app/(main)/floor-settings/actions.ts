"use server";

import { createServerClient } from "@/lib/supabaseServerClient";
import { Table } from "@/types/floor";
import { revalidatePath } from "next/cache";

export async function getTables() {
    const supabase = await createServerClient();

    // Get current user's store_id
    const { data: { user } } = await supabase.auth.getUser();
    console.log("getTables - user:", user?.id);
    if (!user) return [];

    const { data: profile } = await supabase
        .from("profiles")
        .select("store_id")
        .eq("user_id", user.id)
        .single();

    console.log("getTables - profile:", profile);
    if (!profile?.store_id) return [];

    const { data: tables, error } = await supabase
        .from("tables")
        .select("*")
        .eq("store_id", profile.store_id)
        .order("created_at", { ascending: true });

    console.log("getTables - tables:", tables, "error:", error);
    if (error) {
        console.error("Error fetching tables:", error);
        return [];
    }

    return tables as Table[];
}

export async function saveTable(tableData: Partial<Table>) {
    const supabase = await createServerClient();

    // Get current user's store_id
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: profile } = await supabase
        .from("profiles")
        .select("store_id")
        .eq("id", user.id)
        .single();

    if (!profile?.store_id) throw new Error("No store found");

    const dataToSave = {
        ...tableData,
        store_id: profile.store_id,
        updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
        .from("tables")
        .upsert(dataToSave)
        .select()
        .single();

    if (error) {
        console.error("Error saving table:", error);
        throw new Error("Failed to save table");
    }

    revalidatePath("/app/floor-settings");
    return { success: true, table: data as Table };
}

export async function deleteTable(id: string) {
    const supabase = await createServerClient();
    const { error } = await supabase
        .from("tables")
        .delete()
        .eq("id", id);

    if (error) {
        console.error("Error deleting table:", error);
        throw new Error("Failed to delete table");
    }

    revalidatePath("/app/floor-settings");
    revalidatePath("/app/seats");
    return { success: true };
}

export async function createTable(tableData: Omit<Table, "id" | "store_id" | "created_at" | "updated_at" | "layout_data">) {
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
        .from("tables")
        .insert({
            ...tableData,
            store_id: profile.store_id,
            layout_data: { seats: [], objects: [] },
        })
        .select()
        .single();

    if (error) {
        console.error("Error creating table:", error);
        throw error; // Throw the actual error for better debugging
    }

    revalidatePath("/app/floor-settings");
    revalidatePath("/app/seats");
    return data as Table;
}

export async function updateTable(id: string, tableData: Partial<Table>) {
    const supabase = await createServerClient();

    const { data, error } = await supabase
        .from("tables")
        .update({
            ...tableData,
            updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

    if (error) {
        console.error("Error updating table:", error);
        throw new Error("Failed to update table");
    }

    revalidatePath("/app/floor-settings");
    revalidatePath("/app/seats");
    return data as Table;
}
