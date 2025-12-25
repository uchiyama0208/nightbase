"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
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
import { Switch } from "@/components/ui/switch";
import { X, Trash2, ChevronLeft, ChevronUp, ChevronDown, ChevronRight, Plus } from "lucide-react";
import { DriverSelectModal } from "./driver-select-modal";
import { CastSelectModal } from "./cast-select-modal";
import {
    createPickupRoute,
    updatePickupRoute,
    deletePickupRoute,
    type PickupRouteWithPassengers,
    type TodayAttendee,
} from "./actions";
import { useGlobalLoading } from "@/components/global-loading";
import { toast } from "@/components/ui/use-toast";

interface PickupModalProps {
    isOpen: boolean;
    onClose: () => void;
    editingRoute: PickupRouteWithPassengers | null;
    allRoutes: PickupRouteWithPassengers[];
    attendees: TodayAttendee[];
    staffProfiles: { id: string; display_name: string; display_name_kana: string | null; role: string }[];
    storeId: string;
    date: string;
}

interface PassengerEntry {
    id: string;
    cast_profile_id: string;
    cast_name: string;
    trip_number: number;
    order_index: number;
    pickup_destination: string | null;
}

export function PickupModal({
    isOpen,
    onClose,
    editingRoute,
    allRoutes,
    attendees,
    staffProfiles,
    storeId,
    date,
}: PickupModalProps) {
    const router = useRouter();
    const { showLoading, hideLoading } = useGlobalLoading();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isInitializedRef = useRef(false);

    // 移動確認ダイアログ用
    const [moveConfirm, setMoveConfirm] = useState<{
        attendee: TodayAttendee;
        tripNumber: number;
        fromRouteName: string;
    } | null>(null);

    // Driver select modal
    const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);

    // Cast select modal
    const [isCastModalOpen, setIsCastModalOpen] = useState(false);
    const [castModalTripNumber, setCastModalTripNumber] = useState<number>(1);

    // Form state
    const [driverProfileId, setDriverProfileId] = useState<string>("");
    const [driverName, setDriverName] = useState<string>("");
    const [roundTrips, setRoundTrips] = useState(0);
    const [capacity, setCapacity] = useState(3);
    const [departureTime, setDepartureTime] = useState<string>("");
    const [returnDepartureTime, setReturnDepartureTime] = useState<string>("");
    const [avoidHighways, setAvoidHighways] = useState(false);
    const [avoidTolls, setAvoidTolls] = useState(false);
    const [passengers, setPassengers] = useState<PassengerEntry[]>([]);

    // Drag state
    const [draggedItem, setDraggedItem] = useState<PassengerEntry | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<{ trip: number; index: number } | null>(null);

    // Initialize form when editing
    useEffect(() => {
        isInitializedRef.current = false;
        if (editingRoute) {
            setDriverProfileId(editingRoute.driver_profile_id || "");
            setDriverName(editingRoute.driver_name || "");
            setRoundTrips(editingRoute.round_trips);
            setCapacity(editingRoute.capacity);
            setDepartureTime(editingRoute.departure_time || "");
            setReturnDepartureTime(editingRoute.return_departure_time || "");
            setAvoidHighways(editingRoute.avoid_highways || false);
            setAvoidTolls(editingRoute.avoid_tolls || false);
            setPassengers(editingRoute.passengers.map((p) => ({ ...p })));
        } else {
            setDriverProfileId("");
            setDriverName("");
            setRoundTrips(0);
            setCapacity(3);
            setDepartureTime("");
            setReturnDepartureTime("");
            setAvoidHighways(false);
            setAvoidTolls(false);
            setPassengers([]);
        }
        // 初期化完了後にフラグを立てる
        setTimeout(() => {
            isInitializedRef.current = true;
        }, 100);
    }, [editingRoute, isOpen]);

    // 自動保存関数（編集モードのみ）
    const autoSave = useCallback(async () => {
        if (!editingRoute) return;

        showLoading("保存中...");
        try {
            const formData = new FormData();
            formData.append("storeId", storeId);
            formData.append("date", date);
            formData.append("driverProfileId", driverProfileId || "");
            formData.append("roundTrips", roundTrips.toString());
            formData.append("capacity", capacity.toString());
            formData.append("departureTime", departureTime || "");
            formData.append("returnDepartureTime", returnDepartureTime || "");
            formData.append("avoidHighways", avoidHighways.toString());
            formData.append("avoidTolls", avoidTolls.toString());
            formData.append(
                "passengers",
                JSON.stringify(
                    passengers.map((p, idx) => ({
                        cast_profile_id: p.cast_profile_id,
                        trip_number: p.trip_number,
                        order_index: idx,
                    }))
                )
            );
            formData.append("routeId", editingRoute.id);
            await updatePickupRoute(formData);
            router.refresh();
        } catch (error) {
            console.error("Error auto-saving pickup route:", error);
            toast({
                title: "保存に失敗しました",
                variant: "destructive",
            });
        } finally {
            hideLoading();
        }
    }, [editingRoute, storeId, date, driverProfileId, roundTrips, capacity, departureTime, returnDepartureTime, avoidHighways, avoidTolls, passengers, router, showLoading, hideLoading]);

    // 自動保存のデバウンス（編集モードのみ）
    useEffect(() => {
        // 編集モードでない場合、または初期化中の場合はスキップ
        if (!editingRoute || !isInitializedRef.current) return;

        if (autoSaveTimeoutRef.current) {
            clearTimeout(autoSaveTimeoutRef.current);
        }

        autoSaveTimeoutRef.current = setTimeout(() => {
            autoSave();
        }, 800);

        return () => {
            if (autoSaveTimeoutRef.current) {
                clearTimeout(autoSaveTimeoutRef.current);
            }
        };
    }, [driverProfileId, roundTrips, capacity, departureTime, returnDepartureTime, avoidHighways, avoidTolls, passengers, editingRoute, autoSave]);

    const handleClose = () => {
        setShowDeleteConfirm(false);
        setErrorMessage(null);
        setMoveConfirm(null);
        onClose();
    };

    // 他のルートに割り当てられているか確認
    const getAssignedRoute = (profileId: string) => {
        for (const route of allRoutes) {
            // 編集中のルートは除外
            if (editingRoute && route.id === editingRoute.id) continue;
            const passenger = route.passengers.find(p => p.cast_profile_id === profileId);
            if (passenger) {
                return route;
            }
        }
        return null;
    };

    // 新規作成時のみ使用
    const handleCreate = async () => {
        if (editingRoute) return; // 編集モードでは使用しない

        setIsSubmitting(true);
        setErrorMessage(null);
        try {
            const formData = new FormData();
            formData.append("storeId", storeId);
            formData.append("date", date);
            formData.append("driverProfileId", driverProfileId || "");
            formData.append("roundTrips", roundTrips.toString());
            formData.append("capacity", capacity.toString());
            formData.append("departureTime", departureTime || "");
            formData.append("returnDepartureTime", returnDepartureTime || "");
            formData.append("avoidHighways", avoidHighways.toString());
            formData.append("avoidTolls", avoidTolls.toString());
            formData.append(
                "passengers",
                JSON.stringify(
                    passengers.map((p, idx) => ({
                        cast_profile_id: p.cast_profile_id,
                        trip_number: p.trip_number,
                        order_index: idx,
                    }))
                )
            );

            await createPickupRoute(formData);
            router.refresh();
            handleClose();
        } catch (error) {
            console.error("Error creating pickup route:", error);
            setErrorMessage("作成に失敗しました");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        setErrorMessage(null);
        if (!editingRoute) return;
        setIsSubmitting(true);
        try {
            await deletePickupRoute(editingRoute.id);
            router.refresh();
            handleClose();
        } catch (error) {
            console.error("Error deleting pickup route:", error);
            setErrorMessage("削除に失敗しました");
        } finally {
            setIsSubmitting(false);
        }
    };

    // 実際にキャストを追加する処理
    const doAddPassenger = (tripNumber: number, attendee: TodayAttendee) => {
        // Check if already added to this trip
        const exists = passengers.some(
            (p) => p.cast_profile_id === attendee.profile_id && p.trip_number === tripNumber
        );
        if (exists) return;

        const newPassenger: PassengerEntry = {
            id: `new-${Date.now()}-${Math.random()}`,
            cast_profile_id: attendee.profile_id,
            cast_name: attendee.display_name,
            trip_number: tripNumber,
            order_index: passengers.filter((p) => p.trip_number === tripNumber).length,
            pickup_destination: attendee.pickup_destination,
        };
        setPassengers([...passengers, newPassenger]);
    };

    // キャスト追加時に他のルートに割り当て済みかチェック
    const addPassenger = (tripNumber: number, attendee: TodayAttendee) => {
        const assignedRoute = getAssignedRoute(attendee.profile_id);
        if (assignedRoute) {
            // 他のルートに割り当て済み → 確認ダイアログを表示
            setMoveConfirm({
                attendee,
                tripNumber,
                fromRouteName: assignedRoute.driver_name || `ルート`,
            });
        } else {
            doAddPassenger(tripNumber, attendee);
        }
    };

    // 移動確認OKの場合
    const handleMoveConfirm = () => {
        if (moveConfirm) {
            doAddPassenger(moveConfirm.tripNumber, moveConfirm.attendee);
            setMoveConfirm(null);
        }
    };

    const removePassenger = (passengerId: string) => {
        setPassengers(passengers.filter((p) => p.id !== passengerId));
    };

    const handleDragStart = (e: React.DragEvent, passenger: PassengerEntry) => {
        setDraggedItem(passenger);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: React.DragEvent, tripNumber: number, index: number) => {
        e.preventDefault();
        setDragOverIndex({ trip: tripNumber, index });
    };

    const handleDrop = (e: React.DragEvent, tripNumber: number, dropIndex: number) => {
        e.preventDefault();
        if (!draggedItem) return;

        const newPassengers = passengers.filter((p) => p.id !== draggedItem.id);
        const updatedItem = { ...draggedItem, trip_number: tripNumber };

        // Insert at the correct position - ソートしてから処理
        const tripPassengers = newPassengers
            .filter((p) => p.trip_number === tripNumber)
            .sort((a, b) => a.order_index - b.order_index);
        const otherPassengers = newPassengers.filter((p) => p.trip_number !== tripNumber);

        tripPassengers.splice(dropIndex, 0, updatedItem);

        // Recalculate order_index
        const reorderedTrip = tripPassengers.map((p, idx) => ({
            ...p,
            order_index: idx,
        }));

        setPassengers([...otherPassengers, ...reorderedTrip]);
        setDraggedItem(null);
        setDragOverIndex(null);
    };

    const handleDragEnd = () => {
        setDraggedItem(null);
        setDragOverIndex(null);
    };

    // 順番を上に移動
    const moveUp = (tripNumber: number, currentIndex: number) => {
        if (currentIndex === 0) return;
        const tripPassengers = passengers
            .filter((p) => p.trip_number === tripNumber)
            .sort((a, b) => a.order_index - b.order_index);
        const otherPassengers = passengers.filter((p) => p.trip_number !== tripNumber);

        // Swap
        [tripPassengers[currentIndex - 1], tripPassengers[currentIndex]] =
            [tripPassengers[currentIndex], tripPassengers[currentIndex - 1]];

        // Recalculate order_index
        const reorderedTrip = tripPassengers.map((p, idx) => ({
            ...p,
            order_index: idx,
        }));

        setPassengers([...otherPassengers, ...reorderedTrip]);
    };

    // 順番を下に移動
    const moveDown = (tripNumber: number, currentIndex: number, totalCount: number) => {
        if (currentIndex >= totalCount - 1) return;
        const tripPassengers = passengers
            .filter((p) => p.trip_number === tripNumber)
            .sort((a, b) => a.order_index - b.order_index);
        const otherPassengers = passengers.filter((p) => p.trip_number !== tripNumber);

        // Swap
        [tripPassengers[currentIndex], tripPassengers[currentIndex + 1]] =
            [tripPassengers[currentIndex + 1], tripPassengers[currentIndex]];

        // Recalculate order_index
        const reorderedTrip = tripPassengers.map((p, idx) => ({
            ...p,
            order_index: idx,
        }));

        setPassengers([...otherPassengers, ...reorderedTrip]);
    };

    // Get available attendees (with destination, not already added to this trip)
    const getAvailableAttendees = (tripNumber: number) => {
        const addedIds = new Set(
            passengers
                .filter((p) => p.trip_number === tripNumber)
                .map((p) => p.cast_profile_id)
        );
        return attendees.filter(
            (a) => a.pickup_destination && !addedIds.has(a.profile_id)
        );
    };

    // Get excluded IDs for a specific trip (already added to that trip)
    const getExcludedIds = (tripNumber: number) => {
        return new Set(
            passengers
                .filter((p) => p.trip_number === tripNumber)
                .map((p) => p.cast_profile_id)
        );
    };

    // Open cast select modal for a specific trip
    const openCastModal = (tripNumber: number) => {
        setCastModalTripNumber(tripNumber);
        setIsCastModalOpen(true);
    };

    // Get passengers for a specific trip
    const getTripPassengers = (tripNumber: number) => {
        return passengers
            .filter((p) => p.trip_number === tripNumber)
            .sort((a, b) => a.order_index - b.order_index);
    };

    const tripCount = roundTrips + 1;

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="p-0 overflow-hidden flex flex-col max-h-[90vh] rounded-2xl">
                <DialogHeader className="sticky top-0 z-10 bg-white dark:bg-gray-900 flex !flex-row items-center gap-2 h-14 min-h-[3.5rem] flex-shrink-0 border-b border-gray-200 dark:border-gray-700 px-4">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <DialogTitle className="flex-1 text-center text-lg font-semibold text-gray-900 dark:text-white truncate">
                        {editingRoute ? "送迎ルート編集" : "送迎ルート作成"}
                    </DialogTitle>
                    {editingRoute ? (
                        <button
                            type="button"
                            onClick={() => setShowDeleteConfirm(true)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                            aria-label="削除"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    ) : (
                        <div className="w-8 h-8" />
                    )}
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
                {moveConfirm ? (
                    <div className="space-y-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            <span className="font-medium text-gray-900 dark:text-white">
                                {moveConfirm.attendee.display_name}
                            </span>
                            さんは既に
                            <span className="font-medium text-gray-900 dark:text-white">
                                「{moveConfirm.fromRouteName}」
                            </span>
                            に割り当てられています。
                            <br />
                            このルートに移動しますか？
                        </p>
                        <DialogFooter className="gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setMoveConfirm(null)}
                            >
                                キャンセル
                            </Button>
                            <Button
                                onClick={handleMoveConfirm}
                                className="bg-blue-600 text-white hover:bg-blue-700"
                            >
                                移動する
                            </Button>
                        </DialogFooter>
                    </div>
                ) : showDeleteConfirm ? (
                    <div className="space-y-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            この送迎ルートを削除しますか？
                        </p>
                        <DialogFooter className="gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setShowDeleteConfirm(false)}
                            >
                                キャンセル
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleDelete}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? "削除中..." : "削除"}
                            </Button>
                        </DialogFooter>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Driver */}
                        <div className="space-y-1.5">
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                ドライバー
                            </Label>
                            <button
                                type="button"
                                onClick={() => setIsDriverModalOpen(true)}
                                className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                <span className={`text-sm ${driverName ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"}`}>
                                    {driverName || "未定"}
                                </span>
                                <ChevronRight className="h-4 w-4 text-gray-400" />
                            </button>
                        </div>

                        {/* Round trips */}
                        <div className="space-y-1.5">
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                戻り回数
                            </Label>
                            <Select
                                value={roundTrips.toString()}
                                onValueChange={(v) => setRoundTrips(parseInt(v))}
                            >
                                <SelectTrigger className="h-10 border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {[0, 1, 2, 3].map((n) => (
                                        <SelectItem key={n} value={n.toString()}>
                                            {n}回
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Capacity */}
                        <div className="space-y-1.5">
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                人数上限
                            </Label>
                            <Input
                                type="number"
                                min={1}
                                max={10}
                                value={capacity}
                                onChange={(e) => setCapacity(parseInt(e.target.value) || 3)}
                                className="h-10 rounded-lg border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
                            />
                        </div>

                        {/* Departure Time */}
                        <div className="space-y-1.5">
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                出発予定時間
                            </Label>
                            <Input
                                type="time"
                                value={departureTime}
                                onChange={(e) => setDepartureTime(e.target.value)}
                                className="h-10 rounded-lg border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
                            />
                        </div>

                        {/* Return Departure Time (only when roundTrips > 0) */}
                        {roundTrips > 0 && (
                            <div className="space-y-1.5">
                                <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                    戻り便の出発時間
                                </Label>
                                <Input
                                    type="time"
                                    value={returnDepartureTime}
                                    onChange={(e) => setReturnDepartureTime(e.target.value)}
                                    placeholder="指定しない場合は1便目の店舗着時間"
                                    className="h-10 rounded-lg border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    未指定の場合、出発便の店舗着時間に出発します
                                </p>
                            </div>
                        )}

                        {/* Road Settings */}
                        <div className="space-y-3 rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800/50">
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                道路設定
                            </Label>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                    高速道路を避ける
                                </span>
                                <Switch
                                    checked={avoidHighways}
                                    onCheckedChange={setAvoidHighways}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                    有料道路を避ける
                                </span>
                                <Switch
                                    checked={avoidTolls}
                                    onCheckedChange={setAvoidTolls}
                                />
                            </div>
                        </div>

                        {/* Passengers by trip */}
                        {Array.from({ length: tripCount }, (_, i) => i + 1).map((tripNum) => {
                            const tripPassengers = getTripPassengers(tripNum);
                            const availableAttendees = getAvailableAttendees(tripNum);

                            return (
                                <div key={tripNum} className="space-y-2">
                                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                        {tripCount > 1 ? `${tripNum}便目` : "乗車キャスト"}
                                    </Label>

                                    {/* Passenger list */}
                                    <div
                                        className="min-h-[60px] rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-2 space-y-1"
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                            if (tripPassengers.length === 0) {
                                                setDragOverIndex({ trip: tripNum, index: 0 });
                                            }
                                        }}
                                        onDrop={(e) => handleDrop(e, tripNum, tripPassengers.length)}
                                    >
                                        {tripPassengers.length === 0 ? (
                                            availableAttendees.length > 0 ? (
                                                <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">
                                                    キャストを追加してください
                                                </p>
                                            ) : null
                                        ) : (
                                            tripPassengers.map((passenger, index) => (
                                                <div
                                                    key={passenger.id}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, passenger)}
                                                    onDragOver={(e) => handleDragOver(e, tripNum, index)}
                                                    onDrop={(e) => handleDrop(e, tripNum, index)}
                                                    onDragEnd={handleDragEnd}
                                                    className={`flex items-center gap-2 bg-white dark:bg-gray-900 rounded-lg px-2 py-1.5 cursor-move border ${
                                                        dragOverIndex?.trip === tripNum &&
                                                        dragOverIndex?.index === index
                                                            ? "border-blue-500"
                                                            : "border-transparent"
                                                    } ${
                                                        draggedItem?.id === passenger.id
                                                            ? "opacity-50"
                                                            : ""
                                                    }`}
                                                >
                                                    <div className="flex flex-col">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                moveUp(tripNum, index);
                                                            }}
                                                            disabled={index === 0}
                                                            className="p-0.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded disabled:opacity-30"
                                                        >
                                                            <ChevronUp className="h-3 w-3 text-gray-400" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                moveDown(tripNum, index, tripPassengers.length);
                                                            }}
                                                            disabled={index === tripPassengers.length - 1}
                                                            className="p-0.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded disabled:opacity-30"
                                                        >
                                                            <ChevronDown className="h-3 w-3 text-gray-400" />
                                                        </button>
                                                    </div>
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                                        {index + 1}.
                                                    </span>
                                                    <span className="flex-1 text-sm text-gray-900 dark:text-white">
                                                        {passenger.cast_name}
                                                    </span>
                                                    {passenger.pickup_destination && (
                                                        <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[100px]">
                                                            {passenger.pickup_destination}
                                                        </span>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            removePassenger(passenger.id);
                                                        }}
                                                        className="p-1 hover:bg-gray-50 dark:hover:bg-gray-700 rounded"
                                                    >
                                                        <X className="h-3 w-3 text-gray-400" />
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    {/* Add passenger button */}
                                    {availableAttendees.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => openCastModal(tripNum)}
                                            className="w-full h-9 px-3 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
                                        >
                                            <Plus className="h-5 w-5 text-gray-400" />
                                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                                キャストを追加
                                            </span>
                                        </button>
                                    )}

                                    {/* Capacity warning */}
                                    {tripPassengers.length > capacity && (
                                        <p className="text-xs text-red-500">
                                            人数上限を超えています
                                        </p>
                                    )}
                                </div>
                            );
                        })}

                        {/* Error message */}
                        {errorMessage && (
                            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
                                <p className="text-sm text-red-600 dark:text-red-400">
                                    {errorMessage}
                                </p>
                            </div>
                        )}

                        {/* 新規作成時のみフッターを表示 */}
                        {!editingRoute && (
                            <DialogFooter className="gap-2">
                                <Button
                                    variant="outline"
                                    onClick={handleClose}
                                >
                                    キャンセル
                                </Button>
                                <Button
                                    onClick={handleCreate}
                                    disabled={isSubmitting}
                                    className="bg-blue-600 text-white hover:bg-blue-700"
                                >
                                    {isSubmitting ? "作成中..." : "作成"}
                                </Button>
                            </DialogFooter>
                        )}
                    </div>
                )}
                </div>
            </DialogContent>

            {/* Driver Select Modal */}
            <DriverSelectModal
                isOpen={isDriverModalOpen}
                onClose={() => setIsDriverModalOpen(false)}
                onSelect={(id, name) => {
                    setDriverProfileId(id || "");
                    setDriverName(name || "");
                }}
                staffProfiles={staffProfiles}
                selectedDriverId={driverProfileId || null}
            />

            {/* Cast Select Modal */}
            <CastSelectModal
                isOpen={isCastModalOpen}
                onClose={() => setIsCastModalOpen(false)}
                onSelect={(attendee) => {
                    addPassenger(castModalTripNumber, attendee);
                }}
                attendees={attendees}
                excludeIds={getExcludedIds(castModalTripNumber)}
            />
        </Dialog>
    );
}
