"use server";

import { createServerClient } from "@/lib/supabaseServerClient";
import { Table } from "@/types/floor";
import { revalidatePath } from "next/cache";

export async function getTables() {
    const supabase = await createServerClient() as any;

    // Get current user's store_id
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: profile } = await supabase
        .from("profiles")
        .select("store_id")
        .eq("user_id", user.id)
        .single();

    if (!profile?.store_id) return [];

    const { data: tables, error } = await supabase
        .from("tables")
        .select("*")
        .eq("store_id", profile.store_id)
        .order("created_at", { ascending: true });

    if (error) {
        console.error("Error fetching tables:", error);
        return [];
    }

    return tables as Table[];
}

export async function saveTable(tableData: Partial<Table>) {
    const supabase = await createServerClient() as any;

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

    revalidatePath("/app/seats");
    return { success: true, table: data as Table };
}

export async function deleteTable(id: string) {
    const supabase = await createServerClient() as any;
    const { error } = await supabase
        .from("tables")
        .delete()
        .eq("id", id);

    if (error) {
        console.error("Error deleting table:", error);
        throw new Error("Failed to delete table");
    }

    revalidatePath("/app/seats");
    return { success: true };
}

export async function createTable(tableData: Omit<Table, "id" | "store_id" | "created_at" | "updated_at" | "layout_data">) {
    const supabase = await createServerClient() as any;

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
        throw error;
    }

    revalidatePath("/app/seats");
    return data as Table;
}

export async function updateTable(id: string, tableData: Partial<Table>) {
    const supabase = await createServerClient() as any;

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

    revalidatePath("/app/seats");
    return data as Table;
}

// Table Type Management Functions

export async function getTableTypes() {
    const supabase = await createServerClient() as any;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: profile } = await supabase
        .from("profiles")
        .select("store_id")
        .eq("user_id", user.id)
        .single();

    if (!profile?.store_id) return [];

    const { data: tableTypes, error } = await supabase
        .from("table_types")
        .select("*")
        .eq("store_id", profile.store_id)
        .order("sort_order", { ascending: true });

    if (error) {
        console.error("Error fetching table types:", error);
        return [];
    }

    return tableTypes;
}

export async function createTableType(name: string, sortOrder: number = 0) {
    const supabase = await createServerClient() as any;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: profile } = await supabase
        .from("profiles")
        .select("store_id")
        .eq("user_id", user.id)
        .single();

    if (!profile?.store_id) throw new Error("No store found");

    const { data, error } = await supabase
        .from("table_types")
        .insert({
            store_id: profile.store_id,
            name,
            sort_order: sortOrder,
        })
        .select()
        .single();

    if (error) {
        console.error("Error creating table type:", error);
        throw new Error("Failed to create table type");
    }

    revalidatePath("/app/seats");
    return data;
}

export async function updateTableType(id: string, name: string, sortOrder: number) {
    const supabase = await createServerClient() as any;

    const { data, error } = await supabase
        .from("table_types")
        .update({
            name,
            sort_order: sortOrder,
            updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

    if (error) {
        console.error("Error updating table type:", error);
        throw new Error("Failed to update table type");
    }

    revalidatePath("/app/seats");
    return data;
}

export async function deleteTableType(id: string) {
    const supabase = await createServerClient() as any;

    const { error } = await supabase
        .from("table_types")
        .delete()
        .eq("id", id);

    if (error) {
        console.error("Error deleting table type:", error);
        throw new Error("Failed to delete table type");
    }

    revalidatePath("/app/seats");
    return { success: true };
}

export async function updateTableTypeSortOrders(updates: { id: string; sort_order: number }[]) {
    const supabase = await createServerClient() as any;

    for (const update of updates) {
        const { error } = await supabase
            .from("table_types")
            .update({ sort_order: update.sort_order })
            .eq("id", update.id);

        if (error) {
            console.error("Error updating sort order:", error);
            throw new Error("Failed to update sort order");
        }
    }

    revalidatePath("/app/seats");
    return { success: true };
}
