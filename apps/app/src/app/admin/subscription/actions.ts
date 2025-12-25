"use server";

import { createServiceRoleClient } from "@/lib/supabaseServerClient";
import { revalidatePath } from "next/cache";

// =============================================
// Types
// =============================================

export interface PlanData {
    id: string;
    name: string;
    display_name: string;
    description: string | null;
    price_yen: number;
    stripe_price_id: string | null;
    limits: {
        max_members: number;
        ai_credits: number;
        sales_reports: number;
        sns_posts: number;
    };
    features: Record<string, boolean>;
    sort_order: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface CouponData {
    id: string;
    code: string;
    name: string | null;
    stripe_coupon_id: string | null;
    discount_type: "percent" | "fixed";
    discount_value: number;
    duration: "once" | "repeating" | "forever";
    duration_months: number | null;
    max_redemptions: number | null;
    redemption_count: number;
    valid_from: string;
    valid_until: string | null;
    applicable_plans: string[] | null;
    is_active: boolean;
    created_at: string;
}

export interface SubscriptionStats {
    totalStores: number;
    byPlan: { plan_name: string; count: number }[];
    byStatus: { status: string; count: number }[];
    totalRevenue: number;
}

// =============================================
// Plan Management
// =============================================

export async function getAdminPlans(): Promise<PlanData[]> {
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .order("sort_order");

    if (error) {
        console.error("Error fetching plans:", error);
        return [];
    }

    return data || [];
}

export async function updatePlan(
    planId: string,
    updates: {
        display_name?: string;
        description?: string;
        price_yen?: number;
        stripe_price_id?: string;
        limits?: {
            max_members: number;
            ai_credits: number;
            sales_reports: number;
            sns_posts: number;
        };
        features?: Record<string, boolean>;
        is_active?: boolean;
    }
): Promise<{ success: boolean; error?: string }> {
    const supabase = createServiceRoleClient();

    const { error } = await supabase
        .from("subscription_plans")
        .update({
            ...updates,
            updated_at: new Date().toISOString(),
        })
        .eq("id", planId);

    if (error) {
        console.error("Error updating plan:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/admin/subscription");
    return { success: true };
}

export async function createStripePriceForPlan(
    planId: string
): Promise<{ success: boolean; priceId?: string; error?: string }> {
    const supabase = createServiceRoleClient();

    // Get plan details
    const { data: plan, error: planError } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("id", planId)
        .single();

    if (planError || !plan) {
        return { success: false, error: "Plan not found" };
    }

    if (plan.price_yen === 0) {
        return { success: false, error: "Cannot create Stripe price for free plan" };
    }

    try {
        const Stripe = (await import("stripe")).default;
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

        // Create or get product
        let productId: string;
        const products = await stripe.products.list({ limit: 1 });
        const existingProduct = products.data.find(p => p.name === "NightBase Subscription");

        if (existingProduct) {
            productId = existingProduct.id;
        } else {
            const product = await stripe.products.create({
                name: "NightBase Subscription",
                description: "NightBase SaaS subscription",
            });
            productId = product.id;
        }

        // Create price
        const price = await stripe.prices.create({
            product: productId,
            unit_amount: plan.price_yen,
            currency: "jpy",
            recurring: { interval: "month" },
            nickname: plan.display_name,
            metadata: {
                plan_id: planId,
                plan_name: plan.name,
            },
        });

        // Update plan with stripe_price_id
        await supabase
            .from("subscription_plans")
            .update({
                stripe_price_id: price.id,
                updated_at: new Date().toISOString(),
            })
            .eq("id", planId);

        revalidatePath("/admin/subscription");
        return { success: true, priceId: price.id };
    } catch (err) {
        console.error("Error creating Stripe price:", err);
        return {
            success: false,
            error: err instanceof Error ? err.message : "Failed to create Stripe price",
        };
    }
}

// =============================================
// Coupon Management
// =============================================

export async function getAdminCoupons(): Promise<CouponData[]> {
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching coupons:", error);
        return [];
    }

    return data || [];
}

export async function createCoupon(data: {
    code: string;
    name?: string;
    discount_type: "percent" | "fixed";
    discount_value: number;
    duration: "once" | "repeating" | "forever";
    duration_months?: number;
    max_redemptions?: number;
    valid_until?: string;
    applicable_plans?: string[];
}): Promise<{ success: boolean; coupon?: CouponData; error?: string }> {
    const supabase = createServiceRoleClient();

    // Validate code uniqueness
    const { data: existing } = await supabase
        .from("coupons")
        .select("id")
        .eq("code", data.code.toUpperCase())
        .single();

    if (existing) {
        return { success: false, error: "Coupon code already exists" };
    }

    // Create Stripe coupon if Stripe is configured
    let stripeCouponId: string | null = null;
    if (process.env.STRIPE_SECRET_KEY) {
        try {
            const Stripe = (await import("stripe")).default;
            const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

            const couponParams: Parameters<typeof stripe.coupons.create>[0] = {
                name: data.name || data.code,
                duration: data.duration,
            };

            if (data.discount_type === "percent") {
                couponParams.percent_off = data.discount_value;
            } else {
                couponParams.amount_off = data.discount_value;
                couponParams.currency = "jpy";
            }

            if (data.duration === "repeating" && data.duration_months) {
                couponParams.duration_in_months = data.duration_months;
            }

            if (data.max_redemptions) {
                couponParams.max_redemptions = data.max_redemptions;
            }

            const stripeCoupon = await stripe.coupons.create(couponParams);
            stripeCouponId = stripeCoupon.id;
        } catch (err) {
            console.error("Error creating Stripe coupon:", err);
            // Continue without Stripe coupon
        }
    }

    // Create coupon in DB
    const { data: coupon, error } = await supabase
        .from("coupons")
        .insert({
            code: data.code.toUpperCase(),
            name: data.name,
            stripe_coupon_id: stripeCouponId,
            discount_type: data.discount_type,
            discount_value: data.discount_value,
            duration: data.duration,
            duration_months: data.duration_months,
            max_redemptions: data.max_redemptions,
            valid_until: data.valid_until,
            applicable_plans: data.applicable_plans,
        })
        .select()
        .single();

    if (error) {
        console.error("Error creating coupon:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/admin/subscription/coupons");
    return { success: true, coupon };
}

export async function updateCoupon(
    couponId: string,
    updates: {
        name?: string;
        max_redemptions?: number;
        valid_until?: string;
        applicable_plans?: string[];
        is_active?: boolean;
    }
): Promise<{ success: boolean; error?: string }> {
    const supabase = createServiceRoleClient();

    const { error } = await supabase
        .from("coupons")
        .update({
            ...updates,
            updated_at: new Date().toISOString(),
        })
        .eq("id", couponId);

    if (error) {
        console.error("Error updating coupon:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/admin/subscription/coupons");
    return { success: true };
}

export async function deactivateCoupon(
    couponId: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = createServiceRoleClient();

    // Get coupon to check for Stripe ID
    const { data: coupon } = await supabase
        .from("coupons")
        .select("stripe_coupon_id")
        .eq("id", couponId)
        .single();

    // Deactivate in Stripe if exists
    if (coupon?.stripe_coupon_id && process.env.STRIPE_SECRET_KEY) {
        try {
            const Stripe = (await import("stripe")).default;
            const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
            await stripe.coupons.del(coupon.stripe_coupon_id);
        } catch (err) {
            console.error("Error deleting Stripe coupon:", err);
            // Continue anyway
        }
    }

    // Deactivate in DB
    const { error } = await supabase
        .from("coupons")
        .update({
            is_active: false,
            updated_at: new Date().toISOString(),
        })
        .eq("id", couponId);

    if (error) {
        console.error("Error deactivating coupon:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/admin/subscription/coupons");
    return { success: true };
}

export async function getCouponStats(
    couponId: string
): Promise<{ redemptions: number; totalDiscount: number }> {
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
        .from("coupon_redemptions")
        .select("discount_amount")
        .eq("coupon_id", couponId);

    if (error || !data) {
        return { redemptions: 0, totalDiscount: 0 };
    }

    const totalDiscount = data.reduce((sum, r) => sum + (r.discount_amount || 0), 0);

    return {
        redemptions: data.length,
        totalDiscount,
    };
}

// =============================================
// Statistics
// =============================================

export async function getSubscriptionStats(): Promise<SubscriptionStats> {
    const supabase = createServiceRoleClient();

    // Total stores with subscriptions
    const { count: totalStores } = await supabase
        .from("subscriptions")
        .select("*", { count: "exact", head: true });

    // By plan
    const { data: byPlanData } = await supabase
        .from("subscriptions")
        .select(`
            plan:subscription_plans(name)
        `);

    const byPlan: { plan_name: string; count: number }[] = [];
    if (byPlanData) {
        const counts: Record<string, number> = {};
        byPlanData.forEach((s: any) => {
            const name = s.plan?.name || "unknown";
            counts[name] = (counts[name] || 0) + 1;
        });
        Object.entries(counts).forEach(([plan_name, count]) => {
            byPlan.push({ plan_name, count });
        });
    }

    // By status
    const { data: byStatusData } = await supabase
        .from("subscriptions")
        .select("status");

    const byStatus: { status: string; count: number }[] = [];
    if (byStatusData) {
        const counts: Record<string, number> = {};
        byStatusData.forEach((s) => {
            counts[s.status] = (counts[s.status] || 0) + 1;
        });
        Object.entries(counts).forEach(([status, count]) => {
            byStatus.push({ status, count });
        });
    }

    // Estimate monthly revenue (active paid subscriptions)
    const { data: revenueData } = await supabase
        .from("subscriptions")
        .select(`
            plan:subscription_plans(price_yen)
        `)
        .in("status", ["active", "trialing"]);

    let totalRevenue = 0;
    if (revenueData) {
        revenueData.forEach((s: any) => {
            totalRevenue += s.plan?.price_yen || 0;
        });
    }

    return {
        totalStores: totalStores || 0,
        byPlan,
        byStatus,
        totalRevenue,
    };
}
