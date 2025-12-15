"use client";

import { useState, useEffect } from "react";
import { PricingSystem } from "@/types/floor";
import { updatePricingSystem, deletePricingSystem, setDefaultPricingSystem } from "@/app/app/(main)/pricing-systems/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { ChevronLeft, MoreHorizontal, Star, Trash2 } from "lucide-react";

interface PricingSystemFormData {
    name: string;
    set_fee: number | "";
    set_duration_minutes: number | "";
    extension_fee: number | "";
    extension_duration_minutes: number | "";
    nomination_fee: number | "";
    nomination_set_duration_minutes: number | "";
    douhan_fee: number | "";
    douhan_set_duration_minutes: number | "";
    companion_fee: number | "";
    companion_set_duration_minutes: number | "";
    service_rate: number | "";
    tax_rate: number | "";
    is_default: boolean;
}

interface PricingSystemModalProps {
    isOpen: boolean;
    onClose: () => void;
    system: PricingSystem | null;
    onSaved?: (system: PricingSystem) => void;
    onDeleted?: (id: string) => void;
}

export function PricingSystemModal({
    isOpen,
    onClose,
    system,
    onSaved,
    onDeleted,
}: PricingSystemModalProps) {
    const [formData, setFormData] = useState<PricingSystemFormData>({
        name: "",
        set_fee: "",
        set_duration_minutes: "",
        extension_fee: "",
        extension_duration_minutes: "",
        nomination_fee: "",
        nomination_set_duration_minutes: "",
        douhan_fee: "",
        douhan_set_duration_minutes: "",
        companion_fee: "",
        companion_set_duration_minutes: "",
        service_rate: "",
        tax_rate: "",
        is_default: false,
    });
    const [isLoading, setIsLoading] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (system) {
            setFormData({
                name: system.name ?? "",
                set_fee: system.set_fee ?? "",
                set_duration_minutes: system.set_duration_minutes ?? "",
                extension_fee: system.extension_fee ?? "",
                extension_duration_minutes: system.extension_duration_minutes ?? "",
                nomination_fee: system.nomination_fee ?? "",
                nomination_set_duration_minutes: system.nomination_set_duration_minutes ?? "",
                douhan_fee: system.douhan_fee ?? "",
                douhan_set_duration_minutes: system.douhan_set_duration_minutes ?? "",
                companion_fee: system.companion_fee ?? "",
                companion_set_duration_minutes: system.companion_set_duration_minutes ?? "",
                service_rate: system.service_rate ?? "",
                tax_rate: system.tax_rate ?? "",
                is_default: system.is_default ?? false,
            });
        }
    }, [system]);

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

    const handleSave = async () => {
        if (!system) return;
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
            douhan_fee: formData.douhan_fee === "" ? 0 : formData.douhan_fee,
            douhan_set_duration_minutes: formData.douhan_set_duration_minutes === "" ? 60 : formData.douhan_set_duration_minutes,
            companion_fee: formData.companion_fee === "" ? 0 : formData.companion_fee,
            companion_set_duration_minutes: formData.companion_set_duration_minutes === "" ? 60 : formData.companion_set_duration_minutes,
            service_rate: formData.service_rate === "" ? 0 : formData.service_rate,
            tax_rate: formData.tax_rate === "" ? 0 : formData.tax_rate,
            is_default: formData.is_default,
        };

        setIsLoading(true);
        try {
            await updatePricingSystem(system.id, dataToSave);
            toast({ title: "料金システムを更新しました" });
            const updatedSystem = { ...system, ...dataToSave } as PricingSystem;
            onSaved?.(updatedSystem);
            onClose();
        } catch (error) {
            console.error(error);
            toast({ title: "保存に失敗しました" });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!system) return;

        setIsLoading(true);
        try {
            await deletePricingSystem(system.id);
            toast({ title: "料金システムを削除しました" });
            onDeleted?.(system.id);
            setIsDeleteModalOpen(false);
            onClose();
        } catch (error) {
            console.error(error);
            toast({ title: "削除に失敗しました" });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSetDefault = async () => {
        if (!system) return;

        try {
            await setDefaultPricingSystem(system.id);
            toast({ title: "デフォルトに設定しました" });
            const updatedSystem = { ...system, is_default: true } as PricingSystem;
            onSaved?.(updatedSystem);
        } catch (error) {
            console.error(error);
            toast({ title: "設定に失敗しました" });
        }
    };

    if (!system) return null;

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader className="flex flex-row items-center justify-between border-b pb-4 space-y-0">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="-ml-2"
                            onClick={onClose}
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <DialogTitle>料金システム編集</DialogTitle>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="-mr-2">
                                    <MoreHorizontal className="h-5 w-5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {!system.is_default && (
                                    <DropdownMenuItem onClick={handleSetDefault}>
                                        <Star className="h-4 w-4 mr-2" />
                                        デフォルトに設定
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => setIsDeleteModalOpen(true)}
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    削除
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
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
                                <Label>同伴料金</Label>
                                <Input
                                    type="number"
                                    value={formData.douhan_fee}
                                    onChange={(e) => handleNumberChange("douhan_fee", e.target.value)}
                                    onWheel={(e) => e.currentTarget.blur()}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>同伴セット時間 (分)</Label>
                                <Input
                                    type="number"
                                    value={formData.douhan_set_duration_minutes}
                                    onChange={(e) => handleNumberChange("douhan_set_duration_minutes", e.target.value)}
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
                                id="is_default_modal"
                                checked={formData.is_default}
                                onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                                className="h-4 w-4 rounded border-gray-300"
                            />
                            <Label htmlFor="is_default_modal" className="cursor-pointer">デフォルトに設定</Label>
                        </div>
                    </div>
                    <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row">
                        <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
                            キャンセル
                        </Button>
                        <Button onClick={handleSave} disabled={isLoading} className="w-full sm:w-auto">
                            更新
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
        </>
    );
}
