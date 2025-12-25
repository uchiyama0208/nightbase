"use server";

import { createServerClient } from "@/lib/supabaseServerClient";

// =============================================
// Types
// =============================================

export interface SubscriptionPlan {
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
}

export interface Subscription {
    id: string;
    store_id: string;
    plan_id: string;
    stripe_subscription_id: string | null;
    stripe_customer_id: string | null;
    status: "trialing" | "active" | "past_due" | "canceled" | "unpaid" | "incomplete";
    current_period_start: string | null;
    current_period_end: string | null;
    trial_end: string | null;
    cancel_at_period_end: boolean;
    canceled_at: string | null;
    plan?: SubscriptionPlan;
}

export interface UsageInfo {
    allowed: boolean;
    current: number;
    limit: number;
    remaining: number;
}

export interface SubscriptionContext {
    subscription: Subscription | null;
    plan: SubscriptionPlan | null;
    isTrialing: boolean;
    daysUntilTrialEnd: number | null;
    isPastDue: boolean;
    daysUntilGraceEnd: number | null;
}

// =============================================
// Plan Functions
// =============================================

export async function getPlans(): Promise<SubscriptionPlan[]> {
    const supabase = await createServerClient();

    const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");

    if (error) {
        console.error("Error fetching plans:", error);
        return [];
    }

    return data || [];
}

export async function getPlanByName(name: string): Promise<SubscriptionPlan | null> {
    const supabase = await createServerClient();

    const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("name", name)
        .single();

    if (error) {
        return null;
    }

    return data;
}

// =============================================
// Subscription Functions
// =============================================

export async function getSubscription(storeId: string): Promise<Subscription | null> {
    const supabase = await createServerClient();

    const { data, error } = await supabase
        .from("subscriptions")
        .select(`
            *,
            plan:subscription_plans(*)
        `)
        .eq("store_id", storeId)
        .single();

    if (error) {
        return null;
    }

    return data;
}

export async function getSubscriptionContext(storeId: string): Promise<SubscriptionContext> {
    const subscription = await getSubscription(storeId);

    if (!subscription) {
        return {
            subscription: null,
            plan: null,
            isTrialing: false,
            daysUntilTrialEnd: null,
            isPastDue: false,
            daysUntilGraceEnd: null,
        };
    }

    const plan = subscription.plan as SubscriptionPlan | undefined;
    const now = new Date();

    // Calculate trial days remaining
    let daysUntilTrialEnd: number | null = null;
    if (subscription.status === "trialing" && subscription.trial_end) {
        const trialEnd = new Date(subscription.trial_end);
        const diffMs = trialEnd.getTime() - now.getTime();
        daysUntilTrialEnd = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    }

    // Calculate grace period (3 days for past_due)
    let daysUntilGraceEnd: number | null = null;
    if (subscription.status === "past_due" && subscription.current_period_end) {
        const periodEnd = new Date(subscription.current_period_end);
        const graceEnd = new Date(periodEnd.getTime() + 3 * 24 * 60 * 60 * 1000);
        const diffMs = graceEnd.getTime() - now.getTime();
        daysUntilGraceEnd = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    }

    return {
        subscription,
        plan: plan || null,
        isTrialing: subscription.status === "trialing",
        daysUntilTrialEnd,
        isPastDue: subscription.status === "past_due",
        daysUntilGraceEnd,
    };
}

// =============================================
// Usage Tracking Functions
// =============================================

export async function getCurrentUsage(
    storeId: string,
    usageType: "ai_credits" | "sales_reports" | "sns_posts"
): Promise<number> {
    const supabase = await createServerClient();

    const { data, error } = await supabase.rpc("get_current_usage", {
        p_store_id: storeId,
        p_usage_type: usageType,
    });

    if (error) {
        console.error("Error getting usage:", error);
        return 0;
    }

    return data || 0;
}

export async function checkUsageLimit(
    storeId: string,
    usageType: "ai_credits" | "sales_reports" | "sns_posts"
): Promise<UsageInfo> {
    const subscription = await getSubscription(storeId);

    if (!subscription || !subscription.plan) {
        // No subscription = use free plan limits
        const freePlan = await getPlanByName("free");
        const limit = freePlan?.limits[usageType] ?? 0;
        const current = await getCurrentUsage(storeId, usageType);

        return {
            allowed: limit === -1 || current < limit,
            current,
            limit: limit === -1 ? Infinity : limit,
            remaining: limit === -1 ? Infinity : Math.max(0, limit - current),
        };
    }

    const plan = subscription.plan as SubscriptionPlan;
    const limit = plan.limits[usageType] ?? 0;
    const current = await getCurrentUsage(storeId, usageType);

    // -1 means unlimited
    if (limit === -1) {
        return {
            allowed: true,
            current,
            limit: Infinity,
            remaining: Infinity,
        };
    }

    return {
        allowed: current < limit,
        current,
        limit,
        remaining: Math.max(0, limit - current),
    };
}

export async function incrementUsage(
    storeId: string,
    usageType: "ai_credits" | "sales_reports" | "sns_posts"
): Promise<number> {
    const supabase = await createServerClient();

    const { data, error } = await supabase.rpc("increment_usage", {
        p_store_id: storeId,
        p_usage_type: usageType,
    });

    if (error) {
        console.error("Error incrementing usage:", error);
        throw new Error("Failed to record usage");
    }

    return data || 0;
}

// =============================================
// Member Limit Functions
// =============================================

export async function canAddMember(storeId: string): Promise<boolean> {
    const supabase = await createServerClient();

    // Get current member count
    const { count, error: countError } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("store_id", storeId)
        .neq("role", "guest");

    if (countError) {
        console.error("Error counting members:", countError);
        return false;
    }

    const currentCount = count || 0;

    // Get subscription limit
    const subscription = await getSubscription(storeId);
    if (!subscription || !subscription.plan) {
        const freePlan = await getPlanByName("free");
        const maxMembers = freePlan?.limits.max_members ?? 5;
        return maxMembers === -1 || currentCount < maxMembers;
    }

    const plan = subscription.plan as SubscriptionPlan;
    const maxMembers = plan.limits.max_members ?? 5;

    return maxMembers === -1 || currentCount < maxMembers;
}

export async function getMemberCount(storeId: string): Promise<{
    current: number;
    limit: number;
    remaining: number;
}> {
    const supabase = await createServerClient();

    const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("store_id", storeId)
        .neq("role", "guest");

    const currentCount = count || 0;

    const subscription = await getSubscription(storeId);
    let maxMembers = 5;

    if (subscription?.plan) {
        const plan = subscription.plan as SubscriptionPlan;
        maxMembers = plan.limits.max_members ?? 5;
    } else {
        const freePlan = await getPlanByName("free");
        maxMembers = freePlan?.limits.max_members ?? 5;
    }

    return {
        current: currentCount,
        limit: maxMembers === -1 ? Infinity : maxMembers,
        remaining: maxMembers === -1 ? Infinity : Math.max(0, maxMembers - currentCount),
    };
}

// =============================================
// Coupon Functions
// =============================================

export interface CouponValidation {
    isValid: boolean;
    couponId: string | null;
    discountType: "percent" | "fixed" | null;
    discountValue: number | null;
    errorMessage: string | null;
}

export async function validateCoupon(
    code: string,
    planName: string,
    storeId: string
): Promise<CouponValidation> {
    const supabase = await createServerClient();

    const { data, error } = await supabase.rpc("validate_coupon", {
        p_code: code.toUpperCase(),
        p_plan_name: planName,
        p_store_id: storeId,
    });

    if (error || !data || data.length === 0) {
        return {
            isValid: false,
            couponId: null,
            discountType: null,
            discountValue: null,
            errorMessage: "Invalid coupon code",
        };
    }

    const result = data[0];
    return {
        isValid: result.is_valid,
        couponId: result.coupon_id,
        discountType: result.discount_type,
        discountValue: result.discount_value,
        errorMessage: result.error_message,
    };
}

export async function calculateDiscountedPrice(
    originalPrice: number,
    discountType: "percent" | "fixed",
    discountValue: number
): Promise<number> {
    if (discountType === "percent") {
        return Math.round(originalPrice * (1 - discountValue / 100));
    }
    return Math.max(0, originalPrice - discountValue);
}
