"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, ChevronRight, ChevronLeft, Users, Crown, User, Search } from "lucide-react";
import { RoleMembersModal } from "./role-members-modal";
import { RoleFormModal } from "./role-form-modal";
import { setAdminRole } from "./actions";
import { useRouter } from "next/navigation";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import Image from "next/image";

interface Role {
    id: string;
    name: string;
    for_role: "staff" | "cast";
    permissions: Record<string, string>;
    is_system_role?: boolean;
    created_at: string;
}

interface Profile {
    id: string;
    display_name: string;
    real_name: string | null;
    role_id: string | null;
    role: string;
    avatar_url?: string | null;
}

interface RoleSetTabProps {
    forRole: "staff" | "cast";
    roles: Role[];
    profiles: Profile[];
    adminProfiles?: Profile[];
    currentProfileId: string;
    isAdmin: boolean;
}

export function RoleSetTab({ forRole, roles: initialRoles, profiles: initialProfiles, adminProfiles: initialAdminProfiles, currentProfileId, isAdmin }: RoleSetTabProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [editRole, setEditRole] = useState<Role | null>(null);
    const [membersRole, setMembersRole] = useState<Role | null>(null);
    const [adminMembersOpen, setAdminMembersOpen] = useState(false);
    const [addAdminDialogOpen, setAddAdminDialogOpen] = useState(false);
    const [removeAdminDialogOpen, setRemoveAdminDialogOpen] = useState(false);
    const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
    const [adminSearchQuery, setAdminSearchQuery] = useState("");
    const [addAdminSearchQuery, setAddAdminSearchQuery] = useState("");

    // Local state for profiles and roles to enable immediate UI updates
    const [localProfiles, setLocalProfiles] = useState<Profile[]>(initialProfiles);
    const [localAdminProfiles, setLocalAdminProfiles] = useState<Profile[]>(initialAdminProfiles || []);
    const [localRoles, setLocalRoles] = useState<Role[]>(initialRoles);

    // Sync with props when they change
    React.useEffect(() => {
        setLocalProfiles(initialProfiles);
    }, [initialProfiles]);

    React.useEffect(() => {
        setLocalAdminProfiles(initialAdminProfiles || []);
    }, [initialAdminProfiles]);

    React.useEffect(() => {
        setLocalRoles(initialRoles);
    }, [initialRoles]);

    const getProfilesForRole = (roleId: string) => {
        return localProfiles.filter(p => p.role_id === roleId);
    };

    // Filter admin members by search
    const filteredAdminProfiles = useMemo(() => {
        if (!adminSearchQuery.trim()) return localAdminProfiles;
        const query = adminSearchQuery.toLowerCase();
        return localAdminProfiles.filter(p =>
            p.display_name.toLowerCase().includes(query) ||
            (p.real_name && p.real_name.toLowerCase().includes(query))
        );
    }, [localAdminProfiles, adminSearchQuery]);

    // Filter non-admin profiles for adding
    const filteredAddableProfiles = useMemo(() => {
        const nonAdminProfiles = localProfiles.filter(
            p => !localAdminProfiles.some(ap => ap.id === p.id)
        );
        if (!addAdminSearchQuery.trim()) return nonAdminProfiles;
        const query = addAdminSearchQuery.toLowerCase();
        return nonAdminProfiles.filter(p =>
            p.display_name.toLowerCase().includes(query) ||
            (p.real_name && p.real_name.toLowerCase().includes(query))
        );
    }, [localProfiles, localAdminProfiles, addAdminSearchQuery]);

    const handleAddAdmin = async (profile: Profile) => {
        setLoading(true);
        try {
            await setAdminRole(profile.id, true);
            // Update local state immediately
            setLocalAdminProfiles(prev => [...prev, { ...profile, role: "admin" }]);
            setAddAdminDialogOpen(false);
            setAddAdminSearchQuery("");
        } catch (error: any) {
            alert(error.message || "エラーが発生しました");
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveAdmin = async (profileId: string) => {
        setLoading(true);
        try {
            await setAdminRole(profileId, false);
            // Update local state immediately
            setLocalAdminProfiles(prev => prev.filter(p => p.id !== profileId));
            setRemoveAdminDialogOpen(false);
            setSelectedProfile(null);
        } catch (error: any) {
            alert(error.message || "エラーが発生しました");
        } finally {
            setLoading(false);
        }
    };

    const openRemoveDialog = (profile: Profile) => {
        setSelectedProfile(profile);
        setRemoveAdminDialogOpen(true);
    };

    const handleProfilesChange = (updatedProfiles: Profile[]) => {
        setLocalProfiles(updatedProfiles);
    };

    const handleRoleUpdate = (updatedRole: Role) => {
        setLocalRoles(prev => prev.map(r => r.id === updatedRole.id ? updatedRole : r));
        // Also update the membersRole if it's the same role
        if (membersRole?.id === updatedRole.id) {
            setMembersRole(updatedRole);
        }
    };

    const handleRoleDelete = (deletedRoleId: string) => {
        setLocalRoles(prev => prev.filter(r => r.id !== deletedRoleId));
    };

    return (
        <div className="space-y-4">
            {/* Admin Card - Only for Staff Tab */}
            {forRole === "staff" && initialAdminProfiles && (
                <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 overflow-hidden">
                    <div className="p-4">
                        <div className="flex items-center gap-2">
                            <Crown className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                            <h3 className="font-medium text-gray-900 dark:text-white">管理者</h3>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            setAdminMembersOpen(true);
                            setAdminSearchQuery("");
                        }}
                        className="w-full flex items-center justify-between px-4 py-3 border-t border-amber-200 dark:border-amber-800 bg-amber-100/50 dark:bg-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
                    >
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <Users className="h-4 w-4" />
                            <span>{localAdminProfiles.length}名が所属</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                    </button>
                </div>
            )}

            {/* Roles List */}
            {localRoles.length === 0 ? (
                <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-8 text-center">
                    <p className="text-gray-500 dark:text-gray-400">
                        権限セットがありません
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {localRoles.map((role) => {
                        const members = getProfilesForRole(role.id);
                        return (
                            <div
                                key={role.id}
                                className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden"
                            >
                                <button
                                    onClick={() => isAdmin ? setEditRole(role) : null}
                                    className="w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                                    disabled={!isAdmin}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <h3 className="font-medium text-gray-900 dark:text-white">
                                                {role.name}
                                            </h3>
                                            {role.is_system_role && (
                                                <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">
                                                    システム
                                                </span>
                                            )}
                                        </div>
                                        {isAdmin && (
                                            <ChevronRight className="h-4 w-4 text-gray-400" />
                                        )}
                                    </div>
                                </button>

                                {/* Members Section */}
                                <button
                                    onClick={() => setMembersRole(role)}
                                    className="w-full flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                >
                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                        <Users className="h-4 w-4" />
                                        <span>{members.length}名が所属</span>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-gray-400" />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Edit Modal */}
            {editRole && (
                <RoleFormModal
                    open={!!editRole}
                    onClose={() => setEditRole(null)}
                    forRole={forRole}
                    role={editRole}
                    onRoleUpdate={handleRoleUpdate}
                    onRoleDelete={handleRoleDelete}
                />
            )}

            {/* Members Modal */}
            {membersRole && (
                <RoleMembersModal
                    open={!!membersRole}
                    onClose={() => setMembersRole(null)}
                    role={membersRole}
                    profiles={localProfiles}
                    allRoles={localRoles}
                    isAdmin={isAdmin}
                    onProfilesChange={handleProfilesChange}
                />
            )}

            {/* Admin Members Modal */}
            {forRole === "staff" && initialAdminProfiles && (
                <Dialog open={adminMembersOpen} onOpenChange={setAdminMembersOpen}>
                    <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white p-0 dark:border-gray-800 dark:bg-gray-900">
                        <DialogHeader className="sticky top-0 z-10 bg-white dark:bg-gray-900 px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setAdminMembersOpen(false)}
                                    className="p-1 -ml-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                >
                                    <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                                </button>
                                <DialogTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                                    <Crown className="h-4 w-4 text-amber-600" />
                                    管理者
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
                                    value={adminSearchQuery}
                                    onChange={(e) => setAdminSearchQuery(e.target.value)}
                                    className="pl-9 rounded-lg h-9"
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        所属メンバー ({localAdminProfiles.length}名)
                                    </h3>
                                    {isAdmin && localProfiles.length > 0 && (
                                        <Button
                                            size="sm"
                                            onClick={() => {
                                                setAddAdminDialogOpen(true);
                                                setAddAdminSearchQuery("");
                                            }}
                                            className="rounded-full h-7 px-3 text-xs"
                                        >
                                            <Plus className="h-3 w-3 mr-1" />
                                            追加
                                        </Button>
                                    )}
                                </div>

                                {filteredAdminProfiles.length === 0 ? (
                                    <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-4 text-center">
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {adminSearchQuery ? "該当する管理者がいません" : "管理者がいません"}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {filteredAdminProfiles.map((profile) => (
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
                                                        {profile.id === currentProfileId && (
                                                            <p className="text-xs text-blue-600 dark:text-blue-400">あなた</p>
                                                        )}
                                                    </div>
                                                </div>
                                                {isAdmin && profile.id !== currentProfileId && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => openRemoveDialog(profile)}
                                                        className="rounded-full text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                    >
                                                        解除
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
            )}

            {/* Add Admin Dialog */}
            <Dialog open={addAdminDialogOpen} onOpenChange={setAddAdminDialogOpen}>
                <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white p-0 dark:border-gray-800 dark:bg-gray-900">
                    <DialogHeader className="sticky top-0 z-10 bg-white dark:bg-gray-900 px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setAddAdminDialogOpen(false)}
                                className="p-1 -ml-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                                <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                            </button>
                            <DialogTitle className="text-gray-900 dark:text-white">管理者を追加</DialogTitle>
                        </div>
                    </DialogHeader>

                    <div className="px-6 py-4 space-y-4">
                        {/* Search Input */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                type="text"
                                placeholder="名前で検索..."
                                value={addAdminSearchQuery}
                                onChange={(e) => setAddAdminSearchQuery(e.target.value)}
                                className="pl-9 rounded-lg h-9"
                            />
                        </div>

                        <div className="space-y-2">
                            {filteredAddableProfiles.length === 0 ? (
                                <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-4 text-center">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {addAdminSearchQuery ? "該当するスタッフがいません" : "追加できるスタッフがいません"}
                                    </p>
                                </div>
                            ) : (
                                filteredAddableProfiles.map((profile) => (
                                    <button
                                        key={profile.id}
                                        onClick={() => handleAddAdmin(profile)}
                                        disabled={loading}
                                        className="w-full flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                                            {profile.avatar_url ? (
                                                <Image
                                                    src={profile.avatar_url}
                                                    alt={profile.display_name}
                                                    width={40}
                                                    height={40}
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <User className="h-5 w-5 text-gray-400" />
                                            )}
                                        </div>
                                        <div className="text-left flex-1">
                                            <p className="font-medium text-gray-900 dark:text-white">
                                                {profile.display_name}
                                            </p>
                                            {profile.real_name && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {profile.real_name}
                                                </p>
                                            )}
                                        </div>
                                        <Plus className="h-4 w-4 text-blue-500" />
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Remove Admin Dialog */}
            <Dialog open={removeAdminDialogOpen} onOpenChange={setRemoveAdminDialogOpen}>
                <DialogContent className="max-w-md rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                    <DialogHeader>
                        <DialogTitle className="text-gray-900 dark:text-white">管理者を解除</DialogTitle>
                        <DialogDescription className="text-gray-600 dark:text-gray-400">
                            {selectedProfile?.display_name}の管理者権限を解除しますか？
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setRemoveAdminDialogOpen(false)}
                            className="rounded-lg"
                        >
                            キャンセル
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => selectedProfile && handleRemoveAdmin(selectedProfile.id)}
                            disabled={loading}
                            className="rounded-lg"
                        >
                            {loading ? "処理中..." : "解除する"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}
