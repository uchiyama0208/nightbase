"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectSeparator,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { createStoreAndLink } from "../actions";

const INDUSTRIES = [
    "バー",
    "スナック",
    "ガールズバー",
    "ラウンジ",
    "キャバクラ",
    "クラブ",
    "ホストクラブ",
    "パブ",
    "コンカフェ",
    "メイドカフェ",
    "ボーイズバー",
    "オカマバー",
    "セクキャバ",
    "マッスルバー",
    "その他",
];

const PREFECTURE_REGIONS = [
    { region: "北海道", prefectures: ["北海道"] },
    { region: "東北", prefectures: ["青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県"] },
    { region: "関東", prefectures: ["茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県"] },
    { region: "中部", prefectures: ["新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県", "静岡県", "愛知県"] },
    { region: "近畿", prefectures: ["三重県", "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県"] },
    { region: "中国", prefectures: ["鳥取県", "島根県", "岡山県", "広島県", "山口県"] },
    { region: "四国", prefectures: ["徳島県", "香川県", "愛媛県", "高知県"] },
    { region: "九州・沖縄", prefectures: ["福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県"] },
];

const DAYS_OF_WEEK = [
    { value: "monday", label: "月曜日" },
    { value: "tuesday", label: "火曜日" },
    { value: "wednesday", label: "水曜日" },
    { value: "thursday", label: "木曜日" },
    { value: "friday", label: "金曜日" },
    { value: "saturday", label: "土曜日" },
    { value: "sunday", label: "日曜日" },
    { value: "holiday", label: "祝日" },
];

const REFERRAL_SOURCES = [
    "知人・友人からの紹介",
    "ウェブ検索",
    "AI検索",
    "X(Twitter)",
    "Instagram",
    "Youtube",
    "Tiktok",
    "広告",
    "その他",
];

export function StoreInfoForm() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [closedDays, setClosedDays] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        const storeFormData = new FormData(e.currentTarget);

        // Add closed days to form data
        closedDays.forEach(day => {
            storeFormData.append("closed_days", day);
        });

        const result = await createStoreAndLink(storeFormData);

        if (result.success) {
            // Use window.location for a full page reload to ensure fresh data
            window.location.href = "/app/dashboard";
        } else {
            setError(result.error || "店舗の作成に失敗しました");
            setIsSubmitting(false);
        }
    };

    const toggleClosedDay = (dayValue: string) => {
        setClosedDays(prev =>
            prev.includes(dayValue)
                ? prev.filter(d => d !== dayValue)
                : [...prev, dayValue]
        );
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">店舗情報</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                    店舗の基本情報を入力してください
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="name" className="text-sm font-medium text-gray-700 dark:text-gray-200">店舗名 *</Label>
                        <Input
                            id="name"
                            name="name"
                            placeholder="例: Bar Nightbase"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="industry" className="text-sm font-medium text-gray-700 dark:text-gray-200">業種 *</Label>
                            <Select name="industry" required>
                                <SelectTrigger className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                    <SelectValue placeholder="業種を選択" />
                                </SelectTrigger>
                                <SelectContent>
                                    {INDUSTRIES.map((industry) => (
                                        <SelectItem key={industry} value={industry}>
                                            {industry}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="prefecture" className="text-sm font-medium text-gray-700 dark:text-gray-200">都道府県 *</Label>
                            <Select name="prefecture" required>
                                <SelectTrigger className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                    <SelectValue placeholder="都道府県を選択" />
                                </SelectTrigger>
                                <SelectContent>
                                    {PREFECTURE_REGIONS.map((group, index) => (
                                        <SelectGroup key={group.region}>
                                            {index > 0 && <SelectSeparator className="my-1" />}
                                            <SelectLabel className="text-xs font-bold text-primary bg-primary/5 py-2 px-3 -mx-1 rounded">{group.region}</SelectLabel>
                                            {group.prefectures.map((pref) => (
                                                <SelectItem key={pref} value={pref}>
                                                    {pref}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="business_start_time" className="text-sm font-medium text-gray-700 dark:text-gray-200">営業開始時間</Label>
                            <Input
                                type="time"
                                id="business_start_time"
                                name="business_start_time"
                                defaultValue="20:00"
                                step={60}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="business_end_time" className="text-sm font-medium text-gray-700 dark:text-gray-200">営業終了時間</Label>
                            <Input
                                type="time"
                                id="business_end_time"
                                name="business_end_time"
                                defaultValue="01:00"
                                step={60}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="day_switch_time" className="text-sm font-medium text-gray-700 dark:text-gray-200">日にち切り替え時間</Label>
                            <Select name="day_switch_time" defaultValue="06:00">
                                <SelectTrigger className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                    <SelectValue placeholder="選択" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Array.from({ length: 24 }).map((_, hour) => {
                                        const value = `${hour.toString().padStart(2, "0")}:00`;
                                        return (
                                            <SelectItem key={value} value={value}>
                                                {hour}時
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                この時間を過ぎると翌日の出勤扱いになります
                            </p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="referral_source" className="text-sm font-medium text-gray-700 dark:text-gray-200">Nightbaseを知ったきっかけ *</Label>
                        <Select name="referral_source" required>
                            <SelectTrigger className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                <SelectValue placeholder="選択してください" />
                            </SelectTrigger>
                            <SelectContent>
                                {REFERRAL_SOURCES.map((source) => (
                                    <SelectItem key={source} value={source}>
                                        {source}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">定休日</Label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {DAYS_OF_WEEK.map((day) => (
                                <div key={day.value} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`closed_${day.value}`}
                                        checked={closedDays.includes(day.value)}
                                        onCheckedChange={() => toggleClosedDay(day.value)}
                                    />
                                    <Label htmlFor={`closed_${day.value}`} className="text-sm font-normal cursor-pointer">
                                        {day.label}
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="pt-4 border-t space-y-3">
                        {error && (
                            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                            </div>
                        )}
                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting ? "処理中..." : "登録完了"}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
