"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    updateTimecardSettings,
    getTimecardQuestions,
    createTimecardQuestion,
    updateTimecardQuestion,
    deleteTimecardQuestion,
    type TimecardQuestion,
} from "../actions";
import { useTransition, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check, ExternalLink, ChevronRight, Plus, Trash2, ArrowUp, ArrowDown, Edit2, X } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";

interface TimecardSettingsFormProps {
    store: any;
}

type DetailView = "break" | "location" | "tablet" | "rounding" | "autoclockout" | "pickup" | "questions" | null;

export function TimecardSettingsForm({ store }: TimecardSettingsFormProps) {
    const [isPending, startTransition] = useTransition();
    const [activeDetail, setActiveDetail] = useState<DetailView>(null);

    // State for all fields
    const [showBreakColumns, setShowBreakColumns] = useState(store.show_break_columns ?? false);
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

    // Time Rounding Settings State
    const [timeRoundingEnabled, setTimeRoundingEnabled] = useState(store.time_rounding_enabled ?? false);
    const [timeRoundingMethod, setTimeRoundingMethod] = useState(store.time_rounding_method || "round");
    const [timeRoundingMinutes, setTimeRoundingMinutes] = useState(store.time_rounding_minutes ?? 15);

    // Auto Clock-Out Settings State
    const [autoClockoutEnabled, setAutoClockoutEnabled] = useState(store.auto_clockout_enabled ?? false);

    // Pickup Settings State
    const [pickupEnabledCast, setPickupEnabledCast] = useState(store.pickup_enabled_cast ?? false);
    const [pickupEnabledStaff, setPickupEnabledStaff] = useState(store.pickup_enabled_staff ?? false);

    // Custom Questions State
    const [questions, setQuestions] = useState<TimecardQuestion[]>([]);
    const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<TimecardQuestion | null>(null);
    const [questionLabel, setQuestionLabel] = useState("");
    const [questionFieldType, setQuestionFieldType] = useState("text");
    const [questionOptions, setQuestionOptions] = useState("");
    const [questionIsRequired, setQuestionIsRequired] = useState(false);
    const [questionTargetRole, setQuestionTargetRole] = useState("both");
    const [questionTiming, setQuestionTiming] = useState("clock_in");
    const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [questionToDelete, setQuestionToDelete] = useState<TimecardQuestion | null>(null);

    const [origin, setOrigin] = useState("");
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        setOrigin(window.location.origin);
    }, []);

    // Load questions when entering questions detail view
    const loadQuestions = useCallback(async () => {
        setIsLoadingQuestions(true);
        try {
            const data = await getTimecardQuestions();
            setQuestions(data);
        } catch (error) {
            console.error("Error loading questions:", error);
            toast({ title: "質問の読み込みに失敗しました", variant: "destructive" });
        } finally {
            setIsLoadingQuestions(false);
        }
    }, []);

    useEffect(() => {
        if (activeDetail === "questions") {
            loadQuestions();
        }
    }, [activeDetail, loadQuestions]);

    // Question modal functions
    const openNewQuestionModal = () => {
        setEditingQuestion(null);
        setQuestionLabel("");
        setQuestionFieldType("text");
        setQuestionOptions("");
        setQuestionIsRequired(false);
        setQuestionTargetRole("both");
        setQuestionTiming("clock_in");
        setIsQuestionModalOpen(true);
    };

    const openEditQuestionModal = (question: TimecardQuestion) => {
        setEditingQuestion(question);
        setQuestionLabel(question.label);
        setQuestionFieldType(question.field_type);
        setQuestionOptions(question.options?.join("\n") || "");
        setQuestionIsRequired(question.is_required);
        setQuestionTargetRole(question.target_role);
        setQuestionTiming(question.timing);
        setIsQuestionModalOpen(true);
    };

    const handleSaveQuestion = async () => {
        if (!questionLabel.trim()) {
            toast({ title: "質問内容を入力してください", variant: "destructive" });
            return;
        }

        const questionData = {
            label: questionLabel.trim(),
            field_type: questionFieldType,
            options: questionFieldType === "select" ? questionOptions.split("\n").filter(o => o.trim()) : null,
            is_required: questionIsRequired,
            target_role: questionTargetRole,
            timing: questionTiming,
        };

        startTransition(async () => {
            try {
                if (editingQuestion) {
                    const result = await updateTimecardQuestion(editingQuestion.id, questionData);
                    if (!result.success) throw new Error(result.error);
                    toast({ title: "質問を更新しました" });
                } else {
                    const result = await createTimecardQuestion(questionData);
                    if (!result.success) throw new Error(result.error);
                    toast({ title: "質問を追加しました" });
                }
                setIsQuestionModalOpen(false);
                loadQuestions();
            } catch (error) {
                console.error("Error saving question:", error);
                toast({ title: "保存に失敗しました", variant: "destructive" });
            }
        });
    };

    const openDeleteConfirm = (question: TimecardQuestion) => {
        setQuestionToDelete(question);
        setIsDeleteConfirmOpen(true);
    };

    const handleDeleteQuestion = async () => {
        if (!questionToDelete) return;

        startTransition(async () => {
            try {
                const result = await deleteTimecardQuestion(questionToDelete.id);
                if (!result.success) throw new Error(result.error);
                toast({ title: "質問を削除しました" });
                setIsDeleteConfirmOpen(false);
                setIsQuestionModalOpen(false);
                setQuestionToDelete(null);
                loadQuestions();
            } catch (error) {
                console.error("Error deleting question:", error);
                toast({ title: "削除に失敗しました", variant: "destructive" });
            }
        });
    };

    const handleToggleQuestionActive = async (question: TimecardQuestion) => {
        startTransition(async () => {
            try {
                const result = await updateTimecardQuestion(question.id, { is_active: !question.is_active });
                if (!result.success) throw new Error(result.error);
                loadQuestions();
            } catch (error) {
                console.error("Error toggling question:", error);
                toast({ title: "更新に失敗しました", variant: "destructive" });
            }
        });
    };

    const tabletUrl = `${origin}/tablet/timecard/${store.id}`;

    const handleCopyUrl = () => {
        navigator.clipboard.writeText(tabletUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Sync state with props when they change
    useEffect(() => {
        setShowBreakColumns(store.show_break_columns ?? false);
        setTabletTimecardEnabled(store.tablet_timecard_enabled ?? false);
        setTabletAllowedStaff(!store.tablet_allowed_roles || store.tablet_allowed_roles.includes("staff"));
        setTabletAllowedCast(!store.tablet_allowed_roles || store.tablet_allowed_roles.includes("cast"));
        setTabletAcceptanceStartTime(store.tablet_acceptance_start_time || "");
        setTabletAcceptanceEndTime(store.tablet_acceptance_end_time || "");
        setTabletTheme(store.tablet_theme || "light");

        setLocationCheckEnabled(store.location_check_enabled ?? false);
        setLatitude(store.latitude);
        setLongitude(store.longitude);
        setLocationRadius(store.location_radius || 50);

        setTimeRoundingEnabled(store.time_rounding_enabled ?? false);
        setTimeRoundingMethod(store.time_rounding_method || "round");
        setTimeRoundingMinutes(store.time_rounding_minutes || 15);
        setAutoClockoutEnabled(store.auto_clockout_enabled ?? false);
        setPickupEnabledCast(store.pickup_enabled_cast ?? false);
        setPickupEnabledStaff(store.pickup_enabled_staff ?? false);
    }, [store]);

    const isRoleSelectionInvalid = tabletTimecardEnabled && !tabletAllowedStaff && !tabletAllowedCast;

    const handleSave = (updates: any = {}) => {
        const formData = new FormData();
        formData.append("showBreakColumns", (updates.showBreakColumns ?? showBreakColumns) ? "on" : "off");
        formData.append("tabletTimecardEnabled", (updates.tabletTimecardEnabled ?? tabletTimecardEnabled) ? "on" : "off");
        formData.append("tabletAcceptanceStartTime", updates.tabletAcceptanceStartTime ?? tabletAcceptanceStartTime);
        formData.append("tabletAcceptanceEndTime", updates.tabletAcceptanceEndTime ?? tabletAcceptanceEndTime);

        const roles: string[] = [];
        if (updates.tabletAllowedStaff ?? tabletAllowedStaff) roles.push("staff");
        if (updates.tabletAllowedCast ?? tabletAllowedCast) roles.push("cast");
        roles.forEach(role => formData.append("tabletAllowedRoles", role));

        formData.append("tabletTheme", updates.tabletTheme ?? tabletTheme);

        formData.append("locationCheckEnabled", (updates.locationCheckEnabled ?? locationCheckEnabled) ? "on" : "off");

        const lat = updates.latitude ?? latitude;
        const lng = updates.longitude ?? longitude;
        if (lat) formData.append("latitude", lat.toString());
        if (lng) formData.append("longitude", lng.toString());

        formData.append("locationRadius", (updates.locationRadius ?? locationRadius).toString());

        formData.append("timeRoundingEnabled", (updates.timeRoundingEnabled ?? timeRoundingEnabled) ? "on" : "off");
        formData.append("timeRoundingMethod", updates.timeRoundingMethod ?? timeRoundingMethod);
        formData.append("timeRoundingMinutes", (updates.timeRoundingMinutes ?? timeRoundingMinutes).toString());
        formData.append("autoClockoutEnabled", (updates.autoClockoutEnabled ?? autoClockoutEnabled) ? "on" : "off");
        formData.append("pickupEnabledCast", (updates.pickupEnabledCast ?? pickupEnabledCast) ? "on" : "off");
        formData.append("pickupEnabledStaff", (updates.pickupEnabledStaff ?? pickupEnabledStaff) ? "on" : "off");

        startTransition(async () => {
            try {
                await updateTimecardSettings(formData);
            } catch (error) {
                console.error("Failed to update settings:", error);
                toast({ title: "設定の保存に失敗しました", variant: "destructive" });
            }
        });
    };

    const handleGetCurrentLocation = () => {
        setLoadingLocation(true);
        if (!navigator.geolocation) {
            toast({ title: "お使いのブラウザは位置情報をサポートしていません。", variant: "destructive" });
            setLoadingLocation(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const newLat = position.coords.latitude;
                const newLng = position.coords.longitude;
                setLatitude(newLat);
                setLongitude(newLng);

                handleSave({
                    latitude: newLat,
                    longitude: newLng
                });

                toast({ title: "現在位置を取得しました。" });
                setLoadingLocation(false);
            },
            (error) => {
                console.error("Error getting location:", error);
                toast({ title: "位置情報の取得に失敗しました。", variant: "destructive" });
                setLoadingLocation(false);
            }
        );
    };

    // Detail view for Break Button Settings
    const renderBreakDetail = () => (
        <div className="bg-gray-50 dark:bg-gray-950">
            <div className="space-y-4">
                <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">休憩ボタンを表示</h2>
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
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        タイムカードで休憩開始・終了ボタンを表示します
                    </p>
                </div>

                <Button
                    variant="outline"
                    onClick={() => setActiveDetail(null)}
                    className="w-full rounded-lg"
                >
                    戻る
                </Button>
            </div>
        </div>
    );

    // Detail view for Location Settings
    const renderLocationDetail = () => (
        <div className="bg-gray-50 dark:bg-gray-950">
            <div className="space-y-4">
                <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">位置情報による打刻制限</h2>
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
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        店舗から離れた場所での打刻を禁止します
                    </p>

                    <div className={`space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700 ${!locationCheckEnabled ? "opacity-50 pointer-events-none" : ""}`}>
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">位置情報 (緯度・経度)</Label>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleGetCurrentLocation}
                                disabled={loadingLocation || !locationCheckEnabled}
                            >
                                {loadingLocation ? "取得中..." : "現在位置を取得"}
                            </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">緯度</div>
                                <div className="font-mono text-sm text-gray-900 dark:text-white">{latitude?.toFixed(6) ?? "未設定"}</div>
                            </div>
                            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">経度</div>
                                <div className="font-mono text-sm text-gray-900 dark:text-white">{longitude?.toFixed(6) ?? "未設定"}</div>
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            現在地を店舗の位置として設定します
                        </p>

                        <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <Label htmlFor="locationRadius" className="text-sm font-medium text-gray-700 dark:text-gray-200">許可範囲 (メートル)</Label>
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
                                    disabled={!locationCheckEnabled}
                                    className="w-32 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                                />
                                <span className="text-sm text-gray-500 dark:text-gray-400">m 以内での打刻を許可</span>
                            </div>
                        </div>
                    </div>
                </div>

                <Button
                    variant="outline"
                    onClick={() => setActiveDetail(null)}
                    className="w-full rounded-lg"
                >
                    戻る
                </Button>
            </div>
        </div>
    );

    // Detail view for Tablet Settings
    const renderTabletDetail = () => (
        <div className="bg-gray-50 dark:bg-gray-950">
            <div className="space-y-4">
                <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">タブレット用タイムカード</h2>
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
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        ログイン無しで使える店舗専用の打刻画面を有効にします
                    </p>

                    <div className={`space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700 ${!tabletTimecardEnabled ? "opacity-50 pointer-events-none" : ""}`}>
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">
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
                                        step={60}
                                        className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-base text-gray-900 dark:text-white"
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
                                        step={60}
                                        className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-base text-gray-900 dark:text-white"
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                空欄の場合は24時間受付可能です
                            </p>
                        </div>

                        <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">
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
                            {isRoleSelectionInvalid && (
                                <p className="text-xs text-red-500">
                                    スタッフまたはキャストのいずれかは必ず選択してください
                                </p>
                            )}
                        </div>

                        <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">
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
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">ライト</span>
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
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">ダーク</span>
                                </label>
                            </div>
                        </div>

                        {/* Tablet Link Section */}
                        <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                タブレット用リンク
                            </Label>

                            <div className="flex gap-2">
                                <Input
                                    value={tabletUrl}
                                    readOnly
                                    className="bg-gray-50 dark:bg-gray-800 font-mono text-xs"
                                />
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={handleCopyUrl}
                                    className="shrink-0"
                                >
                                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-5 w-5" />}
                                </Button>
                            </div>

                            <div className="flex flex-col gap-4 items-center bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                                <div className="bg-white p-2 rounded shadow-sm shrink-0">
                                    <QRCodeSVG value={tabletUrl} size={140} level="H" />
                                </div>
                                <div className="space-y-2 w-full text-center">
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                        QRコードでアクセス
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        iPadなどのタブレット端末でこのQRコードを読み取ると、直接タイムカード画面にアクセスできます。
                                    </p>
                                    <Button asChild variant="default" className="w-full">
                                        <a href={tabletUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
                                            <ExternalLink className="h-4 w-4" />
                                            ブラウザで開く
                                        </a>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <Button
                    variant="outline"
                    onClick={() => setActiveDetail(null)}
                    className="w-full rounded-lg"
                >
                    戻る
                </Button>
            </div>
        </div>
    );

    // Detail view for Time Rounding Settings
    const renderRoundingDetail = () => (
        <div className="bg-gray-50 dark:bg-gray-950">
            <div className="space-y-4">
                <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">打刻時間の自動修正</h2>
                        <Switch
                            id="timeRoundingEnabled"
                            checked={timeRoundingEnabled}
                            onCheckedChange={(checked) => {
                                setTimeRoundingEnabled(checked);
                                handleSave({ timeRoundingEnabled: checked });
                            }}
                            disabled={isPending}
                        />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        出勤・退勤時刻を指定した単位で自動的に修正します
                    </p>

                    <div className={`space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700 ${!timeRoundingEnabled ? "opacity-50 pointer-events-none" : ""}`}>
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                修正方法
                            </Label>
                            <Select
                                value={timeRoundingMethod}
                                onValueChange={(value) => {
                                    setTimeRoundingMethod(value);
                                    handleSave({ timeRoundingMethod: value });
                                }}
                                disabled={!timeRoundingEnabled}
                            >
                                <SelectTrigger className="w-full bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white">
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

                        <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                修正単位（分）
                            </Label>
                            <Select
                                value={timeRoundingMinutes.toString()}
                                onValueChange={(value) => {
                                    const minutes = parseInt(value);
                                    setTimeRoundingMinutes(minutes);
                                    handleSave({ timeRoundingMinutes: minutes });
                                }}
                                disabled={!timeRoundingEnabled}
                            >
                                <SelectTrigger className="w-full bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">1分</SelectItem>
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
                </div>

                <Button
                    variant="outline"
                    onClick={() => setActiveDetail(null)}
                    className="w-full rounded-lg"
                >
                    戻る
                </Button>
            </div>
        </div>
    );

    // Detail view for Auto Clock-Out Settings
    const renderAutoClockoutDetail = () => (
        <div className="bg-gray-50 dark:bg-gray-950">
            <div className="space-y-4">
                <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">退勤忘れ時の自動退勤</h2>
                        <Switch
                            id="autoClockoutEnabled"
                            checked={autoClockoutEnabled}
                            onCheckedChange={(checked) => {
                                setAutoClockoutEnabled(checked);
                                handleSave({ autoClockoutEnabled: checked });
                            }}
                            disabled={isPending}
                        />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        日にち切り替え時間に退勤打刻がない場合、自動的に退勤処理を行います
                    </p>
                </div>

                <Button
                    variant="outline"
                    onClick={() => setActiveDetail(null)}
                    className="w-full rounded-lg"
                >
                    戻る
                </Button>
            </div>
        </div>
    );

    // Detail view for Pickup Settings
    const renderPickupDetail = () => (
        <div className="bg-gray-50 dark:bg-gray-950">
            <div className="space-y-4">
                <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 space-y-4">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">送迎先入力</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            出勤時に送迎先を入力できるようにします
                        </p>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="pickupEnabledCast" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                キャスト
                            </Label>
                            <Switch
                                id="pickupEnabledCast"
                                checked={pickupEnabledCast}
                                onCheckedChange={(checked) => {
                                    setPickupEnabledCast(checked);
                                    handleSave({ pickupEnabledCast: checked });
                                }}
                                disabled={isPending}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="pickupEnabledStaff" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                スタッフ
                            </Label>
                            <Switch
                                id="pickupEnabledStaff"
                                checked={pickupEnabledStaff}
                                onCheckedChange={(checked) => {
                                    setPickupEnabledStaff(checked);
                                    handleSave({ pickupEnabledStaff: checked });
                                }}
                                disabled={isPending}
                            />
                        </div>
                    </div>
                </div>

                <Button
                    variant="outline"
                    onClick={() => setActiveDetail(null)}
                    className="w-full rounded-lg"
                >
                    戻る
                </Button>
            </div>
        </div>
    );

    // Helper functions for questions display
    const getTargetRoleLabel = (role: string) => {
        switch (role) {
            case "cast": return "キャスト";
            case "staff": return "スタッフ";
            case "both": return "両方";
            default: return role;
        }
    };

    const getTimingLabel = (timing: string) => {
        switch (timing) {
            case "clock_in": return "出勤時";
            case "clock_out": return "退勤時";
            case "both": return "両方";
            default: return timing;
        }
    };

    const getFieldTypeLabel = (type: string) => {
        switch (type) {
            case "text": return "テキスト";
            case "textarea": return "複数行テキスト";
            case "number": return "数値";
            case "select": return "選択";
            case "checkbox": return "チェックボックス";
            default: return type;
        }
    };

    // Detail view for Custom Questions
    const renderQuestionsDetail = () => (
        <div className="bg-gray-50 dark:bg-gray-950">
            <div className="space-y-4">
                <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">カスタム質問</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                出勤・退勤時に追加の質問を設定できます
                            </p>
                        </div>
                        <Button
                            size="sm"
                            onClick={openNewQuestionModal}
                            className="rounded-lg shrink-0 whitespace-nowrap"
                        >
                            <Plus className="h-4 w-4 mr-1" />
                            追加
                        </Button>
                    </div>

                    {isLoadingQuestions ? (
                        <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                            読み込み中...
                        </div>
                    ) : questions.length === 0 ? (
                        <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                            カスタム質問がありません
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {questions.map((question) => (
                                <div
                                    key={question.id}
                                    className={`p-3 rounded-lg border ${
                                        question.is_active
                                            ? "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                                            : "border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 opacity-60"
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-medium text-gray-900 dark:text-white text-sm">
                                                    {question.label}
                                                </span>
                                                {question.is_required && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                                                        必須
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                                                    {getTargetRoleLabel(question.target_role)}
                                                </span>
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                                                    {getTimingLabel(question.timing)}
                                                </span>
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                                                    {getFieldTypeLabel(question.field_type)}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Switch
                                                checked={question.is_active}
                                                onCheckedChange={() => handleToggleQuestionActive(question)}
                                                disabled={isPending}
                                                className="scale-75"
                                            />
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7"
                                                onClick={() => openEditQuestionModal(question)}
                                            >
                                                <Edit2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <Button
                    variant="outline"
                    onClick={() => setActiveDetail(null)}
                    className="w-full rounded-lg"
                >
                    戻る
                </Button>
            </div>

            {/* Question Edit Modal */}
            <Dialog open={isQuestionModalOpen} onOpenChange={setIsQuestionModalOpen}>
                <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto rounded-2xl">
                    <DialogHeader className="flex flex-row items-center justify-between">
                        <DialogTitle>
                            {editingQuestion ? "質問を編集" : "質問を追加"}
                        </DialogTitle>
                        {editingQuestion && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                onClick={() => openDeleteConfirm(editingQuestion)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        )}
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>質問内容 *</Label>
                            <Input
                                value={questionLabel}
                                onChange={(e) => setQuestionLabel(e.target.value)}
                                placeholder="例: 本日の体調はいかがですか?"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>対象</Label>
                                <Select value={questionTargetRole} onValueChange={setQuestionTargetRole}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="both">両方</SelectItem>
                                        <SelectItem value="cast">キャストのみ</SelectItem>
                                        <SelectItem value="staff">スタッフのみ</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>タイミング</Label>
                                <Select value={questionTiming} onValueChange={setQuestionTiming}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="clock_in">出勤時</SelectItem>
                                        <SelectItem value="clock_out">退勤時</SelectItem>
                                        <SelectItem value="both">両方</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>入力タイプ</Label>
                            <Select value={questionFieldType} onValueChange={setQuestionFieldType}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="text">テキスト (1行)</SelectItem>
                                    <SelectItem value="textarea">テキスト (複数行)</SelectItem>
                                    <SelectItem value="number">数値</SelectItem>
                                    <SelectItem value="select">選択式</SelectItem>
                                    <SelectItem value="checkbox">チェックボックス</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {questionFieldType === "select" && (
                            <div className="space-y-2">
                                <Label>選択肢 (1行に1つ)</Label>
                                <Textarea
                                    value={questionOptions}
                                    onChange={(e) => setQuestionOptions(e.target.value)}
                                    placeholder={"良好\n普通\n体調不良"}
                                    rows={4}
                                />
                            </div>
                        )}

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="questionRequired"
                                checked={questionIsRequired}
                                onChange={(e) => setQuestionIsRequired(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300"
                            />
                            <Label htmlFor="questionRequired" className="cursor-pointer">
                                必須項目にする
                            </Label>
                        </div>
                    </div>
                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button
                            onClick={handleSaveQuestion}
                            disabled={isPending || !questionLabel.trim()}
                            className="w-full sm:w-auto"
                        >
                            {isPending ? "保存中..." : "保存"}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setIsQuestionModalOpen(false)}
                            className="w-full sm:w-auto"
                        >
                            キャンセル
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Modal */}
            <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
                <DialogContent className="sm:max-w-sm rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>質問を削除</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            「{questionToDelete?.label}」を削除しますか？
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                            この操作は取り消せません。
                        </p>
                    </div>
                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button
                            variant="destructive"
                            onClick={handleDeleteQuestion}
                            disabled={isPending}
                            className="w-full sm:w-auto"
                        >
                            {isPending ? "削除中..." : "削除"}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsDeleteConfirmOpen(false);
                                setQuestionToDelete(null);
                            }}
                            className="w-full sm:w-auto"
                        >
                            キャンセル
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );

    // メイン画面か詳細画面かで切り替え
    if (activeDetail === "break") {
        return renderBreakDetail();
    }
    if (activeDetail === "location") {
        return renderLocationDetail();
    }
    if (activeDetail === "tablet") {
        return renderTabletDetail();
    }
    if (activeDetail === "rounding") {
        return renderRoundingDetail();
    }
    if (activeDetail === "autoclockout") {
        return renderAutoClockoutDetail();
    }
    if (activeDetail === "pickup") {
        return renderPickupDetail();
    }
    if (activeDetail === "questions") {
        return renderQuestionsDetail();
    }

    return (
        <div className="space-y-4">
                <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {/* 休憩ボタン */}
                    <button
                        type="button"
                        onClick={() => setActiveDetail("break")}
                        className="flex items-center justify-between p-4 w-full text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        <div className="flex-1 space-y-0.5">
                            <div className="flex items-center gap-2">
                                <span className="text-base font-medium text-gray-900 dark:text-white">
                                    休憩ボタンを表示
                                </span>
                                {showBreakColumns && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                        オン
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                タイムカードで休憩開始・終了ボタンを表示します
                            </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                    </button>

                    {/* 位置情報による打刻制限 */}
                    <button
                        type="button"
                        onClick={() => setActiveDetail("location")}
                        className="flex items-center justify-between p-4 w-full text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        <div className="flex-1 space-y-0.5">
                            <div className="flex items-center gap-2">
                                <span className="text-base font-medium text-gray-900 dark:text-white">
                                    位置情報による打刻制限
                                </span>
                                {locationCheckEnabled && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                        オン
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                店舗から離れた場所での打刻を禁止します
                            </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                    </button>

                    {/* タブレット用タイムカード */}
                    <button
                        type="button"
                        onClick={() => setActiveDetail("tablet")}
                        className="flex items-center justify-between p-4 w-full text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        <div className="flex-1 space-y-0.5">
                            <div className="flex items-center gap-2">
                                <span className="text-base font-medium text-gray-900 dark:text-white">
                                    タブレット用タイムカード
                                </span>
                                {tabletTimecardEnabled && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                        オン
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                ログイン無しで使える店舗専用の打刻画面を有効にします
                            </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                    </button>

                    {/* 打刻時間の自動修正 */}
                    <button
                        type="button"
                        onClick={() => setActiveDetail("rounding")}
                        className="flex items-center justify-between p-4 w-full text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        <div className="flex-1 space-y-0.5">
                            <div className="flex items-center gap-2">
                                <span className="text-base font-medium text-gray-900 dark:text-white">
                                    打刻時間の自動修正
                                </span>
                                {timeRoundingEnabled && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                        オン
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                出勤・退勤時刻を指定した単位で自動的に修正します
                            </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                    </button>

                    {/* 退勤忘れ時の自動退勤 */}
                    <button
                        type="button"
                        onClick={() => setActiveDetail("autoclockout")}
                        className="flex items-center justify-between p-4 w-full text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        <div className="flex-1 space-y-0.5">
                            <div className="flex items-center gap-2">
                                <span className="text-base font-medium text-gray-900 dark:text-white">
                                    退勤忘れ時の自動退勤
                                </span>
                                {autoClockoutEnabled && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                        オン
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                日にち切り替え時間に退勤打刻がない場合、自動的に退勤処理を行います
                            </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                    </button>

                    {/* 送迎先入力 */}
                    <button
                        type="button"
                        onClick={() => setActiveDetail("pickup")}
                        className="flex items-center justify-between p-4 w-full text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        <div className="flex-1 space-y-0.5">
                            <div className="flex items-center gap-2">
                                <span className="text-base font-medium text-gray-900 dark:text-white">
                                    送迎先入力
                                </span>
                                {(pickupEnabledCast || pickupEnabledStaff) && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                        オン
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                出勤時に送迎先を入力できるようにします
                            </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                    </button>

                    {/* カスタム質問 */}
                    <button
                        type="button"
                        onClick={() => setActiveDetail("questions")}
                        className="flex items-center justify-between p-4 w-full text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        <div className="flex-1 space-y-0.5">
                            <div className="flex items-center gap-2">
                                <span className="text-base font-medium text-gray-900 dark:text-white">
                                    カスタム質問
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                出勤・退勤時に追加の質問を設定します
                            </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                    </button>
                </div>

                <Button
                    variant="outline"
                    onClick={() => window.history.back()}
                    className="w-full rounded-lg"
                >
                    戻る
                </Button>
        </div>
    );
}
