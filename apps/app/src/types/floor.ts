// ============================================
// Base Types
// ============================================

export type TableShape = 'rect' | 'circle';

export interface Seat {
    id: string;
    x: number;
    y: number;
    rotation: number;
    label: string;
}

export interface TableLayoutData {
    grid?: boolean[][];
    seats: Seat[];
    objects: unknown[];
}

export interface TableType {
    id: string;
    store_id: string;
    name: string;
    sort_order: number;
    created_at: string;
    updated_at: string;
}

export interface Table {
    id: string;
    store_id: string;
    name: string;
    type_id: string | null;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    shape: TableShape;
    layout_data: TableLayoutData;
    created_at: string;
    updated_at: string;
}

// ============================================
// Profile Types (for guests and casts)
// ============================================

export interface Profile {
    id: string;
    user_id: string | null;
    store_id: string;
    display_name: string | null;
    display_name_kana: string | null;
    real_name: string | null;
    real_name_kana: string | null;
    role: string;
    avatar_url: string | null;
    status: string | null;
    phone_number: string | null;
    email: string | null;
    line_id: string | null;
    instagram_id: string | null;
    twitter_id: string | null;
    birthday: string | null;
    hire_date: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

// ============================================
// Session Types
// ============================================

export type TableSessionStatus = 'active' | 'payment_pending' | 'completed' | 'closed';

export interface TableSession {
    id: string;
    store_id: string;
    table_id: string | null;
    main_guest_id: string | null;
    guest_count: number;
    start_time: string;
    end_time: string | null;
    status: TableSessionStatus;
    pricing_system_id: string | null;
    total_amount: number;
    created_at: string;
    updated_at: string;
}

// V2: Session with relations (used in floor management)
export interface SessionWithRelations extends TableSession {
    pricing_systems: PricingSystem | null;
    session_guests: SessionGuestWithProfile[];
    orders: OrderWithRelations[];
}

// ============================================
// Session Guest Types (V2)
// ============================================

export interface SessionGuest {
    id: string;
    table_session_id: string;
    guest_id: string;
    created_at: string;
}

export interface SessionGuestWithProfile extends SessionGuest {
    profiles: Profile | null;
}

// ============================================
// Order Types (V2 - unified with cast assignments)
// ============================================

export type OrderStatus = 'pending' | 'served' | 'cancelled';
export type CastOrderStatus = 'waiting' | 'serving' | 'ended';

// Special fee names that are used in orders
export type SpecialFeeName = 'セット料金' | '延長料金' | '指名料' | '同伴料' | '場内料金';

export interface Order {
    id: string;
    table_session_id: string;
    menu_id: string | null;
    item_name: string | null;
    quantity: number;
    amount: number;
    status: OrderStatus;
    cast_id: string | null;
    guest_id: string | null;
    created_by: string | null;
    start_time: string | null;
    end_time: string | null;
    cast_status: CastOrderStatus | null;
    created_at: string;
    updated_at: string;
}

// Order with profile relations
export interface OrderWithRelations extends Order {
    menus: Menu | null;
    profiles: Profile | null;  // cast profile (joined via cast_id)
}

// ============================================
// Menu Types
// ============================================

export interface Menu {
    id: string;
    store_id: string;
    name: string;
    price: number;
    category_id: string | null;
    image_url: string | null;
    sort_order: number;
    is_hidden: boolean;
    created_at: string;
    updated_at: string;
}

export interface MenuCategory {
    id: string;
    store_id: string;
    name: string;
    sort_order: number;
    created_at: string;
    updated_at: string;
}

// ============================================
// Pricing System Types
// ============================================

export interface PricingSystem {
    id: string;
    store_id: string;
    name: string;
    set_fee: number;
    set_duration_minutes: number;
    extension_fee: number;
    extension_duration_minutes: number;
    nomination_fee: number;
    nomination_set_duration_minutes: number | null;
    douhan_fee: number;
    douhan_set_duration_minutes: number;
    companion_fee: number;
    companion_set_duration_minutes: number | null;
    service_rate: number;
    tax_rate: number;
    is_default: boolean;
    created_at: string;
    updated_at: string;
}

// ============================================
// Bill Settings Types
// ============================================

export interface BillSettings {
    store_id: string;
    hourly_charge: number;
    set_duration_minutes: number;
    extension_fee_30m: number;
    extension_fee_60m: number;
    shime_fee: number;
    jounai_fee: number;
    tax_rate: number;
    service_rate: number;
    created_at: string;
    updated_at: string;
}

// ============================================
// Legacy Types (V1 - deprecated, will be removed)
// ============================================

/** @deprecated Use CastOrderStatus instead */
export type CastAssignmentStatus = 'jounai' | 'shime' | 'free' | 'help';

/** @deprecated Use Order with cast_id instead */
export interface CastAssignment {
    id: string;
    table_session_id: string;
    cast_id: string;
    guest_id: string | null;
    status: CastAssignmentStatus;
    start_time: string;
    end_time: string | null;
    created_at: string;
    updated_at: string;
}

// ============================================
// Helper Types for UI
// ============================================

// Processed order item for slip display
export interface SlipOrderItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
    castName?: string;
    castId?: string | null;
    guestId?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    created_at: string;
    menu_id?: string | null;
    item_name?: string | null;
    hide_from_slip?: boolean;
}

// Guest group for session card display
export interface GuestGroup {
    guest: Profile | null;
    servingCasts: Profile[];
}
