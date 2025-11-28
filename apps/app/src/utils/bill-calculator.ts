import { TableSession, BillSettings, Order } from "@/types/floor";

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
    // 1. Time Charge
    const startTime = new Date(session.start_time).getTime();
    const endTime = session.end_time ? new Date(session.end_time).getTime() : Date.now();
    const durationMinutes = Math.ceil((endTime - startTime) / (1000 * 60));

    const setDuration = settings.set_duration_minutes || 60;
    const extensionMinutes = Math.max(0, durationMinutes - setDuration);
    const extensionBlocks = Math.ceil(extensionMinutes / 30); // Assuming 30 min blocks for simplicity logic

    const basePrice = settings.hourly_charge * session.guest_count;
    const extensionPrice = (extensionBlocks * settings.extension_fee_30m) * session.guest_count;
    const timeChargeTotal = basePrice + extensionPrice;

    // 2. Cast Fees
    let shimeCount = 0;
    let jounaiCount = 0;

    if (session.cast_assignments) {
        session.cast_assignments.forEach(a => {
            if (a.status === 'shime') shimeCount++;
            if (a.status === 'jounai') jounaiCount++;
        });
    }

    const shimeTotal = shimeCount * settings.shime_fee;
    const jounaiTotal = jounaiCount * settings.jounai_fee;
    const castFeesTotal = shimeTotal + jounaiTotal;

    // 3. Orders
    const orderTotal = orders.reduce((sum, order) => sum + (order.amount || 0), 0);

    // 4. Grand Total
    const subtotal = timeChargeTotal + castFeesTotal + orderTotal;
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
        castFees: {
            shimeCount,
            jounaiCount,
            shimeTotal,
            jounaiTotal,
            total: castFeesTotal
        },
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
