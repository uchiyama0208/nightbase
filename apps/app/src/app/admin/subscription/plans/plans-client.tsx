"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Pencil, Zap } from "lucide-react";
import { updatePlan, createStripePriceForPlan, type PlanData } from "../actions";

interface PlansClientProps {
    plans: PlanData[];
}

export function PlansClient({ plans }: PlansClientProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [editingPlan, setEditingPlan] = useState<PlanData | null>(null);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        display_name: "",
        description: "",
        price_yen: 0,
        stripe_price_id: "",
        max_members: 0,
        ai_credits: 0,
        sales_reports: 0,
        sns_posts: 0,
        is_active: true,
    });

    const openEditDialog = (plan: PlanData) => {
        setEditingPlan(plan);
        setFormData({
            display_name: plan.display_name,
            description: plan.description || "",
            price_yen: plan.price_yen,
            stripe_price_id: plan.stripe_price_id || "",
            max_members: plan.limits.max_members,
            ai_credits: plan.limits.ai_credits,
            sales_reports: plan.limits.sales_reports,
            sns_posts: plan.limits.sns_posts,
            is_active: plan.is_active,
        });
    };

    const handleSave = async () => {
        if (!editingPlan) return;

        setLoading(true);
        try {
            const result = await updatePlan(editingPlan.id, {
                display_name: formData.display_name,
                description: formData.description || undefined,
                price_yen: formData.price_yen,
                stripe_price_id: formData.stripe_price_id || undefined,
                limits: {
                    max_members: formData.max_members,
                    ai_credits: formData.ai_credits,
                    sales_reports: formData.sales_reports,
                    sns_posts: formData.sns_posts,
                },
                is_active: formData.is_active,
            });

            if (result.success) {
                toast({ title: "Plan updated successfully" });
                setEditingPlan(null);
                router.refresh();
            } else {
                toast({
                    title: "Error",
                    description: result.error,
                    variant: "destructive",
                });
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCreateStripePrice = async (planId: string) => {
        setLoading(true);
        try {
            const result = await createStripePriceForPlan(planId);

            if (result.success) {
                toast({
                    title: "Stripe price created",
                    description: `Price ID: ${result.priceId}`,
                });
                router.refresh();
            } else {
                toast({
                    title: "Error",
                    description: result.error,
                    variant: "destructive",
                });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Plan Management</h1>
                <p className="text-muted-foreground">
                    Configure subscription plans and pricing
                </p>
            </div>

            <div className="grid gap-4">
                {plans.map((plan) => (
                    <Card key={plan.id} className={!plan.is_active ? "opacity-60" : ""}>
                        <CardHeader className="flex flex-row items-start justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <CardTitle>{plan.display_name}</CardTitle>
                                    {!plan.is_active && <Badge variant="secondary">Inactive</Badge>}
                                    {plan.name === "free" && <Badge>Default</Badge>}
                                </div>
                                <CardDescription>
                                    {plan.description || `Internal name: ${plan.name}`}
                                </CardDescription>
                            </div>
                            <div className="flex gap-2">
                                {plan.price_yen > 0 && !plan.stripe_price_id && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleCreateStripePrice(plan.id)}
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <Zap className="mr-2 h-4 w-4" />
                                        )}
                                        Create Stripe Price
                                    </Button>
                                )}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openEditDialog(plan)}
                                >
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Edit
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                <div>
                                    <span className="text-sm text-muted-foreground">Price</span>
                                    <p className="text-lg font-semibold">
                                        {plan.price_yen === 0
                                            ? "Free"
                                            : `${plan.price_yen.toLocaleString()}/month`}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-sm text-muted-foreground">Members</span>
                                    <p className="text-lg font-semibold">
                                        {plan.limits.max_members === -1
                                            ? "Unlimited"
                                            : plan.limits.max_members}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-sm text-muted-foreground">AI Credits</span>
                                    <p className="text-lg font-semibold">
                                        {plan.limits.ai_credits === -1
                                            ? "Unlimited"
                                            : `${plan.limits.ai_credits}/mo`}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-sm text-muted-foreground">SNS Posts</span>
                                    <p className="text-lg font-semibold">
                                        {plan.limits.sns_posts === -1
                                            ? "Unlimited"
                                            : plan.limits.sns_posts === 0
                                            ? "-"
                                            : `${plan.limits.sns_posts}/mo`}
                                    </p>
                                </div>
                            </div>
                            {plan.stripe_price_id && (
                                <div className="mt-4 rounded bg-muted p-2">
                                    <span className="text-xs text-muted-foreground">
                                        Stripe Price ID:{" "}
                                    </span>
                                    <code className="text-xs">{plan.stripe_price_id}</code>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Edit Dialog */}
            <Dialog open={!!editingPlan} onOpenChange={() => setEditingPlan(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Edit Plan: {editingPlan?.display_name}</DialogTitle>
                        <DialogDescription>
                            Update plan details and limits. Changes to price will only affect new
                            subscribers.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="display_name">Display Name</Label>
                                <Input
                                    id="display_name"
                                    value={formData.display_name}
                                    onChange={(e) =>
                                        setFormData({ ...formData, display_name: e.target.value })
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="price_yen">Price (JPY/month)</Label>
                                <Input
                                    id="price_yen"
                                    type="number"
                                    value={formData.price_yen}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            price_yen: parseInt(e.target.value) || 0,
                                        })
                                    }
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Input
                                id="description"
                                value={formData.description}
                                onChange={(e) =>
                                    setFormData({ ...formData, description: e.target.value })
                                }
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="stripe_price_id">Stripe Price ID</Label>
                            <Input
                                id="stripe_price_id"
                                value={formData.stripe_price_id}
                                onChange={(e) =>
                                    setFormData({ ...formData, stripe_price_id: e.target.value })
                                }
                                placeholder="price_xxxxx"
                            />
                        </div>

                        <div className="border-t pt-4">
                            <h4 className="mb-3 font-medium">Limits (-1 = unlimited)</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="max_members">Max Members</Label>
                                    <Input
                                        id="max_members"
                                        type="number"
                                        value={formData.max_members}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                max_members: parseInt(e.target.value) || 0,
                                            })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="ai_credits">AI Credits/month</Label>
                                    <Input
                                        id="ai_credits"
                                        type="number"
                                        value={formData.ai_credits}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                ai_credits: parseInt(e.target.value) || 0,
                                            })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="sales_reports">Sales Reports/month</Label>
                                    <Input
                                        id="sales_reports"
                                        type="number"
                                        value={formData.sales_reports}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                sales_reports: parseInt(e.target.value) || 0,
                                            })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="sns_posts">SNS Posts/month</Label>
                                    <Input
                                        id="sns_posts"
                                        type="number"
                                        value={formData.sns_posts}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                sns_posts: parseInt(e.target.value) || 0,
                                            })
                                        }
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center space-x-2 border-t pt-4">
                            <Switch
                                id="is_active"
                                checked={formData.is_active}
                                onCheckedChange={(checked) =>
                                    setFormData({ ...formData, is_active: checked })
                                }
                            />
                            <Label htmlFor="is_active">Plan is active</Label>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingPlan(null)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
