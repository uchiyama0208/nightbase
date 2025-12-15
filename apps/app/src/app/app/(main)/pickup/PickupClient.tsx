"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Plus, Sparkles, ArrowRight, X } from "lucide-react";
import { PickupModal } from "./pickup-modal";
import { AIModal } from "./ai-modal";
import { PickupMap } from "./PickupMap";
import {
    addPassengerToRoute,
    removePassengerFromRoute,
    type PickupRouteWithPassengers,
    type TodayAttendee,
} from "./actions";

// ルートカードコンポーネント
function RouteCard({
    route,
    routeIndex,
    isProcessing,
    onRemovePassenger,
    onOpenModal,
}: {
    route: PickupRouteWithPassengers;
    routeIndex: number;
    isProcessing: boolean;
    onRemovePassenger: (routeId: string, castProfileId: string) => void;
    onOpenModal: (route: PickupRouteWithPassengers) => void;
}) {
    return (
        <div
            className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 pt-3 pb-2 px-2 cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
            onClick={() => onOpenModal(route)}
        >
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-xs">
                    {routeIndex + 1}
                </span>
                {route.driver_name || `ルート${routeIndex + 1}`}
            </h3>
            <div className="space-y-1">
                {route.passengers.length === 0 ? (
                    <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">
                        乗車者なし
                    </p>
                ) : (
                    route.passengers
                        .sort((a, b) => a.trip_number - b.trip_number || a.order_index - b.order_index)
                        .map((passenger) => (
                            <Popover key={passenger.id}>
                                <PopoverTrigger asChild>
                                    <button
                                        type="button"
                                        disabled={isProcessing}
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-full bg-gray-50 dark:bg-gray-800 rounded-lg px-2 py-1.5 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                                    >
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <span className="text-sm text-gray-900 dark:text-white shrink-0">
                                                {passenger.cast_name}
                                            </span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                {passenger.pickup_destination}
                                            </span>
                                        </div>
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-48 p-1" align="start">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRemovePassenger(route.id, passenger.cast_profile_id);
                                        }}
                                        disabled={isProcessing}
                                        className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                    >
                                        <X className="h-3 w-3" />
                                        未決定に戻す
                                    </button>
                                </PopoverContent>
                            </Popover>
                        ))
                )}
            </div>
        </div>
    );
}

interface PickupClientProps {
    initialRoutes: PickupRouteWithPassengers[];
    initialAttendees: TodayAttendee[];
    staffProfiles: { id: string; display_name: string; role: string }[];
    initialDate: string;
    storeId: string;
}

export function PickupClient({
    initialRoutes,
    initialAttendees,
    staffProfiles,
    initialDate,
    storeId,
}: PickupClientProps) {
    const router = useRouter();
    const [viewMode, setViewMode] = useState<"list" | "map">("list");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAIModalOpen, setIsAIModalOpen] = useState(false);
    const [editingRoute, setEditingRoute] = useState<PickupRouteWithPassengers | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Vercel-style tabs
    const tabsRef = useRef<{ [key: string]: HTMLButtonElement | null }>({});
    const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

    useEffect(() => {
        const activeButton = tabsRef.current[viewMode];
        if (activeButton) {
            setIndicatorStyle({
                left: activeButton.offsetLeft,
                width: activeButton.offsetWidth,
            });
        }
    }, [viewMode]);

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

    return (
        <>
            {/* Header with buttons */}
            <div className="flex items-center justify-end gap-2 mb-4">
                <Button
                    size="icon"
                    className="h-10 w-10 rounded-full bg-purple-600 text-white hover:bg-purple-700 border-none shadow-md transition-all hover:scale-105 active:scale-95"
                    onClick={() => setIsAIModalOpen(true)}
                >
                    <Sparkles className="h-5 w-5" />
                </Button>
                <Button
                    size="icon"
                    className="h-10 w-10 rounded-full bg-blue-600 text-white hover:bg-blue-700 border-none shadow-md transition-all hover:scale-105 active:scale-95"
                    onClick={() => handleOpenModal()}
                >
                    <Plus className="h-5 w-5" />
                </Button>
            </div>

            {/* Vercel-style Tab Navigation */}
            <div className="relative mb-4">
                <div className="flex w-full">
                    <button
                        ref={(el) => { tabsRef.current["list"] = el; }}
                        type="button"
                        onClick={() => setViewMode("list")}
                        className={`flex-1 py-2 text-sm font-medium transition-colors relative ${
                            viewMode === "list"
                                ? "text-gray-900 dark:text-white"
                                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                        }`}
                    >
                        一覧
                    </button>
                    <button
                        ref={(el) => { tabsRef.current["map"] = el; }}
                        type="button"
                        onClick={() => setViewMode("map")}
                        className={`flex-1 py-2 text-sm font-medium transition-colors relative ${
                            viewMode === "map"
                                ? "text-gray-900 dark:text-white"
                                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                        }`}
                    >
                        マップ
                    </button>
                </div>
                <div
                    className="absolute bottom-0 h-0.5 bg-gray-900 dark:bg-white transition-all duration-200"
                    style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
                />
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gray-200 dark:bg-gray-700" />
            </div>

            {/* Content */}
            {viewMode === "list" ? (
                <div className="space-y-6">
                    {/* 2列Masonryレイアウト: 未決定 + ルートカード */}
                    <div className="columns-2 gap-2 space-y-0">
                        {/* 未決定 */}
                        <div className="break-inside-avoid pb-2">
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
                        </div>

                        {/* ルートカード */}
                        {initialRoutes.map((route) => (
                            <div key={route.id} className="break-inside-avoid pb-2">
                                <RouteCard
                                    route={route}
                                    routeIndex={initialRoutes.indexOf(route)}
                                    isProcessing={isProcessing}
                                    onRemovePassenger={handleRemoveFromRoute}
                                    onOpenModal={handleOpenModal}
                                />
                            </div>
                        ))}
                    </div>

                </div>
            ) : (
                <PickupMap routes={initialRoutes} />
            )}

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
                routes={initialRoutes}
                attendees={initialAttendees}
                staffProfiles={staffProfiles}
                storeId={storeId}
                date={initialDate}
            />
        </>
    );
}
