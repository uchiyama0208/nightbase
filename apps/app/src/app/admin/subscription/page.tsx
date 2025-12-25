import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    CreditCard,
    Users,
    TrendingUp,
    Ticket,
    Settings,
    Plus,
    ArrowRight,
} from "lucide-react";
import { getAdminPlans, getAdminCoupons, getSubscriptionStats } from "./actions";

export default async function AdminSubscriptionPage() {
    const [plans, coupons, stats] = await Promise.all([
        getAdminPlans(),
        getAdminCoupons(),
        getSubscriptionStats(),
    ]);

    const activeCoupons = coupons.filter((c) => c.is_active);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Subscription Management</h1>
                    <p className="text-muted-foreground">
                        Manage plans, coupons, and view subscription analytics
                    </p>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Subscribers</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalStores}</div>
                        <p className="text-xs text-muted-foreground">
                            Stores with subscriptions
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {stats.totalRevenue.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">Estimated monthly</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Plans</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {plans.filter((p) => p.is_active).length}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            of {plans.length} total plans
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Coupons</CardTitle>
                        <Ticket className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeCoupons.length}</div>
                        <p className="text-xs text-muted-foreground">
                            of {coupons.length} total coupons
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Subscription Distribution */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Subscribers by Plan</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {stats.byPlan.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No data yet</p>
                            ) : (
                                stats.byPlan.map((item) => (
                                    <div
                                        key={item.plan_name}
                                        className="flex items-center justify-between"
                                    >
                                        <span className="capitalize">{item.plan_name}</span>
                                        <Badge variant="secondary">{item.count}</Badge>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Subscribers by Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {stats.byStatus.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No data yet</p>
                            ) : (
                                stats.byStatus.map((item) => (
                                    <div
                                        key={item.status}
                                        className="flex items-center justify-between"
                                    >
                                        <span className="capitalize">{item.status}</span>
                                        <Badge
                                            variant={
                                                item.status === "active"
                                                    ? "default"
                                                    : item.status === "trialing"
                                                    ? "secondary"
                                                    : "destructive"
                                            }
                                        >
                                            {item.count}
                                        </Badge>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Plans Section */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Plans</CardTitle>
                            <CardDescription>Manage subscription plans</CardDescription>
                        </div>
                        <Link href="/admin/subscription/plans">
                            <Button variant="outline" size="sm">
                                <Settings className="mr-2 h-4 w-4" />
                                Manage
                            </Button>
                        </Link>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {plans.slice(0, 4).map((plan) => (
                                <div
                                    key={plan.id}
                                    className="flex items-center justify-between rounded-lg border p-3"
                                >
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{plan.display_name}</span>
                                            {!plan.is_active && (
                                                <Badge variant="secondary">Inactive</Badge>
                                            )}
                                        </div>
                                        <span className="text-sm text-muted-foreground">
                                            {plan.price_yen === 0
                                                ? "Free"
                                                : `${plan.price_yen.toLocaleString()}/month`}
                                        </span>
                                    </div>
                                    <Badge variant={plan.stripe_price_id ? "default" : "outline"}>
                                        {plan.stripe_price_id ? "Stripe OK" : "No Stripe"}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                        <Link
                            href="/admin/subscription/plans"
                            className="mt-4 flex items-center text-sm text-primary hover:underline"
                        >
                            View all plans
                            <ArrowRight className="ml-1 h-4 w-4" />
                        </Link>
                    </CardContent>
                </Card>

                {/* Coupons Section */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Coupons</CardTitle>
                            <CardDescription>Manage discount codes</CardDescription>
                        </div>
                        <Link href="/admin/subscription/coupons">
                            <Button size="sm">
                                <Plus className="mr-2 h-4 w-4" />
                                New Coupon
                            </Button>
                        </Link>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {coupons.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No coupons yet</p>
                            ) : (
                                coupons.slice(0, 4).map((coupon) => (
                                    <div
                                        key={coupon.id}
                                        className="flex items-center justify-between rounded-lg border p-3"
                                    >
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <code className="rounded bg-muted px-2 py-1 text-sm font-mono">
                                                    {coupon.code}
                                                </code>
                                                {!coupon.is_active && (
                                                    <Badge variant="secondary">Inactive</Badge>
                                                )}
                                            </div>
                                            <span className="text-sm text-muted-foreground">
                                                {coupon.discount_type === "percent"
                                                    ? `${coupon.discount_value}% off`
                                                    : `${coupon.discount_value.toLocaleString()} off`}
                                            </span>
                                        </div>
                                        <span className="text-sm text-muted-foreground">
                                            {coupon.redemption_count} used
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                        <Link
                            href="/admin/subscription/coupons"
                            className="mt-4 flex items-center text-sm text-primary hover:underline"
                        >
                            Manage coupons
                            <ArrowRight className="ml-1 h-4 w-4" />
                        </Link>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
