"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Plus, Ban, Copy, Check } from "lucide-react";
import {
    createCoupon,
    deactivateCoupon,
    type CouponData,
    type PlanData,
} from "../actions";

interface CouponsClientProps {
    coupons: CouponData[];
    plans: PlanData[];
}

export function CouponsClient({ coupons, plans }: CouponsClientProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [loading, setLoading] = useState(false);
    const [copiedCode, setCopiedCode] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        code: "",
        name: "",
        discount_type: "percent" as "percent" | "fixed",
        discount_value: 10,
        duration: "once" as "once" | "repeating" | "forever",
        duration_months: 3,
        max_redemptions: "",
        valid_until: "",
        applicable_plans: [] as string[],
    });

    const resetForm = () => {
        setFormData({
            code: "",
            name: "",
            discount_type: "percent",
            discount_value: 10,
            duration: "once",
            duration_months: 3,
            max_redemptions: "",
            valid_until: "",
            applicable_plans: [],
        });
    };

    const handleCreate = async () => {
        if (!formData.code) {
            toast({
                title: "Error",
                description: "Coupon code is required",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);
        try {
            const result = await createCoupon({
                code: formData.code,
                name: formData.name || undefined,
                discount_type: formData.discount_type,
                discount_value: formData.discount_value,
                duration: formData.duration,
                duration_months:
                    formData.duration === "repeating" ? formData.duration_months : undefined,
                max_redemptions: formData.max_redemptions
                    ? parseInt(formData.max_redemptions)
                    : undefined,
                valid_until: formData.valid_until || undefined,
                applicable_plans:
                    formData.applicable_plans.length > 0 ? formData.applicable_plans : undefined,
            });

            if (result.success) {
                toast({ title: "Coupon created successfully" });
                setShowCreateDialog(false);
                resetForm();
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

    const handleDeactivate = async (couponId: string) => {
        if (!confirm("Are you sure you want to deactivate this coupon?")) return;

        setLoading(true);
        try {
            const result = await deactivateCoupon(couponId);

            if (result.success) {
                toast({ title: "Coupon deactivated" });
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

    const copyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
    };

    const generateCode = () => {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let code = "";
        for (let i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setFormData({ ...formData, code });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Coupon Management</h1>
                    <p className="text-muted-foreground">Create and manage discount codes</p>
                </div>
                <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Coupon
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Coupons</CardTitle>
                </CardHeader>
                <CardContent>
                    {coupons.length === 0 ? (
                        <p className="py-8 text-center text-muted-foreground">
                            No coupons yet. Create your first coupon!
                        </p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Code</TableHead>
                                    <TableHead>Discount</TableHead>
                                    <TableHead>Duration</TableHead>
                                    <TableHead>Used</TableHead>
                                    <TableHead>Valid Until</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {coupons.map((coupon) => (
                                    <TableRow key={coupon.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <code className="rounded bg-muted px-2 py-1 font-mono text-sm">
                                                    {coupon.code}
                                                </code>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={() => copyCode(coupon.code)}
                                                >
                                                    {copiedCode === coupon.code ? (
                                                        <Check className="h-3 w-3 text-green-500" />
                                                    ) : (
                                                        <Copy className="h-3 w-3" />
                                                    )}
                                                </Button>
                                            </div>
                                            {coupon.name && (
                                                <p className="text-xs text-muted-foreground">
                                                    {coupon.name}
                                                </p>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {coupon.discount_type === "percent"
                                                ? `${coupon.discount_value}%`
                                                : `${coupon.discount_value.toLocaleString()}`}
                                        </TableCell>
                                        <TableCell className="capitalize">{coupon.duration}</TableCell>
                                        <TableCell>
                                            {coupon.redemption_count}
                                            {coupon.max_redemptions && ` / ${coupon.max_redemptions}`}
                                        </TableCell>
                                        <TableCell>
                                            {coupon.valid_until
                                                ? new Date(coupon.valid_until).toLocaleDateString()
                                                : "-"}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={coupon.is_active ? "default" : "secondary"}
                                            >
                                                {coupon.is_active ? "Active" : "Inactive"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {coupon.is_active && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDeactivate(coupon.id)}
                                                    disabled={loading}
                                                >
                                                    <Ban className="mr-1 h-4 w-4" />
                                                    Deactivate
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Create Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Create New Coupon</DialogTitle>
                        <DialogDescription>
                            Create a discount code for your customers
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="code">Coupon Code</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="code"
                                    value={formData.code}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            code: e.target.value.toUpperCase(),
                                        })
                                    }
                                    placeholder="SUMMER2024"
                                />
                                <Button variant="outline" onClick={generateCode}>
                                    Generate
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="name">Name (optional)</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) =>
                                    setFormData({ ...formData, name: e.target.value })
                                }
                                placeholder="Summer Sale 2024"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Discount Type</Label>
                                <Select
                                    value={formData.discount_type}
                                    onValueChange={(value: "percent" | "fixed") =>
                                        setFormData({ ...formData, discount_type: value })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="percent">Percentage (%)</SelectItem>
                                        <SelectItem value="fixed">Fixed Amount (JPY)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="discount_value">
                                    {formData.discount_type === "percent"
                                        ? "Discount %"
                                        : "Discount Amount"}
                                </Label>
                                <Input
                                    id="discount_value"
                                    type="number"
                                    value={formData.discount_value}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            discount_value: parseInt(e.target.value) || 0,
                                        })
                                    }
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Duration</Label>
                                <Select
                                    value={formData.duration}
                                    onValueChange={(value: "once" | "repeating" | "forever") =>
                                        setFormData({ ...formData, duration: value })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="once">Once</SelectItem>
                                        <SelectItem value="repeating">Repeating</SelectItem>
                                        <SelectItem value="forever">Forever</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {formData.duration === "repeating" && (
                                <div className="space-y-2">
                                    <Label htmlFor="duration_months">Months</Label>
                                    <Input
                                        id="duration_months"
                                        type="number"
                                        value={formData.duration_months}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                duration_months: parseInt(e.target.value) || 1,
                                            })
                                        }
                                    />
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="max_redemptions">Max Redemptions</Label>
                                <Input
                                    id="max_redemptions"
                                    type="number"
                                    value={formData.max_redemptions}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            max_redemptions: e.target.value,
                                        })
                                    }
                                    placeholder="Unlimited"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="valid_until">Valid Until</Label>
                                <Input
                                    id="valid_until"
                                    type="date"
                                    value={formData.valid_until}
                                    onChange={(e) =>
                                        setFormData({ ...formData, valid_until: e.target.value })
                                    }
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Applicable Plans (leave empty for all)</Label>
                            <div className="flex flex-wrap gap-2">
                                {plans
                                    .filter((p) => p.price_yen > 0)
                                    .map((plan) => (
                                        <Badge
                                            key={plan.name}
                                            variant={
                                                formData.applicable_plans.includes(plan.name)
                                                    ? "default"
                                                    : "outline"
                                            }
                                            className="cursor-pointer"
                                            onClick={() => {
                                                const current = formData.applicable_plans;
                                                if (current.includes(plan.name)) {
                                                    setFormData({
                                                        ...formData,
                                                        applicable_plans: current.filter(
                                                            (p) => p !== plan.name
                                                        ),
                                                    });
                                                } else {
                                                    setFormData({
                                                        ...formData,
                                                        applicable_plans: [...current, plan.name],
                                                    });
                                                }
                                            }}
                                        >
                                            {plan.display_name}
                                        </Badge>
                                    ))}
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreate} disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Coupon
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
