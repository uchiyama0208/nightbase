"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, Check, X, User } from "lucide-react";

export interface SelectedGuest {
    id: string;
    display_name: string;
    cast?: {
        id: string;
        display_name: string;
        nomination_type: "shimei" | "douhan" | "banai";
    } | null;
}

interface GuestSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    guests: { id: string; display_name: string }[];
    selectedGuests: SelectedGuest[];
    onConfirm: (guests: SelectedGuest[]) => void;
    title?: string;
}

export function GuestSelectorModal({
    isOpen,
    onClose,
    guests,
    selectedGuests,
    onConfirm,
    title = "ゲストを選択",
}: GuestSelectorModalProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [tempSelected, setTempSelected] = useState<SelectedGuest[]>([]);

    // モーダルが開いたときに選択状態をリセット
    useEffect(() => {
        if (isOpen) {
            setTempSelected(selectedGuests);
            setSearchQuery("");
        }
    }, [isOpen, selectedGuests]);

    // 検索フィルタ
    const filteredGuests = useMemo(() => {
        if (!searchQuery) return guests;
        const query = searchQuery.toLowerCase();
        return guests.filter((g) =>
            g.display_name.toLowerCase().includes(query)
        );
    }, [guests, searchQuery]);

    const isSelected = (guestId: string) => {
        return tempSelected.some((g) => g.id === guestId);
    };

    const toggleGuest = (guest: { id: string; display_name: string }) => {
        if (isSelected(guest.id)) {
            setTempSelected(tempSelected.filter((g) => g.id !== guest.id));
        } else {
            setTempSelected([
                ...tempSelected,
                { id: guest.id, display_name: guest.display_name, cast: null },
            ]);
        }
    };

    const handleConfirm = () => {
        onConfirm(tempSelected);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-md rounded-2xl border border-gray-200 bg-white p-0 shadow-xl dark:border-gray-800 dark:bg-gray-900 max-h-[80vh] flex flex-col">
                <DialogHeader className="p-4 pb-2 space-y-3">
                    <DialogTitle className="text-base font-semibold text-gray-900 dark:text-gray-50">
                        {title}
                    </DialogTitle>
                    {/* 検索バー */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="名前で検索..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-10 rounded-lg"
                        />
                    </div>
                </DialogHeader>

                {/* 選択済みタグ */}
                {tempSelected.length > 0 && (
                    <div className="px-4 py-2 flex flex-wrap gap-2 border-b border-gray-100 dark:border-gray-800">
                        {tempSelected.map((guest) => (
                            <span
                                key={guest.id}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium"
                            >
                                {guest.display_name}
                                <button
                                    type="button"
                                    onClick={() => toggleGuest(guest)}
                                    className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </span>
                        ))}
                    </div>
                )}

                {/* ゲストリスト */}
                <div className="flex-1 overflow-y-auto px-2 py-2">
                    {filteredGuests.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                            {searchQuery ? "該当するゲストがいません" : "ゲストが登録されていません"}
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {filteredGuests.map((guest) => (
                                <button
                                    key={guest.id}
                                    type="button"
                                    onClick={() => toggleGuest(guest)}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                                        isSelected(guest.id)
                                            ? "bg-blue-50 dark:bg-blue-900/20"
                                            : "hover:bg-gray-50 dark:hover:bg-gray-800"
                                    }`}
                                >
                                    <div
                                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                            isSelected(guest.id)
                                                ? "bg-blue-500 text-white"
                                                : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                                        }`}
                                    >
                                        {isSelected(guest.id) ? (
                                            <Check className="h-4 w-4" />
                                        ) : (
                                            <User className="h-4 w-4" />
                                        )}
                                    </div>
                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        {guest.display_name}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <DialogFooter className="p-4 pt-2 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                        {tempSelected.length}名選択中
                    </span>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="rounded-lg"
                        >
                            キャンセル
                        </Button>
                        <Button
                            onClick={handleConfirm}
                            className="rounded-lg"
                        >
                            確定
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
