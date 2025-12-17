"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Plus, Sparkles, ArrowRight, X, MapIcon, ChevronLeft, ChevronRight, CalendarIcon, Clock, Navigation, ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import { PickupModal } from "./pickup-modal";
import { AIModal } from "./ai-modal";
import { AttendanceModal } from "../attendance/attendance-modal";
import {
    addPassengerToRoute,
    removePassengerFromRoute,
    updatePassengerOrder,
    calculateRouteDuration,
    type PickupRouteWithPassengers,
    type TodayAttendee,
    type RouteCalculationResult,
} from "./actions";

// 便ごとに完全に異なる色（一瞬で見分けがつくように）
const tripColorPalette = [
    "#3B82F6",  // 青
    "#F97316",  // オレンジ
    "#10B981",  // 緑
    "#EC4899",  // ピンク
    "#8B5CF6",  // 紫
    "#EAB308",  // 黄
    "#EF4444",  // 赤
    "#06B6D4",  // シアン
    "#84CC16",  // ライム
    "#D946EF",  // フクシア
    "#14B8A6",  // ティール
    "#F43F5E",  // ローズ
];

// 色を少し薄くしたバージョン（背景用）
const getTripColorLight = (hexColor: string) => {
    // HEX to RGB
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    // 薄い色（透明度20%相当）
    return `rgba(${r}, ${g}, ${b}, 0.15)`;
};

// ルートインデックスと便番号から一意の色を取得
const getRouteTripsColor = (routeIndex: number, tripNumber: number | null) => {
    const trip = tripNumber ?? 1;
    // 各ルートの各便に一意の色を割り当てる
    // routeIndex * 4 で各ルートに4色ずつ確保し、tripNumber-1で便ごとにオフセット
    const colorIndex = (routeIndex * 4 + (trip - 1)) % tripColorPalette.length;
    return tripColorPalette[colorIndex];
};

// ルートカードコンポーネント
function RouteCard({
    route,
    routeIndex,
    isProcessing,
    onRemovePassenger,
    onOpenModal,
    storeAddress,
    onOrderUpdated,
}: {
    route: PickupRouteWithPassengers;
    routeIndex: number;
    isProcessing: boolean;
    onRemovePassenger: (routeId: string, castProfileId: string) => void;
    onOpenModal: (route: PickupRouteWithPassengers) => void;
    storeAddress?: string;
    onOrderUpdated: () => void;
}) {
    // 便ごとの所要時間情報
    const [tripInfoMap, setTripInfoMap] = useState<Record<number, RouteCalculationResult | null>>({});
    const [isCalculating, setIsCalculating] = useState(false);

    // ローカルの乗客リスト（アニメーション用）
    const [localPassengers, setLocalPassengers] = useState(route.passengers);
    const [animatingPassengerId, setAnimatingPassengerId] = useState<string | null>(null);
    const [animationDirection, setAnimationDirection] = useState<"up" | "down" | null>(null);
    const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);

    // 削除確認モーダル
    const [deleteTarget, setDeleteTarget] = useState<{
        castProfileId: string;
        castName: string;
    } | null>(null);

    // route.passengers が変更されたらローカルを更新
    useEffect(() => {
        setLocalPassengers(route.passengers);
    }, [route.passengers]);

    // 便の数を取得（表示用にローカル状態を使用）
    const tripNumbers = [...new Set(localPassengers.map((p) => p.trip_number))].sort((a, b) => a - b);

    // 各便の所要時間を順番に計算（前の便の帰還時刻を次の便の出発時刻として使用）
    useEffect(() => {
        const calculateAllTrips = async () => {
            if (!storeAddress || route.passengers.length === 0) {
                setTripInfoMap({});
                return;
            }

            setIsCalculating(true);
            const newTripInfoMap: Record<number, RouteCalculationResult | null> = {};
            let previousArrivalTimestamp: number | undefined = undefined;

            // 便を順番に計算（前の便の帰還時刻が次の便の出発時刻になる）
            for (const tripNumber of tripNumbers) {
                const tripPassengers = route.passengers
                    .filter((p) => p.trip_number === tripNumber && p.pickup_destination)
                    .sort((a, b) => a.order_index - b.order_index);

                if (tripPassengers.length === 0) {
                    newTripInfoMap[tripNumber] = null;
                    continue;
                }

                const destinations = tripPassengers
                    .map((p) => p.pickup_destination)
                    .filter((d): d is string => !!d);

                if (destinations.length === 0) {
                    newTripInfoMap[tripNumber] = null;
                    continue;
                }

                try {
                    // 1便目はdeparture_time
                    // 2便目以降は return_departure_time が設定されていればそれを使用、
                    // なければ前の便の帰還時刻を使用
                    let departureTimestampForTrip: number | undefined = undefined;
                    let departureTimeForTrip: string | null = null;

                    if (tripNumber === 1) {
                        departureTimeForTrip = route.departure_time;
                    } else if (route.return_departure_time) {
                        // カスタム戻り便出発時間が設定されている
                        departureTimeForTrip = route.return_departure_time;
                    } else {
                        // デフォルト: 前の便の帰還時刻を使用
                        departureTimestampForTrip = previousArrivalTimestamp;
                    }

                    const result = await calculateRouteDuration(
                        storeAddress,
                        destinations,
                        departureTimeForTrip,
                        route.avoid_highways,
                        route.avoid_tolls,
                        departureTimestampForTrip
                    );
                    newTripInfoMap[tripNumber] = result;

                    // 次の便のために帰還時刻を保存
                    if (result?.arrivalTimestamp) {
                        previousArrivalTimestamp = result.arrivalTimestamp;
                    }
                } catch (error) {
                    console.error(`Error calculating route for trip ${tripNumber}:`, error);
                    newTripInfoMap[tripNumber] = null;
                }
            }

            setTripInfoMap(newTripInfoMap);
            setIsCalculating(false);
        };

        calculateAllTrips();
    }, [
        storeAddress,
        route.passengers,
        route.departure_time,
        route.return_departure_time,
        route.avoid_highways,
        route.avoid_tolls,
    ]);

    // 1便目の情報（ヘッダー表示用）
    const routeInfo = tripInfoMap[1] || null;

    // 時間をフォーマット（分→時間:分）
    const formatDuration = (minutes: number) => {
        if (minutes < 60) return `${minutes}分`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}時間${mins}分` : `${hours}時間`;
    };

    // Google Mapsで経路を開く（便ごと）
    const openTripInMaps = (e: React.MouseEvent, tripNumber: number) => {
        e.stopPropagation();

        if (!storeAddress) return;

        // 指定した便の送迎先を順番通りに取得
        const tripPassengers = route.passengers
            .filter((p) => p.trip_number === tripNumber && p.pickup_destination)
            .sort((a, b) => a.order_index - b.order_index);

        if (tripPassengers.length === 0) return;

        const destinations = tripPassengers
            .map((p) => p.pickup_destination)
            .filter((d): d is string => !!d);

        if (destinations.length === 0) return;

        // Google Maps URLを構築
        const origin = encodeURIComponent(storeAddress);
        const destination = encodeURIComponent(destinations[destinations.length - 1]);

        // 経由地（最後の目的地以外）
        const waypoints = destinations.slice(0, -1).map((d) => encodeURIComponent(d)).join("|");

        // avoid パラメータ
        const avoidParams: string[] = [];
        if (route.avoid_highways) avoidParams.push("highways");
        if (route.avoid_tolls) avoidParams.push("tolls");

        let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;

        if (waypoints) {
            url += `&waypoints=${waypoints}`;
        }

        if (avoidParams.length > 0) {
            url += `&avoid=${avoidParams.join(",")}`;
        }

        // 新しいウィンドウ/アプリで開く
        window.open(url, "_blank");
    };

    // 同じ便内での順番変更
    const handleMovePassenger = async (
        e: React.MouseEvent,
        passenger: typeof route.passengers[0],
        direction: "up" | "down",
        tripPassengers: typeof route.passengers
    ) => {
        e.stopPropagation();
        if (isUpdatingOrder || isProcessing) return;

        const currentIndex = tripPassengers.findIndex(
            (p) => p.cast_profile_id === passenger.cast_profile_id
        );
        const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

        if (newIndex < 0 || newIndex >= tripPassengers.length) return;

        // アニメーション開始
        setAnimatingPassengerId(passenger.cast_profile_id);
        setAnimationDirection(direction);

        // アニメーション待機
        await new Promise((resolve) => setTimeout(resolve, 150));

        // ローカルで順番を入れ替え
        const newTripPassengers = [...tripPassengers];
        [newTripPassengers[currentIndex], newTripPassengers[newIndex]] = [
            newTripPassengers[newIndex],
            newTripPassengers[currentIndex],
        ];

        // order_index を更新
        const updatedTripPassengers = newTripPassengers.map((p, idx) => ({
            ...p,
            order_index: idx,
        }));

        // ローカルの乗客リストを更新
        const newLocalPassengers = localPassengers.map((p) => {
            const updated = updatedTripPassengers.find(
                (up) => up.cast_profile_id === p.cast_profile_id
            );
            return updated || p;
        });
        setLocalPassengers(newLocalPassengers);

        // アニメーション終了
        setAnimatingPassengerId(null);
        setAnimationDirection(null);

        // サーバーに保存
        setIsUpdatingOrder(true);
        try {
            await updatePassengerOrder(
                route.id,
                newLocalPassengers.map((p) => ({
                    cast_profile_id: p.cast_profile_id,
                    order_index: p.order_index,
                }))
            );
            onOrderUpdated();
        } catch (error) {
            console.error("Error updating order:", error);
            // エラー時は元に戻す
            setLocalPassengers(route.passengers);
        } finally {
            setIsUpdatingOrder(false);
        }
    };

    // 乗客を削除（楽観的UI更新）
    const handleDeletePassenger = async () => {
        if (!deleteTarget) return;

        // 即座にUIを更新（楽観的更新）
        setLocalPassengers((prev) =>
            prev.filter((p) => p.cast_profile_id !== deleteTarget.castProfileId)
        );
        setDeleteTarget(null);

        // バックグラウンドでサーバーに保存
        try {
            await onRemovePassenger(route.id, deleteTarget.castProfileId);
        } catch (error) {
            console.error("Error removing passenger:", error);
            // エラー時は元に戻す
            setLocalPassengers(route.passengers);
        }
    };

    return (
        <>
        <div
            className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 pt-3 pb-2 px-2 cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
            onClick={() => onOpenModal(route)}
        >
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs">
                        {localPassengers.length}
                    </span>
                    {route.driver_name || `ルート${routeIndex + 1}`}
                </h3>
                {/* 全便合計の所要時間表示 */}
                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                    {isCalculating ? (
                        <span className="text-gray-400">計算中...</span>
                    ) : route.passengers.length > 0 ? (
                        (() => {
                            // 全便の合計時間を計算（送迎時間 + 戻り時間）
                            const totalMinutes = Object.values(tripInfoMap).reduce((sum, info) => {
                                if (!info) return sum;
                                return sum + info.totalDurationMinutes + (info.returnDurationMinutes || 0);
                            }, 0);
                            return totalMinutes > 0 ? (
                                <span className="text-gray-600 dark:text-gray-400 font-medium">
                                    合計 {formatDuration(totalMinutes)}
                                </span>
                            ) : (
                                <span className="text-gray-400">-</span>
                            );
                        })()
                    ) : null}
                </div>
            </div>
            <div className="space-y-3">
                {localPassengers.length === 0 ? (
                    <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">
                        乗車者なし
                    </p>
                ) : (
                    // 便ごとにグループ化して表示（タイムライン形式）
                    tripNumbers.map((tripNumber) => {
                        const tripPassengers = localPassengers
                            .filter((p) => p.trip_number === tripNumber)
                            .sort((a, b) => a.order_index - b.order_index);
                        const tripInfo = tripInfoMap[tripNumber];
                        const isReturnTrip = tripNumber > 1;

                        // 店舗帰還時刻を計算
                        const storeReturnTime = tripInfo?.arrivalTimestamp
                            ? new Date(tripInfo.arrivalTimestamp).toLocaleTimeString("ja-JP", {
                                timeZone: "Asia/Tokyo",
                                hour: "2-digit",
                                minute: "2-digit",
                            })
                            : null;

                        // 出発時刻を計算
                        let tripDepartureTime: string | null = null;
                        if (tripNumber === 1) {
                            tripDepartureTime = route.departure_time?.slice(0, 5) || null;
                        } else if (route.return_departure_time) {
                            // カスタム戻り便出発時間が設定されている
                            tripDepartureTime = route.return_departure_time.slice(0, 5);
                        } else if (tripInfo?.departureTimestamp) {
                            // デフォルト: 計算された出発時刻を表示
                            tripDepartureTime = new Date(tripInfo.departureTimestamp).toLocaleTimeString("ja-JP", {
                                timeZone: "Asia/Tokyo",
                                hour: "2-digit",
                                minute: "2-digit",
                            });
                        }

                        if (tripPassengers.length === 0) return null;

                        // この便の色を取得
                        const tripColor = getRouteTripsColor(routeIndex, tripNumber);
                        const tripColorLight = getTripColorLight(tripColor);
                        const tripLabel = tripNumber === 1 ? "出発便" : "戻り便";
                        const canOpenThisTripInMaps = storeAddress && tripPassengers.some(p => p.pickup_destination);
                        // この便の所要時間（送迎 + 戻り）
                        const tripTotalMinutes = tripInfo
                            ? tripInfo.totalDurationMinutes + (tripInfo.returnDurationMinutes || 0)
                            : 0;

                        return (
                            <div key={tripNumber} className="relative">
                                {/* 便ラベル */}
                                <div className="flex items-center gap-2 mb-1">
                                    <span
                                        className="text-xs font-semibold px-1.5 py-0.5 rounded"
                                        style={{ backgroundColor: tripColorLight, color: tripColor }}
                                    >
                                        {tripLabel}
                                    </span>
                                    {tripTotalMinutes > 0 && (
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {formatDuration(tripTotalMinutes)}
                                        </span>
                                    )}
                                </div>

                                {/* タイムライン */}
                                <div className="relative pl-[60px]">
                                    {/* 縦線 */}
                                    <div
                                        className="absolute left-[51px] top-2 bottom-2 w-0.5 opacity-50"
                                        style={{ backgroundColor: tripColor }}
                                    />

                                    {/* 出発（店舗） */}
                                    <div className="relative flex items-center py-1">
                                        <span
                                            className="absolute left-[-60px] w-10 text-right text-xs font-semibold"
                                            style={{ color: tripColor }}
                                        >
                                            {tripDepartureTime || ""}
                                        </span>
                                        <div
                                            className="absolute left-[-14px] w-3 h-3 rounded-full border-2 bg-white dark:bg-gray-900"
                                            style={{ borderColor: tripColor }}
                                        />
                                        <span className="text-xs font-medium text-gray-900 dark:text-white">店舗出発</span>
                                    </div>

                                    {/* 乗客リスト */}
                                    {tripPassengers.map((passenger, passengerIndex) => {
                                        const arrivalInfo = tripInfo?.estimatedArrivalTimes.find(
                                            (a) => a.destination === passenger.pickup_destination
                                        );
                                        const isAnimating = animatingPassengerId === passenger.cast_profile_id;
                                        const isFirst = passengerIndex === 0;
                                        const isLast = passengerIndex === tripPassengers.length - 1;

                                        return (
                                            <div
                                                key={passenger.id}
                                                className={`relative flex items-center py-1 transition-all duration-200 ${
                                                    isAnimating && animationDirection === "up"
                                                        ? "-translate-y-full opacity-0"
                                                        : isAnimating && animationDirection === "down"
                                                        ? "translate-y-full opacity-0"
                                                        : ""
                                                }`}
                                            >
                                                {/* 到着時刻 */}
                                                <span className="absolute left-[-60px] w-10 text-right text-xs font-medium text-green-600 dark:text-green-400">
                                                    {arrivalInfo?.arrivalTime || ""}
                                                </span>
                                                {/* ドット */}
                                                <div
                                                    className="absolute left-[-12px] w-2 h-2 rounded-full"
                                                    style={{ backgroundColor: tripColor }}
                                                />
                                                {/* 名前と住所（1行で省略） */}
                                                <div className="flex-1 min-w-0 flex items-center overflow-hidden">
                                                    <span className="text-sm text-gray-900 dark:text-white shrink-0">
                                                        {passenger.cast_name}
                                                    </span>
                                                    <span className="text-xs text-gray-400 dark:text-gray-500 ml-2 truncate">
                                                        {passenger.pickup_destination}
                                                    </span>
                                                </div>
                                                {/* 上下ボタン + 削除ボタン（常時表示） */}
                                                <div className="flex items-center gap-0.5 shrink-0 ml-1">
                                                    {/* 上ボタン */}
                                                    <button
                                                        type="button"
                                                        onClick={(e) => handleMovePassenger(e, passenger, "up", tripPassengers)}
                                                        disabled={isFirst || isUpdatingOrder || isProcessing}
                                                        className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                                    >
                                                        <ChevronUp className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                                    </button>
                                                    {/* 下ボタン */}
                                                    <button
                                                        type="button"
                                                        onClick={(e) => handleMovePassenger(e, passenger, "down", tripPassengers)}
                                                        disabled={isLast || isUpdatingOrder || isProcessing}
                                                        className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                                    >
                                                        <ChevronDown className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                                    </button>
                                                    {/* 削除ボタン */}
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setDeleteTarget({
                                                                castProfileId: passenger.cast_profile_id,
                                                                castName: passenger.cast_name,
                                                            });
                                                        }}
                                                        disabled={isProcessing}
                                                        className="p-0.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                    >
                                                        <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-500 dark:hover:text-red-400" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* 店舗着 */}
                                    <div className="relative flex items-center py-1">
                                        <span
                                            className="absolute left-[-60px] w-10 text-right text-xs font-semibold"
                                            style={{ color: tripColor }}
                                        >
                                            {tripDepartureTime ? (storeReturnTime || (isCalculating ? "..." : "")) : ""}
                                        </span>
                                        <div
                                            className="absolute left-[-14px] w-3 h-3 rounded-full border-2 bg-white dark:bg-gray-900"
                                            style={{ borderColor: tripColor }}
                                        />
                                        <span className="text-xs font-medium text-gray-900 dark:text-white">店舗着</span>
                                    </div>
                                </div>

                                {/* この便をマップで表示 */}
                                {canOpenThisTripInMaps && (
                                    <button
                                        type="button"
                                        onClick={(e) => openTripInMaps(e, tripNumber)}
                                        className="w-full mt-1.5 flex items-center justify-center gap-1 py-1 rounded-lg text-xs font-medium transition-colors"
                                        style={{
                                            backgroundColor: tripColorLight,
                                            color: tripColor,
                                        }}
                                    >
                                        <Navigation className="h-3 w-3" />
                                        マップで表示
                                    </button>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>

        {/* 削除確認モーダル */}
        <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
            <DialogContent className="max-w-sm rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="text-gray-900 dark:text-white">
                        未決定に戻す
                    </DialogTitle>
                    <DialogDescription className="text-gray-600 dark:text-gray-400">
                        {deleteTarget?.castName}をこのルートから削除しますか？
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setDeleteTarget(null)}
                        className="flex-1 rounded-lg"
                    >
                        キャンセル
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleDeletePassenger}
                        className="flex-1 rounded-lg"
                    >
                        削除
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        </>
    );
}

interface PickupClientProps {
    initialRoutes: PickupRouteWithPassengers[];
    initialAttendees: TodayAttendee[];
    staffProfiles: { id: string; display_name: string; display_name_kana: string | null; role: string }[];
    allProfiles: { id: string; display_name: string | null; real_name: string | null; role: string }[];
    currentProfileId: string;
    initialDate: string;
    storeId: string;
    storeAddress?: string;
    canEdit?: boolean;
    daySwitchTime?: string;
}

export function PickupClient({
    initialRoutes,
    initialAttendees,
    staffProfiles,
    allProfiles,
    currentProfileId,
    initialDate,
    storeId,
    storeAddress,
    canEdit = false,
    daySwitchTime = "05:00",
}: PickupClientProps) {
    const router = useRouter();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAIModalOpen, setIsAIModalOpen] = useState(false);
    const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
    const [editingRoute, setEditingRoute] = useState<PickupRouteWithPassengers | null>(null);

    // カレンダー用のstate
    const initialDateObj = new Date(initialDate);
    const [calendarYear, setCalendarYear] = useState(initialDateObj.getFullYear());
    const [calendarMonth, setCalendarMonth] = useState(initialDateObj.getMonth());
    const [isProcessing, setIsProcessing] = useState(false);

    const handleOpenModal = (route?: PickupRouteWithPassengers) => {
        setEditingRoute(route || null);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingRoute(null);
    };

    // 送迎先が設定されているキャストだけをフィルタ
    const attendeesWithDestination = initialAttendees.filter(
        (a) => a.pickup_destination
    );

    // ルートに割り当てられていないキャストを取得
    const assignedCastIds = new Set(
        initialRoutes.flatMap((r) => r.passengers.map((p) => p.cast_profile_id))
    );
    const unassignedAttendees = attendeesWithDestination.filter(
        (a) => !assignedCastIds.has(a.profile_id)
    );

    // キャストをルートに追加
    const handleAddToRoute = async (routeId: string, castProfileId: string) => {
        setIsProcessing(true);
        try {
            await addPassengerToRoute(routeId, castProfileId);
            router.refresh();
        } catch (error) {
            console.error("Error adding to route:", error);
        } finally {
            setIsProcessing(false);
        }
    };

    // キャストをルートから削除
    const handleRemoveFromRoute = async (routeId: string, castProfileId: string) => {
        setIsProcessing(true);
        try {
            await removePassengerFromRoute(routeId, castProfileId);
            router.refresh();
        } catch (error) {
            console.error("Error removing from route:", error);
        } finally {
            setIsProcessing(false);
        }
    };

    // 日付ナビゲーション
    const handleDateChange = (offset: number) => {
        const currentDate = new Date(initialDate);
        currentDate.setDate(currentDate.getDate() + offset);
        const newDate = currentDate.toLocaleDateString("ja-JP", {
            timeZone: "Asia/Tokyo",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        }).replace(/\//g, "-");
        router.push(`/app/pickup?date=${newDate}`);
    };

    // カレンダーから日付を選択
    const handleCalendarSelect = (year: number, month: number, day: number) => {
        const m = String(month + 1).padStart(2, "0");
        const d = String(day).padStart(2, "0");
        const newDate = `${year}-${m}-${d}`;
        router.push(`/app/pickup?date=${newDate}`);
    };

    // カレンダーの月を移動
    const goToPreviousMonth = () => {
        if (calendarMonth === 0) {
            setCalendarYear(calendarYear - 1);
            setCalendarMonth(11);
        } else {
            setCalendarMonth(calendarMonth - 1);
        }
    };

    const goToNextMonth = () => {
        if (calendarMonth === 11) {
            setCalendarYear(calendarYear + 1);
            setCalendarMonth(0);
        } else {
            setCalendarMonth(calendarMonth + 1);
        }
    };

    // カレンダーの日付グリッドを生成
    const getCalendarDays = () => {
        const firstDayOfMonth = new Date(calendarYear, calendarMonth, 1);
        const lastDayOfMonth = new Date(calendarYear, calendarMonth + 1, 0);
        const daysInMonth = lastDayOfMonth.getDate();
        const startingDayOfWeek = firstDayOfMonth.getDay();

        const days: (number | null)[] = [];
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null);
        }
        for (let day = 1; day <= daysInMonth; day++) {
            days.push(day);
        }
        return days;
    };

    const weekDays = ["日", "月", "火", "水", "木", "金", "土"];

    // 店舗の日付切り替え時間を考慮した今日の営業日を計算
    const getTodayBusinessDate = () => {
        const now = new Date();
        const jstDate = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
        const currentHour = jstDate.getHours();
        const currentMinute = jstDate.getMinutes();

        const parts = daySwitchTime.split(":");
        const switchHour = parseInt(parts[0], 10) || 5;
        const switchMinute = parseInt(parts[1], 10) || 0;

        // 現在時刻が切り替え時間より前の場合は前日の営業日
        if (currentHour < switchHour || (currentHour === switchHour && currentMinute < switchMinute)) {
            jstDate.setDate(jstDate.getDate() - 1);
        }

        return jstDate.toLocaleDateString("ja-JP", {
            timeZone: "Asia/Tokyo",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        }).replace(/\//g, "-");
    };

    // 日付のフォーマット（表示用）
    const formatDisplayDate = (dateStr: string) => {
        const todayBusinessDate = getTodayBusinessDate();
        if (dateStr === todayBusinessDate) {
            return "今日";
        }
        const date = new Date(dateStr);
        const dayOfWeek = ["日", "月", "火", "水", "木", "金", "土"][date.getDay()];
        return `${date.getMonth() + 1}/${date.getDate()}（${dayOfWeek}）`;
    };

    return (
        <>
            {/* Header with buttons */}
            <div className="flex items-center justify-between mb-4">
                {/* マップ表示ボタン */}
                <Link href={`/app/pickup/map${initialDate ? `?date=${initialDate}` : ""}`}>
                    <Button
                        variant="outline"
                        className="rounded-full px-4 h-10 bg-white dark:bg-gray-800 border-none shadow-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                        <MapIcon className="h-4 w-4 mr-2" />
                        マップ
                    </Button>
                </Link>

                {canEdit && (
                    <div className="flex items-center gap-2">
                        <Button
                            className="h-10 rounded-full px-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 border-none shadow-md transition-all hover:scale-105 active:scale-95"
                            onClick={() => setIsAIModalOpen(true)}
                        >
                            <Sparkles className="h-5 w-5" />
                            <span className="ml-1.5 text-sm font-semibold">ルート提案</span>
                        </Button>
                        <Button
                            size="icon"
                            className="h-10 w-10 rounded-full bg-blue-600 text-white hover:bg-blue-700 border-none shadow-md transition-all hover:scale-105 active:scale-95"
                            onClick={() => handleOpenModal()}
                        >
                            <Plus className="h-5 w-5" />
                        </Button>
                    </div>
                )}
            </div>

            {/* 日付ナビゲーション */}
            <div className="flex items-center justify-center gap-2 mb-4">
                <button
                    type="button"
                    onClick={() => handleDateChange(-1)}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                    <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </button>
                <Popover>
                    <PopoverTrigger asChild>
                        <button
                            type="button"
                            className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            <span className="text-lg font-semibold text-gray-900 dark:text-white">
                                {formatDisplayDate(initialDate)}
                            </span>
                            <CalendarIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                        </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-0" align="center">
                        <div className="bg-white dark:bg-gray-900 rounded-xl overflow-hidden">
                            {/* カレンダーヘッダー */}
                            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                                <button
                                    type="button"
                                    onClick={goToPreviousMonth}
                                    className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                >
                                    <ChevronLeft className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                </button>
                                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                    {calendarYear}年{calendarMonth + 1}月
                                </span>
                                <button
                                    type="button"
                                    onClick={goToNextMonth}
                                    className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                >
                                    <ChevronRight className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                </button>
                            </div>
                            {/* 曜日ヘッダー */}
                            <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
                                {weekDays.map((day, idx) => (
                                    <div
                                        key={day}
                                        className={`py-1.5 text-center text-xs font-medium ${
                                            idx === 0
                                                ? "text-red-500"
                                                : idx === 6
                                                ? "text-blue-500"
                                                : "text-gray-500 dark:text-gray-400"
                                        }`}
                                    >
                                        {day}
                                    </div>
                                ))}
                            </div>
                            {/* 日付グリッド */}
                            <div className="grid grid-cols-7 p-1">
                                {getCalendarDays().map((day, index) => {
                                    if (day === null) {
                                        return <div key={`empty-${index}`} className="h-8" />;
                                    }
                                    const m = String(calendarMonth + 1).padStart(2, "0");
                                    const d = String(day).padStart(2, "0");
                                    const dateKey = `${calendarYear}-${m}-${d}`;
                                    const isSelected = dateKey === initialDate;
                                    const isToday = dateKey === getTodayBusinessDate();
                                    const dayOfWeek = (new Date(calendarYear, calendarMonth, 1).getDay() + day - 1) % 7;
                                    const isSunday = dayOfWeek === 0;
                                    const isSaturday = dayOfWeek === 6;

                                    return (
                                        <button
                                            key={dateKey}
                                            type="button"
                                            onClick={() => handleCalendarSelect(calendarYear, calendarMonth, day)}
                                            className={`h-8 w-8 mx-auto rounded-full text-sm font-medium transition-colors ${
                                                isSelected
                                                    ? "bg-blue-600 text-white"
                                                    : isToday
                                                    ? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300"
                                                    : isSunday
                                                    ? "text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                                                    : isSaturday
                                                    ? "text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                                                    : "text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                                            }`}
                                        >
                                            {day}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>
                <button
                    type="button"
                    onClick={() => handleDateChange(1)}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                    <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </button>
            </div>

            {/* Content - 縦1列レイアウト */}
            <div className="space-y-2">
                {/* 未決定 */}
                <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 pt-3 pb-2 px-2">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                        <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-300 text-xs">
                            {unassignedAttendees.length}
                        </span>
                        未決定
                    </h3>
                    <div className="space-y-1.5">
                        {unassignedAttendees.length === 0 ? (
                            <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">
                                なし
                            </p>
                        ) : (
                            unassignedAttendees.map((attendee) => (
                                <Popover key={attendee.profile_id}>
                                    <PopoverTrigger asChild>
                                        <button
                                            type="button"
                                            disabled={isProcessing}
                                            className="w-full bg-gray-50 dark:bg-gray-800 rounded-lg px-2 py-1.5 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                                        >
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <span className="text-sm text-gray-900 dark:text-white shrink-0">
                                                    {attendee.display_name}
                                                </span>
                                                <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                    {attendee.pickup_destination}
                                                </span>
                                            </div>
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-48 p-1" align="start">
                                        <p className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1">
                                            ルートに追加
                                        </p>
                                        {initialRoutes.length === 0 ? (
                                            <p className="text-xs text-gray-400 px-2 py-2">
                                                ルートがありません
                                            </p>
                                        ) : (
                                            initialRoutes.map((route, idx) => (
                                                <button
                                                    key={route.id}
                                                    type="button"
                                                    onClick={() => handleAddToRoute(route.id, attendee.profile_id)}
                                                    disabled={isProcessing}
                                                    className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                                                >
                                                    <ArrowRight className="h-3 w-3 text-gray-400" />
                                                    {route.driver_name || `ルート${idx + 1}`}
                                                </button>
                                            ))
                                        )}
                                    </PopoverContent>
                                </Popover>
                            ))
                        )}
                    </div>
                </div>

                {/* ルートカード */}
                {initialRoutes.map((route) => (
                    <RouteCard
                        key={route.id}
                        route={route}
                        routeIndex={initialRoutes.indexOf(route)}
                        isProcessing={isProcessing}
                        onRemovePassenger={handleRemoveFromRoute}
                        onOpenModal={handleOpenModal}
                        storeAddress={storeAddress}
                        onOrderUpdated={() => router.refresh()}
                    />
                ))}
            </div>

            {/* Modals */}
            <PickupModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                editingRoute={editingRoute}
                allRoutes={initialRoutes}
                attendees={initialAttendees}
                staffProfiles={staffProfiles}
                storeId={storeId}
                date={initialDate}
            />

            <AIModal
                isOpen={isAIModalOpen}
                onClose={() => setIsAIModalOpen(false)}
                onOpenCreateRoute={() => {
                    setIsAIModalOpen(false);
                    handleOpenModal();
                }}
                onOpenAddAttendance={() => {
                    setIsAttendanceModalOpen(true);
                }}
                routes={initialRoutes}
                attendees={initialAttendees}
                staffProfiles={staffProfiles}
                storeId={storeId}
                date={initialDate}
                storeAddress={storeAddress}
            />

            <AttendanceModal
                isOpen={isAttendanceModalOpen}
                onClose={() => setIsAttendanceModalOpen(false)}
                profiles={allProfiles}
                currentProfileId={currentProfileId}
                defaultRole="cast"
                initialData={{
                    date: initialDate,
                }}
                onSaved={() => {
                    setIsAttendanceModalOpen(false);
                    router.refresh();
                }}
            />
        </>
    );
}
