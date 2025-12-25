"use client";

import { useState, useMemo } from "react";
import { Search, UserCircle, ChevronLeft, Plus, Check } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Profile {
    id: string;
    display_name: string | null;
    display_name_kana: string | null;
    real_name: string | null;
    real_name_kana: string | null;
    avatar_url: string | null;
    role: string;
}

interface GuestSelectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onToggle: (profileId: string) => void;
    onAddNew: () => void;
    onViewProfile?: (profile: Profile) => void;
    profiles: Profile[];
    selectedIds: string[];
}

export function GuestSelectModal({
    isOpen,
    onClose,
    onToggle,
    onAddNew,
    onViewProfile,
    profiles,
    selectedIds,
}: GuestSelectModalProps) {
    const [search, setSearch] = useState("");

    // カタカナをひらがなに変換
    const toHiragana = (str: string) =>
        str.replace(/[\u30A1-\u30F6]/g, (match) =>
            String.fromCharCode(match.charCodeAt(0) - 0x60)
        );

    // 50音順にソート（ゲストのみ）
    const sortedProfiles = useMemo(() => {
        return [...profiles]
            .filter(profile => profile.role === "guest")
            .sort((a, b) => {
                const aName = a.display_name_kana || a.display_name || a.real_name_kana || a.real_name || "";
                const bName = b.display_name_kana || b.display_name || b.real_name_kana || b.real_name || "";
                return aName.localeCompare(bName, 'ja');
            });
    }, [profiles]);

    // 検索フィルター
    const filteredProfiles = useMemo(() => {
        const searchLower = toHiragana(search.toLowerCase());
        return sortedProfiles.filter(profile => {
            const displayName = toHiragana((profile.display_name || "").toLowerCase());
            const displayNameKana = toHiragana((profile.display_name_kana || "").toLowerCase());
            const realName = toHiragana((profile.real_name || "").toLowerCase());
            const realNameKana = toHiragana((profile.real_name_kana || "").toLowerCase());
            return displayName.includes(searchLower) ||
                displayNameKana.includes(searchLower) ||
                realName.includes(searchLower) ||
                realNameKana.includes(searchLower);
        });
    }, [sortedProfiles, search]);

    const handleToggle = (profileId: string) => {
        onToggle(profileId);
    };

    const totalCount = filteredProfiles.length;
    const selectedCount = selectedIds.length;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="p-0 overflow-hidden flex flex-col max-h-[90vh] rounded-2xl sm:max-w-md w-[95%] bg-white dark:bg-gray-900">
                <DialogHeader className="sticky top-0 z-10 bg-white dark:bg-gray-900 flex !flex-row items-center gap-2 h-14 min-h-[3.5rem] flex-shrink-0 border-b border-gray-200 dark:border-gray-700 px-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <DialogTitle className="flex-1 text-center text-lg font-semibold text-gray-900 dark:text-white truncate">
                        ゲストを選択
                        {selectedCount > 0 && (
                            <span className="ml-2 text-sm font-normal text-gray-500">
                                ({selectedCount}人選択中)
                            </span>
                        )}
                    </DialogTitle>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                            onClose();
                            onAddNew();
                        }}
                        className="h-8 w-8 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                    >
                        <Plus className="h-5 w-5" />
                    </Button>
                </DialogHeader>

                {/* Search */}
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            type="text"
                            placeholder="ゲスト名で検索..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 h-10 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                            autoFocus
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto">
                    {totalCount === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                            <UserCircle className="h-12 w-12 mb-3 text-gray-300 dark:text-gray-600" />
                            <p className="text-sm">
                                {search ? "該当するゲストがいません" : "ゲストがいません"}
                            </p>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    onClose();
                                    onAddNew();
                                }}
                                className="mt-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                            >
                                <Plus className="h-5 w-5 mr-1" />
                                新しいゲストを追加
                            </Button>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100 dark:divide-gray-800">
                            {filteredProfiles.map((profile) => {
                                const isSelected = selectedIds.includes(profile.id);
                                return (
                                    <div
                                        key={profile.id}
                                        className={`w-full px-4 py-3 flex items-center gap-3 ${
                                            isSelected
                                                ? "bg-blue-50 dark:bg-blue-900/20"
                                                : ""
                                        }`}
                                    >
                                        {/* Avatar - クリックでプロフィール詳細 */}
                                        <button
                                            type="button"
                                            onClick={() => onViewProfile?.(profile)}
                                            className="flex-shrink-0 hover:opacity-70 transition-opacity"
                                        >
                                            <Avatar className="h-10 w-10 border border-gray-200 dark:border-gray-700">
                                                <AvatarImage src={profile.avatar_url || undefined} alt={profile.display_name || profile.real_name || ""} />
                                                <AvatarFallback className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                                    {(profile.display_name || profile.real_name || "?").charAt(0)}
                                                </AvatarFallback>
                                            </Avatar>
                                        </button>

                                        {/* Info - クリックで選択/解除 */}
                                        <button
                                            type="button"
                                            onClick={() => handleToggle(profile.id)}
                                            className="flex-1 min-w-0 text-left hover:opacity-70 transition-opacity"
                                        >
                                            <p className={`text-sm font-medium truncate ${
                                                isSelected
                                                    ? "text-blue-600 dark:text-blue-400"
                                                    : "text-gray-900 dark:text-white"
                                            }`}>
                                                {profile.display_name || profile.real_name || "名前未設定"}
                                            </p>
                                            {profile.display_name && profile.real_name && profile.display_name !== profile.real_name && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                    {profile.real_name}
                                                </p>
                                            )}
                                        </button>

                                        {/* Selected indicator */}
                                        <button
                                            type="button"
                                            onClick={() => handleToggle(profile.id)}
                                            className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                                                isSelected
                                                    ? "bg-blue-600 text-white"
                                                    : "border-2 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                                            }`}
                                        >
                                            {isSelected && <Check className="w-4 h-4" />}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
