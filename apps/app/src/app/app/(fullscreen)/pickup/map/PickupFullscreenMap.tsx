"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
    APIProvider,
    Map,
    AdvancedMarker,
    useMap,
    useMapsLibrary,
} from "@vis.gl/react-google-maps";
import { Loader2, Star, ArrowRight, Trash2, MapPin, ChevronLeft, Sparkles, Plus, X, ChevronUp, ChevronDown, Clock, Navigation } from "lucide-react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { PickupRouteWithPassengers, StoreLocation, TodayAttendee, RouteCalculationResult } from "@/app/app/(main)/pickup/actions";
import { addPassengerToRoute, removePassengerFromRoute, clearPickupDestination, updatePassengerOrder, calculateRouteDuration } from "@/app/app/(main)/pickup/actions";
import { AIModal } from "@/app/app/(main)/pickup/ai-modal";
import { PickupModal } from "@/app/app/(main)/pickup/pickup-modal";
import { AttendanceModal } from "@/app/app/(main)/attendance/attendance-modal";

interface PickupFullscreenMapProps {
    routes: PickupRouteWithPassengers[];
    storeLocation: StoreLocation;
    attendees: TodayAttendee[];
    allAttendees: TodayAttendee[];
    staffProfiles: { id: string; display_name: string; display_name_kana: string | null; role: string }[];
    allProfiles: { id: string; display_name: string | null; real_name: string | null; role: string }[];
    currentProfileId: string;
    storeId: string;
    storeAddress?: string;
    date: string;
    canEdit?: boolean;
    daySwitchTime?: string;
}

const defaultCenter = {
    lat: 35.6812,
    lng: 139.7671,
};

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

// 互換性のため残す
const routeColors = tripColorPalette;

// ルートインデックスと便番号から一意の色を取得
// 各便に異なる色を割り当て（ルート0の1便、ルート0の2便、ルート1の1便...）
const getRouteTripsColor = (routeIndex: number, tripNumber: number | null) => {
    const trip = tripNumber ?? 1;
    // ルートごとに最大4便まで想定し、一意のインデックスを計算
    const colorIndex = (routeIndex * 4 + (trip - 1)) % tripColorPalette.length;
    return tripColorPalette[colorIndex];
};

// 便番号のみから色を取得（後方互換性用、デフォルトはルート0）
const getTripColor = (tripNumber: number | null) => {
    return getRouteTripsColor(0, tripNumber);
};

// 色を少し薄くしたバージョン（背景用）
const getTripColorLight = (hexColor: string) => {
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, 0.15)`;
};

const unassignedColor = "#6B7280";

interface GeocodedAttendee {
    profileId: string;
    destination: string;
    lat: number;
    lng: number;
    displayName: string;
    routeIndex: number | null;
    routeId: string | null;
    tripNumber: number | null;
}

// ルート描画コンポーネント（店舗スタート、便ごとに描画）
function DirectionsPolyline({
    geocodedAttendees,
    routeIndex,
    tripNumber,
    color,
    storePosition,
}: {
    geocodedAttendees: GeocodedAttendee[];
    routeIndex: number;
    tripNumber?: number;
    color: string;
    storePosition: { lat: number; lng: number } | null;
}) {
    const map = useMap();
    const routesLibrary = useMapsLibrary("routes");
    const polylineRef = useRef<google.maps.Polyline | null>(null);

    useEffect(() => {
        if (!map || !routesLibrary || !storePosition) return;

        // 指定された便のみをフィルタリング
        const routeLocations = geocodedAttendees
            .filter((loc) => {
                if (loc.routeIndex !== routeIndex) return false;
                // tripNumberが指定されている場合は、その便のみ
                if (tripNumber !== undefined && loc.tripNumber !== tripNumber) return false;
                return true;
            })
            .sort((a, b) => {
                if (a.tripNumber !== null && b.tripNumber !== null && a.tripNumber !== b.tripNumber) {
                    return a.tripNumber - b.tripNumber;
                }
                return 0;
            });

        if (routeLocations.length === 0) return;

        const directionsService = new routesLibrary.DirectionsService();

        // 店舗を起点として、各送迎先を経由点として設定
        const origin = storePosition;
        const destination = routeLocations[routeLocations.length - 1];
        const waypoints = routeLocations.slice(0, -1).map((loc) => ({
            location: new google.maps.LatLng(loc.lat, loc.lng),
            stopover: true,
        }));

        directionsService.route(
            {
                origin: new google.maps.LatLng(origin.lat, origin.lng),
                destination: new google.maps.LatLng(destination.lat, destination.lng),
                waypoints,
                travelMode: google.maps.TravelMode.DRIVING,
                optimizeWaypoints: false,
            },
            (result, status) => {
                if (status === "OK" && result) {
                    if (polylineRef.current) {
                        polylineRef.current.setMap(null);
                    }
                    const path = result.routes[0].overview_path;
                    polylineRef.current = new google.maps.Polyline({
                        path,
                        strokeColor: color,
                        strokeWeight: 4,
                        strokeOpacity: 0.8,
                        map,
                    });
                }
            }
        );

        return () => {
            if (polylineRef.current) {
                polylineRef.current.setMap(null);
            }
        };
    }, [map, routesLibrary, geocodedAttendees, routeIndex, tripNumber, color, storePosition]);

    return null;
}

// マーカー
function MarkerPin({
    index,
    color,
    name,
    isUnassigned,
}: {
    index: number | null;
    color: string;
    name: string;
    isUnassigned: boolean;
}) {
    return (
        <div className="relative flex flex-col items-center cursor-pointer active:scale-95 transition-transform touch-manipulation">
            <div
                className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-1 rounded-lg text-xs font-medium shadow-lg"
                style={{ backgroundColor: color, color: "white" }}
            >
                {name}
                <div
                    className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0"
                    style={{
                        borderLeft: "6px solid transparent",
                        borderRight: "6px solid transparent",
                        borderTop: `6px solid ${color}`,
                    }}
                />
            </div>
            <div
                style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    backgroundColor: color,
                    border: "2px solid white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontWeight: "bold",
                    fontSize: 12,
                    boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                }}
            >
                {isUnassigned ? "?" : (index !== null ? index + 1 : "?")}
            </div>
        </div>
    );
}

// 店舗マーカー
function StoreMarkerPin({ name }: { name: string }) {
    return (
        <div className="relative flex flex-col items-center">
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-1 rounded-lg text-xs font-medium shadow-lg bg-amber-500 text-white">
                {name}
                <div
                    className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0"
                    style={{
                        borderLeft: "6px solid transparent",
                        borderRight: "6px solid transparent",
                        borderTop: "6px solid #F59E0B",
                    }}
                />
            </div>
            <div
                className="flex items-center justify-center"
                style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    backgroundColor: "#F59E0B",
                    border: "2px solid white",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                }}
            >
                <Star className="w-5 h-5 text-white fill-white" />
            </div>
        </div>
    );
}

// 乗客リストアイテム（アニメーション付き）
function PassengerListItem({
    passenger,
    index,
    totalCount,
    isCurrentAttendee,
    isProcessing,
    onMoveUp,
    onMoveDown,
    onSelect,
    onDelete,
    animatingIndex,
}: {
    passenger: { cast_profile_id: string; cast_name: string; pickup_destination: string | null; order_index: number };
    index: number;
    totalCount: number;
    isCurrentAttendee: boolean;
    isProcessing: boolean;
    onMoveUp: () => void;
    onMoveDown: () => void;
    onSelect: () => void;
    onDelete: () => void;
    animatingIndex: number | null;
}) {
    const isAnimatingUp = animatingIndex === index && index > 0;
    const isAnimatingDown = animatingIndex === index - 1 && index > 0;

    return (
        <div
            className={`flex items-center gap-2 p-2 rounded-xl transition-all duration-300 ${
                isCurrentAttendee
                    ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                    : "bg-gray-50 dark:bg-gray-800"
            } ${isAnimatingUp ? "-translate-y-full opacity-0" : ""} ${isAnimatingDown ? "translate-y-full opacity-0" : ""}`}
            style={{
                transform: isAnimatingUp ? "translateY(-100%)" : isAnimatingDown ? "translateY(100%)" : undefined,
            }}
        >
            {/* 順番番号 */}
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300">
                {index + 1}
            </div>

            {/* 名前と住所（クリック可能） */}
            <button
                type="button"
                onClick={onSelect}
                disabled={isProcessing}
                className="flex-1 min-w-0 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg p-1 -m-1 transition-colors"
            >
                <p className={`text-sm font-medium truncate ${isCurrentAttendee ? "text-blue-700 dark:text-blue-300" : "text-gray-900 dark:text-white"}`}>
                    {passenger.cast_name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {passenger.pickup_destination || "送迎先未設定"}
                </p>
            </button>

            {/* 上下ボタン */}
            <div className="flex flex-col gap-0.5 flex-shrink-0">
                <button
                    type="button"
                    onClick={onMoveUp}
                    disabled={isProcessing || index === 0}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronUp className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                </button>
                <button
                    type="button"
                    onClick={onMoveDown}
                    disabled={isProcessing || index === totalCount - 1}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronDown className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                </button>
            </div>

            {/* 削除ボタン */}
            <button
                type="button"
                onClick={onDelete}
                disabled={isProcessing}
                className="p-1.5 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors disabled:opacity-50 flex-shrink-0"
            >
                <Trash2 className="h-4 w-4" />
            </button>
        </div>
    );
}

// ルート一覧用カードコンポーネント
function RouteListCard({
    route,
    routeIndex,
    storeAddress,
    isProcessing,
    onRemoveFromRoute,
    onOpenModal,
}: {
    route: PickupRouteWithPassengers;
    routeIndex: number;
    storeAddress?: string;
    isProcessing: boolean;
    onRemoveFromRoute: (routeId: string, castProfileId: string) => void;
    onOpenModal: (route: PickupRouteWithPassengers) => void;
}) {
    // 便ごとの所要時間情報
    const [tripInfoMap, setTripInfoMap] = useState<Record<number, RouteCalculationResult | null>>({});
    const [isCalculating, setIsCalculating] = useState(false);

    // 便の数を取得
    const tripNumbers: number[] = [...new Set<number>(route.passengers.map((p: { trip_number: number }) => p.trip_number as number))].sort((a, b) => a - b);

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

        const tripPassengers = route.passengers
            .filter((p: { trip_number: number; pickup_destination: string | null }) => p.trip_number === tripNumber && p.pickup_destination)
            .sort((a: { order_index: number }, b: { order_index: number }) => a.order_index - b.order_index);

        if (tripPassengers.length === 0) return;

        const destinations = tripPassengers
            .map((p: { pickup_destination: string | null }) => p.pickup_destination)
            .filter((d: string | null): d is string => !!d);

        if (destinations.length === 0) return;

        const origin = encodeURIComponent(storeAddress);
        const destination = encodeURIComponent(destinations[destinations.length - 1]);
        const waypoints = destinations.slice(0, -1).map((d: string) => encodeURIComponent(d)).join("|");

        const avoidParams: string[] = [];
        if (route.avoid_highways) avoidParams.push("highways");
        if (route.avoid_tolls) avoidParams.push("tolls");

        let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
        if (waypoints) url += `&waypoints=${waypoints}`;
        if (avoidParams.length > 0) url += `&avoid=${avoidParams.join(",")}`;

        window.open(url, "_blank");
    };

    return (
        <div
            className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 pt-3 pb-2 px-2 cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
            onClick={() => onOpenModal(route)}
        >
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs">
                        {route.passengers.length}
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
                {route.passengers.length === 0 ? (
                    <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">
                        乗車者なし
                    </p>
                ) : (
                    // 便ごとにグループ化して表示（タイムライン形式）
                    tripNumbers.map((tripNumber) => {
                        const tripPassengers = route.passengers
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

                        // ルートと便に応じた色を取得
                        const tripColor = getRouteTripsColor(routeIndex, tripNumber);
                        const tripColorBg = getTripColorLight(tripColor);
                        const tripLabel = tripNumber === 1 ? "出発便" : "戻り便";
                        const canOpenThisTripInMaps = storeAddress && tripPassengers.some((p: { pickup_destination: string | null }) => p.pickup_destination);
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
                                        style={{ backgroundColor: tripColorBg, color: tripColor }}
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
                                        className="absolute left-[51px] top-2 bottom-2 w-0.5"
                                        style={{ backgroundColor: tripColor, opacity: 0.5 }}
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
                                    {tripPassengers.map((passenger: { id: string; cast_profile_id: string; cast_name: string; pickup_destination: string | null }) => {
                                        const arrivalInfo = tripInfo?.estimatedArrivalTimes.find(
                                            (a) => a.destination === passenger.pickup_destination
                                        );
                                        return (
                                            <Popover key={passenger.id}>
                                                <PopoverTrigger asChild>
                                                    <button
                                                        type="button"
                                                        disabled={isProcessing}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="relative w-full flex items-center py-1.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800 rounded transition-colors disabled:opacity-50"
                                                    >
                                                        <span className="absolute left-[-60px] w-10 text-right text-xs font-medium text-green-600 dark:text-green-400">
                                                            {arrivalInfo?.arrivalTime || ""}
                                                        </span>
                                                        <div
                                                            className="absolute left-[-12px] w-2 h-2 rounded-full"
                                                            style={{ backgroundColor: tripColor }}
                                                        />
                                                        <span className="text-sm text-gray-900 dark:text-white shrink-0">
                                                            {passenger.cast_name}
                                                        </span>
                                                        <span className="text-xs text-gray-400 dark:text-gray-500 truncate ml-2">
                                                            {passenger.pickup_destination}
                                                        </span>
                                                    </button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-48 p-1" align="start">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onRemoveFromRoute(route.id, passenger.cast_profile_id);
                                                        }}
                                                        disabled={isProcessing}
                                                        className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                                    >
                                                        <X className="h-3 w-3" />
                                                        未決定に戻す
                                                    </button>
                                                </PopoverContent>
                                            </Popover>
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
                                            backgroundColor: tripColorBg,
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
    );
}

// ボトムシートモーダル
function MarkerActionSheet({
    isOpen,
    onClose,
    attendee,
    routes,
    onRouteChange,
    onClearDestination,
    onSelectAttendee,
    onCreateNewRoute,
    date,
}: {
    isOpen: boolean;
    onClose: () => void;
    attendee: GeocodedAttendee | null;
    routes: PickupRouteWithPassengers[];
    onRouteChange: () => void;
    onClearDestination: (profileId: string) => void;
    onSelectAttendee: (profileId: string) => void;
    onCreateNewRoute: () => void;
    date: string;
}) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{
        profileId: string;
        name: string;
    } | null>(null);
    const [deleteConfirmType, setDeleteConfirmType] = useState<"route" | "destination" | null>(null);
    const [localPassengers, setLocalPassengers] = useState<typeof routes[0]["passengers"]>([]);
    const [animatingIndex, setAnimatingIndex] = useState<number | null>(null);

    // ルートが変わったらローカルの乗客リストを更新
    useEffect(() => {
        if (attendee?.routeIndex !== null && attendee?.routeIndex !== undefined) {
            const currentRoute = routes[attendee.routeIndex];
            if (currentRoute) {
                const sorted = [...currentRoute.passengers].sort(
                    (a, b) => a.trip_number - b.trip_number || a.order_index - b.order_index
                );
                setLocalPassengers(sorted);
            }
        }
    }, [attendee?.routeIndex, routes]);

    if (!attendee) return null;

    const isAssigned = attendee.routeIndex !== null;
    const currentRoute = isAssigned ? routes[attendee.routeIndex!] : null;

    const handleAddToRoute = async (routeId: string) => {
        setIsProcessing(true);
        try {
            if (attendee.routeId) {
                await removePassengerFromRoute(attendee.routeId, attendee.profileId);
            }
            await addPassengerToRoute(routeId, attendee.profileId);
            onRouteChange();
            onClose();
        } catch (error) {
            console.error("Error adding to route:", error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRemoveFromRoute = async (profileId: string) => {
        if (!currentRoute) return;
        setIsProcessing(true);
        try {
            await removePassengerFromRoute(currentRoute.id, profileId);
            onRouteChange();
            setDeleteConfirmType(null);
            setDeleteTarget(null);
        } catch (error) {
            console.error("Error removing from route:", error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleClearDestination = async (profileId: string) => {
        setIsProcessing(true);
        try {
            await clearPickupDestination(profileId, date);
            onClearDestination(profileId);
            onRouteChange();
            setDeleteConfirmType(null);
            setDeleteTarget(null);
            if (profileId === attendee.profileId) {
                onClose();
            }
        } catch (error) {
            console.error("Error clearing destination:", error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCloseDeleteModal = () => {
        setDeleteConfirmType(null);
        setDeleteTarget(null);
    };

    const handleMovePassenger = async (fromIndex: number, toIndex: number) => {
        if (!currentRoute || fromIndex === toIndex) return;
        if (toIndex < 0 || toIndex >= localPassengers.length) return;

        setAnimatingIndex(fromIndex);

        // アニメーション用に少し待つ
        await new Promise((resolve) => setTimeout(resolve, 150));

        // ローカルで順番を入れ替え
        const newPassengers = [...localPassengers];
        const [moved] = newPassengers.splice(fromIndex, 1);
        newPassengers.splice(toIndex, 0, moved);

        // order_indexを更新
        const updatedPassengers = newPassengers.map((p, idx) => ({
            ...p,
            order_index: idx,
        }));

        setLocalPassengers(updatedPassengers);
        setAnimatingIndex(null);

        // サーバーに保存
        setIsProcessing(true);
        try {
            await updatePassengerOrder(
                currentRoute.id,
                updatedPassengers.map((p) => ({
                    cast_profile_id: p.cast_profile_id,
                    order_index: p.order_index,
                }))
            );
            onRouteChange();
        } catch (error) {
            console.error("Error updating order:", error);
            // エラー時は元に戻す
            setLocalPassengers(
                [...currentRoute.passengers].sort(
                    (a, b) => a.trip_number - b.trip_number || a.order_index - b.order_index
                )
            );
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <>
            <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <SheetContent
                    side="bottom"
                    className="h-auto max-h-[85vh] rounded-t-3xl bg-white dark:bg-gray-900 p-0"
                >
                    <div className="flex justify-center pt-3 pb-2">
                        <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                    </div>

                    <SheetHeader className="px-4 pb-2 mb-0">
                        <SheetTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                            {attendee.displayName}
                        </SheetTitle>
                    </SheetHeader>

                    <div className="px-4 pb-8 space-y-4 overflow-y-auto max-h-[calc(85vh-80px)]">
                        {/* 現在のルート - 乗客リスト付き */}
                        {isAssigned && currentRoute && (
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4">
                                <div className="flex items-center gap-3 mb-3">
                                    <div
                                        className="w-4 h-4 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: routeColors[attendee.routeIndex! % routeColors.length] }}
                                    />
                                    <p className="flex-1 text-sm font-medium text-gray-900 dark:text-white">
                                        {currentRoute.driver_name || `ルート${attendee.routeIndex! + 1}`}
                                    </p>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                        {localPassengers.length}名
                                    </span>
                                </div>

                                {/* 乗客リスト */}
                                <div className="space-y-1.5">
                                    {localPassengers.map((passenger, index) => (
                                        <PassengerListItem
                                            key={passenger.cast_profile_id}
                                            passenger={passenger}
                                            index={index}
                                            totalCount={localPassengers.length}
                                            isCurrentAttendee={passenger.cast_profile_id === attendee.profileId}
                                            isProcessing={isProcessing}
                                            onMoveUp={() => handleMovePassenger(index, index - 1)}
                                            onMoveDown={() => handleMovePassenger(index, index + 1)}
                                            onSelect={() => {
                                                if (passenger.cast_profile_id !== attendee.profileId) {
                                                    onSelectAttendee(passenger.cast_profile_id);
                                                }
                                            }}
                                            onDelete={() => setDeleteTarget({
                                                profileId: passenger.cast_profile_id,
                                                name: passenger.cast_name,
                                            })}
                                            animatingIndex={animatingIndex}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ルート選択 */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {isAssigned ? "別のルートに移動" : "ルートに追加"}
                                </p>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={onCreateNewRoute}
                                    className="h-8 px-3 text-xs rounded-full"
                                >
                                    <Plus className="h-3.5 w-3.5 mr-1" />
                                    新規ルート
                                </Button>
                            </div>
                            {routes.length === 0 ? (
                                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
                                    ルートがありません
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {routes.map((route, idx) => {
                                        const isCurrent = attendee.routeId === route.id;
                                        return (
                                            <button
                                                key={route.id}
                                                type="button"
                                                onClick={() => !isCurrent && handleAddToRoute(route.id)}
                                                disabled={isProcessing || isCurrent}
                                                className={`w-full flex items-center gap-3 px-4 py-4 rounded-2xl text-base transition-colors touch-manipulation active:scale-[0.98] ${
                                                    isCurrent
                                                        ? "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500"
                                                        : "bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white active:bg-gray-100 dark:active:bg-gray-700"
                                                }`}
                                            >
                                                <div
                                                    className="w-5 h-5 rounded-full flex-shrink-0"
                                                    style={{ backgroundColor: routeColors[idx % routeColors.length] }}
                                                />
                                                <span className="flex-1 text-left font-medium">
                                                    {route.driver_name || `ルート${idx + 1}`}
                                                </span>
                                                {!isCurrent && <ArrowRight className="h-5 w-5 text-gray-400" />}
                                                {isCurrent && <span className="text-sm text-gray-400">現在</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            {/* 削除選択モーダル */}
            <Dialog open={deleteTarget !== null && deleteConfirmType === null} onOpenChange={(open) => !open && handleCloseDeleteModal()}>
                <DialogContent className="max-w-sm rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-gray-900 dark:text-white">
                            {deleteTarget?.name}を削除
                        </DialogTitle>
                        <DialogDescription className="text-gray-600 dark:text-gray-400">
                            削除方法を選択してください
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-2">
                        <button
                            type="button"
                            onClick={() => setDeleteConfirmType("route")}
                            className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                        >
                            <X className="h-5 w-5 text-orange-500" />
                            <div className="flex-1">
                                <p className="font-medium">ルートから削除</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">未決定に戻します</p>
                            </div>
                        </button>
                        <button
                            type="button"
                            onClick={() => setDeleteConfirmType("destination")}
                            className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                        >
                            <Trash2 className="h-5 w-5 text-red-500" />
                            <div className="flex-1">
                                <p className="font-medium">送迎先を削除</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">送迎一覧から完全に消えます</p>
                            </div>
                        </button>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={handleCloseDeleteModal}
                            className="w-full"
                        >
                            キャンセル
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 削除確認モーダル */}
            <Dialog open={deleteConfirmType !== null} onOpenChange={(open) => !open && setDeleteConfirmType(null)}>
                <DialogContent className="max-w-sm rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-gray-900 dark:text-white">
                            {deleteConfirmType === "route" ? "ルートから削除" : "送迎先を削除"}
                        </DialogTitle>
                        <DialogDescription className="text-gray-600 dark:text-gray-400">
                            {deleteConfirmType === "route"
                                ? `${deleteTarget?.name}をルートから削除しますか？`
                                : `${deleteTarget?.name}の送迎先を削除しますか？この人は送迎一覧から消えます。`}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setDeleteConfirmType(null)}
                            disabled={isProcessing}
                            className="flex-1"
                        >
                            戻る
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                if (deleteTarget) {
                                    if (deleteConfirmType === "route") {
                                        handleRemoveFromRoute(deleteTarget.profileId);
                                    } else if (deleteConfirmType === "destination") {
                                        handleClearDestination(deleteTarget.profileId);
                                    }
                                }
                            }}
                            disabled={isProcessing}
                            className="flex-1"
                        >
                            削除
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

// マップコンテンツ
function MapContent({
    routes,
    geocodedAttendees,
    storePosition,
    storeName,
    onMarkerClick,
}: {
    routes: PickupRouteWithPassengers[];
    geocodedAttendees: GeocodedAttendee[];
    storePosition: { lat: number; lng: number } | null;
    storeName: string;
    onMarkerClick: (attendee: GeocodedAttendee) => void;
}) {
    const getMarkerIndex = (attendee: GeocodedAttendee): number | null => {
        if (attendee.routeIndex === null) return null;
        const routeAttendees = geocodedAttendees
            .filter((a) => a.routeIndex === attendee.routeIndex)
            .sort((a, b) => {
                if (a.tripNumber !== null && b.tripNumber !== null && a.tripNumber !== b.tripNumber) {
                    return a.tripNumber - b.tripNumber;
                }
                return 0;
            });
        return routeAttendees.findIndex((a) => a.profileId === attendee.profileId);
    };

    return (
        <>
            {storePosition && (
                <AdvancedMarker position={storePosition} title={storeName}>
                    <StoreMarkerPin name={storeName} />
                </AdvancedMarker>
            )}

            {geocodedAttendees.map((attendee) => {
                const isUnassigned = attendee.routeIndex === null;
                // ルートインデックスと便番号に基づいて色を決定
                const color = isUnassigned
                    ? unassignedColor
                    : getRouteTripsColor(attendee.routeIndex!, attendee.tripNumber);
                const markerIndex = getMarkerIndex(attendee);

                return (
                    <AdvancedMarker
                        key={attendee.profileId}
                        position={{ lat: attendee.lat, lng: attendee.lng }}
                        title={`${attendee.displayName}: ${attendee.destination}`}
                        onClick={() => onMarkerClick(attendee)}
                    >
                        <MarkerPin
                            index={markerIndex}
                            color={color}
                            name={attendee.displayName}
                            isUnassigned={isUnassigned}
                        />
                    </AdvancedMarker>
                );
            })}

            {/* 各ルートの各便ごとにポリラインを描画 */}
            {routes.flatMap((route, routeIdx) => {
                // ルート内の便番号を取得
                const tripNumbers: number[] = [...new Set<number>(route.passengers.map((p: { trip_number: number }) => p.trip_number as number))].sort((a, b) => a - b);
                return tripNumbers.map((tripNumber: number) => (
                    <DirectionsPolyline
                        key={`${routeIdx}-trip${tripNumber}`}
                        geocodedAttendees={geocodedAttendees}
                        routeIndex={routeIdx}
                        tripNumber={tripNumber}
                        color={getRouteTripsColor(routeIdx, tripNumber)}
                        storePosition={storePosition}
                    />
                ));
            })}
        </>
    );
}

export function PickupFullscreenMap({
    routes,
    storeLocation,
    attendees,
    allAttendees,
    staffProfiles,
    allProfiles,
    currentProfileId,
    storeId,
    storeAddress,
    date,
    canEdit = false,
    daySwitchTime = "05:00",
}: PickupFullscreenMapProps) {
    const router = useRouter();
    const [geocodedAttendees, setGeocodedAttendees] = useState<GeocodedAttendee[]>([]);
    const [isGeocoding, setIsGeocoding] = useState(false);
    const [mapCenter, setMapCenter] = useState(defaultCenter);
    const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [storePosition, setStorePosition] = useState<{ lat: number; lng: number } | null>(null);
    const [selectedAttendee, setSelectedAttendee] = useState<GeocodedAttendee | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isRouteListOpen, setIsRouteListOpen] = useState(false);
    const [isAIModalOpen, setIsAIModalOpen] = useState(false);
    const [isPickupModalOpen, setIsPickupModalOpen] = useState(false);
    const [editingRoute, setEditingRoute] = useState<PickupRouteWithPassengers | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

    const assignmentRecord: Record<string, { routeIndex: number; routeId: string; tripNumber: number }> = {};
    routes.forEach((route, routeIndex) => {
        route.passengers.forEach((passenger) => {
            assignmentRecord[passenger.cast_profile_id] = {
                routeIndex,
                routeId: route.id,
                tripNumber: passenger.trip_number,
            };
        });
    });

    const geocodeAddresses = useCallback(async () => {
        setIsGeocoding(true);
        const geocoder = new google.maps.Geocoder();
        const results: GeocodedAttendee[] = [];

        if (storeLocation.latitude && storeLocation.longitude) {
            setStorePosition({ lat: storeLocation.latitude, lng: storeLocation.longitude });
        } else if (storeLocation.address) {
            try {
                const response = await new Promise<google.maps.GeocoderResult[]>(
                    (resolve, reject) => {
                        geocoder.geocode(
                            { address: storeLocation.address!, region: "JP" },
                            (results, status) => {
                                if (status === "OK" && results) {
                                    resolve(results);
                                } else {
                                    reject(new Error(`Store geocoding failed: ${status}`));
                                }
                            }
                        );
                    }
                );
                if (response[0]) {
                    setStorePosition({
                        lat: response[0].geometry.location.lat(),
                        lng: response[0].geometry.location.lng(),
                    });
                }
            } catch (error) {
                console.error("Failed to geocode store address:", error);
            }
        }

        for (const attendee of attendees) {
            if (!attendee.pickup_destination) continue;

            try {
                const response = await new Promise<google.maps.GeocoderResult[]>(
                    (resolve, reject) => {
                        geocoder.geocode(
                            { address: attendee.pickup_destination!, region: "JP" },
                            (results, status) => {
                                if (status === "OK" && results) {
                                    resolve(results);
                                } else {
                                    reject(new Error(`Geocoding failed: ${status}`));
                                }
                            }
                        );
                    }
                );

                if (response[0]) {
                    const assignment = assignmentRecord[attendee.profile_id];
                    results.push({
                        profileId: attendee.profile_id,
                        destination: attendee.pickup_destination,
                        lat: response[0].geometry.location.lat(),
                        lng: response[0].geometry.location.lng(),
                        displayName: attendee.display_name,
                        routeIndex: assignment?.routeIndex ?? null,
                        routeId: assignment?.routeId ?? null,
                        tripNumber: assignment?.tripNumber ?? null,
                    });
                }
            } catch (error) {
                console.error(`Failed to geocode: ${attendee.pickup_destination}`, error);
            }
        }

        setGeocodedAttendees(results);

        if (storeLocation.latitude && storeLocation.longitude) {
            setMapCenter({ lat: storeLocation.latitude, lng: storeLocation.longitude });
        } else if (results.length > 0) {
            const avgLat = results.reduce((sum, r) => sum + r.lat, 0) / results.length;
            const avgLng = results.reduce((sum, r) => sum + r.lng, 0) / results.length;
            setMapCenter({ lat: avgLat, lng: avgLng });
        }

        setIsGeocoding(false);
    }, [attendees, storeLocation, assignmentRecord]);

    useEffect(() => {
        const hasStoreToGeocode = !storePosition && (storeLocation.latitude || storeLocation.address);
        const hasAttendees = attendees.length > 0 && geocodedAttendees.length === 0;

        if (isReady && (hasAttendees || hasStoreToGeocode)) {
            geocodeAddresses();
        }
    }, [isReady, attendees.length, geocodedAttendees.length, geocodeAddresses, storePosition, storeLocation]);

    useEffect(() => {
        if (geocodedAttendees.length > 0) {
            const updatedAttendees = geocodedAttendees.map((attendee) => {
                const assignment = assignmentRecord[attendee.profileId];
                return {
                    ...attendee,
                    routeIndex: assignment?.routeIndex ?? null,
                    routeId: assignment?.routeId ?? null,
                    tripNumber: assignment?.tripNumber ?? null,
                };
            });
            setGeocodedAttendees(updatedAttendees);
        }
    }, [routes]);

    const handleMarkerClick = (attendee: GeocodedAttendee) => {
        setSelectedAttendee(attendee);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedAttendee(null);
    };

    const handleBack = () => {
        router.push(`/app/pickup${date ? `?date=${date}` : ""}`);
    };

    const handleRouteChange = () => {
        router.refresh();
    };

    const handleOpenPickupModal = (route?: PickupRouteWithPassengers) => {
        setEditingRoute(route || null);
        setIsPickupModalOpen(true);
    };

    const handleClosePickupModal = () => {
        setIsPickupModalOpen(false);
        setEditingRoute(null);
    };

    // 送迎先が設定されているキャストだけをフィルタ
    const attendeesWithDestination = allAttendees.filter(
        (a) => a.pickup_destination
    );

    // ルートに割り当てられていないキャストを取得
    const assignedCastIds = new Set(
        routes.flatMap((r) => r.passengers.map((p) => p.cast_profile_id))
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

    if (!apiKey) {
        return (
            <div className="h-full flex items-center justify-center">
                <p className="text-red-500">Google Maps APIキーが設定されていません</p>
            </div>
        );
    }

    return (
        <div className="h-full w-full relative">
            {/* 上部ボタン群 */}
            <div className="absolute top-4 left-4 right-4 z-10 flex items-start justify-between">
                {/* 左側: 戻るボタン + AIボタン */}
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleBack}
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 touch-manipulation active:scale-95 transition-transform"
                    >
                        <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    </button>

                    {canEdit && (
                        <button
                            type="button"
                            onClick={() => setIsAIModalOpen(true)}
                            className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg touch-manipulation active:scale-95 transition-transform"
                        >
                            <Sparkles className="h-5 w-5" />
                        </button>
                    )}
                </div>

                {/* 右側: 凡例（クリックでルート一覧を開く） */}
                <button
                    type="button"
                    onClick={() => setIsRouteListOpen(true)}
                    className="flex flex-col gap-1.5 bg-white/90 dark:bg-gray-800/90 backdrop-blur rounded-xl p-2 shadow-lg border border-gray-200 dark:border-gray-700 touch-manipulation active:scale-95 transition-transform text-left"
                >
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: unassignedColor }} />
                        <span className="text-xs text-gray-700 dark:text-gray-300">未割当 ({unassignedAttendees.length})</span>
                    </div>
                    {routes.map((route, idx) => {
                        // 便ごとの乗客数を計算
                        const tripNumbers: number[] = [...new Set<number>(route.passengers.map((p: { trip_number: number }) => p.trip_number as number))].sort((a, b) => a - b);

                        return (
                            <div key={route.id} className="flex flex-col gap-0.5">
                                <span className="text-xs font-medium text-gray-800 dark:text-gray-200 max-w-[100px] truncate">
                                    {route.driver_name || `ルート${idx + 1}`}
                                </span>
                                {tripNumbers.map((tripNumber: number) => {
                                    const tripPassengerCount = route.passengers.filter((p: { trip_number: number }) => p.trip_number === tripNumber).length;
                                    const tripLabel = tripNumber === 1 ? "出発便" : "戻り便";
                                    return (
                                        <div key={tripNumber} className="flex items-center gap-2 pl-1">
                                            <div
                                                className="w-2.5 h-2.5 rounded-full"
                                                style={{ backgroundColor: getRouteTripsColor(idx, tripNumber) }}
                                            />
                                            <span className="text-xs text-gray-600 dark:text-gray-400">
                                                {tripLabel} ({tripPassengerCount})
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </button>
            </div>

            {/* マップ */}
            <APIProvider apiKey={apiKey} language="ja" onLoad={() => setIsReady(true)}>
                {isGeocoding ? (
                    <div className="h-full w-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <div className="text-center">
                            <Loader2 className="h-8 w-8 animate-spin text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                            <p className="text-gray-500 dark:text-gray-400 text-sm">住所を検索中...</p>
                        </div>
                    </div>
                ) : (
                    <Map
                        style={{ width: "100%", height: "100%" }}
                        defaultCenter={mapCenter}
                        defaultZoom={12}
                        gestureHandling="greedy"
                        disableDefaultUI={true}
                        zoomControl={false}
                        streetViewControl={false}
                        mapTypeControl={false}
                        fullscreenControl={false}
                        mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID"}
                    >
                        <MapContent
                            routes={routes}
                            geocodedAttendees={geocodedAttendees}
                            storePosition={storePosition}
                            storeName={storeLocation.name}
                            onMarkerClick={handleMarkerClick}
                        />
                    </Map>
                )}
            </APIProvider>

            {/* ボトムシートモーダル（マーカークリック時） */}
            <MarkerActionSheet
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                attendee={selectedAttendee}
                routes={routes}
                onRouteChange={handleRouteChange}
                onClearDestination={(profileId) => {
                    setGeocodedAttendees((prev) => prev.filter((a) => a.profileId !== profileId));
                }}
                onSelectAttendee={(profileId) => {
                    const foundAttendee = geocodedAttendees.find((a) => a.profileId === profileId);
                    if (foundAttendee) {
                        setSelectedAttendee(foundAttendee);
                    }
                }}
                onCreateNewRoute={() => handleOpenPickupModal()}
                date={date}
            />

            {/* ルート一覧シート */}
            <Sheet open={isRouteListOpen} onOpenChange={setIsRouteListOpen}>
                <SheetContent
                    side="bottom"
                    className="h-[85vh] rounded-t-3xl bg-white dark:bg-gray-900 p-0"
                >
                    <div className="flex justify-center pt-3 pb-2">
                        <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                    </div>

                    <SheetHeader className="px-4 pb-2 flex flex-row items-center justify-between">
                        <SheetTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                            送迎ルート一覧
                        </SheetTitle>
                        {canEdit && (
                            <Button
                                size="icon"
                                className="h-9 w-9 rounded-full bg-blue-600 text-white hover:bg-blue-700 border-none shadow-md transition-all hover:scale-105 active:scale-95"
                                onClick={() => handleOpenPickupModal()}
                            >
                                <Plus className="h-5 w-5" />
                            </Button>
                        )}
                    </SheetHeader>

                    <div className="px-4 pb-8 overflow-y-auto max-h-[calc(85vh-80px)]">
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
                                                        {routes.length === 0 ? (
                                                            <p className="text-xs text-gray-400 px-2 py-2">
                                                                ルートがありません
                                                            </p>
                                                        ) : (
                                                            routes.map((route, idx) => (
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
                            {routes.map((route, routeIndex) => (
                                <RouteListCard
                                    key={route.id}
                                    route={route}
                                    routeIndex={routeIndex}
                                    storeAddress={storeAddress}
                                    isProcessing={isProcessing}
                                    onRemoveFromRoute={handleRemoveFromRoute}
                                    onOpenModal={handleOpenPickupModal}
                                />
                            ))}
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            {/* AIモーダル */}
            <AIModal
                isOpen={isAIModalOpen}
                onClose={() => setIsAIModalOpen(false)}
                onOpenCreateRoute={() => {
                    setIsAIModalOpen(false);
                    handleOpenPickupModal();
                }}
                onOpenAddAttendance={() => {
                    setIsAttendanceModalOpen(true);
                }}
                routes={routes}
                attendees={allAttendees}
                staffProfiles={staffProfiles}
                storeId={storeId}
                date={date}
                storeAddress={storeAddress}
            />

            {/* ルート作成・編集モーダル */}
            <PickupModal
                isOpen={isPickupModalOpen}
                onClose={handleClosePickupModal}
                editingRoute={editingRoute}
                allRoutes={routes}
                attendees={allAttendees}
                staffProfiles={staffProfiles}
                storeId={storeId}
                date={date}
            />

            {/* 出勤追加モーダル */}
            <AttendanceModal
                isOpen={isAttendanceModalOpen}
                onClose={() => setIsAttendanceModalOpen(false)}
                profiles={allProfiles}
                currentProfileId={currentProfileId}
                defaultRole="cast"
                initialData={{
                    date: date,
                }}
                onSaved={() => {
                    setIsAttendanceModalOpen(false);
                    router.refresh();
                }}
            />
        </div>
    );
}
