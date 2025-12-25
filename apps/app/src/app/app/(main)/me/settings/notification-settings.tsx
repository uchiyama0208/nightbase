"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff, Loader2, ChevronRight, ChevronLeft, MessageCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetClose,
} from "@/components/ui/sheet";
import {
    isPushNotificationSupported,
    getNotificationPermission,
    subscribeToPush,
    unsubscribeFromPush,
    serializeSubscription,
    getPushSubscription,
} from "@/lib/push-notifications";

// 通知タイプの定義
const NOTIFICATION_TYPES = {
    // 勤怠系
    attendance: { label: "出退勤通知", category: "勤怠" },
    shift_submitted: { label: "シフト提出通知", category: "勤怠" },
    shift_deadline: { label: "シフト提出期限リマインダー", category: "勤怠" },
    // フロア系
    order_notification: { label: "注文通知", category: "フロア" },
    guest_arrival: { label: "来店通知", category: "フロア" },
    checkout: { label: "会計終了通知", category: "フロア" },
    set_time: { label: "セット時間アラート", category: "フロア" },
    extension: { label: "延長通知", category: "フロア" },
    nomination: { label: "指名通知", category: "フロア" },
    in_store: { label: "場内通知", category: "フロア" },
    cast_rotation: { label: "キャスト付け回し時間", category: "フロア" },
    // 管理系
    inventory: { label: "在庫アラート", category: "管理" },
    invitation_joined: { label: "招待参加通知", category: "管理" },
    application: { label: "参加申請通知", category: "管理" },
    resume: { label: "履歴書提出通知", category: "管理" },
    // 予約系
    queue: { label: "順番待ち通知", category: "予約" },
    reservation: { label: "予約通知", category: "予約" },
} as const;

interface NotificationSettings {
    enabled: boolean;
    [key: string]: boolean;
}

const CATEGORIES = ["勤怠", "フロア", "管理", "予約"] as const;

export function NotificationSettings() {
    const { toast } = useToast();

    // プッシュ通知の状態
    const [isPushSupported, setIsPushSupported] = useState(false);
    const [pushPermission, setPushPermission] = useState<NotificationPermission | null>(null);
    const [isPushSubscribed, setIsPushSubscribed] = useState(false);
    const [pushSettings, setPushSettings] = useState<NotificationSettings | null>(null);
    const [isPushLoading, setIsPushLoading] = useState(true);
    const [isTogglingPush, setIsTogglingPush] = useState(false);

    // LINE通知の状態
    const [isLineLinked, setIsLineLinked] = useState(false);
    const [lineSettings, setLineSettings] = useState<NotificationSettings | null>(null);
    const [isLineLoading, setIsLineLoading] = useState(true);

    // プッシュ通知の初期化
    useEffect(() => {
        const initPush = async () => {
            const supported = isPushNotificationSupported();
            setIsPushSupported(supported);

            if (supported) {
                setPushPermission(getNotificationPermission());
            }

            try {
                const res = await fetch("/api/push/settings");
                if (res.ok) {
                    const data = await res.json();
                    setPushSettings(data.settings);
                    setIsPushSubscribed(data.isSubscribed);
                }
            } catch (error) {
                console.error("Failed to fetch push settings:", error);
            }

            setIsPushLoading(false);
        };

        initPush();
    }, []);

    // LINE通知の初期化
    useEffect(() => {
        const initLine = async () => {
            try {
                const res = await fetch("/api/line/settings");
                if (res.ok) {
                    const data = await res.json();
                    setLineSettings(data.settings);
                    setIsLineLinked(data.isLineLinked);
                }
            } catch (error) {
                console.error("Failed to fetch LINE settings:", error);
            }

            setIsLineLoading(false);
        };

        initLine();
    }, []);

    // プッシュ通知の有効/無効を切り替え
    const togglePushSubscription = async () => {
        if (!isPushSupported) return;

        setIsTogglingPush(true);

        try {
            if (isPushSubscribed) {
                const subscription = await getPushSubscription();
                if (subscription) {
                    await unsubscribeFromPush();
                    await fetch("/api/push/subscribe", {
                        method: "DELETE",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ endpoint: subscription.endpoint }),
                    });
                }
                setIsPushSubscribed(false);
                toast({ title: "プッシュ通知を無効にしました" });
            } else {
                const subscription = await subscribeToPush();
                const serialized = serializeSubscription(subscription);

                const res = await fetch("/api/push/subscribe", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(serialized),
                });

                if (!res.ok) {
                    throw new Error("Failed to save subscription");
                }

                setIsPushSubscribed(true);
                setPushPermission("granted");
                toast({ title: "プッシュ通知を有効にしました" });
            }
        } catch (error) {
            console.error("Toggle push subscription error:", error);
            const message = error instanceof Error ? error.message : "";
            if (message === "通知の許可が得られませんでした") {
                toast({ title: "通知の許可が必要です", description: "ブラウザの設定から許可してください。", variant: "destructive" });
                setPushPermission("denied");
            } else if (message.includes("Service Worker")) {
                toast({ title: "Service Workerが利用できません", description: "本番環境でお試しください。", variant: "destructive" });
            } else if (message.includes("タイムアウト")) {
                toast({ title: "接続がタイムアウトしました", description: "再度お試しください。", variant: "destructive" });
            } else {
                toast({ title: "プッシュ通知の設定に失敗しました", description: message || "エラーが発生しました", variant: "destructive" });
            }
        }

        setIsTogglingPush(false);
    };

    // プッシュ通知の個別設定を更新（楽観的更新）
    const updatePushSetting = async (key: string, value: boolean) => {
        // 楽観的更新：即座にUIを更新（関数型更新で最新の状態を参照）
        setPushSettings(prev => {
            if (!prev) return prev;
            return { ...prev, [key]: value };
        });

        try {
            const res = await fetch("/api/push/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ [key]: value }),
            });

            if (!res.ok) {
                throw new Error("Failed to update setting");
            }
        } catch (error) {
            // エラー時はロールバック
            console.error("Update push setting error:", error);
            setPushSettings(prev => {
                if (!prev) return prev;
                return { ...prev, [key]: !value };
            });
            toast({ title: "設定の更新に失敗しました", variant: "destructive" });
        }
    };

    // LINE通知の個別設定を更新（楽観的更新）
    const updateLineSetting = async (key: string, value: boolean) => {
        // 楽観的更新：即座にUIを更新（関数型更新で最新の状態を参照）
        setLineSettings(prev => {
            if (!prev) return prev;
            return { ...prev, [key]: value };
        });

        try {
            const res = await fetch("/api/line/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ [key]: value }),
            });

            if (!res.ok) {
                throw new Error("Failed to update setting");
            }
        } catch (error) {
            // エラー時はロールバック
            console.error("Update LINE setting error:", error);
            setLineSettings(prev => {
                if (!prev) return prev;
                return { ...prev, [key]: !value };
            });
            toast({ title: "設定の更新に失敗しました", variant: "destructive" });
        }
    };

    // すべての通知タイプのキーを取得
    const allNotificationKeys = Object.keys(NOTIFICATION_TYPES);

    // プッシュ通知をすべてオン/オフ
    const toggleAllPushSettings = async (value: boolean) => {
        if (!isPushSubscribed) return;

        // 楽観的更新
        const updates: Record<string, boolean> = {};
        allNotificationKeys.forEach(key => {
            updates[key] = value;
        });

        setPushSettings(prev => {
            if (!prev) return prev;
            return { ...prev, ...updates };
        });

        try {
            const res = await fetch("/api/push/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updates),
            });

            if (!res.ok) {
                throw new Error("Failed to update settings");
            }
        } catch (error) {
            console.error("Update all push settings error:", error);
            // ロールバック
            setPushSettings(prev => {
                if (!prev) return prev;
                const rollback: Record<string, boolean> = {};
                allNotificationKeys.forEach(key => {
                    rollback[key] = !value;
                });
                return { ...prev, ...rollback };
            });
            toast({ title: "設定の更新に失敗しました", variant: "destructive" });
        }
    };

    // LINE通知をすべてオン/オフ
    const toggleAllLineSettings = async (value: boolean) => {
        if (!isLineLinked) return;

        // 楽観的更新
        const updates: Record<string, boolean> = {};
        allNotificationKeys.forEach(key => {
            updates[key] = value;
        });

        setLineSettings(prev => {
            if (!prev) return prev;
            return { ...prev, ...updates };
        });

        try {
            const res = await fetch("/api/line/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updates),
            });

            if (!res.ok) {
                throw new Error("Failed to update settings");
            }
        } catch (error) {
            console.error("Update all LINE settings error:", error);
            // ロールバック
            setLineSettings(prev => {
                if (!prev) return prev;
                const rollback: Record<string, boolean> = {};
                allNotificationKeys.forEach(key => {
                    rollback[key] = !value;
                });
                return { ...prev, ...rollback };
            });
            toast({ title: "設定の更新に失敗しました", variant: "destructive" });
        }
    };

    // すべてオンかどうかをチェック
    const isAllPushOn = isPushSubscribed && allNotificationKeys.every(key => pushSettings?.[key] ?? true);
    const isAllLineOn = isLineLinked && allNotificationKeys.every(key => lineSettings?.[key] ?? true);

    // 通知の状態を表すテキスト
    const getStatusText = () => {
        const statuses: string[] = [];

        if (isPushSubscribed) {
            statuses.push("プッシュ");
        }
        if (isLineLinked && lineSettings?.enabled) {
            statuses.push("LINE");
        }

        if (statuses.length === 0) {
            return "オフ";
        }
        return statuses.join(" / ");
    };

    const isLoading = isPushLoading || isLineLoading;

    // シートの中身
    const renderSheetContent = () => {
        if (isLoading) {
            return (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
            );
        }

        return (
            <div className="flex flex-col h-full overflow-y-auto">
                {/* プッシュ通知の有効化セクション */}
                <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Bell className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                            <div>
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                    プッシュ通知
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {!isPushSupported
                                        ? "非対応ブラウザ"
                                        : pushPermission === "denied"
                                        ? "ブロック中"
                                        : isPushSubscribed
                                        ? "有効"
                                        : "無効"}
                                </p>
                            </div>
                        </div>
                        <Button
                            variant={isPushSubscribed ? "outline" : "default"}
                            size="sm"
                            onClick={togglePushSubscription}
                            disabled={!isPushSupported || isTogglingPush || pushPermission === "denied"}
                            className="min-w-[72px] text-xs"
                        >
                            {isTogglingPush ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : isPushSubscribed ? (
                                "無効にする"
                            ) : (
                                "有効にする"
                            )}
                        </Button>
                    </div>
                </div>

                {/* LINE連携セクション */}
                <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <MessageCircle className="h-5 w-5 text-[#00B900]" />
                            <div>
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                    LINE通知
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {isLineLinked ? "連携済み" : "未連携"}
                                </p>
                            </div>
                        </div>
                        {!isLineLinked && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.location.href = "/app/me/settings"}
                                className="text-xs"
                            >
                                LINE連携
                            </Button>
                        )}
                    </div>
                </div>

                {/* ヘッダー行 */}
                <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            通知項目
                        </span>
                        <div className="flex items-center gap-6">
                            <div className="w-12 flex flex-col items-center gap-1">
                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                    プッシュ
                                </span>
                                <button
                                    type="button"
                                    onClick={() => toggleAllPushSettings(!isAllPushOn)}
                                    disabled={!isPushSubscribed}
                                    className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline disabled:text-gray-400 disabled:no-underline disabled:cursor-not-allowed"
                                >
                                    {isAllPushOn ? "全オフ" : "全オン"}
                                </button>
                            </div>
                            <div className="w-12 flex flex-col items-center gap-1">
                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                    LINE
                                </span>
                                <button
                                    type="button"
                                    onClick={() => toggleAllLineSettings(!isAllLineOn)}
                                    disabled={!isLineLinked}
                                    className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline disabled:text-gray-400 disabled:no-underline disabled:cursor-not-allowed"
                                >
                                    {isAllLineOn ? "全オフ" : "全オン"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* カテゴリ別の通知設定 */}
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {CATEGORIES.map((category) => {
                        const typesInCategory = Object.entries(NOTIFICATION_TYPES).filter(
                            ([, value]) => value.category === category
                        );

                        if (typesInCategory.length === 0) return null;

                        return (
                            <div key={category}>
                                <div className="px-4 py-2 bg-gray-100 dark:bg-gray-800">
                                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                        {category}
                                    </span>
                                </div>
                                {typesInCategory.map(([key, value]) => (
                                    <div
                                        key={key}
                                        className="px-4 py-3 flex items-center justify-between"
                                    >
                                        <span className="text-sm text-gray-700 dark:text-gray-300">
                                            {value.label}
                                        </span>
                                        <div className="flex items-center gap-6">
                                            {/* プッシュ通知チェックボックス */}
                                            <div className="w-12 flex justify-center">
                                                <Checkbox
                                                    id={`push-${key}`}
                                                    checked={isPushSubscribed && (pushSettings?.[key] ?? true)}
                                                    onCheckedChange={(checked) => updatePushSetting(key, !!checked)}
                                                    disabled={!isPushSubscribed}
                                                    className="h-5 w-5"
                                                />
                                            </div>
                                            {/* LINE通知チェックボックス */}
                                            <div className="w-12 flex justify-center">
                                                <Checkbox
                                                    id={`line-${key}`}
                                                    checked={isLineLinked && (lineSettings?.[key] ?? true)}
                                                    onCheckedChange={(checked) => updateLineSetting(key, !!checked)}
                                                    disabled={!isLineLinked}
                                                    className="h-5 w-5"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <Sheet>
            <SheetTrigger asChild>
                <button
                    type="button"
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                    <div className="flex items-center space-x-4">
                        <div className="bg-yellow-100 dark:bg-yellow-900 p-2 rounded-md">
                            <Bell className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">通知設定</span>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col bg-white dark:bg-gray-900 gap-0">
                <SheetHeader className="relative px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 mb-0 gap-0">
                    <SheetClose asChild>
                        <button
                            type="button"
                            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        </button>
                    </SheetClose>
                    <SheetTitle className="text-base font-semibold text-gray-900 dark:text-white text-center">
                        通知設定
                    </SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-hidden">
                    {renderSheetContent()}
                </div>
            </SheetContent>
        </Sheet>
    );
}
