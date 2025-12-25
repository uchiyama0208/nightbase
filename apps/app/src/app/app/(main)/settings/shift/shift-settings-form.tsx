"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { VercelTabs } from "@/components/ui/vercel-tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { updateShiftSettings } from "./actions";
import { useRouter } from "next/navigation";

interface ShiftSettingsFormProps {
    store: any;
    automationSettings: any;
}

export function ShiftSettingsForm({ store, automationSettings }: ShiftSettingsFormProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [activeTab, setActiveTab] = useState<"basic" | "automation">("basic");

    // Basic settings
    const [castStartTime, setCastStartTime] = useState(
        store.default_cast_start_time?.slice(0, 5) || "20:00"
    );
    const [castEndTime, setCastEndTime] = useState(
        store.default_cast_end_time?.slice(0, 5) || "01:00"
    );
    const [staffStartTime, setStaffStartTime] = useState(
        store.default_staff_start_time?.slice(0, 5) || "19:00"
    );
    const [staffEndTime, setStaffEndTime] = useState(
        store.default_staff_end_time?.slice(0, 5) || "02:00"
    );

    // Automation settings
    const [automationEnabled, setAutomationEnabled] = useState(
        automationSettings?.enabled ?? false
    );
    const [targetRoles, setTargetRoles] = useState<string[]>(
        automationSettings?.target_roles || ["cast", "staff"]
    );
    const [periodType, setPeriodType] = useState<"week" | "half_month" | "month">(
        automationSettings?.period_type || "week"
    );
    const [sendDayOffset, setSendDayOffset] = useState(
        automationSettings?.send_day_offset ?? 7
    );
    const [sendHour, setSendHour] = useState(
        automationSettings?.send_hour ?? 10
    );
    const [reminderEnabled, setReminderEnabled] = useState(
        automationSettings?.reminder_enabled ?? false
    );
    const [reminderDayOffset, setReminderDayOffset] = useState(
        automationSettings?.reminder_day_offset ?? 1
    );
    const [reminderHour, setReminderHour] = useState(
        automationSettings?.reminder_hour ?? 10
    );

    const tabs = [
        { key: "basic", label: "基本設定" },
        { key: "automation", label: "自動化" },
    ];

    const handleSubmit = async () => {
        startTransition(async () => {
            const result = await updateShiftSettings(store.id, {
                default_cast_start_time: castStartTime,
                default_cast_end_time: castEndTime,
                default_staff_start_time: staffStartTime,
                default_staff_end_time: staffEndTime,
                automation: {
                    enabled: automationEnabled,
                    target_roles: targetRoles,
                    period_type: periodType,
                    send_day_offset: sendDayOffset,
                    send_hour: sendHour,
                    reminder_enabled: reminderEnabled,
                    reminder_day_offset: reminderDayOffset,
                    reminder_hour: reminderHour,
                },
            });

            if (result.success) {
                router.refresh();
            }
        });
    };

    return (
        <div className="space-y-6">
            {/* Vercel-style Tab Switcher */}
            <VercelTabs
                tabs={tabs}
                value={activeTab}
                onChange={(val) => setActiveTab(val as "basic" | "automation")}
                className="mb-4"
            />

            {/* Content */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                {activeTab === "basic" ? (
                    <div className="space-y-6">
                        {/* Cast Default Times */}
                        <div>
                            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                                キャストのデフォルト出勤時間
                            </h3>
                            <div className="flex items-center gap-3">
                                <div className="flex-1">
                                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                        出勤
                                    </label>
                                    <Input
                                        type="time"
                                        value={castStartTime}
                                        onChange={(e) => setCastStartTime(e.target.value)}
                                        className="h-10"
                                    />
                                </div>
                                <span className="text-gray-400 mt-5">〜</span>
                                <div className="flex-1">
                                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                        退勤
                                    </label>
                                    <Input
                                        type="time"
                                        value={castEndTime}
                                        onChange={(e) => setCastEndTime(e.target.value)}
                                        className="h-10"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Staff Default Times */}
                        <div>
                            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                                スタッフのデフォルト出勤時間
                            </h3>
                            <div className="flex items-center gap-3">
                                <div className="flex-1">
                                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                        出勤
                                    </label>
                                    <Input
                                        type="time"
                                        value={staffStartTime}
                                        onChange={(e) => setStaffStartTime(e.target.value)}
                                        className="h-10"
                                    />
                                </div>
                                <span className="text-gray-400 mt-5">〜</span>
                                <div className="flex-1">
                                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                        退勤
                                    </label>
                                    <Input
                                        type="time"
                                        value={staffEndTime}
                                        onChange={(e) => setStaffEndTime(e.target.value)}
                                        className="h-10"
                                    />
                                </div>
                            </div>
                        </div>

                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            ここで設定した時間がシフト募集作成時のデフォルト値になります。
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Automation Enable */}
                        <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
                            <div>
                                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                    シフト募集の自動化
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    設定したタイミングで自動的にLINEでシフト募集を送信します
                                </p>
                            </div>
                            <Switch
                                checked={automationEnabled}
                                onCheckedChange={setAutomationEnabled}
                            />
                        </div>

                        {automationEnabled && (
                            <>
                                {/* Target Roles */}
                                <div>
                                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                                        送信対象
                                    </h3>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2">
                                            <Checkbox
                                                checked={targetRoles.includes("cast")}
                                                onCheckedChange={(checked) => {
                                                    setTargetRoles((prev) =>
                                                        checked
                                                            ? [...prev, "cast"]
                                                            : prev.filter((r) => r !== "cast")
                                                    );
                                                }}
                                            />
                                            <span className="text-sm text-gray-700 dark:text-gray-300">
                                                キャスト
                                            </span>
                                        </label>
                                        <label className="flex items-center gap-2">
                                            <Checkbox
                                                checked={targetRoles.includes("staff")}
                                                onCheckedChange={(checked) => {
                                                    setTargetRoles((prev) =>
                                                        checked
                                                            ? [...prev, "staff"]
                                                            : prev.filter((r) => r !== "staff")
                                                    );
                                                }}
                                            />
                                            <span className="text-sm text-gray-700 dark:text-gray-300">
                                                スタッフ
                                            </span>
                                        </label>
                                    </div>
                                </div>

                                {/* Period Type */}
                                <div>
                                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                                        募集期間
                                    </h3>
                                    <Select value={periodType} onValueChange={(v) => setPeriodType(v as typeof periodType)}>
                                        <SelectTrigger className="h-10">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="week">1週間（月曜スタート）</SelectItem>
                                            <SelectItem value="half_month">半月（1-15日 / 16日-末日）</SelectItem>
                                            <SelectItem value="month">1ヶ月（1日スタート）</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Send Timing */}
                                <div>
                                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                                        送信タイミング
                                    </h3>
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1">
                                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                                期間開始の
                                            </label>
                                            <Select
                                                value={String(sendDayOffset)}
                                                onValueChange={(v) => setSendDayOffset(Number(v))}
                                            >
                                                <SelectTrigger className="h-10">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {[0, 1, 2, 3, 4, 5, 6, 7].map((d) => (
                                                        <SelectItem key={d} value={String(d)}>
                                                            {d === 0 ? "当日" : `${d}日前`}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                                送信時刻
                                            </label>
                                            <Select
                                                value={String(sendHour)}
                                                onValueChange={(v) => setSendHour(Number(v))}
                                            >
                                                <SelectTrigger className="h-10">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {Array.from({ length: 24 }, (_, i) => (
                                                        <SelectItem key={i} value={String(i)}>
                                                            {String(i).padStart(2, "0")}:00
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>

                                {/* Reminder */}
                                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                                自動催促
                                            </h3>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                提出期限前に未提出者へリマインドを送信
                                            </p>
                                        </div>
                                        <Switch
                                            checked={reminderEnabled}
                                            onCheckedChange={setReminderEnabled}
                                        />
                                    </div>

                                    {reminderEnabled && (
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1">
                                                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                                    期限の
                                                </label>
                                                <Select
                                                    value={String(reminderDayOffset)}
                                                    onValueChange={(v) => setReminderDayOffset(Number(v))}
                                                >
                                                    <SelectTrigger className="h-10">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {[0, 1, 2, 3, 4, 5, 6, 7].map((d) => (
                                                            <SelectItem key={d} value={String(d)}>
                                                                {d === 0 ? "当日" : `${d}日前`}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                                    送信時刻
                                                </label>
                                                <Select
                                                    value={String(reminderHour)}
                                                    onValueChange={(v) => setReminderHour(Number(v))}
                                                >
                                                    <SelectTrigger className="h-10">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {Array.from({ length: 24 }, (_, i) => (
                                                            <SelectItem key={i} value={String(i)}>
                                                                {String(i).padStart(2, "0")}:00
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Save Button */}
            <Button
                onClick={handleSubmit}
                disabled={isPending}
                className="w-full"
            >
                {isPending ? (
                    <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        保存中...
                    </>
                ) : (
                    "保存"
                )}
            </Button>
        </div>
    );
}
