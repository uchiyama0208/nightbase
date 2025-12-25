"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type PickupFormProps = {
    profileId?: string;
    pickupHistory: string[];
    onValidationChange: (isValid: boolean) => void;
    isDarkMode: boolean;
    onPickupChange?: (required: boolean) => void;
    onDestinationChange?: (destination: string) => void;
    onDeleteDestination?: (destination: string) => Promise<void>;
    pickupEnabled?: boolean;
};

export function PickupForm({
    pickupHistory,
    onValidationChange,
    isDarkMode,
    onPickupChange,
    onDestinationChange,
    onDeleteDestination,
    pickupEnabled = true,
}: PickupFormProps) {
    const [pickupRequired, setPickupRequired] = useState<boolean | null>(null);
    const [destination, setDestination] = useState("");
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handlePickupChange = (value: boolean) => {
        setPickupRequired(value);
        if (onPickupChange) onPickupChange(value);

        // Validate when pickup selection changes
        if (value === false) {
            onValidationChange(true); // No pickup = valid
        } else {
            // Check if destination is filled
            onValidationChange(destination.trim() !== "");
            if (onDestinationChange) onDestinationChange(destination);
        }
    };

    const handleDestinationChange = (value: string) => {
        setDestination(value);

        // Validate when destination changes
        if (pickupRequired === true) {
            onValidationChange(value.trim() !== "");
            if (onDestinationChange) onDestinationChange(value);
        }
    };

    const handleDeleteClick = (e: React.MouseEvent, dest: string) => {
        e.stopPropagation();
        setDeleteTarget(dest);
    };

    const handleConfirmDelete = async () => {
        if (!deleteTarget || !onDeleteDestination) return;

        setIsDeleting(true);
        try {
            await onDeleteDestination(deleteTarget);
            // If the deleted destination was selected, clear the selection
            if (destination === deleteTarget) {
                setDestination("");
                if (pickupRequired === true) {
                    onValidationChange(false);
                }
            }
        } catch (error) {
            console.error("Failed to delete destination:", error);
        } finally {
            setIsDeleting(false);
            setDeleteTarget(null);
        }
    };

    // If pickup is not enabled, automatically set to "no pickup" and mark as valid
    useEffect(() => {
        if (!pickupEnabled) {
            setPickupRequired(false);
            onValidationChange(true);
            if (onPickupChange) onPickupChange(false);
        }
    }, [pickupEnabled, onValidationChange, onPickupChange]);

    // If pickup is not enabled, render hidden input with pickup_required=no
    if (!pickupEnabled) {
        return <input type="hidden" name="pickup_required" value="no" />;
    }

    return (
        <>
            <div className="space-y-3">
                <div className={`text-base font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>送迎の有無</div>
                <div className="grid grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={() => handlePickupChange(false)}
                        className={`px-6 py-4 rounded-xl border-2 font-semibold text-lg transition-all ${pickupRequired === false
                            ? "bg-blue-500 border-blue-500 text-white"
                            : isDarkMode
                                ? "bg-gray-800 border-gray-600 text-gray-200 hover:border-gray-400"
                                : "bg-white border-gray-300 text-gray-700 hover:border-gray-400"
                            }`}
                    >
                        送迎なし
                    </button>
                    <button
                        type="button"
                        onClick={() => handlePickupChange(true)}
                        className={`px-6 py-4 rounded-xl border-2 font-semibold text-lg transition-all ${pickupRequired === true
                            ? "bg-blue-500 border-blue-500 text-white"
                            : isDarkMode
                                ? "bg-gray-800 border-gray-600 text-gray-200 hover:border-gray-400"
                                : "bg-white border-gray-300 text-gray-700 hover:border-gray-400"
                            }`}
                    >
                        送迎あり
                    </button>
                </div>
            </div>

            <input type="hidden" name="pickup_required" value={pickupRequired === true ? "yes" : "no"} />

            {pickupRequired === true && (
                <div className="space-y-3">
                    <div className={`text-base font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>送迎先</div>
                    <div className="space-y-4">
                        <input
                            type="text"
                            name="pickup_destination_custom"
                            value={destination}
                            onChange={(e) => handleDestinationChange(e.target.value)}
                            placeholder="送迎先を入力"
                            className={`w-full rounded-lg px-4 py-3 text-base border placeholder:text-gray-400 ${isDarkMode
                                ? "bg-gray-800 border-gray-600 text-white placeholder:text-gray-500"
                                : "bg-white border-gray-300 text-gray-900"
                                }`}
                        />

                        {pickupHistory?.length > 0 && (
                            <div className="space-y-2">
                                <div className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>過去の履歴から選択</div>
                                <div className="flex flex-wrap gap-2">
                                    {pickupHistory.map((dest) => (
                                        <div
                                            key={dest}
                                            className={`flex items-center gap-1 pl-4 pr-1 py-2 rounded-lg text-sm border transition-colors ${destination === dest
                                                ? "bg-blue-500 border-blue-500 text-white"
                                                : isDarkMode
                                                    ? "bg-gray-800 border-gray-600 text-gray-200 hover:border-gray-400"
                                                    : "bg-white border-gray-300 text-gray-700 hover:border-gray-400"
                                                }`}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => handleDestinationChange(dest)}
                                                className="text-left"
                                            >
                                                {dest}
                                            </button>
                                            {onDeleteDestination && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => handleDeleteClick(e, dest)}
                                                    className={`p-1 rounded-full transition-colors ${destination === dest
                                                        ? "hover:bg-blue-600"
                                                        : isDarkMode
                                                            ? "hover:bg-gray-700"
                                                            : "hover:bg-gray-200"
                                                        }`}
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <DialogContent className="sm:max-w-sm rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
                    <DialogHeader className="space-y-1.5">
                        <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                            送迎先を削除
                        </DialogTitle>
                        <DialogDescription className="text-sm text-gray-600 dark:text-gray-400">
                            「{deleteTarget}」を履歴から削除しますか？
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex flex-col-reverse gap-2 mt-4">
                        <Button
                            variant="outline"
                            onClick={() => setDeleteTarget(null)}
                            className="w-full h-11 rounded-lg"
                            disabled={isDeleting}
                        >
                            キャンセル
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleConfirmDelete}
                            className="w-full h-11 rounded-lg"
                            disabled={isDeleting}
                        >
                            {isDeleting ? "削除中..." : "削除"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
