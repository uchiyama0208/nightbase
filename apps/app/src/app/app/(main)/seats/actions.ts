"use server";

import { getAuthContext } from "@/lib/auth-helpers";
import { Table } from "@/types/floor";
import { revalidatePath } from "next/cache";
import type { TableType, SortOrderUpdate } from "./types";

// ============================================
// テーブル関連の関数
// ============================================

/**
 * 店舗のテーブル一覧を取得
 */
export async function getTables(): Promise<Table[]> {
    try {
        const { supabase, storeId } = await getAuthContext();

        const { data: tables, error } = await supabase
            .from("tables")
            .select("*")
            .eq("store_id", storeId)
            .order("created_at", { ascending: true });

        if (error) {
            console.error("Error fetching tables:", error);
            return [];
        }

        return tables as Table[];
    } catch {
        return [];
    }
}

/**
 * テーブルを保存（新規作成または更新）
 */
export async function saveTable(
    tableData: Partial<Table>
): Promise<{ success: boolean; table?: Table }> {
    const { supabase, storeId } = await getAuthContext();

    const dataToSave = {
        ...tableData,
        store_id: storeId,
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

/**
 * テーブルを削除
 */
export async function deleteTable(id: string): Promise<{ success: boolean }> {
    const { supabase } = await getAuthContext();

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

/**
 * テーブルを新規作成
 */
export async function createTable(
    tableData: Omit<Table, "id" | "store_id" | "created_at" | "updated_at" | "layout_data">
): Promise<Table> {
    const { supabase, storeId } = await getAuthContext();

    const { data, error } = await supabase
        .from("tables")
        .insert({
            ...tableData,
            store_id: storeId,
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

/**
 * テーブルを更新
 */
export async function updateTable(
    id: string,
    tableData: Partial<Table>
): Promise<Table> {
    const { supabase } = await getAuthContext();

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

// ============================================
// テーブルタイプ関連の関数
// ============================================

/**
 * テーブルタイプ一覧を取得
 */
export async function getTableTypes(): Promise<TableType[]> {
    try {
        const { supabase, storeId } = await getAuthContext();

        const { data: tableTypes, error } = await supabase
            .from("table_types")
            .select("*")
            .eq("store_id", storeId)
            .order("sort_order", { ascending: true });

        if (error) {
            console.error("Error fetching table types:", error);
            return [];
        }

        return tableTypes as TableType[];
    } catch {
        return [];
    }
}

/**
 * テーブルタイプを新規作成
 */
export async function createTableType(
    name: string,
    sortOrder: number = 0
): Promise<TableType> {
    const { supabase, storeId } = await getAuthContext();

    const { data, error } = await supabase
        .from("table_types")
        .insert({
            store_id: storeId,
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
    return data as TableType;
}

/**
 * テーブルタイプを更新
 */
export async function updateTableType(
    id: string,
    name: string,
    sortOrder: number
): Promise<TableType> {
    const { supabase } = await getAuthContext();

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
    return data as TableType;
}

/**
 * テーブルタイプを削除
 */
export async function deleteTableType(id: string): Promise<{ success: boolean }> {
    const { supabase } = await getAuthContext();

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

/**
 * テーブルタイプの並び順を一括更新
 */
export async function updateTableTypeSortOrders(
    updates: SortOrderUpdate[]
): Promise<{ success: boolean }> {
    const { supabase } = await getAuthContext();

    // 並列で更新（エラー時は途中で止まる）
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
