"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
    AlertTriangle,
    Check,
    CreditCard,
    ExternalLink,
    Loader2,
    Sparkles,
    Users,
    BarChart3,
    Share2,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
    createCheckoutSession,
    getCustomerPortalUrl,
    validateCouponCode,
    cancelSubscription,
    resumeSubscription,
    type SubscriptionPageData,
} from "./actions";
import { PlanCard } from "./plan-card";

interface SubscriptionClientProps {
    data: SubscriptionPageData;
}

export function SubscriptionClient({ data }: SubscriptionClientProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [couponCode, setCouponCode] = useState("");
    const [couponValidation, setCouponValidation] = useState<{
        isValid: boolean;
        discountedPrice?: number;
        errorMessage?: string | null;
    } | null>(null);
    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

    const { plans, subscription, usage, memberCount } = data;
    const currentPlan = subscription.plan;
    const isTrialing = subscription.isTrialing;
    const isPastDue = subscription.isPastDue;

    const handleSelectPlan = async (planId: string) => {
        setLoading(true);
        try {
            const result = await createCheckoutSession(planId, couponCode || undefined);
            if (result.success && result.url) {
                window.location.href = result.url;
            } else {
                toast({
                    title: "Error",
                    description: result.error || "Failed to create checkout session",
                    variant: "destructive",
                });
            }
        } catch {
            toast({
                title: "Error",
                description: "Something went wrong",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleManageSubscription = async () => {
        setLoading(true);
        try {
            const result = await getCustomerPortalUrl();
            if (result.success && result.url) {
                window.location.href = result.url;
            } else {
                toast({
                    title: "Error",
                    description: result.error || "Failed to open customer portal",
                    variant: "destructive",
                });
            }
        } catch {
            toast({
                title: "Error",
                description: "Something went wrong",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleValidateCoupon = async (planName: string) => {
        if (!couponCode) {
            setCouponValidation(null);
            return;
        }

        const result = await validateCouponCode(couponCode, planName);
        setCouponValidation({
            isValid: result.isValid,
            discountedPrice: result.discountedPrice,
            errorMessage: result.errorMessage,
        });
    };

    const handleCancelSubscription = async () => {
        if (!confirm("Are you sure you want to cancel your subscription?")) {
            return;
        }

        setLoading(true);
        try {
            const result = await cancelSubscription();
            if (result.success) {
                toast({
                    title: "Subscription canceled",
                    description: "Your subscription will end at the end of the billing period",
                });
                router.refresh();
            } else {
                toast({
                    title: "Error",
                    description: result.error || "Failed to cancel subscription",
                    variant: "destructive",
                });
            }
        } finally {
            setLoading(false);
        }
    };

    const handleResumeSubscription = async () => {
        setLoading(true);
        try {
            const result = await resumeSubscription();
            if (result.success) {
                toast({
                    title: "Subscription resumed",
                    description: "Your subscription has been resumed",
                });
                router.refresh();
            } else {
                toast({
                    title: "Error",
                    description: result.error || "Failed to resume subscription",
                    variant: "destructive",
                });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Trial / Past Due Banner */}
            {isTrialing && subscription.daysUntilTrialEnd !== null && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-blue-600" />
                        <span className="font-medium text-blue-900">
                            Trial period: {subscription.daysUntilTrialEnd} days remaining
                        </span>
                    </div>
                    <p className="mt-1 text-sm text-blue-700">
                        Enjoy all Professional features during your trial
                    </p>
                </div>
            )}

            {isPastDue && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        <span className="font-medium text-red-900">Payment failed</span>
                    </div>
                    <p className="mt-1 text-sm text-red-700">
                        Please update your payment method to avoid service interruption
                        {subscription.daysUntilGraceEnd !== null && (
                            <> ({subscription.daysUntilGraceEnd} days remaining)</>
                        )}
                    </p>
                    <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={handleManageSubscription}
                    >
                        Update payment method
                    </Button>
                </div>
            )}

            {/* Current Plan */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Current Plan
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-2xl font-bold">
                                    {currentPlan?.display_name || "Free"}
                                </span>
                                {subscription.subscription?.cancel_at_period_end && (
                                    <Badge variant="secondary">Canceling</Badge>
                                )}
                            </div>
                            <p className="text-muted-foreground">
                                {currentPlan?.price_yen === 0
                                    ? "Free"
                                    : `${currentPlan?.price_yen?.toLocaleString() || 0}/month`}
                            </p>
                        </div>
                        {subscription.subscription?.stripe_subscription_id && (
                            <div className="flex gap-2">
                                {subscription.subscription.cancel_at_period_end ? (
                                    <Button
                                        variant="outline"
                                        onClick={handleResumeSubscription}
                                        disabled={loading}
                                    >
                                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Resume subscription
                                    </Button>
                                ) : (
                                    <Button
                                        variant="outline"
                                        onClick={handleManageSubscription}
                                        disabled={loading}
                                    >
                                        <ExternalLink className="mr-2 h-4 w-4" />
                                        Manage billing
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Usage Overview */}
            <Card>
                <CardHeader>
                    <CardTitle>Usage This Month</CardTitle>
                    <CardDescription>Track your resource usage</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Members */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">Team Members</span>
                            </div>
                            <span className="text-sm text-muted-foreground">
                                {memberCount.current} / {memberCount.limit === Infinity ? "Unlimited" : memberCount.limit}
                            </span>
                        </div>
                        {memberCount.limit !== Infinity && (
                            <Progress
                                value={(memberCount.current / memberCount.limit) * 100}
                                className="h-2"
                            />
                        )}
                    </div>

                    {/* AI Credits */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">AI Credits</span>
                            </div>
                            <span className="text-sm text-muted-foreground">
                                {usage.aiCredits.current} / {usage.aiCredits.limit === Infinity ? "Unlimited" : usage.aiCredits.limit}
                            </span>
                        </div>
                        {usage.aiCredits.limit !== Infinity && (
                            <Progress
                                value={(usage.aiCredits.current / usage.aiCredits.limit) * 100}
                                className="h-2"
                            />
                        )}
                    </div>

                    {/* Sales Reports */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">Sales Reports</span>
                            </div>
                            <span className="text-sm text-muted-foreground">
                                {usage.salesReports.current} / {usage.salesReports.limit === Infinity ? "Unlimited" : usage.salesReports.limit}
                            </span>
                        </div>
                        {usage.salesReports.limit !== Infinity && (
                            <Progress
                                value={(usage.salesReports.current / usage.salesReports.limit) * 100}
                                className="h-2"
                            />
                        )}
                    </div>

                    {/* SNS Posts */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Share2 className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">SNS Posts</span>
                            </div>
                            <span className="text-sm text-muted-foreground">
                                {usage.snsPosts.current} / {usage.snsPosts.limit === Infinity ? "Unlimited" : usage.snsPosts.limit}
                            </span>
                        </div>
                        {usage.snsPosts.limit !== Infinity && (
                            <Progress
                                value={(usage.snsPosts.current / usage.snsPosts.limit) * 100}
                                className="h-2"
                            />
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Coupon Code */}
            <Card>
                <CardHeader>
                    <CardTitle>Coupon Code</CardTitle>
                    <CardDescription>Enter a coupon code to get a discount</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <Input
                                placeholder="Enter coupon code"
                                value={couponCode}
                                onChange={(e) => {
                                    setCouponCode(e.target.value.toUpperCase());
                                    setCouponValidation(null);
                                }}
                            />
                        </div>
                    </div>
                    {couponValidation && (
                        <div className={`mt-2 text-sm ${couponValidation.isValid ? "text-green-600" : "text-red-600"}`}>
                            {couponValidation.isValid ? (
                                <div className="flex items-center gap-1">
                                    <Check className="h-4 w-4" />
                                    Coupon applied!
                                </div>
                            ) : (
                                couponValidation.errorMessage
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Plan Selection */}
            <div>
                <h2 className="mb-4 text-xl font-semibold">Choose a Plan</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {plans.map((plan) => (
                        <PlanCard
                            key={plan.id}
                            plan={plan}
                            isCurrentPlan={currentPlan?.id === plan.id}
                            couponCode={couponCode}
                            onSelect={() => handleSelectPlan(plan.id)}
                            onValidateCoupon={() => handleValidateCoupon(plan.name)}
                            couponValidation={couponValidation}
                            loading={loading}
                        />
                    ))}
                </div>
            </div>

            {/* Cancel Option */}
            {subscription.subscription?.stripe_subscription_id &&
                !subscription.subscription.cancel_at_period_end && (
                    <Card className="border-red-200">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-medium">Cancel Subscription</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Your subscription will remain active until the end of the billing period
                                    </p>
                                </div>
                                <Button
                                    variant="destructive"
                                    onClick={handleCancelSubscription}
                                    disabled={loading}
                                >
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Cancel
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
        </div>
    );
}
