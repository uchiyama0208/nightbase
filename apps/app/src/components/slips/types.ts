// 伝票詳細モーダルで使用する型定義

export interface OrderItem {
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

export interface FeeSchedule {
    [orderId: string]: { start: string; end: string };
}

export interface EditingOrderValue {
    quantity?: number;
    amount?: number;
    castId?: string | null;
    startTime?: string;
    endTime?: string;
}

export interface StoreSettings {
    day_switch_time?: string;
    slip_rounding_enabled?: boolean;
    slip_rounding_method?: string;
    slip_rounding_unit?: number;
}

export interface PricingSystem {
    id: string;
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
}
