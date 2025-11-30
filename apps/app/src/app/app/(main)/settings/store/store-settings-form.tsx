"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { updateStore, uploadStoreIcon, deleteStoreIcon, searchAddressByPostalCode } from "../actions";
import { ChevronLeft, Upload, Download, Trash2, Store as StoreIcon } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

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
    "北海道",
    "青森県",
    "岩手県",
    "宮城県",
    "秋田県",
    "山形県",
    "福島県",
    "茨城県",
    "栃木県",
    "群馬県",
    "埼玉県",
    "千葉県",
    "東京都",
    "神奈川県",
    "新潟県",
    "富山県",
    "石川県",
    "福井県",
    "山梨県",
    "長野県",
    "岐阜県",
    "静岡県",
    "愛知県",
    "三重県",
    "滋賀県",
    "京都府",
    "大阪府",
    "兵庫県",
    "奈良県",
    "和歌山県",
    "鳥取県",
    "島根県",
    "岡山県",
    "広島県",
    "山口県",
    "徳島県",
    "香川県",
    "愛媛県",
    "高知県",
    "福岡県",
    "佐賀県",
    "長崎県",
    "熊本県",
    "大分県",
    "宮崎県",
    "鹿児島県",
    "沖縄県",
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

interface StoreSettingsFormProps {
    store: any;
}

export function StoreSettingsForm({ store }: StoreSettingsFormProps) {
    const daySwitchDefault =
        store.day_switch_time && typeof store.day_switch_time === "string"
            ? `${store.day_switch_time.slice(0, 2)}:00`
            : "05:00";

    const router = useRouter();
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Address State
    const [postalCode, setPostalCode] = useState<string>(store.postal_code || "");
    const [prefecture, setPrefecture] = useState<string>(store.prefecture || "");
    const [city, setCity] = useState<string>(store.city || "");
    const [addressLine1, setAddressLine1] = useState<string>(store.address_line1 || "");
    const [addressLine2, setAddressLine2] = useState<string>(store.address_line2 || "");

    const handlePostalCodeSearch = async () => {
        if (!postalCode || postalCode.length < 7) return;

        try {
            const result = await searchAddressByPostalCode(postalCode);
            if (result.success) {
                setPrefecture(result.prefecture || "");
                setCity(result.city || "");
                setAddressLine1(result.addressLine1 || "");
            } else {
                alert("住所が見つかりませんでした。");
            }
        } catch (error) {
            console.error("Error searching address:", error);
            alert("住所検索に失敗しました。");
        }
    };

    const handleIconClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);

        try {
            await uploadStoreIcon(formData);
            router.refresh();
        } catch (error) {
            console.error("Icon upload failed:", error);
            alert("アップロードに失敗しました");
        }
    };

    const handleDeleteIcon = async () => {
        if (!confirm("アイコンを削除しますか？")) return;
        try {
            await deleteStoreIcon();
            router.refresh();
        } catch (error) {
            console.error("Icon delete failed:", error);
            alert("削除に失敗しました");
        }
    };

    return (
        <form action={updateStore} className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden p-6 space-y-6 border border-gray-200 dark:border-gray-700">

                <div className="flex flex-col items-center gap-4 mb-6">
                    <div className="relative group">
                        <Avatar className="h-24 w-24 cursor-pointer" onClick={handleIconClick}>
                            <AvatarImage src={store.icon_url || ""} className="object-cover" />
                            <AvatarFallback className="bg-gray-100 dark:bg-gray-800 text-2xl">
                                <StoreIcon className="h-12 w-12 text-gray-400" />
                            </AvatarFallback>
                            <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Upload className="h-6 w-6 text-white" />
                            </div>
                        </Avatar>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileChange}
                        />
                    </div>
                    {store.icon_url && (
                        <div className="flex gap-2">
                            <a
                                href={store.icon_url}
                                download={`store-icon-${store.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
                                title="ダウンロード"
                            >
                                <Download className="h-4 w-4" />
                            </a>
                            <button
                                type="button"
                                onClick={handleDeleteIcon}
                                className="p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors"
                                title="削除"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="name" className="text-gray-900 dark:text-gray-200">店舗名</Label>
                    <Input
                        id="name"
                        name="name"
                        defaultValue={store.name}
                        required
                        className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
                    />
                </div>

                <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id="allow_join_requests"
                            name="allow_join_requests"
                            defaultChecked={store.allow_join_requests}
                            className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500 dark:focus:ring-blue-400"
                            style={{ accentColor: '#2563eb' }}
                        />
                        <Label htmlFor="allow_join_requests" className="cursor-pointer text-gray-900 dark:text-gray-200">
                            参加申請を許可する
                        </Label>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 ml-6">
                        店舗IDを使った参加申請を受け付けます
                    </p>
                </div>

                <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">住所情報</h3>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="postal_code" className="text-gray-900 dark:text-gray-200">郵便番号</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="postal_code"
                                    name="postal_code"
                                    value={postalCode}
                                    onChange={(e) => setPostalCode(e.target.value)}
                                    placeholder="例: 100-0001"
                                    className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handlePostalCodeSearch}
                                    disabled={!postalCode || postalCode.replace(/-/g, "").length < 7}
                                    className="shrink-0"
                                >
                                    住所検索
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="prefecture" className="text-gray-900 dark:text-gray-200">都道府県</Label>
                            <Select
                                name="prefecture"
                                value={prefecture}
                                onValueChange={setPrefecture}
                            >
                                <SelectTrigger id="prefecture" className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white">
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

                    <div className="space-y-2">
                        <Label htmlFor="city" className="text-gray-900 dark:text-gray-200">市区町村</Label>
                        <Input
                            id="city"
                            name="city"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            placeholder="例: 千代田区"
                            className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="address_line1" className="text-gray-900 dark:text-gray-200">丁目・番地</Label>
                        <Input
                            id="address_line1"
                            name="address_line1"
                            value={addressLine1}
                            onChange={(e) => setAddressLine1(e.target.value)}
                            placeholder="例: 千代田1-1-1"
                            className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="address_line2" className="text-gray-900 dark:text-gray-200">建物名・部屋番号</Label>
                        <Input
                            id="address_line2"
                            name="address_line2"
                            value={addressLine2}
                            onChange={(e) => setAddressLine2(e.target.value)}
                            placeholder="例: ○○ビル 3F"
                            className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="industry" className="text-gray-900 dark:text-gray-200">業種</Label>
                        <Select name="industry" defaultValue={store.industry || undefined}>
                            <SelectTrigger id="industry" className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white">
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="business_start_time" className="text-gray-900 dark:text-gray-200">営業開始時間</Label>
                        <Input
                            type="time"
                            id="business_start_time"
                            name="business_start_time"
                            defaultValue={store.business_start_time}
                            step={60}
                            className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="business_end_time" className="text-gray-900 dark:text-gray-200">営業終了時間</Label>
                        <Input
                            type="time"
                            id="business_end_time"
                            name="business_end_time"
                            defaultValue={store.business_end_time}
                            step={60}
                            className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="day_switch_time" className="text-gray-900 dark:text-gray-200">日にち切り替え時間</Label>
                        <Select
                            name="day_switch_time"
                            defaultValue={daySwitchDefault}
                        >
                            <SelectTrigger id="day_switch_time" className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white">
                                <SelectValue placeholder="日にち切り替え時間を選択" />
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
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            この時間を過ぎると翌日の出勤扱いになります
                        </p>
                    </div>
                </div>

                <div className="space-y-3">
                    <Label className="text-gray-900 dark:text-gray-200">定休日</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {DAYS_OF_WEEK.map((day) => (
                            <div key={day.value} className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id={`closed_${day.value}`}
                                    name="closed_days"
                                    value={day.value}
                                    defaultChecked={store.closed_days?.includes(day.value)}
                                    className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500 dark:focus:ring-blue-400"
                                    style={{ accentColor: '#2563eb' }}
                                />
                                <Label htmlFor={`closed_${day.value}`} className="text-sm font-normal cursor-pointer text-gray-700 dark:text-gray-300">
                                    {day.label}
                                </Label>
                            </div>
                        ))}
                    </div>
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
