"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { updateTimecardSettings } from "../actions";
import { useTransition, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check, ExternalLink } from "lucide-react";

interface TimecardSettingsFormProps {
    store: any;
}

export function TimecardSettingsForm({ store }: TimecardSettingsFormProps) {
    const [isPending, startTransition] = useTransition();

    // State for all fields
    const [showBreakColumns, setShowBreakColumns] = useState(store.show_break_columns ?? true);
    const [tabletTimecardEnabled, setTabletTimecardEnabled] = useState(store.tablet_timecard_enabled ?? false);
    const [tabletAllowedStaff, setTabletAllowedStaff] = useState(
        !store.tablet_allowed_roles || store.tablet_allowed_roles.includes("staff"),
    );
    const [tabletAllowedCast, setTabletAllowedCast] = useState(
        !store.tablet_allowed_roles || store.tablet_allowed_roles.includes("cast"),
    );
    const [tabletAcceptanceStartTime, setTabletAcceptanceStartTime] = useState(store.tablet_acceptance_start_time || "");
    const [tabletAcceptanceEndTime, setTabletAcceptanceEndTime] = useState(store.tablet_acceptance_end_time || "");
    const [tabletTheme, setTabletTheme] = useState(store.tablet_theme || "light");

    // Location Settings State
    const [locationCheckEnabled, setLocationCheckEnabled] = useState(store.location_check_enabled ?? false);
    const [latitude, setLatitude] = useState<number | null>(store.latitude);
    const [longitude, setLongitude] = useState<number | null>(store.longitude);
    const [locationRadius, setLocationRadius] = useState(store.location_radius ?? 50);
    const [loadingLocation, setLoadingLocation] = useState(false);

    // Address State
    const [address, setAddress] = useState<string>("");
    const [isFetchingAddress, setIsFetchingAddress] = useState(false);

    // Time Rounding Settings State
    const [timeRoundingEnabled, setTimeRoundingEnabled] = useState(store.time_rounding_enabled ?? false);
    const [timeRoundingMethod, setTimeRoundingMethod] = useState(store.time_rounding_method || "round");
    const [timeRoundingMinutes, setTimeRoundingMinutes] = useState(store.time_rounding_minutes ?? 15);

    // Auto Clock-Out Settings State
    // Auto Clock-Out Settings State
    const [autoClockoutEnabled, setAutoClockoutEnabled] = useState(store.auto_clockout_enabled ?? false);

    const [origin, setOrigin] = useState("");
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        setOrigin(window.location.origin);
    }, []);

    const tabletUrl = `${origin}/tablet/timecard/${store.id}`;

    const handleCopyUrl = () => {
        navigator.clipboard.writeText(tabletUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Fetch address from coordinates using Nominatim
    useEffect(() => {
        const fetchAddress = async () => {
            if (!latitude || !longitude) {
                setAddress("");
                return;
            }

            setIsFetchingAddress(true);
            try {
                // Use Nominatim API for reverse geocoding
                // Note: Please respect Nominatim's usage policy (User-Agent, rate limiting)
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1&accept-language=ja`,
                    {
                        headers: {
                            "User-Agent": "Nightbase/1.0"
                        }
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    setAddress(data.display_name || "住所が見つかりませんでした");
                } else {
                    setAddress("住所の取得に失敗しました");
                }
            } catch (error) {
                console.error("Error fetching address:", error);
                setAddress("住所の取得エラー");
            } finally {
                setIsFetchingAddress(false);
            }
        };

        // Debounce the API call
        const timer = setTimeout(() => {
            fetchAddress();
        }, 1000);

        return () => clearTimeout(timer);
    }, [latitude, longitude]);

    // Sync state with props when they change
    useEffect(() => {
        setShowBreakColumns(store.show_break_columns ?? true);
        setTabletTimecardEnabled(store.tablet_timecard_enabled ?? false);
        setTabletAllowedStaff(!store.tablet_allowed_roles || store.tablet_allowed_roles.includes("staff"));
        setTabletAllowedCast(!store.tablet_allowed_roles || store.tablet_allowed_roles.includes("cast"));
        setTabletAcceptanceStartTime(store.tablet_acceptance_start_time || "");
        setTabletAcceptanceEndTime(store.tablet_acceptance_end_time || "");
        setTabletTheme(store.tablet_theme || "light");

        setLocationCheckEnabled(store.location_check_enabled ?? false);
        setLatitude(store.latitude);
        setLongitude(store.longitude);
        setLocationRadius(store.location_radius ?? 50);

        setTimeRoundingEnabled(store.time_rounding_enabled ?? false);
        setTimeRoundingMethod(store.time_rounding_method || "round");
        setTimeRoundingMinutes(store.time_rounding_minutes ?? 15);

        setAutoClockoutEnabled(store.auto_clockout_enabled ?? false);
    }, [store]);

    const isRoleSelectionInvalid = tabletTimecardEnabled && !tabletAllowedStaff && !tabletAllowedCast;

    const handleSave = (updates: Partial<{
        showBreakColumns: boolean;
        tabletTimecardEnabled: boolean;
        tabletAllowedStaff: boolean;
        tabletAllowedCast: boolean;
        tabletAcceptanceStartTime: string;
        tabletAcceptanceEndTime: string;
        tabletTheme: string;
        locationCheckEnabled: boolean;
        latitude: number | null;
        longitude: number | null;
        locationRadius: number;
        timeRoundingEnabled: boolean;
        timeRoundingMethod: string;
        timeRoundingMinutes: number;
        autoClockoutEnabled: boolean;
    }>) => {
        startTransition(async () => {
            const newState = {
                showBreakColumns,
                tabletTimecardEnabled,
                tabletAllowedStaff,
                tabletAllowedCast,
                tabletAcceptanceStartTime,
                tabletAcceptanceEndTime,
                tabletTheme,
                locationCheckEnabled,
                latitude,
                longitude,
                locationRadius,
                timeRoundingEnabled,
                timeRoundingMethod,
                timeRoundingMinutes,
                autoClockoutEnabled,
                ...updates
            };

            const formData = new FormData();
            formData.append("showBreakColumns", newState.showBreakColumns ? "on" : "off");
            formData.append("tabletTimecardEnabled", newState.tabletTimecardEnabled ? "on" : "off");
            formData.append("tabletAcceptanceStartTime", newState.tabletAcceptanceStartTime);
            formData.append("tabletAcceptanceEndTime", newState.tabletAcceptanceEndTime);

            // Handle roles
            if (newState.tabletAllowedStaff) formData.append("tabletAllowedRoles", "staff");
            if (newState.tabletAllowedCast) formData.append("tabletAllowedRoles", "cast");

            formData.append("tabletTheme", newState.tabletTheme);

            // Location settings
            formData.append("locationCheckEnabled", newState.locationCheckEnabled ? "on" : "off");
            if (newState.latitude !== null) formData.append("latitude", newState.latitude.toString());
            if (newState.longitude !== null) formData.append("longitude", newState.longitude.toString());
            formData.append("locationRadius", newState.locationRadius.toString());

            // Time rounding settings
            formData.append("timeRoundingEnabled", newState.timeRoundingEnabled ? "on" : "off");
            formData.append("timeRoundingMethod", newState.timeRoundingMethod);
            formData.append("timeRoundingMinutes", newState.timeRoundingMinutes.toString());

            // Auto clock-out settings
            formData.append("autoClockoutEnabled", newState.autoClockoutEnabled ? "on" : "off");

            try {
                await updateTimecardSettings(formData);
            } catch (error) {
                console.error("Failed to update settings", error);
                // Ideally we would revert state here, but for simplicity we rely on the next prop update or user correction
            }
        });
    };

    const handleGetCurrentLocation = () => {
        setLoadingLocation(true);
        if (!navigator.geolocation) {
            alert("お使いのブラウザは位置情報をサポートしていません。");
            setLoadingLocation(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const newLat = position.coords.latitude;
                const newLng = position.coords.longitude;
                setLatitude(newLat);
                setLongitude(newLng);
                setLoadingLocation(false);
                alert("現在位置を取得しました。");
                handleSave({ latitude: newLat, longitude: newLng });
            },
            (error) => {
                console.error("Error getting location:", error);
                alert("位置情報の取得に失敗しました。");
                setLoadingLocation(false);
            }
        );
    };

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label htmlFor="showBreakColumns" className="text-base font-medium text-gray-900 dark:text-white">
                            休憩ボタンを表示
                        </Label>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            タイムカードで休憩開始・終了ボタンを表示します
                        </p>
                    </div>
                    <Switch
                        id="showBreakColumns"
                        checked={showBreakColumns}
                        onCheckedChange={(checked) => {
                            setShowBreakColumns(checked);
                            handleSave({ showBreakColumns: checked });
                        }}
                        disabled={isPending}
                    />
                </div>

                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label htmlFor="locationCheckEnabled" className="text-base font-medium text-gray-900 dark:text-white">
                            位置情報による打刻制限
                        </Label>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            店舗から離れた場所での打刻を禁止します
                        </p>
                    </div>
                    <Switch
                        id="locationCheckEnabled"
                        checked={locationCheckEnabled}
                        onCheckedChange={(checked) => {
                            setLocationCheckEnabled(checked);
                            handleSave({ locationCheckEnabled: checked });
                        }}
                        disabled={isPending}
                    />
                </div>

                {locationCheckEnabled && (
                    <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="latitude" className="text-sm font-medium text-gray-900 dark:text-white">緯度</Label>
                                <Input
                                    id="latitude"
                                    type="number"
                                    step="any"
                                    value={latitude ?? ""}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        setLatitude(val);
                                        handleSave({ latitude: val });
                                    }}
                                    placeholder="例: 35.6895"
                                    className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="longitude" className="text-sm font-medium text-gray-900 dark:text-white">経度</Label>
                                <Input
                                    id="longitude"
                                    type="number"
                                    step="any"
                                    value={longitude ?? ""}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        setLongitude(val);
                                        handleSave({ longitude: val });
                                    }}
                                    placeholder="例: 139.6917"
                                    className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                                />
                            </div>
                        </div>

                        {/* Address Display */}
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-md text-sm">
                            <span className="font-medium text-gray-700 dark:text-gray-300">住所: </span>
                            <span className="text-gray-600 dark:text-gray-400">
                                {isFetchingAddress ? "取得中..." : (address || "緯度・経度を入力すると住所が表示されます")}
                            </span>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                ※ 実際の住所と若干ずれる場合があります。
                            </p>
                        </div>

                        <div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleGetCurrentLocation}
                                disabled={loadingLocation || isPending}
                                className="dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                            >
                                {loadingLocation ? "取得中..." : "現在位置を取得して設定"}
                            </Button>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                現在地を店舗の位置として設定します
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="locationRadius" className="text-sm font-medium text-gray-900 dark:text-white">許可範囲 (メートル)</Label>
                            <div className="flex items-center space-x-2">
                                <Input
                                    id="locationRadius"
                                    type="number"
                                    value={locationRadius}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        setLocationRadius(val);
                                        handleSave({ locationRadius: val });
                                    }}
                                    min="10"
                                    className="w-32 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                                />
                                <span className="text-sm text-gray-500 dark:text-gray-400">m 以内での打刻を許可</span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="space-y-0.5">
                        <Label htmlFor="tabletTimecardEnabled" className="text-base font-medium text-gray-900 dark:text-white">
                            タブレット用タイムカードを有効化
                        </Label>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            ログイン無しで使える店舗専用のタブレット打刻画面を有効にします
                        </p>
                    </div>
                    <Switch
                        id="tabletTimecardEnabled"
                        checked={tabletTimecardEnabled}
                        onCheckedChange={(checked) => {
                            setTabletTimecardEnabled(checked);
                            handleSave({ tabletTimecardEnabled: checked });
                        }}
                        disabled={isPending}
                    />
                </div>

                {tabletTimecardEnabled && (
                    <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-900 dark:text-white">
                                受付時間
                            </Label>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label htmlFor="tabletAcceptanceStartTime" className="text-xs text-gray-500 dark:text-gray-400">
                                        開始時刻
                                    </Label>
                                    <input
                                        type="time"
                                        id="tabletAcceptanceStartTime"
                                        value={tabletAcceptanceStartTime}
                                        onChange={(e) => {
                                            setTabletAcceptanceStartTime(e.target.value);
                                            handleSave({ tabletAcceptanceStartTime: e.target.value });
                                        }}
                                        className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="tabletAcceptanceEndTime" className="text-xs text-gray-500 dark:text-gray-400">
                                        終了時刻
                                    </Label>
                                    <input
                                        type="time"
                                        id="tabletAcceptanceEndTime"
                                        value={tabletAcceptanceEndTime}
                                        onChange={(e) => {
                                            setTabletAcceptanceEndTime(e.target.value);
                                            handleSave({ tabletAcceptanceEndTime: e.target.value });
                                        }}
                                        className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                空欄の場合は24時間受付可能です
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-900 dark:text-white">
                                表示する役職
                            </Label>
                            <div className="space-y-2">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={tabletAllowedStaff}
                                        onChange={(e) => {
                                            setTabletAllowedStaff(e.target.checked);
                                            handleSave({ tabletAllowedStaff: e.target.checked });
                                        }}
                                        className="h-4 w-4 rounded border-gray-300"
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">スタッフ</span>
                                </label>
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={tabletAllowedCast}
                                        onChange={(e) => {
                                            setTabletAllowedCast(e.target.checked);
                                            handleSave({ tabletAllowedCast: e.target.checked });
                                        }}
                                        className="h-4 w-4 rounded border-gray-300"
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">キャスト</span>
                                </label>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                タブレット打刻画面に表示する役職を選択してください
                            </p>
                            {isRoleSelectionInvalid && (
                                <p className="text-xs text-red-500">
                                    スタッフまたはキャストのいずれかは必ず選択してください
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-900 dark:text-white">
                                テーマ
                            </Label>
                            <div className="flex gap-3">
                                <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 cursor-pointer hover:border-blue-400 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 dark:has-[:checked]:bg-blue-900/20">
                                    <input
                                        type="radio"
                                        name="tabletTheme"
                                        value="light"
                                        checked={tabletTheme === "light"}
                                        onChange={(e) => {
                                            setTabletTheme(e.target.value);
                                            handleSave({ tabletTheme: e.target.value });
                                        }}
                                        className="h-4 w-4"
                                    />
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">ライトモード</span>
                                </label>
                                <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 cursor-pointer hover:border-blue-400 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 dark:has-[:checked]:bg-blue-900/20">
                                    <input
                                        type="radio"
                                        name="tabletTheme"
                                        value="dark"
                                        checked={tabletTheme === "dark"}
                                        onChange={(e) => {
                                            setTabletTheme(e.target.value);
                                            handleSave({ tabletTheme: e.target.value });
                                        }}
                                        className="h-4 w-4"
                                    />
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">ダークモード</span>
                                </label>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                タブレット打刻画面の表示テーマを選択してください
                            </p>
                        </div>

                        {/* Tablet Link Section */}
                        <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <Label className="text-sm font-medium text-gray-900 dark:text-white">
                                タブレット用リンク
                            </Label>

                            <div className="flex gap-2">
                                <Input
                                    value={tabletUrl}
                                    readOnly
                                    className="bg-gray-50 dark:bg-gray-900 font-mono text-xs"
                                />
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={handleCopyUrl}
                                    className="shrink-0"
                                >
                                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                </Button>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                                <div className="bg-white p-2 rounded shadow-sm shrink-0">
                                    <QRCodeSVG value={tabletUrl} size={140} level="H" />
                                </div>
                                <div className="space-y-3 flex-1 w-full">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                                            QRコードでアクセス
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            iPadなどのタブレット端末でこのQRコードを読み取ると、直接タイムカード画面にアクセスできます。
                                        </p>
                                    </div>
                                    <Button asChild variant="default" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white">
                                        <a href={tabletUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                                            <ExternalLink className="h-4 w-4" />
                                            ブラウザで開く
                                        </a>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Time Rounding Settings */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label htmlFor="timeRoundingEnabled" className="text-base font-medium text-gray-900 dark:text-white">
                            打刻時間の自動修正
                        </Label>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            出勤・退勤時刻を指定した単位で自動的に修正します
                        </p>
                    </div>
                    <Switch
                        id="timeRoundingEnabled"
                        checked={timeRoundingEnabled}
                        onCheckedChange={(checked) => {
                            setTimeRoundingEnabled(checked);
                            handleSave({ timeRoundingEnabled: checked });
                        }}
                    />
                </div>

                {timeRoundingEnabled && (
                    <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                修正方法
                            </Label>
                            <Select
                                value={timeRoundingMethod}
                                onValueChange={(value) => {
                                    setTimeRoundingMethod(value);
                                    handleSave({ timeRoundingMethod: value });
                                }}
                            >
                                <SelectTrigger className="w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="floor">繰り下げ</SelectItem>
                                    <SelectItem value="ceil">繰り上げ</SelectItem>
                                    <SelectItem value="round">四捨五入</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {timeRoundingMethod === "floor" && "例: 9:07 → 9:00（5分単位の場合）"}
                                {timeRoundingMethod === "ceil" && "例: 9:03 → 9:05（5分単位の場合）"}
                                {timeRoundingMethod === "round" && "例: 9:03 → 9:05、9:02 → 9:00（5分単位の場合）"}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                修正単位（分）
                            </Label>
                            <Select
                                value={timeRoundingMinutes.toString()}
                                onValueChange={(value) => {
                                    const minutes = parseInt(value);
                                    setTimeRoundingMinutes(minutes);
                                    handleSave({ timeRoundingMinutes: minutes });
                                }}
                            >
                                <SelectTrigger className="w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="5">5分</SelectItem>
                                    <SelectItem value="10">10分</SelectItem>
                                    <SelectItem value="15">15分</SelectItem>
                                    <SelectItem value="20">20分</SelectItem>
                                    <SelectItem value="30">30分</SelectItem>
                                    <SelectItem value="60">60分</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                )}
            </div>

            {/* Auto Clock-Out Settings */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label htmlFor="autoClockoutEnabled" className="text-base font-medium text-gray-900 dark:text-white">
                            退勤忘れ時の自動退勤
                        </Label>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            日にち切り替え時間に退勤打刻がない場合、自動的に退勤処理を行います
                        </p>
                    </div>
                    <Switch
                        id="autoClockoutEnabled"
                        checked={autoClockoutEnabled}
                        onCheckedChange={(checked) => {
                            setAutoClockoutEnabled(checked);
                            handleSave({ autoClockoutEnabled: checked });
                        }}
                    />
                </div>
            </div>


        </div>
    );
}
