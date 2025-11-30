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
    objects: any[];
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

export type TableSessionStatus = 'active' | 'payment_pending' | 'closed';

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
    created_at: string;
    updated_at: string;
    cast_assignments?: CastAssignment[];
}

export type CastAssignmentStatus = 'jounai' | 'shime' | 'free' | 'help';

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

export type OrderStatus = 'pending' | 'served' | 'cancelled';

export interface Order {
    id: string;
    table_session_id: string;
    menu_id: string;
    quantity: number;
    amount: number;
    status: OrderStatus;
    cast_id: string | null;
    guest_id: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

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

export interface PricingSystem {
    id: string;
    store_id: string;
    name: string;
    set_fee: number;
    set_duration_minutes: number;
    extension_fee: number;
    extension_duration_minutes: number;
    nomination_fee: number;
    companion_fee: number;
    service_rate: number;
    tax_rate: number;
    is_default: boolean;
    created_at: string;
    updated_at: string;
}
