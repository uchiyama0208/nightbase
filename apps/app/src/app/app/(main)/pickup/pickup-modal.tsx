"use client";

import { useState, useEffect, useCallback } from "react";
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
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { GripVertical, X, Trash2, ArrowLeft, MoreHorizontal, ChevronUp, ChevronDown } from "lucide-react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    createPickupRoute,
    updatePickupRoute,
    deletePickupRoute,
    type PickupRouteWithPassengers,
    type TodayAttendee,
} from "./actions";

interface PickupModalProps {
    isOpen: boolean;
    onClose: () => void;
    editingRoute: PickupRouteWithPassengers | null;
    allRoutes: PickupRouteWithPassengers[];
    attendees: TodayAttendee[];
    staffProfiles: { id: string; display_name: string; role: string }[];
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
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // 移動確認ダイアログ用
    const [moveConfirm, setMoveConfirm] = useState<{
        attendee: TodayAttendee;
        tripNumber: number;
        fromRouteName: string;
    } | null>(null);

    // Form state
    const [driverProfileId, setDriverProfileId] = useState<string>("");
    const [roundTrips, setRoundTrips] = useState(0);
    const [capacity, setCapacity] = useState(3);
    const [passengers, setPassengers] = useState<PassengerEntry[]>([]);

    // Drag state
    const [draggedItem, setDraggedItem] = useState<PassengerEntry | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<{ trip: number; index: number } | null>(null);

    // Initialize form when editing
    useEffect(() => {
        if (editingRoute) {
            setDriverProfileId(editingRoute.driver_profile_id || "");
            setRoundTrips(editingRoute.round_trips);
            setCapacity(editingRoute.capacity);
            setPassengers(editingRoute.passengers.map((p) => ({ ...p })));
        } else {
            setDriverProfileId("");
            setRoundTrips(0);
            setCapacity(3);
            setPassengers([]);
        }
    }, [editingRoute, isOpen]);

    const handleClose = () => {
        setShowDeleteConfirm(false);
        setErrorMessage(null);
        setMoveConfirm(null);
        setIsMenuOpen(false);
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

    const handleSubmit = async () => {
        setIsSubmitting(true);
        setErrorMessage(null);
        try {
            const formData = new FormData();
            formData.append("storeId", storeId);
            formData.append("date", date);
            formData.append("driverProfileId", driverProfileId || "");
            formData.append("roundTrips", roundTrips.toString());
            formData.append("capacity", capacity.toString());
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

            if (editingRoute) {
                formData.append("routeId", editingRoute.id);
                await updatePickupRoute(formData);
            } else {
                await createPickupRoute(formData);
            }

            router.refresh();
            handleClose();
        } catch (error) {
            console.error("Error saving pickup route:", error);
            setErrorMessage("保存に失敗しました");
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

    // Get passengers for a specific trip
    const getTripPassengers = (tripNumber: number) => {
        return passengers
            .filter((p) => p.trip_number === tripNumber)
            .sort((a, b) => a.order_index - b.order_index);
    };

    const tripCount = roundTrips + 1;

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900 max-h-[90vh] overflow-y-auto">
                <DialogHeader className="relative flex flex-row items-center justify-center space-y-0 pb-2">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="absolute left-0 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    </button>
                    <DialogTitle className="text-base font-semibold text-gray-900 dark:text-gray-50">
                        {editingRoute ? "送迎ルート編集" : "送迎ルート作成"}
                    </DialogTitle>
                    {editingRoute && (
                        <Popover open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                            <PopoverTrigger asChild>
                                <button
                                    type="button"
                                    className="absolute right-0 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                >
                                    <MoreHorizontal className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                                </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-40 p-1" align="end">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsMenuOpen(false);
                                        setShowDeleteConfirm(true);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    削除
                                </button>
                            </PopoverContent>
                        </Popover>
                    )}
                </DialogHeader>

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
                                className="rounded-lg"
                            >
                                キャンセル
                            </Button>
                            <Button
                                onClick={handleMoveConfirm}
                                className="rounded-lg bg-blue-600 text-white hover:bg-blue-700"
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
                                className="rounded-lg"
                            >
                                キャンセル
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleDelete}
                                disabled={isSubmitting}
                                className="rounded-lg"
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
                            <Select
                                value={driverProfileId || "__none__"}
                                onValueChange={(v) => setDriverProfileId(v === "__none__" ? "" : v)}
                            >
                                <SelectTrigger className="h-10 rounded-lg border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                                    <SelectValue placeholder="未定" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__none__">未定</SelectItem>
                                    {staffProfiles.filter(s => s.role === "staff" || s.role === "admin").length > 0 && (
                                        <SelectGroup>
                                            <SelectLabel className="text-xs text-gray-500 dark:text-gray-400">スタッフ</SelectLabel>
                                            {staffProfiles
                                                .filter(s => s.role === "staff" || s.role === "admin")
                                                .map((staff) => (
                                                    <SelectItem key={staff.id} value={staff.id}>
                                                        {staff.display_name}
                                                    </SelectItem>
                                                ))}
                                        </SelectGroup>
                                    )}
                                    {staffProfiles.filter(s => s.role === "partner").length > 0 && (
                                        <SelectGroup>
                                            <SelectLabel className="text-xs text-gray-500 dark:text-gray-400">パートナー</SelectLabel>
                                            {staffProfiles
                                                .filter(s => s.role === "partner")
                                                .map((partner) => (
                                                    <SelectItem key={partner.id} value={partner.id}>
                                                        {partner.display_name}
                                                    </SelectItem>
                                                ))}
                                        </SelectGroup>
                                    )}
                                </SelectContent>
                            </Select>
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
                                <SelectTrigger className="h-10 rounded-lg border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
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
                                            <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">
                                                キャストを追加してください
                                            </p>
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
                                                            className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-30"
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
                                                            className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-30"
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
                                                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                                                    >
                                                        <X className="h-3 w-3 text-gray-400" />
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    {/* Add passenger dropdown */}
                                    {availableAttendees.length > 0 && (
                                        <Select
                                            value={undefined}
                                            onValueChange={(profileId) => {
                                                const attendee = attendees.find(
                                                    (a) => a.profile_id === profileId
                                                );
                                                if (attendee) {
                                                    addPassenger(tripNum, attendee);
                                                }
                                            }}
                                        >
                                            <SelectTrigger className="h-9 rounded-lg border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 text-sm">
                                                <SelectValue placeholder="キャストを追加..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availableAttendees.map((attendee) => (
                                                    <SelectItem
                                                        key={attendee.profile_id}
                                                        value={attendee.profile_id}
                                                    >
                                                        {attendee.display_name}
                                                        {attendee.pickup_destination && (
                                                            <span className="text-gray-400 ml-2">
                                                                ({attendee.pickup_destination})
                                                            </span>
                                                        )}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
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

                        <DialogFooter className="gap-2 mt-6">
                            <Button
                                variant="outline"
                                onClick={handleClose}
                                className="rounded-lg"
                            >
                                キャンセル
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                            >
                                {isSubmitting ? "保存中..." : "保存"}
                            </Button>
                        </DialogFooter>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
