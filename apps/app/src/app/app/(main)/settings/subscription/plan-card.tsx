"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2 } from "lucide-react";
import type { SubscriptionPlan } from "@/lib/subscription";

interface PlanCardProps {
    plan: SubscriptionPlan;
    isCurrentPlan: boolean;
    couponCode: string;
    onSelect: () => void;
    onValidateCoupon: () => void;
    couponValidation: {
        isValid: boolean;
        discountedPrice?: number;
        errorMessage?: string | null;
    } | null;
    loading: boolean;
}

export function PlanCard({
    plan,
    isCurrentPlan,
    couponCode,
    onSelect,
    onValidateCoupon,
    couponValidation,
    loading,
}: PlanCardProps) {
    const features = [
        {
            label: "Members",
            value: plan.limits.max_members === -1 ? "Unlimited" : `Up to ${plan.limits.max_members}`,
        },
        {
            label: "AI Credits",
            value: plan.limits.ai_credits === -1 ? "Unlimited" : `${plan.limits.ai_credits}/month`,
        },
        {
            label: "Sales Reports",
            value: plan.limits.sales_reports === -1 ? "Unlimited" : `${plan.limits.sales_reports}/month`,
        },
        {
            label: "SNS Posts",
            value: plan.limits.sns_posts === -1
                ? "Unlimited"
                : plan.limits.sns_posts === 0
                ? "-"
                : `${plan.limits.sns_posts}/month`,
        },
    ];

    const showDiscountedPrice = couponValidation?.isValid && couponValidation.discountedPrice !== undefined;
    const isProfessional = plan.name === "professional";

    return (
        <Card className={`relative ${isCurrentPlan ? "border-primary ring-2 ring-primary" : ""} ${isProfessional ? "border-blue-500" : ""}`}>
            {isProfessional && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-blue-500">Popular</Badge>
                </div>
            )}
            {isCurrentPlan && (
                <div className="absolute -top-3 right-4">
                    <Badge>Current</Badge>
                </div>
            )}

            <CardHeader className="text-center">
                <CardTitle>{plan.display_name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Price */}
                <div className="text-center">
                    {showDiscountedPrice ? (
                        <>
                            <span className="text-2xl text-muted-foreground line-through">
                                {plan.price_yen.toLocaleString()}
                            </span>
                            <span className="text-3xl font-bold text-green-600">
                                {couponValidation.discountedPrice?.toLocaleString()}
                            </span>
                        </>
                    ) : (
                        <span className="text-3xl font-bold">
                            {plan.price_yen === 0 ? "Free" : `${plan.price_yen.toLocaleString()}`}
                        </span>
                    )}
                    {plan.price_yen > 0 && <span className="text-muted-foreground">/month</span>}
                </div>

                {/* Features */}
                <ul className="space-y-2">
                    {features.map((feature) => (
                        <li key={feature.label} className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-green-500" />
                            <span className="text-muted-foreground">{feature.label}:</span>
                            <span className="font-medium">{feature.value}</span>
                        </li>
                    ))}
                </ul>

                {/* Action Button */}
                {plan.price_yen > 0 && (
                    <Button
                        className="w-full"
                        variant={isProfessional ? "default" : "outline"}
                        onClick={() => {
                            if (couponCode) {
                                onValidateCoupon();
                            }
                            onSelect();
                        }}
                        disabled={loading || isCurrentPlan}
                    >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isCurrentPlan ? "Current Plan" : "Subscribe"}
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}
