"use client";

import { useState, useEffect } from "react";
import { PricingSystem } from "@/types/floor";
import { getPricingSystems, createPricingSystem, updatePricingSystem, deletePricingSystem, setDefaultPricingSystem } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Edit2, Trash2, Star, Check, ChevronLeft, MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PricingSystemFormData {
    name: string;
    set_fee: number | "";
    set_duration_minutes: number | "";
    extension_fee: number | "";
    extension_duration_minutes: number | "";
    nomination_fee: number | "";
    nomination_set_duration_minutes: number | "";
    companion_fee: number | "";
    companion_set_duration_minutes: number | "";
    service_rate: number | "";
    tax_rate: number | "";
    is_default: boolean;
}

const defaultFormData: PricingSystemFormData = {
    name: "",
    set_fee: "",
    set_duration_minutes: "",
    extension_fee: "",
    extension_duration_minutes: "",
    nomination_fee: "",
    nomination_set_duration_minutes: "",
    companion_fee: "",
    companion_set_duration_minutes: "",
    service_rate: "",
    tax_rate: "",
    is_default: false,
};

export default function PricingSystemsPage() {
    const [systems, setSystems] = useState<PricingSystem[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [editingSystem, setEditingSystem] = useState<PricingSystem | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<PricingSystemFormData>(defaultFormData);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const data = await getPricingSystems();
        setSystems(data);
    };

    const handleOpenModal = (system?: PricingSystem) => {
        if (system) {
            setEditingSystem(system);
            setFormData({
                name: system.name ?? "",
                set_fee: system.set_fee ?? "",
                set_duration_minutes: system.set_duration_minutes ?? "",
                extension_fee: system.extension_fee ?? "",
                extension_duration_minutes: system.extension_duration_minutes ?? "",
                nomination_fee: system.nomination_fee ?? "",
                nomination_set_duration_minutes: system.nomination_set_duration_minutes ?? "",
                companion_fee: system.companion_fee ?? "",
                companion_set_duration_minutes: system.companion_set_duration_minutes ?? "",
                service_rate: system.service_rate ?? "",
                tax_rate: system.tax_rate ?? "",
                is_default: system.is_default ?? false,
            });
        } else {
            setEditingSystem(null);
            setFormData(defaultFormData);
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.name.trim()) {
            toast({ title: "名前を入力してください" });
            return;
        }

        const dataToSave = {
            name: formData.name,
            set_fee: formData.set_fee === "" ? 0 : formData.set_fee,
            set_duration_minutes: formData.set_duration_minutes === "" ? 0 : formData.set_duration_minutes,
            extension_fee: formData.extension_fee === "" ? 0 : formData.extension_fee,
            extension_duration_minutes: formData.extension_duration_minutes === "" ? 0 : formData.extension_duration_minutes,
            nomination_fee: formData.nomination_fee === "" ? 0 : formData.nomination_fee,
            nomination_set_duration_minutes: formData.nomination_set_duration_minutes === "" ? 60 : formData.nomination_set_duration_minutes,
            companion_fee: formData.companion_fee === "" ? 0 : formData.companion_fee,
            companion_set_duration_minutes: formData.companion_set_duration_minutes === "" ? 60 : formData.companion_set_duration_minutes,
            service_rate: formData.service_rate === "" ? 0 : formData.service_rate,
            tax_rate: formData.tax_rate === "" ? 0 : formData.tax_rate,
            is_default: formData.is_default,
        };

        setIsLoading(true);
        try {
            if (editingSystem) {
                await updatePricingSystem(editingSystem.id, dataToSave);
                toast({ title: "料金システムを更新しました" });
            } else {
                await createPricingSystem(dataToSave);
                toast({ title: "料金システムを作成しました" });
            }
            await loadData();
            setIsModalOpen(false);
        } catch (error) {
            console.error(error);
            toast({ title: "保存に失敗しました" });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!deletingId) return;

        setIsLoading(true);
        try {
            await deletePricingSystem(deletingId);
            toast({ title: "料金システムを削除しました" });
            await loadData();
            setIsDeleteModalOpen(false);
            setDeletingId(null);
        } catch (error) {
            console.error(error);
            toast({ title: "削除に失敗しました" });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSetDefault = async (id: string) => {
        try {
            await setDefaultPricingSystem(id);
            toast({ title: "デフォルトに設定しました" });
            await loadData();
        } catch (error) {
            console.error(error);
            toast({ title: "設定に失敗しました" });
        }
    };

    const formatCurrency = (value: number) => {
        return `¥${value.toLocaleString()}`;
    };

    const handleNumberChange = (field: keyof PricingSystemFormData, value: string) => {
        if (value === "") {
            setFormData({ ...formData, [field]: "" });
        } else {
            const num = parseFloat(value);
            if (!isNaN(num)) {
                setFormData({ ...formData, [field]: num });
            }
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">料金システム</h1>
                <Button onClick={() => handleOpenModal()}>
                    <Plus className="h-4 w-4 mr-2" />
                    新規作成
                </Button>
            </div>

            {systems.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                        <p className="mb-4">料金システムがありません</p>
                        <Button onClick={() => handleOpenModal()}>
                            <Plus className="h-4 w-4 mr-2" />
                            最初の料金システムを作成
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {systems.map((system) => (
                        <Card
                            key={system.id}
                            className="relative cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => handleOpenModal(system)}
                        >
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                                    {system.name}
                                    {system.is_default && (
                                        <Badge variant="secondary" className="text-xs">
                                            <Star className="h-3 w-3 mr-1 fill-current" />
                                            デフォルト
                                        </Badge>
                                    )}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">セット料金</span>
                                    <span className="font-semibold text-foreground">{formatCurrency(system.set_fee)} / {system.set_duration_minutes}分</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">延長料金</span>
                                    <span className="font-semibold text-foreground">{formatCurrency(system.extension_fee)} / {system.extension_duration_minutes}分</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">指名料金</span>
                                    <span className="font-semibold text-foreground">{formatCurrency(system.nomination_fee)} / {system.nomination_set_duration_minutes || 60}分</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">場内料金</span>
                                    <span className="font-semibold text-foreground">{formatCurrency(system.companion_fee)} / {system.companion_set_duration_minutes || 60}分</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">サービス料</span>
                                    <span className="font-semibold text-foreground">{system.service_rate}%</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">消費税</span>
                                    <span className="font-semibold text-foreground">{system.tax_rate}%</span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Create/Edit Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader className="flex flex-row items-center justify-between border-b pb-4 space-y-0">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="-ml-2"
                            onClick={() => setIsModalOpen(false)}
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <DialogTitle>
                            {editingSystem ? "料金システム編集" : "料金システム作成"}
                        </DialogTitle>
                        {editingSystem && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="-mr-2">
                                        <MoreHorizontal className="h-5 w-5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    {!editingSystem.is_default && (
                                        <DropdownMenuItem
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleSetDefault(editingSystem.id);
                                                setIsModalOpen(false);
                                            }}
                                        >
                                            <Star className="h-4 w-4 mr-2" />
                                            デフォルトに設定
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem
                                        className="text-destructive focus:text-destructive"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setDeletingId(editingSystem.id);
                                            setIsDeleteModalOpen(true);
                                            setIsModalOpen(false);
                                        }}
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        削除
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                        {!editingSystem && <div className="w-10" />}
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>名前 *</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="例: 通常料金"
                            />
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>セット料金 (円)</Label>
                                <Input
                                    type="number"
                                    value={formData.set_fee}
                                    onChange={(e) => handleNumberChange("set_fee", e.target.value)}
                                    onWheel={(e) => e.currentTarget.blur()}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>セット時間 (分)</Label>
                                <Input
                                    type="number"
                                    value={formData.set_duration_minutes}
                                    onChange={(e) => handleNumberChange("set_duration_minutes", e.target.value)}
                                    onWheel={(e) => e.currentTarget.blur()}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>延長料金 (円)</Label>
                                <Input
                                    type="number"
                                    value={formData.extension_fee}
                                    onChange={(e) => handleNumberChange("extension_fee", e.target.value)}
                                    onWheel={(e) => e.currentTarget.blur()}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>延長時間 (分)</Label>
                                <Input
                                    type="number"
                                    value={formData.extension_duration_minutes}
                                    onChange={(e) => handleNumberChange("extension_duration_minutes", e.target.value)}
                                    onWheel={(e) => e.currentTarget.blur()}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>指名料金</Label>
                                <Input
                                    type="number"
                                    value={formData.nomination_fee}
                                    onChange={(e) => handleNumberChange("nomination_fee", e.target.value)}
                                    onWheel={(e) => e.currentTarget.blur()}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>指名セット時間 (分)</Label>
                                <Input
                                    type="number"
                                    value={formData.nomination_set_duration_minutes}
                                    onChange={(e) => handleNumberChange("nomination_set_duration_minutes", e.target.value)}
                                    onWheel={(e) => e.currentTarget.blur()}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>場内料金</Label>
                                <Input
                                    type="number"
                                    value={formData.companion_fee}
                                    onChange={(e) => handleNumberChange("companion_fee", e.target.value)}
                                    onWheel={(e) => e.currentTarget.blur()}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>場内セット時間 (分)</Label>
                                <Input
                                    type="number"
                                    value={formData.companion_set_duration_minutes}
                                    onChange={(e) => handleNumberChange("companion_set_duration_minutes", e.target.value)}
                                    onWheel={(e) => e.currentTarget.blur()}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>サービス料 (%)</Label>
                                <Input
                                    type="number"
                                    value={formData.service_rate}
                                    onChange={(e) => handleNumberChange("service_rate", e.target.value)}
                                    onWheel={(e) => e.currentTarget.blur()}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>消費税 (%)</Label>
                                <Input
                                    type="number"
                                    value={formData.tax_rate}
                                    onChange={(e) => handleNumberChange("tax_rate", e.target.value)}
                                    onWheel={(e) => e.currentTarget.blur()}
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="is_default"
                                checked={formData.is_default}
                                onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                                className="h-4 w-4 rounded border-gray-300"
                            />
                            <Label htmlFor="is_default" className="cursor-pointer">デフォルトに設定</Label>
                        </div>
                    </div>
                    <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row">
                        <Button variant="outline" onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto">
                            キャンセル
                        </Button>
                        <Button onClick={handleSave} disabled={isLoading} className="w-full sm:w-auto">
                            {editingSystem ? "更新" : "作成"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Modal */}
            <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>削除確認</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p>この料金システムを削除しますか？</p>
                    </div>
                    <DialogFooter className="flex flex-col-reverse gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setIsDeleteModalOpen(false)}
                            className="w-full h-11"
                        >
                            キャンセル
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={isLoading}
                            className="w-full h-11"
                        >
                            削除
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
