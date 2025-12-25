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
import { Search, Check, X, User, ChevronLeft, Plus } from "lucide-react";
import { UserEditModal } from "@/app/app/(main)/users/user-edit-modal";

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
    storeId?: string;
    onGuestCreated?: () => void;
}

export function GuestSelectorModal({
    isOpen,
    onClose,
    guests,
    selectedGuests,
    onConfirm,
    title = "ゲストを選択",
    storeId = "",
    onGuestCreated,
}: GuestSelectorModalProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [tempSelected, setTempSelected] = useState<SelectedGuest[]>([]);
    const [profileViewGuest, setProfileViewGuest] = useState<{ id: string; display_name: string; role: string; store_id: string } | null>(null);
    const [isCreateGuestOpen, setIsCreateGuestOpen] = useState(false);

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
            <DialogContent className="p-0 overflow-hidden flex flex-col max-h-[90vh] rounded-2xl">
                <DialogHeader className="sticky top-0 z-10 bg-white dark:bg-gray-900 flex !flex-row items-center gap-2 h-14 min-h-[3.5rem] flex-shrink-0 border-b border-gray-200 dark:border-gray-700 px-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 transition-colors"
                        aria-label="戻る"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <DialogTitle className="flex-1 text-center text-lg font-semibold text-gray-900 dark:text-white truncate">
                        {title}
                    </DialogTitle>
                    <button
                        type="button"
                        onClick={() => setIsCreateGuestOpen(true)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 transition-colors"
                        aria-label="新規ゲスト作成"
                    >
                        <Plus className="h-4 w-4" />
                    </button>
                </DialogHeader>

                {/* 検索バー */}
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="名前で検索..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-10 rounded-lg"
                        />
                    </div>
                </div>

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
                                <div
                                    key={guest.id}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                                        isSelected(guest.id)
                                            ? "bg-blue-50 dark:bg-blue-900/20"
                                            : "hover:bg-gray-50 dark:hover:bg-gray-700"
                                    }`}
                                >
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setProfileViewGuest({
                                                id: guest.id,
                                                display_name: guest.display_name,
                                                role: "guest",
                                                store_id: storeId,
                                            });
                                        }}
                                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                                            isSelected(guest.id)
                                                ? "bg-blue-500 text-white hover:bg-blue-600"
                                                : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                                        }`}
                                    >
                                        {isSelected(guest.id) ? (
                                            <Check className="h-4 w-4" />
                                        ) : (
                                            <User className="h-4 w-4" />
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => toggleGuest(guest)}
                                        className="flex-1 text-left"
                                    >
                                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {guest.display_name}
                                        </span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <DialogFooter className="p-4 pt-2 border-t border-gray-100 dark:border-gray-800 flex flex-col gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400 text-center">
                        {tempSelected.length}名選択中
                    </span>
                    <Button
                        onClick={handleConfirm}
                        className="w-full rounded-lg"
                    >
                        確定
                    </Button>
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="w-full rounded-lg"
                    >
                        キャンセル
                    </Button>
                </DialogFooter>
            </DialogContent>

            {/* プロフィールモーダル */}
            {profileViewGuest && (
                <UserEditModal
                    profile={profileViewGuest as any}
                    open={!!profileViewGuest}
                    onOpenChange={(open) => {
                        if (!open) setProfileViewGuest(null);
                    }}
                    isNested={true}
                />
            )}

            {/* 新規ゲスト作成モーダル */}
            {isCreateGuestOpen && (
                <UserEditModal
                    profile={null}
                    open={isCreateGuestOpen}
                    onOpenChange={(open) => {
                        if (!open) setIsCreateGuestOpen(false);
                    }}
                    isNested={true}
                    defaultRole="guest"
                    onCreated={() => {
                        setIsCreateGuestOpen(false);
                        onGuestCreated?.();
                    }}
                />
            )}
        </Dialog>
    );
}
