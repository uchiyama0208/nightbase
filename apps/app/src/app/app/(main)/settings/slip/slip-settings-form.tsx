"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { updateSlipSettings } from "../actions";
import { useRouter } from "next/navigation";
import { useState, useEffect, useTransition } from "react";
import { useToast } from "@/components/ui/use-toast";

interface SlipSettingsFormProps {
    store: any;
}

export function SlipSettingsForm({ store }: SlipSettingsFormProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [roundingEnabled, setRoundingEnabled] = useState(store?.slip_rounding_enabled || false);
    const [roundingMethod, setRoundingMethod] = useState(store?.slip_rounding_method || "round");
    const [roundingUnit, setRoundingUnit] = useState(store?.slip_rounding_unit || 10);

    // Sync state with props when store changes
    useEffect(() => {
        setRoundingEnabled(store?.slip_rounding_enabled || false);
        setRoundingMethod(store?.slip_rounding_method || "round");
        setRoundingUnit(store?.slip_rounding_unit || 10);
    }, [store?.slip_rounding_enabled, store?.slip_rounding_method, store?.slip_rounding_unit]);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        
        // Ensure checkbox value is included
        if (roundingEnabled) {
            formData.set("slip_rounding_enabled", "on");
        } else {
            formData.delete("slip_rounding_enabled");
        }
        formData.set("slip_rounding_method", roundingMethod);
        formData.set("slip_rounding_unit", roundingUnit.toString());

        startTransition(async () => {
            try {
                await updateSlipSettings(formData);
                toast({
                    title: "保存しました",
                    description: "伝票設定を更新しました",
                });
                // Force page reload to get latest data
                router.push("/app/settings/slip");
            } catch (error) {
                toast({
                    title: "エラー",
                    description: error instanceof Error ? error.message : "保存に失敗しました",
                });
            }
        });
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden p-6 space-y-6 border border-gray-200 dark:border-gray-700">
                <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">金額丸め設定</h3>

                    <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="slip_rounding_enabled"
                                name="slip_rounding_enabled"
                                checked={roundingEnabled}
                                onChange={(e) => setRoundingEnabled(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500 dark:focus:ring-blue-400"
                                style={{ accentColor: '#2563eb' }}
                            />
                            <Label htmlFor="slip_rounding_enabled" className="cursor-pointer text-gray-900 dark:text-gray-200">
                                金額丸めを有効にする
                            </Label>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 ml-6">
                            伝票の合計金額を指定した単位で丸めます
                        </p>
                    </div>

                    {/* Hidden inputs to ensure values are always submitted */}
                    <input type="hidden" name="slip_rounding_method" value={roundingMethod} key={`method-${roundingMethod}`} />
                    <input type="hidden" name="slip_rounding_unit" value={roundingUnit.toString()} key={`unit-${roundingUnit}`} />

                    {roundingEnabled && (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="slip_rounding_method" className="text-gray-900 dark:text-gray-200">丸め方法</Label>
                                <Select
                                    value={roundingMethod}
                                    onValueChange={setRoundingMethod}
                                >
                                    <SelectTrigger id="slip_rounding_method" className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white">
                                        <SelectValue placeholder="丸め方法を選択" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="round">四捨五入</SelectItem>
                                        <SelectItem value="ceil">繰り上げ</SelectItem>
                                        <SelectItem value="floor">繰り下げ</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="slip_rounding_unit" className="text-gray-900 dark:text-gray-200">丸め単位</Label>
                                <Select
                                    value={roundingUnit.toString()}
                                    onValueChange={(value) => setRoundingUnit(parseInt(value))}
                                >
                                    <SelectTrigger id="slip_rounding_unit" className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white">
                                        <SelectValue placeholder="丸め単位を選択" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="10">10円単位</SelectItem>
                                        <SelectItem value="100">100円単位</SelectItem>
                                        <SelectItem value="1000">1000円単位</SelectItem>
                                        <SelectItem value="10000">10000円単位</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </>
                    )}
                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                    <Button type="submit" className="w-full" disabled={isPending}>
                        {isPending ? "保存中..." : "保存する"}
                    </Button>
                </div>
            </div>
        </form>
    );
}

