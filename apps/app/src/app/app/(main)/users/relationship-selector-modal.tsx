"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Search, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserCircle } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Profile {
    id: string;
    display_name: string | null;
    display_name_kana?: string | null;
    real_name: string | null;
    role: string;
    avatar_url?: string | null;
}

interface RelationshipSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    profiles: Profile[];
    selectedIds: string[];
    onSelectionChange: (selectedIds: string[]) => void;
    currentProfileId?: string;
}

const roleLabels: Record<string, string> = {
    cast: "キャスト",
    staff: "スタッフ",
    guest: "ゲスト",
};

export function RelationshipSelectorModal({
    isOpen,
    onClose,
    title,
    profiles,
    selectedIds,
    onSelectionChange,
    currentProfileId,
}: RelationshipSelectorModalProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [roleFilter, setRoleFilter] = useState<string | null>("cast");
    const [localSelectedIds, setLocalSelectedIds] = useState<string[]>(selectedIds);
    const roleIndex = useMemo(() => {
        if (roleFilter === "cast") return 0;
        if (roleFilter === "staff") return 1;
        if (roleFilter === "guest") return 2;
        return 0;
    }, [roleFilter]);

    const suggestionItems = useMemo(
        () =>
            Array.from(
                new Set(
                    profiles
                        .map(
                            (profile) =>
                                profile.display_name ||
                                profile.real_name ||
                                profile.display_name_kana ||
                                "",
                        )
                        .filter(Boolean),
                ),
            ) as string[],
        [profiles],
    );

    useEffect(() => {
        setLocalSelectedIds(selectedIds);
    }, [selectedIds]);

    useEffect(() => {
        if (!isOpen) {
            setSearchQuery("");
            setRoleFilter("cast");
        }
    }, [isOpen]);

    const filteredProfiles = profiles
        .filter((p) => p.id !== currentProfileId)
        .filter((p) => {
            const matchesSearch =
                !searchQuery ||
                p.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.real_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.display_name_kana?.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesRole = !roleFilter || p.role === roleFilter;
            return matchesSearch && matchesRole;
        });

    const toggleSelection = (profileId: string) => {
        setLocalSelectedIds((prev) =>
            prev.includes(profileId)
                ? prev.filter((id) => id !== profileId)
                : [...prev, profileId]
        );
    };

    const handleSave = () => {
        onSelectionChange(localSelectedIds);
        onClose();
    };

    const handleCancel = () => {
        setLocalSelectedIds(selectedIds);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open) {
                handleCancel();
            }
        }}>
            <DialogContent
                className="sm:max-w-[600px] bg-white dark:bg-gray-800 w-[95%] rounded-lg max-h-[90vh] flex flex-col p-0"
                onPointerDownOutside={(e) => {
                    e.preventDefault();
                    handleCancel();
                }}
                onEscapeKeyDown={(e) => {
                    e.preventDefault();
                    handleCancel();
                }}
                onInteractOutside={(e) => {
                    e.preventDefault();
                }}
            >
                <DialogHeader className="flex flex-row items-center justify-between gap-2 px-3 py-6 pb-4 relative">
                    <button
                        type="button"
                        onClick={handleCancel}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-0"
                        aria-label="戻る"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <DialogTitle className="flex-1 text-center text-xl md:text-2xl font-bold text-gray-900 dark:text-white truncate">
                        {title}
                    </DialogTitle>
                    <div className="w-8 h-8" />
                </DialogHeader>
                <DialogDescription className="sr-only">
                    {title}を選択してください
                </DialogDescription>

                <div className="px-3 space-y-4 flex-1 overflow-hidden flex flex-col">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            type="text"
                            placeholder="名前で検索..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 rounded-md"
                        />
                    </div>

                    {/* Role Filter - Toggle Button Style */}
                    {(title !== "指名" && title !== "担当") && (
                        <div className="relative inline-flex h-10 items-center rounded-full bg-gray-100 dark:bg-gray-800 p-1 w-fit mx-auto">
                            <div
                                className="absolute h-8 rounded-full bg-white dark:bg-gray-700 shadow-sm transition-transform duration-300 ease-in-out"
                                style={{
                                    width: "72px",
                                    left: "4px",
                                    transform: `translateX(calc(${roleIndex} * 72px))`
                                }}
                            />
                            {["cast", "staff", "guest"].map((role) => (
                                <button
                                    key={role}
                                    onClick={() => setRoleFilter(role)}
                                    className={`relative z-10 w-[72px] flex items-center justify-center h-8 rounded-full text-sm font-medium transition-colors duration-200 ${roleFilter === role
                                        ? "text-gray-900 dark:text-white"
                                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                        }`}
                                >
                                    {roleLabels[role]}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Profile List */}
                    <div className="flex-1 overflow-y-auto -mx-3 px-3">
                        <div className="space-y-1.5">
                            {filteredProfiles.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    該当するメンバーが見つかりません
                                </div>
                            ) : (
                                filteredProfiles.map((profile) => (
                                    <button
                                        key={profile.id}
                                        onClick={() => toggleSelection(profile.id)}
                                        className="w-full flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                    >
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={profile.avatar_url || ""} />
                                            <AvatarFallback className="bg-gray-200 dark:bg-gray-700">
                                                <UserCircle className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 text-left min-w-0">
                                            <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                {profile.display_name || profile.real_name || "名前なし"}
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                {roleLabels[profile.role] || profile.role}
                                            </div>
                                        </div>
                                        <div className="flex-shrink-0">
                                            <div
                                                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${localSelectedIds.includes(profile.id)
                                                    ? "bg-blue-600 border-blue-600"
                                                    : "border-gray-300 dark:border-gray-600"
                                                    }`}
                                            >
                                                {localSelectedIds.includes(profile.id) && (
                                                    <Check className="h-3 w-3 text-white" />
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-3 py-6 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
                    <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
                        {localSelectedIds.length}人選択中
                    </div>
                    <Button
                        onClick={handleSave}
                        className="w-full rounded-full"
                    >
                        保存する
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancel}
                        className="w-full rounded-full border-gray-300 dark:border-gray-600"
                    >
                        キャンセル
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
