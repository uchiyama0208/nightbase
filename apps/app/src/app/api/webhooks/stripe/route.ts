import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabaseServerClient";
import type Stripe from "stripe";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any;

// =============================================
// Subscription Event Handlers
// =============================================

async function handleSubscriptionCreated(
    supabase: SupabaseClient,
    subscription: Stripe.Subscription
) {
    const storeId = subscription.metadata?.store_id;
    if (!storeId) {
        console.error("No store_id in subscription metadata");
        return;
    }

    const planName = subscription.metadata?.plan_name;

    // Get plan from DB
    const { data: plan } = await supabase
        .from("subscription_plans")
        .select("id")
        .eq("name", planName)
        .single();

    if (!plan) {
        console.error("Plan not found:", planName);
        return;
    }

    // Create or update subscription record
    const { error } = await supabase
        .from("subscriptions")
        .upsert({
            store_id: storeId,
            plan_id: plan.id,
            stripe_subscription_id: subscription.id,
            stripe_customer_id: subscription.customer as string,
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            trial_end: subscription.trial_end
                ? new Date(subscription.trial_end * 1000).toISOString()
                : null,
            cancel_at_period_end: subscription.cancel_at_period_end,
            updated_at: new Date().toISOString(),
        }, {
            onConflict: "store_id"
        });

    if (error) {
        console.error("Error creating subscription:", error);
        return;
    }

    // Update store with stripe_customer_id
    await supabase
        .from("stores")
        .update({ stripe_customer_id: subscription.customer as string })
        .eq("id", storeId);

    // Record history
    await supabase.from("subscription_history").insert({
        store_id: storeId,
        event_type: subscription.status === "trialing" ? "trial_started" : "created",
        to_plan_id: plan.id,
        metadata: { stripe_subscription_id: subscription.id }
    });
}

async function handleSubscriptionUpdated(
    supabase: SupabaseClient,
    subscription: Stripe.Subscription
) {
    // Find existing subscription by stripe_subscription_id
    const { data: existingSub } = await supabase
        .from("subscriptions")
        .select("id, store_id, plan_id, status")
        .eq("stripe_subscription_id", subscription.id)
        .single();

    if (!existingSub) {
        console.error("Subscription not found:", subscription.id);
        return;
    }

    // Check if plan changed
    const newPlanName = subscription.metadata?.plan_name;
    let newPlanId = existingSub.plan_id;

    if (newPlanName) {
        const { data: newPlan } = await supabase
            .from("subscription_plans")
            .select("id")
            .eq("name", newPlanName)
            .single();

        if (newPlan) {
            newPlanId = newPlan.id;
        }
    }

    // Update subscription
    const { error } = await supabase
        .from("subscriptions")
        .update({
            plan_id: newPlanId,
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            trial_end: subscription.trial_end
                ? new Date(subscription.trial_end * 1000).toISOString()
                : null,
            cancel_at_period_end: subscription.cancel_at_period_end,
            canceled_at: subscription.canceled_at
                ? new Date(subscription.canceled_at * 1000).toISOString()
                : null,
            updated_at: new Date().toISOString(),
        })
        .eq("id", existingSub.id);

    if (error) {
        console.error("Error updating subscription:", error);
        return;
    }

    // Record plan change history
    if (newPlanId !== existingSub.plan_id) {
        const eventType = subscription.items.data[0]?.price.unit_amount! > 0 ? "upgraded" : "downgraded";
        await supabase.from("subscription_history").insert({
            subscription_id: existingSub.id,
            store_id: existingSub.store_id,
            event_type: eventType,
            from_plan_id: existingSub.plan_id,
            to_plan_id: newPlanId,
        });
    }
}

async function handleSubscriptionDeleted(
    supabase: SupabaseClient,
    subscription: Stripe.Subscription
) {
    const { data: existingSub } = await supabase
        .from("subscriptions")
        .select("id, store_id, plan_id")
        .eq("stripe_subscription_id", subscription.id)
        .single();

    if (!existingSub) {
        return;
    }

    // Get free plan
    const { data: freePlan } = await supabase
        .from("subscription_plans")
        .select("id")
        .eq("name", "free")
        .single();

    // Downgrade to free plan instead of deleting
    await supabase
        .from("subscriptions")
        .update({
            plan_id: freePlan?.id || existingSub.plan_id,
            status: "canceled",
            stripe_subscription_id: null,
            canceled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .eq("id", existingSub.id);

    // Record history
    await supabase.from("subscription_history").insert({
        subscription_id: existingSub.id,
        store_id: existingSub.store_id,
        event_type: "canceled",
        from_plan_id: existingSub.plan_id,
        to_plan_id: freePlan?.id,
    });
}

async function handleInvoicePaymentSucceeded(
    supabase: SupabaseClient,
    invoice: Stripe.Invoice
) {
    const subscriptionId = invoice.subscription as string;
    if (!subscriptionId) return;

    const { data: existingSub } = await supabase
        .from("subscriptions")
        .select("id, store_id")
        .eq("stripe_subscription_id", subscriptionId)
        .single();

    if (!existingSub) return;

    // Update status to active
    await supabase
        .from("subscriptions")
        .update({
            status: "active",
            updated_at: new Date().toISOString(),
        })
        .eq("id", existingSub.id);

    // Record renewal
    if (invoice.billing_reason === "subscription_cycle") {
        await supabase.from("subscription_history").insert({
            subscription_id: existingSub.id,
            store_id: existingSub.store_id,
            event_type: "renewed",
            metadata: { invoice_id: invoice.id }
        });
    }
}

async function handleInvoicePaymentFailed(
    supabase: SupabaseClient,
    invoice: Stripe.Invoice
) {
    const subscriptionId = invoice.subscription as string;
    if (!subscriptionId) return;

    const { data: existingSub } = await supabase
        .from("subscriptions")
        .select("id, store_id")
        .eq("stripe_subscription_id", subscriptionId)
        .single();

    if (!existingSub) return;

    // Update status to past_due
    await supabase
        .from("subscriptions")
        .update({
            status: "past_due",
            updated_at: new Date().toISOString(),
        })
        .eq("id", existingSub.id);

    // Record failure
    await supabase.from("subscription_history").insert({
        subscription_id: existingSub.id,
        store_id: existingSub.store_id,
        event_type: "payment_failed",
        metadata: { invoice_id: invoice.id }
    });
}

// =============================================
// AI Credits Handler (existing)
// =============================================

async function handleAiCreditsCheckout(
    supabase: SupabaseClient,
    session: Stripe.Checkout.Session
) {
    const storeId = session.metadata?.store_id;
    const credits = parseInt(session.metadata?.credits || "0", 10);

    if (!storeId || credits <= 0) return;

    // Get current credits
    const { data: store, error: fetchError } = await supabase
        .from("stores")
        .select("ai_credits")
        .eq("id", storeId)
        .single();

    if (fetchError) {
        console.error("Error fetching store:", fetchError);
        return;
    }

    const currentCredits = store?.ai_credits || 0;

    // Add credits
    const { error: updateError } = await supabase
        .from("stores")
        .update({ ai_credits: currentCredits + credits })
        .eq("id", storeId);

    if (updateError) {
        console.error("Error updating credits:", updateError);
    }
}

// =============================================
// Main Webhook Handler
// =============================================

export async function POST(request: NextRequest) {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripeSecretKey || !webhookSecret) {
        console.error("Stripe keys not configured");
        return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
    }

    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
        return NextResponse.json({ error: "No signature" }, { status: 400 });
    }

    try {
        const Stripe = (await import("stripe")).default;
        const stripe = new Stripe(stripeSecretKey);

        const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
        const supabase = createServiceRoleClient();

        switch (event.type) {
            // Checkout completed
            case "checkout.session.completed": {
                const session = event.data.object as Stripe.Checkout.Session;
                const type = session.metadata?.type;

                if (type === "ai_credits") {
                    await handleAiCreditsCheckout(supabase, session);
                }
                // Subscription checkout is handled by subscription.created
                break;
            }

            // Subscription events
            case "customer.subscription.created": {
                const subscription = event.data.object as Stripe.Subscription;
                await handleSubscriptionCreated(supabase, subscription);
                break;
            }

            case "customer.subscription.updated": {
                const subscription = event.data.object as Stripe.Subscription;
                await handleSubscriptionUpdated(supabase, subscription);
                break;
            }

            case "customer.subscription.deleted": {
                const subscription = event.data.object as Stripe.Subscription;
                await handleSubscriptionDeleted(supabase, subscription);
                break;
            }

            // Invoice events
            case "invoice.payment_succeeded": {
                const invoice = event.data.object as Stripe.Invoice;
                await handleInvoicePaymentSucceeded(supabase, invoice);
                break;
            }

            case "invoice.payment_failed": {
                const invoice = event.data.object as Stripe.Invoice;
                await handleInvoicePaymentFailed(supabase, invoice);
                break;
            }

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        return NextResponse.json({ received: true });
    } catch (err) {
        console.error("Webhook error:", err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Webhook handler failed" },
            { status: 400 }
        );
    }
}
