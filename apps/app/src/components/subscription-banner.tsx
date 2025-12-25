"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SubscriptionBannerProps {
    isTrialing: boolean;
    daysUntilTrialEnd: number | null;
    isPastDue: boolean;
    daysUntilGraceEnd: number | null;
    cancelAtPeriodEnd: boolean;
}

export function SubscriptionBanner({
    isTrialing,
    daysUntilTrialEnd,
    isPastDue,
    daysUntilGraceEnd,
    cancelAtPeriodEnd,
}: SubscriptionBannerProps) {
    const [dismissed, setDismissed] = useState(false);

    if (dismissed) return null;

    // Past due - highest priority
    if (isPastDue) {
        return (
            <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
                <div className="max-w-7xl mx-auto px-4 py-3">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                            <p className="text-sm text-red-800 dark:text-red-200">
                                <span className="font-medium">Payment failed.</span>{" "}
                                Please update your payment method to avoid service interruption.
                                {daysUntilGraceEnd !== null && daysUntilGraceEnd > 0 && (
                                    <span className="text-red-600 dark:text-red-400">
                                        {" "}({daysUntilGraceEnd} days remaining)
                                    </span>
                                )}
                            </p>
                        </div>
                        <Link href="/app/settings/subscription">
                            <Button size="sm" variant="destructive">
                                Update payment
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Canceling
    if (cancelAtPeriodEnd) {
        return (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
                <div className="max-w-7xl mx-auto px-4 py-3">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                            <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                <span className="font-medium">Subscription canceling.</span>{" "}
                                Your subscription will end at the end of the billing period.
                            </p>
                        </div>
                        <Link href="/app/settings/subscription">
                            <Button size="sm" variant="outline">
                                Resume subscription
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Trial
    if (isTrialing && daysUntilTrialEnd !== null) {
        return (
            <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
                <div className="max-w-7xl mx-auto px-4 py-3">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                            <p className="text-sm text-blue-800 dark:text-blue-200">
                                <span className="font-medium">Free trial:</span>{" "}
                                {daysUntilTrialEnd} days remaining.
                                Enjoy all Professional features!
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Link href="/app/settings/subscription">
                                <Button size="sm">
                                    Upgrade now
                                </Button>
                            </Link>
                            <button
                                onClick={() => setDismissed(true)}
                                className="p-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
