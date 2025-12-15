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

export type NominationType = "shimei" | "douhan" | "banai";

export interface SelectedCast {
    id: string;
    display_name: string;
    nomination_type: NominationType;
}

const NOMINATION_TYPES: { value: NominationType; label: string; color: string }[] = [
    { value: "shimei", label: "指名", color: "bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300" },
    { value: "douhan", label: "同伴", color: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300" },
    { value: "banai", label: "場内", color: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" },
];

interface CastSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    casts: { id: string; display_name: string }[];
    selectedCasts: SelectedCast[];
    onConfirm: (casts: SelectedCast[]) => void;
    title?: string;
    guestName?: string; // 紐づくゲスト名（表示用）
}

export function CastSelectorModal({
    isOpen,
    onClose,
    casts,
    selectedCasts,
    onConfirm,
    title = "キャストを選択",
    guestName,
}: CastSelectorModalProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [tempSelected, setTempSelected] = useState<SelectedCast[]>([]);

    // モーダルが開いたときに選択状態をリセット
    useEffect(() => {
        if (isOpen) {
            setTempSelected(selectedCasts);
            setSearchQuery("");
        }
    }, [isOpen, selectedCasts]);

    // 検索フィルタ
    const filteredCasts = useMemo(() => {
        if (!searchQuery) return casts;
        const query = searchQuery.toLowerCase();
        return casts.filter((c) =>
            c.display_name.toLowerCase().includes(query)
        );
    }, [casts, searchQuery]);

    const getSelectedCast = (castId: string) => {
        return tempSelected.find((c) => c.id === castId);
    };

    const isSelected = (castId: string) => {
        return tempSelected.some((c) => c.id === castId);
    };

    const selectCast = (cast: { id: string; display_name: string }, type: NominationType) => {
        const existing = getSelectedCast(cast.id);
        if (existing) {
            // タイプを変更
            setTempSelected(
                tempSelected.map((c) =>
                    c.id === cast.id ? { ...c, nomination_type: type } : c
                )
            );
        } else {
            // 新規追加
            setTempSelected([
                ...tempSelected,
                { id: cast.id, display_name: cast.display_name, nomination_type: type },
            ]);
        }
    };

    const removeCast = (castId: string) => {
        setTempSelected(tempSelected.filter((c) => c.id !== castId));
    };

    const handleConfirm = () => {
        onConfirm(tempSelected);
        onClose();
    };

    const getNominationLabel = (type: NominationType) => {
        return NOMINATION_TYPES.find((t) => t.value === type)?.label || type;
    };

    const getNominationColor = (type: NominationType) => {
        return NOMINATION_TYPES.find((t) => t.value === type)?.color || "";
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-md rounded-2xl border border-gray-200 bg-white p-0 shadow-xl dark:border-gray-800 dark:bg-gray-900 max-h-[80vh] flex flex-col">
                <DialogHeader className="p-4 pb-2 space-y-3">
                    <div>
                        <DialogTitle className="text-base font-semibold text-gray-900 dark:text-gray-50">
                            {title}
                        </DialogTitle>
                        {guestName && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                対象: {guestName}
                            </p>
                        )}
                    </div>
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
                        {tempSelected.map((cast) => (
                            <span
                                key={cast.id}
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getNominationColor(cast.nomination_type)}`}
                            >
                                {cast.display_name}
                                <span className="text-[10px] opacity-70">
                                    ({getNominationLabel(cast.nomination_type)})
                                </span>
                                <button
                                    type="button"
                                    onClick={() => removeCast(cast.id)}
                                    className="hover:opacity-70 rounded-full p-0.5"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </span>
                        ))}
                    </div>
                )}

                {/* キャストリスト */}
                <div className="flex-1 overflow-y-auto px-2 py-2">
                    {filteredCasts.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                            {searchQuery ? "該当するキャストがいません" : "キャストが登録されていません"}
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {filteredCasts.map((cast) => {
                                const selected = getSelectedCast(cast.id);
                                return (
                                    <div
                                        key={cast.id}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                                            selected
                                                ? "bg-pink-50 dark:bg-pink-900/10"
                                                : "hover:bg-gray-50 dark:hover:bg-gray-800"
                                        }`}
                                    >
                                        <div
                                            className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                                selected
                                                    ? "bg-pink-500 text-white"
                                                    : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                                            }`}
                                        >
                                            {selected ? (
                                                <Check className="h-4 w-4" />
                                            ) : (
                                                <User className="h-4 w-4" />
                                            )}
                                        </div>
                                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 flex-1">
                                            {cast.display_name}
                                        </span>
                                        {/* 指名タイプボタン */}
                                        <div className="flex gap-1">
                                            {NOMINATION_TYPES.map((type) => (
                                                <button
                                                    key={type.value}
                                                    type="button"
                                                    onClick={() => selectCast(cast, type.value)}
                                                    className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                                                        selected?.nomination_type === type.value
                                                            ? type.color
                                                            : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                                                    }`}
                                                >
                                                    {type.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
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
