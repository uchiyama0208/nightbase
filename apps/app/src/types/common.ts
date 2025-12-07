import { Database } from "./supabase";

// Base types from database
export type StoreRow = Database["public"]["Tables"]["stores"]["Row"];
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

// Store with extended fields (from store_settings)
export interface Store extends StoreRow {
    show_dashboard?: boolean;
    show_attendance?: boolean;
    show_timecard?: boolean;
    show_users?: boolean;
    show_roles?: boolean;
    show_floor?: boolean;
    show_menus?: boolean;
    show_invitations?: boolean;
    show_join_requests?: boolean;
    show_settings?: boolean;
}

// Profile with store relation
export interface ProfileWithStore extends Omit<ProfileRow, "stores"> {
    stores: Store | null;
}

// Simplified profile for lists
export interface ProfileListItem {
    id: string;
    display_name: string | null;
    display_name_kana: string | null;
    real_name: string | null;
    real_name_kana: string | null;
    role: string;
    store_id: string;
    avatar_url?: string | null;
    status?: string | null;
    phone_number?: string | null;
}

// Role type
export interface Role {
    id: string;
    store_id: string;
    name: string;
    description?: string | null;
    can_manage_floor?: boolean;
    can_manage_menus?: boolean;
    can_manage_users?: boolean;
    can_view_attendance?: boolean;
    can_manage_attendance?: boolean;
    can_view_timecard?: boolean;
    can_manage_timecard?: boolean;
    can_view_salary?: boolean;
    can_manage_salary?: boolean;
    can_manage_store?: boolean;
    can_manage_roles?: boolean;
}

// Menu types
export interface Menu {
    id: string;
    store_id: string;
    name: string;
    price: number;
    category_id: string | null;
    image_url?: string | null;
    sort_order?: number;
    category?: MenuCategory | null;
}

export interface MenuCategory {
    id: string;
    store_id: string;
    name: string;
    sort_order: number;
}

// Invitation type
export interface Invitation {
    id: string;
    token: string;
    profile_id: string;
    expires_at: string;
    status: "pending" | "accepted" | "canceled" | "expired";
    created_at: string;
    profile?: ProfileListItem | null;
    role?: Role | null;
}

// Store features flags
export interface StoreFeatures {
    show_dashboard: boolean;
    show_attendance: boolean;
    show_timecard: boolean;
    show_users: boolean;
    show_roles: boolean;
    show_floor?: boolean;
    show_menus?: boolean;
    show_invitations?: boolean;
    show_join_requests?: boolean;
    show_settings?: boolean;
}
