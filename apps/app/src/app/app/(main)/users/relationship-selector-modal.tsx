"use client";

import { useEffect, useMemo, useState, useRef } from "react";
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

    // Vercel-style tabs
    const roleTabsRef = useRef<{ [key: string]: HTMLButtonElement | null }>({});
    const [roleIndicatorStyle, setRoleIndicatorStyle] = useState({ left: 0, width: 0 });

    useEffect(() => {
        if (roleFilter) {
            const activeButton = roleTabsRef.current[roleFilter];
            if (activeButton) {
                setRoleIndicatorStyle({
                    left: activeButton.offsetLeft,
                    width: activeButton.offsetWidth,
                });
            }
        }
    }, [roleFilter]);

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
        const isCurrentlySelected = localSelectedIds.includes(profileId);
        const newSelectedIds = isCurrentlySelected
            ? localSelectedIds.filter((id) => id !== profileId)
            : [...localSelectedIds, profileId];
        setLocalSelectedIds(newSelectedIds);
        onSelectionChange(newSelectedIds);

        // 追加時はモーダルを閉じる
        if (!isCurrentlySelected) {
            onClose();
        }
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

                    {/* Role Filter - Vercel-style tabs */}
                    {(title !== "指名" && title !== "担当") && (
                        <div className="relative">
                            <div className="flex">
                                {["cast", "staff", "guest"].map((role) => (
                                    <button
                                        key={role}
                                        ref={(el) => { roleTabsRef.current[role] = el; }}
                                        type="button"
                                        onClick={() => setRoleFilter(role)}
                                        className={`flex-1 py-2 text-sm font-medium transition-colors relative ${
                                            roleFilter === role
                                                ? "text-gray-900 dark:text-white"
                                                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                                        }`}
                                    >
                                        {roleLabels[role]}
                                    </button>
                                ))}
                            </div>
                            <div
                                className="absolute bottom-0 h-0.5 bg-gray-900 dark:bg-white transition-all duration-200"
                                style={{ left: roleIndicatorStyle.left, width: roleIndicatorStyle.width }}
                            />
                            <div className="absolute bottom-0 left-0 right-0 h-px bg-gray-200 dark:bg-gray-700" />
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
                                    <div
                                        key={profile.id}
                                        className="w-full flex items-center gap-2.5 p-2.5 rounded-lg"
                                    >
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={profile.avatar_url || ""} />
                                            <AvatarFallback className="bg-gray-200 dark:bg-gray-700">
                                                <UserCircle className="h-5 w-5 text-gray-500 dark:text-gray-400" />
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
                                        <button
                                            type="button"
                                            onClick={() => toggleSelection(profile.id)}
                                            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                                                localSelectedIds.includes(profile.id)
                                                    ? "bg-blue-600 text-white hover:bg-blue-700"
                                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                                            }`}
                                        >
                                            {localSelectedIds.includes(profile.id) ? "解除" : "追加"}
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
