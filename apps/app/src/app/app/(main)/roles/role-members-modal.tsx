"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Plus, X, Search, ChevronLeft } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { assignRoleToProfile } from "./actions";
import Image from "next/image";

interface Role {
    id: string;
    name: string;
    for_role: "staff" | "cast";
    permissions: Record<string, string>;
    is_system_role?: boolean;
}

interface Profile {
    id: string;
    display_name: string;
    real_name: string | null;
    role_id: string | null;
    role: string;
    avatar_url?: string | null;
}

interface RoleMembersModalProps {
    open: boolean;
    onClose: () => void;
    role: Role;
    profiles: Profile[];
    allRoles: Role[];
    isAdmin: boolean;
    onProfilesChange?: (updatedProfiles: Profile[]) => void;
}

export function RoleMembersModal({ open, onClose, role, profiles, allRoles, isAdmin, onProfilesChange }: RoleMembersModalProps) {
    const [loading, setLoading] = useState(false);
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [addSearchQuery, setAddSearchQuery] = useState("");
    const [localProfiles, setLocalProfiles] = useState<Profile[]>(profiles);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [pendingProfile, setPendingProfile] = useState<Profile | null>(null);

    // Reset local state when modal opens or profiles prop changes
    React.useEffect(() => {
        if (open) {
            setLocalProfiles(profiles);
            setAddModalOpen(false);
        }
    }, [open, profiles]);

    const members = useMemo(() =>
        localProfiles.filter(p => p.role_id === role.id),
        [localProfiles, role.id]
    );

    const nonMembers = useMemo(() =>
        localProfiles.filter(p => p.role_id !== role.id),
        [localProfiles, role.id]
    );

    const filteredNonMembers = useMemo(() => {
        if (!addSearchQuery.trim()) return nonMembers;
        const query = addSearchQuery.toLowerCase();
        return nonMembers.filter(p =>
            p.display_name.toLowerCase().includes(query) ||
            (p.real_name && p.real_name.toLowerCase().includes(query))
        );
    }, [nonMembers, addSearchQuery]);

    // Get role name for a profile
    const getRoleName = (roleId: string | null): string | null => {
        if (!roleId) return null;
        const foundRole = allRoles.find(r => r.id === roleId);
        return foundRole?.name || null;
    };

    const handleAddClick = (profile: Profile) => {
        // Check if the profile already has a different role assigned
        if (profile.role_id && profile.role_id !== role.id) {
            setPendingProfile(profile);
            setConfirmDialogOpen(true);
        } else {
            handleAdd(profile.id);
        }
    };

    const handleAdd = async (profileId: string) => {
        setLoading(true);
        try {
            await assignRoleToProfile(profileId, role.id);
            // Update local state immediately
            const updatedProfiles = localProfiles.map(p =>
                p.id === profileId ? { ...p, role_id: role.id } : p
            );
            setLocalProfiles(updatedProfiles);
            // Notify parent of change
            if (onProfilesChange) {
                onProfilesChange(updatedProfiles);
            }
            // Close confirm dialog if open
            setConfirmDialogOpen(false);
            setPendingProfile(null);
        } catch (error: any) {
            alert(error.message || "エラーが発生しました");
        } finally {
            setLoading(false);
        }
    };

    const handleRemove = async (profileId: string) => {
        setLoading(true);
        try {
            await assignRoleToProfile(profileId, null);
            // Update local state immediately
            const updatedProfiles = localProfiles.map(p =>
                p.id === profileId ? { ...p, role_id: null } : p
            );
            setLocalProfiles(updatedProfiles);
            // Notify parent of change
            if (onProfilesChange) {
                onProfilesChange(updatedProfiles);
            }
        } catch (error: any) {
            alert(error.message || "エラーが発生しました");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* Main Members Modal */}
            <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
                <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white p-0 dark:border-gray-800 dark:bg-gray-900">
                    <DialogHeader className="sticky top-0 z-10 bg-white dark:bg-gray-900 px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                        <div className="flex items-center">
                            <button
                                type="button"
                                onClick={onClose}
                                className="p-1 -ml-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors absolute left-5"
                            >
                                <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                            </button>
                            <DialogTitle className="text-gray-900 dark:text-white flex-1 text-center">
                                {role.name}のメンバー
                            </DialogTitle>
                        </div>
                    </DialogHeader>

                    <div className="px-6 py-4 space-y-4">
                        {/* Current Members */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    所属メンバー ({members.length}名)
                                </h3>
                                {isAdmin && nonMembers.length > 0 && (
                                    <Button
                                        size="sm"
                                        onClick={() => {
                                            setAddModalOpen(true);
                                            setAddSearchQuery("");
                                        }}
                                        className="rounded-full h-7 px-3 text-xs"
                                    >
                                        <Plus className="h-3 w-3 mr-1" />
                                        追加
                                    </Button>
                                )}
                            </div>

                            {members.length === 0 ? (
                                <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-4 text-center">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        メンバーがいません
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {members.map((profile) => (
                                        <div
                                            key={profile.id}
                                            className="flex items-center justify-between rounded-xl bg-gray-50 dark:bg-gray-800 p-3"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                                                    {profile.avatar_url ? (
                                                        <Image
                                                            src={profile.avatar_url}
                                                            alt={profile.display_name}
                                                            width={36}
                                                            height={36}
                                                            className="object-cover"
                                                        />
                                                    ) : (
                                                        <User className="h-4 w-4 text-gray-400" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                        {profile.display_name}
                                                    </p>
                                                    {profile.real_name && (
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                                            {profile.real_name}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            {isAdmin && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleRemove(profile.id)}
                                                    disabled={loading}
                                                    className="h-7 w-7 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Add Members Modal */}
            <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
                <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white p-0 dark:border-gray-800 dark:bg-gray-900">
                    <DialogHeader className="sticky top-0 z-10 bg-white dark:bg-gray-900 px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                        <div className="flex items-center">
                            <button
                                type="button"
                                onClick={() => setAddModalOpen(false)}
                                className="p-1 -ml-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors absolute left-5"
                            >
                                <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                            </button>
                            <DialogTitle className="text-gray-900 dark:text-white flex-1 text-center">
                                メンバーを追加
                            </DialogTitle>
                        </div>
                    </DialogHeader>

                    <div className="px-6 py-4 space-y-4">
                        {/* Search Input */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                type="text"
                                placeholder="名前で検索..."
                                value={addSearchQuery}
                                onChange={(e) => setAddSearchQuery(e.target.value)}
                                className="pl-9 rounded-lg h-9"
                            />
                        </div>

                        {/* Available Members */}
                        <div className="space-y-2">
                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                追加可能なメンバー ({filteredNonMembers.length}名)
                            </h3>
                            {filteredNonMembers.length === 0 ? (
                                <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-4 text-center">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {addSearchQuery ? "該当するメンバーがいません" : "追加できるメンバーがいません"}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {filteredNonMembers.map((profile) => {
                                        const currentRoleName = getRoleName(profile.role_id);
                                        return (
                                            <button
                                                key={profile.id}
                                                onClick={() => handleAddClick(profile)}
                                                disabled={loading}
                                                className="w-full flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                                            >
                                                <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                                                    {profile.avatar_url ? (
                                                        <Image
                                                            src={profile.avatar_url}
                                                            alt={profile.display_name}
                                                            width={36}
                                                            height={36}
                                                            className="object-cover"
                                                        />
                                                    ) : (
                                                        <User className="h-4 w-4 text-gray-400" />
                                                    )}
                                                </div>
                                                <div className="text-left flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                        {profile.display_name}
                                                    </p>
                                                    {(profile.real_name || currentRoleName) && (
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                            {profile.real_name}
                                                            {profile.real_name && currentRoleName && " · "}
                                                            {currentRoleName && (
                                                                <span className="text-blue-600 dark:text-blue-400">{currentRoleName}</span>
                                                            )}
                                                        </p>
                                                    )}
                                                </div>
                                                <Plus className="h-4 w-4 text-blue-500 flex-shrink-0" />
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Confirm Role Change Dialog */}
            <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
                <DialogContent className="max-w-md rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                    <DialogHeader>
                        <DialogTitle className="text-gray-900 dark:text-white">権限を変更しますか？</DialogTitle>
                        <DialogDescription className="text-gray-600 dark:text-gray-400">
                            {pendingProfile && (
                                <>
                                    <span className="font-medium text-gray-900 dark:text-white">{pendingProfile.display_name}</span>
                                    さんには既に
                                    <span className="font-medium text-blue-600 dark:text-blue-400">「{getRoleName(pendingProfile.role_id)}」</span>
                                    が適用されています。
                                    <br />
                                    <span className="font-medium text-gray-900 dark:text-white">「{role.name}」</span>
                                    に変更しますか？
                                </>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setConfirmDialogOpen(false);
                                setPendingProfile(null);
                            }}
                            className="rounded-lg"
                        >
                            キャンセル
                        </Button>
                        <Button
                            onClick={() => pendingProfile && handleAdd(pendingProfile.id)}
                            disabled={loading}
                            className="rounded-lg"
                        >
                            {loading ? "処理中..." : "変更する"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
