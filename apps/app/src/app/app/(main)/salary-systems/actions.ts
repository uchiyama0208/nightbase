"use server";

import { createServerClient } from "@/lib/supabaseServerClient";
import { revalidatePath } from "next/cache";

// Types
export interface HourlySettings {
    is_monthly: boolean;
    amount: number;
    time_unit_minutes?: number; // 時給の場合のみ
    time_rounding_type?: 'round' | 'up' | 'down'; // 時間丸め: 四捨五入、繰り上げ、繰り下げ
    during_service_only?: boolean; // 時給の場合のみ
    includes_break?: boolean; // 時給の場合のみ
}

export interface BackTier {
    min_count?: number;      // 回数変動の場合
    min_amount?: number;     // 金額変動の場合
    percentage?: number;
    fixed_amount?: number;
}

export interface BackSettings {
    calculation_type: 'total_percent' | 'subtotal_percent' | 'fixed';
    percentage?: number;
    fixed_amount?: number;
    rounding_type?: 'round' | 'up' | 'down';
    rounding_unit?: 10 | 100 | 1000 | 10000;
    variable_type?: 'none' | 'count' | 'amount';  // なし、回数、金額
    reset_period?: '1week' | '1month' | '2months' | '3months' | '4months' | '6months' | '1year';  // 回数の場合のリセット期間
    tiers?: BackTier[];
}

export interface Deduction {
    id: string;
    name: string;
    type: 'percent' | 'fixed';
    amount: number;
    order: number;
}

export interface SalarySystem {
    id: string;
    store_id: string;
    name: string;
    target_type: 'cast' | 'staff';
    hourly_settings: HourlySettings | null;
    store_back_settings: BackSettings | null;
    jounai_back_settings: BackSettings | null;
    shimei_back_settings: BackSettings | null;
    douhan_back_settings: BackSettings | null;
    shared_count_type: string;
    deductions: Deduction[];
    created_at: string;
    updated_at: string;
    profile_count?: number;
}

export interface SalarySystemInput {
    name: string;
    target_type: 'cast' | 'staff';
    hourly_settings?: HourlySettings | null;
    store_back_settings?: BackSettings | null;
    jounai_back_settings?: BackSettings | null;
    shimei_back_settings?: BackSettings | null;
    douhan_back_settings?: BackSettings | null;
    shared_count_type?: string;
    deductions?: Deduction[];
}

// Get current store ID helper
async function getCurrentStoreId() {
    const supabase = await createServerClient() as any;
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    if (!appUser?.current_profile_id) return null;

    const { data: profile } = await supabase
        .from("profiles")
        .select("store_id")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    return profile?.store_id || null;
}

// Get all salary systems for current store
export async function getSalarySystems(): Promise<SalarySystem[]> {
    const supabase = await createServerClient() as any;
    const storeId = await getCurrentStoreId();

    if (!storeId) return [];

    const { data: systems, error } = await supabase
        .from("salary_systems")
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching salary systems:", error);
        return [];
    }

    // Get profile counts for each system
    const systemIds = systems.map(s => s.id);
    const { data: profileCounts } = await supabase
        .from("profile_salary_systems")
        .select("salary_system_id")
        .in("salary_system_id", systemIds);

    const countMap: Record<string, number> = {};
    profileCounts?.forEach(pc => {
        countMap[pc.salary_system_id] = (countMap[pc.salary_system_id] || 0) + 1;
    });

    return systems.map(system => ({
        ...system,
        deductions: system.deductions || [],
        profile_count: countMap[system.id] || 0,
    }));
}

// Get single salary system
export async function getSalarySystem(id: string): Promise<SalarySystem | null> {
    const supabase = await createServerClient() as any;

    const { data, error } = await supabase
        .from("salary_systems")
        .select("*")
        .eq("id", id)
        .single();

    if (error) {
        console.error("Error fetching salary system:", error);
        return null;
    }

    // Get profile count
    const { count } = await supabase
        .from("profile_salary_systems")
        .select("*", { count: "exact", head: true })
        .eq("salary_system_id", id);

    return {
        ...data,
        deductions: data.deductions || [],
        profile_count: count || 0,
    };
}

// Create salary system
export async function createSalarySystem(input: SalarySystemInput): Promise<{ success: boolean; error?: string; data?: SalarySystem }> {
    const supabase = await createServerClient() as any;
    const storeId = await getCurrentStoreId();

    if (!storeId) {
        return { success: false, error: "店舗が見つかりません" };
    }

    const { data, error } = await supabase
        .from("salary_systems")
        .insert({
            store_id: storeId,
            name: input.name,
            target_type: input.target_type,
            hourly_settings: input.hourly_settings || null,
            store_back_settings: input.store_back_settings || null,
            jounai_back_settings: input.jounai_back_settings || null,
            shimei_back_settings: input.shimei_back_settings || null,
            douhan_back_settings: input.douhan_back_settings || null,
            shared_count_type: input.shared_count_type || 'none',
            deductions: input.deductions || [],
        })
        .select()
        .single();

    if (error) {
        console.error("Error creating salary system:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/app/salary-systems");
    return { success: true, data };
}

// Update salary system
export async function updateSalarySystem(id: string, input: SalarySystemInput): Promise<{ success: boolean; error?: string }> {
    const supabase = await createServerClient() as any;

    const { error } = await supabase
        .from("salary_systems")
        .update({
            name: input.name,
            target_type: input.target_type,
            hourly_settings: input.hourly_settings || null,
            store_back_settings: input.store_back_settings || null,
            jounai_back_settings: input.jounai_back_settings || null,
            shimei_back_settings: input.shimei_back_settings || null,
            douhan_back_settings: input.douhan_back_settings || null,
            shared_count_type: input.shared_count_type || 'none',
            deductions: input.deductions || [],
        })
        .eq("id", id);

    if (error) {
        console.error("Error updating salary system:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/app/salary-systems");
    return { success: true };
}

// Delete salary system
export async function deleteSalarySystem(id: string): Promise<{ success: boolean; error?: string }> {
    const supabase = await createServerClient() as any;

    const { error } = await supabase
        .from("salary_systems")
        .delete()
        .eq("id", id);

    if (error) {
        console.error("Error deleting salary system:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/app/salary-systems");
    return { success: true };
}

// Assign salary system to profile
export async function assignSalarySystemToProfile(profileId: string, salarySystemId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = await createServerClient() as any;

    const { error } = await supabase
        .from("profile_salary_systems")
        .upsert({
            profile_id: profileId,
            salary_system_id: salarySystemId,
        });

    if (error) {
        console.error("Error assigning salary system:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/app/salary-systems");
    return { success: true };
}

// Remove salary system from profile
export async function removeSalarySystemFromProfile(profileId: string, salarySystemId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = await createServerClient() as any;

    const { error } = await supabase
        .from("profile_salary_systems")
        .delete()
        .eq("profile_id", profileId)
        .eq("salary_system_id", salarySystemId);

    if (error) {
        console.error("Error removing salary system:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/app/salary-systems");
    return { success: true };
}
