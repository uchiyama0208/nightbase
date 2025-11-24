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
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { createStoreAndLink } from "../actions";

const INDUSTRIES = [
    "バー",
    "ガールズバー",
    "スナック",
    "キャバクラ",
    "ホストクラブ",
    "ラウンジ",
    "クラブ",
    "パブ",
    "コンカフェ",
    "メイドカフェ",
    "セクキャバ",
    "マッスルバー",
    "ボーイズバー",
    "オカマバー",
    "その他",
];

const PREFECTURES = [
    "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
    "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
    "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県",
    "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府", "兵庫県",
    "奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県", "山口県",
    "徳島県", "香川県", "愛媛県", "高知県", "福岡県", "佐賀県", "長崎県",
    "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県",
];

const DAYS_OF_WEEK = [
    { value: "monday", label: "月曜日" },
    { value: "tuesday", label: "火曜日" },
    { value: "wednesday", label: "水曜日" },
    { value: "thursday", label: "木曜日" },
    { value: "friday", label: "金曜日" },
    { value: "saturday", label: "土曜日" },
    { value: "sunday", label: "日曜日" },
];

const REFERRAL_SOURCES = [
    "知人・友人からの紹介",
    "グーグル検索",
    "AI検索",
    "X(Twitter)",
    "Instagram",
    "Youtube",
    "Tiktok",
    "広告",
    "その他",
];

export function StoreInfoForm() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [closedDays, setClosedDays] = useState<string[]>([]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);

        const storeFormData = new FormData(e.currentTarget);

        // Add closed days to form data
        closedDays.forEach(day => {
            storeFormData.append("closed_days", day);
        });

        const result = await createStoreAndLink(storeFormData);

        if (result.success) {
            router.push("/app/dashboard");
        } else {
            alert(`エラー: ${result.error}`);
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
                        <Label htmlFor="name">店舗名 *</Label>
                        <Input
                            id="name"
                            name="name"
                            placeholder="例: Bar Nightbase"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="industry">業種 *</Label>
                            <Select name="industry" required>
                                <SelectTrigger className="text-gray-900 dark:text-white">
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
                            <Label htmlFor="prefecture">都道府県 *</Label>
                            <Select name="prefecture" required>
                                <SelectTrigger className="text-gray-900 dark:text-white">
                                    <SelectValue placeholder="都道府県を選択" />
                                </SelectTrigger>
                                <SelectContent>
                                    {PREFECTURES.map((pref) => (
                                        <SelectItem key={pref} value={pref}>
                                            {pref}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="business_start_time">営業開始時間</Label>
                            <Input
                                type="time"
                                id="business_start_time"
                                name="business_start_time"
                                defaultValue="18:00"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="business_end_time">営業終了時間</Label>
                            <Input
                                type="time"
                                id="business_end_time"
                                name="business_end_time"
                                defaultValue="03:00"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="day_switch_time">日にち切り替え時間</Label>
                            <Select name="day_switch_time" defaultValue="05:00">
                                <SelectTrigger className="text-gray-900 dark:text-white">
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
                        <Label htmlFor="referral_source">Nightbaseを知った場所 *</Label>
                        <Select name="referral_source" required>
                            <SelectTrigger className="text-gray-900 dark:text-white">
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
                        <Label>定休日</Label>
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

                    <div className="pt-4 border-t">
                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting ? "処理中..." : "登録完了"}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
