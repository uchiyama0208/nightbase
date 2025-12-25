"use server";

import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabaseServerClient";
import {
    getPlans,
    getSubscription,
    getSubscriptionContext,
    checkUsageLimit,
    getMemberCount,
    validateCoupon,
    calculateDiscountedPrice,
    type SubscriptionPlan,
    type SubscriptionContext,
    type UsageInfo,
    type CouponValidation,
} from "@/lib/subscription";

// =============================================
// Types
// =============================================

export interface SubscriptionPageData {
    plans: SubscriptionPlan[];
    subscription: SubscriptionContext;
    usage: {
        aiCredits: UsageInfo;
        salesReports: UsageInfo;
        snsPosts: UsageInfo;
    };
    memberCount: {
        current: number;
        limit: number;
        remaining: number;
    };
}

// =============================================
// Data Fetching
// =============================================

export async function getSubscriptionPageData(): Promise<SubscriptionPageData | null> {
    const supabase = await createServerSupabaseClient();

    // Get current user's profile
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
        .from("profiles")
        .select("store_id, role")
        .eq("user_id", user.id)
        .single();

    if (!profile || profile.role !== "admin") {
        return null;
    }

    const storeId = profile.store_id;

    // Fetch all data in parallel
    const [plans, subscription, aiCredits, salesReports, snsPosts, memberCount] = await Promise.all([
        getPlans(),
        getSubscriptionContext(storeId),
        checkUsageLimit(storeId, "ai_credits"),
        checkUsageLimit(storeId, "sales_reports"),
        checkUsageLimit(storeId, "sns_posts"),
        getMemberCount(storeId),
    ]);

    return {
        plans,
        subscription,
        usage: {
            aiCredits,
            salesReports,
            snsPosts,
        },
        memberCount,
    };
}

// =============================================
// Checkout Session
// =============================================

export async function createCheckoutSession(
    planId: string,
    couponCode?: string
): Promise<{ success: boolean; url?: string; error?: string }> {
    const supabase = await createServerSupabaseClient();

    // Get current user and profile
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: "Not authenticated" };
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("store_id, role")
        .eq("user_id", user.id)
        .single();

    if (!profile || profile.role !== "admin") {
        return { success: false, error: "Admin access required" };
    }

    const storeId = profile.store_id;

    // Get plan details
    const { data: plan, error: planError } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("id", planId)
        .single();

    if (planError || !plan) {
        return { success: false, error: "Plan not found" };
    }

    if (!plan.stripe_price_id) {
        return { success: false, error: "Stripe price not configured for this plan" };
    }

    // Get store info
    const { data: store } = await supabase
        .from("stores")
        .select("stripe_customer_id, name")
        .eq("id", storeId)
        .single();

    // Validate coupon if provided
    let stripeCouponId: string | null = null;
    if (couponCode) {
        const validation = await validateCoupon(couponCode, plan.name, storeId);
        if (!validation.isValid) {
            return { success: false, error: validation.errorMessage || "Invalid coupon" };
        }

        // Get Stripe coupon ID
        const { data: coupon } = await supabase
            .from("coupons")
            .select("stripe_coupon_id")
            .eq("id", validation.couponId)
            .single();

        stripeCouponId = coupon?.stripe_coupon_id || null;
    }

    try {
        const Stripe = (await import("stripe")).default;
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://app.nightbase.jp";

        // Create or retrieve customer
        let customerId = store?.stripe_customer_id;
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                metadata: {
                    store_id: storeId,
                    store_name: store?.name || "",
                },
            });
            customerId = customer.id;

            // Save customer ID to store
            await supabase
                .from("stores")
                .update({ stripe_customer_id: customerId })
                .eq("id", storeId);
        }

        // Create checkout session
        const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
            customer: customerId,
            payment_method_types: ["card"],
            line_items: [
                {
                    price: plan.stripe_price_id,
                    quantity: 1,
                },
            ],
            mode: "subscription",
            success_url: `${siteUrl}/app/settings/subscription?success=true`,
            cancel_url: `${siteUrl}/app/settings/subscription?canceled=true`,
            subscription_data: {
                metadata: {
                    store_id: storeId,
                    plan_name: plan.name,
                },
                trial_period_days: 14,
            },
            metadata: {
                store_id: storeId,
                plan_name: plan.name,
                type: "subscription",
            },
        };

        // Add coupon if validated
        if (stripeCouponId) {
            sessionParams.discounts = [{ coupon: stripeCouponId }];
        }

        const session = await stripe.checkout.sessions.create(sessionParams);

        return { success: true, url: session.url || undefined };
    } catch (err) {
        console.error("Checkout session error:", err);
        return {
            success: false,
            error: err instanceof Error ? err.message : "Failed to create checkout session",
        };
    }
}

// =============================================
// Customer Portal
// =============================================

export async function getCustomerPortalUrl(): Promise<{ success: boolean; url?: string; error?: string }> {
    const supabase = await createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: "Not authenticated" };
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("store_id, role")
        .eq("user_id", user.id)
        .single();

    if (!profile || profile.role !== "admin") {
        return { success: false, error: "Admin access required" };
    }

    const { data: store } = await supabase
        .from("stores")
        .select("stripe_customer_id")
        .eq("id", profile.store_id)
        .single();

    if (!store?.stripe_customer_id) {
        return { success: false, error: "No subscription found" };
    }

    try {
        const Stripe = (await import("stripe")).default;
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://app.nightbase.jp";

        const session = await stripe.billingPortal.sessions.create({
            customer: store.stripe_customer_id,
            return_url: `${siteUrl}/app/settings/subscription`,
        });

        return { success: true, url: session.url };
    } catch (err) {
        console.error("Customer portal error:", err);
        return {
            success: false,
            error: err instanceof Error ? err.message : "Failed to create portal session",
        };
    }
}

// =============================================
// Coupon Validation
// =============================================

export async function validateCouponCode(
    code: string,
    planName: string
): Promise<CouponValidation & { discountedPrice?: number }> {
    const supabase = await createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return {
            isValid: false,
            couponId: null,
            discountType: null,
            discountValue: null,
            errorMessage: "Not authenticated",
        };
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("store_id")
        .eq("user_id", user.id)
        .single();

    if (!profile) {
        return {
            isValid: false,
            couponId: null,
            discountType: null,
            discountValue: null,
            errorMessage: "Profile not found",
        };
    }

    const validation = await validateCoupon(code, planName, profile.store_id);

    if (!validation.isValid) {
        return validation;
    }

    // Get plan price
    const { data: plan } = await supabase
        .from("subscription_plans")
        .select("price_yen")
        .eq("name", planName)
        .single();

    if (plan && validation.discountType && validation.discountValue) {
        const discountedPrice = calculateDiscountedPrice(
            plan.price_yen,
            validation.discountType,
            validation.discountValue
        );
        return { ...validation, discountedPrice };
    }

    return validation;
}

// =============================================
// Cancel Subscription
// =============================================

export async function cancelSubscription(): Promise<{ success: boolean; error?: string }> {
    const supabase = await createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: "Not authenticated" };
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("store_id, role")
        .eq("user_id", user.id)
        .single();

    if (!profile || profile.role !== "admin") {
        return { success: false, error: "Admin access required" };
    }

    const subscription = await getSubscription(profile.store_id);
    if (!subscription?.stripe_subscription_id) {
        return { success: false, error: "No active subscription" };
    }

    try {
        const Stripe = (await import("stripe")).default;
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

        // Cancel at period end (not immediately)
        await stripe.subscriptions.update(subscription.stripe_subscription_id, {
            cancel_at_period_end: true,
        });

        return { success: true };
    } catch (err) {
        console.error("Cancel subscription error:", err);
        return {
            success: false,
            error: err instanceof Error ? err.message : "Failed to cancel subscription",
        };
    }
}

// =============================================
// Resume Subscription
// =============================================

export async function resumeSubscription(): Promise<{ success: boolean; error?: string }> {
    const supabase = await createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: "Not authenticated" };
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("store_id, role")
        .eq("user_id", user.id)
        .single();

    if (!profile || profile.role !== "admin") {
        return { success: false, error: "Admin access required" };
    }

    const subscription = await getSubscription(profile.store_id);
    if (!subscription?.stripe_subscription_id) {
        return { success: false, error: "No subscription found" };
    }

    try {
        const Stripe = (await import("stripe")).default;
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

        // Resume subscription
        await stripe.subscriptions.update(subscription.stripe_subscription_id, {
            cancel_at_period_end: false,
        });

        return { success: true };
    } catch (err) {
        console.error("Resume subscription error:", err);
        return {
            success: false,
            error: err instanceof Error ? err.message : "Failed to resume subscription",
        };
    }
}
