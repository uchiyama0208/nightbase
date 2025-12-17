"use client";

import { useState, useEffect } from "react";
import { PricingSystem } from "@/types/floor";
import { getPricingSystems, createPricingSystem, updatePricingSystem, deletePricingSystem, setDefaultPricingSystem } from "./actions";
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
import { Plus, Trash2, Star, ChevronLeft, MoreHorizontal } from "lucide-react";

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

const defaultFormData: PricingSystemFormData = {
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
};

interface PricingSystemsClientProps {
    canEdit?: boolean;
}

export function PricingSystemsClient({ canEdit = false }: PricingSystemsClientProps) {
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
                douhan_fee: system.douhan_fee ?? "",
                douhan_set_duration_minutes: system.douhan_set_duration_minutes ?? "",
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
        <div className="space-y-2">
            {/* Plus Button */}
            {canEdit && (
                <div className="flex justify-end">
                    <Button
                        size="icon"
                        className="h-10 w-10 rounded-full bg-blue-600 text-white hover:bg-blue-700 border-none shadow-md transition-all hover:scale-105 active:scale-95"
                        onClick={() => handleOpenModal()}
                    >
                        <Plus className="h-5 w-5" />
                    </Button>
                </div>
            )}

            {systems.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <p>料金システムがありません</p>
                    <p className="text-sm mt-1">右上の＋ボタンから作成できます</p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {systems.map((system) => (
                        <div
                            key={system.id}
                            onClick={() => handleOpenModal(system)}
                            className="cursor-pointer rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm hover:shadow-md transition-all hover:border-blue-300 dark:hover:border-blue-600"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <h3 className="font-semibold text-gray-900 dark:text-white truncate flex-1 mr-2">
                                    {system.name}
                                </h3>
                                {system.is_default && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 flex items-center gap-1">
                                        <Star className="h-3 w-3 fill-current" />
                                        デフォルト
                                    </span>
                                )}
                            </div>
                            <div className="space-y-1.5 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">セット</span>
                                    <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(system.set_fee)} / {system.set_duration_minutes}分</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">延長</span>
                                    <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(system.extension_fee)} / {system.extension_duration_minutes}分</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">指名</span>
                                    <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(system.nomination_fee)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">同伴</span>
                                    <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(system.douhan_fee || 0)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">場内</span>
                                    <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(system.companion_fee)}</span>
                                </div>
                            </div>
                            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                                <div className="flex gap-2">
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                                        サービス {system.service_rate}%
                                    </span>
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                                        税 {system.tax_rate}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create/Edit Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-[calc(100vw-32px)] sm:max-w-[400px] max-h-[calc(100vh-32px)] overflow-y-auto rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                    <DialogHeader>
                        <div className="relative flex items-center justify-center py-1">
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="absolute left-0 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                                <ChevronLeft className="h-5 w-5 text-gray-500" />
                            </button>
                            <DialogTitle className="text-gray-900 dark:text-white">
                                {editingSystem ? "料金システム編集" : "料金システム作成"}
                            </DialogTitle>
                            {editingSystem && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button
                                            type="button"
                                            className="absolute right-0 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                        >
                                            <MoreHorizontal className="h-5 w-5 text-gray-500" />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                        {!editingSystem.is_default && (
                                            <DropdownMenuItem
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSetDefault(editingSystem.id);
                                                    setIsModalOpen(false);
                                                }}
                                                className="text-gray-700 dark:text-gray-200"
                                            >
                                                <Star className="h-4 w-4 mr-2" />
                                                デフォルトに設定
                                            </DropdownMenuItem>
                                        )}
                                        <DropdownMenuItem
                                            className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
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
                        </div>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-gray-700 dark:text-gray-200">名前 *</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="例: 通常料金"
                                className="bg-white dark:bg-gray-800"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label className="text-gray-700 dark:text-gray-200">セット料金</Label>
                                <Input
                                    type="number"
                                    value={formData.set_fee}
                                    onChange={(e) => handleNumberChange("set_fee", e.target.value)}
                                    onWheel={(e) => e.currentTarget.blur()}
                                    className="bg-white dark:bg-gray-800"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-gray-700 dark:text-gray-200">セット時間 (分)</Label>
                                <Input
                                    type="number"
                                    value={formData.set_duration_minutes}
                                    onChange={(e) => handleNumberChange("set_duration_minutes", e.target.value)}
                                    onWheel={(e) => e.currentTarget.blur()}
                                    className="bg-white dark:bg-gray-800"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-gray-700 dark:text-gray-200">延長料金</Label>
                                <Input
                                    type="number"
                                    value={formData.extension_fee}
                                    onChange={(e) => handleNumberChange("extension_fee", e.target.value)}
                                    onWheel={(e) => e.currentTarget.blur()}
                                    className="bg-white dark:bg-gray-800"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-gray-700 dark:text-gray-200">延長時間 (分)</Label>
                                <Input
                                    type="number"
                                    value={formData.extension_duration_minutes}
                                    onChange={(e) => handleNumberChange("extension_duration_minutes", e.target.value)}
                                    onWheel={(e) => e.currentTarget.blur()}
                                    className="bg-white dark:bg-gray-800"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-gray-700 dark:text-gray-200">指名料金</Label>
                                <Input
                                    type="number"
                                    value={formData.nomination_fee}
                                    onChange={(e) => handleNumberChange("nomination_fee", e.target.value)}
                                    onWheel={(e) => e.currentTarget.blur()}
                                    className="bg-white dark:bg-gray-800"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-gray-700 dark:text-gray-200">指名時間 (分)</Label>
                                <Input
                                    type="number"
                                    value={formData.nomination_set_duration_minutes}
                                    onChange={(e) => handleNumberChange("nomination_set_duration_minutes", e.target.value)}
                                    onWheel={(e) => e.currentTarget.blur()}
                                    className="bg-white dark:bg-gray-800"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-gray-700 dark:text-gray-200">同伴料金</Label>
                                <Input
                                    type="number"
                                    value={formData.douhan_fee}
                                    onChange={(e) => handleNumberChange("douhan_fee", e.target.value)}
                                    onWheel={(e) => e.currentTarget.blur()}
                                    className="bg-white dark:bg-gray-800"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-gray-700 dark:text-gray-200">同伴時間 (分)</Label>
                                <Input
                                    type="number"
                                    value={formData.douhan_set_duration_minutes}
                                    onChange={(e) => handleNumberChange("douhan_set_duration_minutes", e.target.value)}
                                    onWheel={(e) => e.currentTarget.blur()}
                                    className="bg-white dark:bg-gray-800"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-gray-700 dark:text-gray-200">場内料金</Label>
                                <Input
                                    type="number"
                                    value={formData.companion_fee}
                                    onChange={(e) => handleNumberChange("companion_fee", e.target.value)}
                                    onWheel={(e) => e.currentTarget.blur()}
                                    className="bg-white dark:bg-gray-800"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-gray-700 dark:text-gray-200">場内時間 (分)</Label>
                                <Input
                                    type="number"
                                    value={formData.companion_set_duration_minutes}
                                    onChange={(e) => handleNumberChange("companion_set_duration_minutes", e.target.value)}
                                    onWheel={(e) => e.currentTarget.blur()}
                                    className="bg-white dark:bg-gray-800"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-gray-700 dark:text-gray-200">サービス料 (%)</Label>
                                <Input
                                    type="number"
                                    value={formData.service_rate}
                                    onChange={(e) => handleNumberChange("service_rate", e.target.value)}
                                    onWheel={(e) => e.currentTarget.blur()}
                                    className="bg-white dark:bg-gray-800"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-gray-700 dark:text-gray-200">消費税 (%)</Label>
                                <Input
                                    type="number"
                                    value={formData.tax_rate}
                                    onChange={(e) => handleNumberChange("tax_rate", e.target.value)}
                                    onWheel={(e) => e.currentTarget.blur()}
                                    className="bg-white dark:bg-gray-800"
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 pt-2">
                            <input
                                type="checkbox"
                                id="is_default"
                                checked={formData.is_default}
                                onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <Label htmlFor="is_default" className="cursor-pointer text-gray-700 dark:text-gray-200">デフォルトに設定</Label>
                        </div>
                    </div>
                    <DialogFooter className="flex flex-col gap-2">
                        <Button
                            onClick={handleSave}
                            disabled={isLoading}
                            className="w-full h-11 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {isLoading ? "保存中..." : "保存"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Modal */}
            <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <DialogContent className="max-w-[calc(100vw-32px)] sm:max-w-[360px] rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                    <DialogHeader>
                        <DialogTitle className="text-gray-900 dark:text-white">削除確認</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-gray-600 dark:text-gray-400">この料金システムを削除しますか？</p>
                    </div>
                    <DialogFooter className="flex flex-col gap-2">
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={isLoading}
                            className="w-full h-11 rounded-lg"
                        >
                            {isLoading ? "削除中..." : "削除"}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setIsDeleteModalOpen(false)}
                            className="w-full h-11 rounded-lg"
                        >
                            キャンセル
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
