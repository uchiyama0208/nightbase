"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateFloorSettings } from "./actions";
import { useRouter } from "next/navigation";

interface FloorSettingsFormProps {
    store: any;
}

export function FloorSettingsForm({ store }: FloorSettingsFormProps) {
    const router = useRouter();

    return (
        <form action={updateFloorSettings} className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden p-6 space-y-6 border border-gray-200 dark:border-gray-700">
                <div className="space-y-2">
                    <Label htmlFor="rotation_time" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                        付け回し時間（分）
                    </Label>
                    <Input
                        id="rotation_time"
                        name="rotation_time"
                        type="number"
                        defaultValue={store.rotation_time || ""}
                        placeholder="例: 60"
                        min="0"
                        step="1"
                        className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        キャストの自動ローテーション時間を設定します
                    </p>
                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                    <Button type="submit" className="w-full">
                        保存する
                    </Button>
                </div>
            </div>
        </form>
    );
}
