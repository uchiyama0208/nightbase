import { TableSession, BillSettings, Order } from "@/types/floor";

const MILLISECONDS_PER_MINUTE = 1000 * 60;
const EXTENSION_BLOCK_MINUTES = 30;

function getTimestamp(value: string | null): number | null {
    if (!value) return null;

    const timestamp = new Date(value).getTime();
    return Number.isNaN(timestamp) ? null : timestamp;
}

function calculateDuration(start: string, end: string | null): number {
    const startTime = getTimestamp(start);
    const endTime = getTimestamp(end);
    const fallbackEnd = Date.now();

    if (!startTime) return 0;

    const duration = Math.ceil(((endTime ?? fallbackEnd) - startTime) / MILLISECONDS_PER_MINUTE);
    return Math.max(duration, 0);
}

function calculateExtension(durationMinutes: number, setDuration: number): {
    extensionMinutes: number;
    extensionBlocks: number;
} {
    const extensionMinutes = Math.max(0, durationMinutes - setDuration);
    const extensionBlocks = Math.ceil(extensionMinutes / EXTENSION_BLOCK_MINUTES);

    return {
        extensionMinutes,
        extensionBlocks
    };
}

function calculateCastFees(settings: BillSettings, assignments: TableSession["cast_assignments"]): {
    shimeCount: number;
    jounaiCount: number;
    shimeTotal: number;
    jounaiTotal: number;
    total: number;
} {
    const counts = (assignments ?? []).reduce(
        (acc, assignment) => {
            if (assignment.status === "shime") acc.shime += 1;
            if (assignment.status === "jounai") acc.jounai += 1;
            return acc;
        },
        { shime: 0, jounai: 0 }
    );

    const shimeTotal = counts.shime * settings.shime_fee;
    const jounaiTotal = counts.jounai * settings.jounai_fee;

    return {
        shimeCount: counts.shime,
        jounaiCount: counts.jounai,
        shimeTotal,
        jounaiTotal,
        total: shimeTotal + jounaiTotal
    };
}

export interface BillBreakdown {
    timeCharge: {
        durationMinutes: number;
        extensionMinutes: number;
        basePrice: number;
        extensionPrice: number;
        total: number;
    };
    castFees: {
        shimeCount: number;
        jounaiCount: number;
        shimeTotal: number;
        jounaiTotal: number;
        total: number;
    };
    orders: {
        items: Order[];
        total: number;
    };
    subtotal: number;
    serviceCharge: number;
    tax: number;
    total: number;
}

export function calculateBill(
    session: TableSession,
    orders: Order[],
    settings: BillSettings
): BillBreakdown {
    const durationMinutes = calculateDuration(session.start_time, session.end_time);
    const { extensionMinutes, extensionBlocks } = calculateExtension(
        durationMinutes,
        settings.set_duration_minutes || 60
    );

    const basePrice = settings.hourly_charge * session.guest_count;
    const extensionPrice = extensionBlocks * settings.extension_fee_30m * session.guest_count;
    const timeChargeTotal = basePrice + extensionPrice;

    const castFees = calculateCastFees(settings, session.cast_assignments);
    const orderTotal = orders.reduce((sum, order) => sum + (order.amount || 0), 0);

    const subtotal = timeChargeTotal + castFees.total + orderTotal;
    const serviceCharge = Math.floor(subtotal * settings.service_rate);
    const tax = Math.floor((subtotal + serviceCharge) * settings.tax_rate);
    const total = subtotal + serviceCharge + tax;

    return {
        timeCharge: {
            durationMinutes,
            extensionMinutes,
            basePrice,
            extensionPrice,
            total: timeChargeTotal
        },
        castFees,
        orders: {
            items: orders,
            total: orderTotal
        },
        subtotal,
        serviceCharge,
        tax,
        total
    };
}
