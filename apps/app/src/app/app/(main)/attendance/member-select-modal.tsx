"use client";

import { useState, useMemo } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronLeft, Plus, Search } from "lucide-react";
import { VercelTabs } from "@/components/ui/vercel-tabs";

interface Profile {
    id: string;
    display_name: string | null;
    display_name_kana?: string | null;
    real_name: string | null;
    role: string;
    avatar_url?: string | null;
}

interface MemberSelectModalProps {
    isOpen: boolean;
    onClose: () => void;
    profiles: Profile[];
    defaultRole?: string;
    onSelect: (profile: Profile) => void;
    onOpenProfileEdit?: (profileId: string) => void;
    onCreateNewProfile?: () => void;
}

export function MemberSelectModal({
    isOpen,
    onClose,
    profiles,
    defaultRole = "cast",
    onSelect,
    onOpenProfileEdit,
    onCreateNewProfile,
}: MemberSelectModalProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedRole, setSelectedRole] = useState(defaultRole);

    // Reset state when modal opens
    const handleOpenChange = (open: boolean) => {
        if (!open) {
            onClose();
        } else {
            setSearchQuery("");
            setSelectedRole(defaultRole);
        }
    };

    // Filter profiles by role and search query
    const filteredProfiles = useMemo(() => {
        return profiles.filter((profile) => {
            // Filter by role
            if (selectedRole === "cast" && profile.role !== "cast") return false;
            if (selectedRole === "staff" && profile.role !== "staff" && profile.role !== "admin") return false;

            // Filter by search query
            if (searchQuery.trim()) {
                const term = searchQuery.trim().toLowerCase();
                const searchTarget = [
                    profile.display_name,
                    profile.display_name_kana,
                    profile.real_name,
                ].filter(Boolean).join(" ").toLowerCase();
                if (!searchTarget.includes(term)) return false;
            }

            return true;
        });
    }, [profiles, selectedRole, searchQuery]);

    const handleSelectProfile = (profile: Profile) => {
        onSelect(profile);
        onClose();
    };

    const handleAvatarClick = (e: React.MouseEvent, profileId: string) => {
        e.stopPropagation();
        if (onOpenProfileEdit) {
            onOpenProfileEdit(profileId);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden flex flex-col max-h-[90vh] rounded-2xl">
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
                        メンバー選択
                    </DialogTitle>
                    {onCreateNewProfile ? (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setTimeout(() => {
                                    onCreateNewProfile();
                                }, 0);
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 transition-colors"
                            aria-label="新規メンバー作成"
                        >
                            <Plus className="h-5 w-5" />
                        </button>
                    ) : (
                        <div className="h-8 w-8" />
                    )}
                </DialogHeader>

                <div className="flex flex-col flex-1 overflow-hidden">
                    {/* Role Toggle */}
                    <div className="py-3 px-4 border-b border-gray-100 dark:border-gray-800">
                        <VercelTabs
                            tabs={[
                                { key: "cast", label: "キャスト" },
                                { key: "staff", label: "スタッフ" },
                            ]}
                            value={selectedRole}
                            onChange={setSelectedRole}
                            fullWidth
                        />
                    </div>

                    {/* Search Input */}
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                type="text"
                                placeholder="名前で検索..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 h-10 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-full"
                            />
                        </div>
                    </div>

                    {/* Profile List */}
                    <div className="flex-1 overflow-y-auto">
                        {filteredProfiles.length === 0 ? (
                            <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400 text-sm">
                                該当するメンバーがいません
                            </div>
                        ) : (
                            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                                {filteredProfiles.map((profile) => (
                                    <li key={profile.id}>
                                        <div
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => handleSelectProfile(profile)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" || e.key === " ") {
                                                    e.preventDefault();
                                                    handleSelectProfile(profile);
                                                }
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left cursor-pointer"
                                        >
                                            <button
                                                type="button"
                                                onClick={(e) => handleAvatarClick(e, profile.id)}
                                                className="shrink-0 rounded-full hover:ring-2 hover:ring-blue-500 hover:ring-offset-2 dark:hover:ring-offset-gray-900 transition-all"
                                                aria-label="プロフィールを編集"
                                            >
                                                <Avatar className="h-10 w-10">
                                                    <AvatarImage src={profile.avatar_url || undefined} />
                                                    <AvatarFallback className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                                        {(profile.display_name || profile.real_name || "?")[0]}
                                                    </AvatarFallback>
                                                </Avatar>
                                            </button>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-gray-900 dark:text-white truncate">
                                                    {profile.display_name || profile.real_name || "名前なし"}
                                                </div>
                                                {profile.display_name_kana && (
                                                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                        {profile.display_name_kana}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="shrink-0 text-xs text-gray-400 dark:text-gray-500">
                                                {profile.role === "cast" ? "キャスト" : "スタッフ"}
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
