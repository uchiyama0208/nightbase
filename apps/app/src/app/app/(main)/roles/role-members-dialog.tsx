"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { assignRole } from "./actions";
import { Users, Plus, Minus } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface Profile {
    id: string;
    display_name: string;
    real_name: string | null;
    role_id: string | null;
    role?: string; // "staff" | "cast"
}

interface Role {
    id: string;
    name: string;
    permissions: any;
    created_at: string;
}

interface RoleMembersDialogProps {
    role: Role;
    profiles: Profile[];
    currentProfileId: string;
}

export function RoleMembersDialog({ role, profiles, currentProfileId }: RoleMembersDialogProps) {
    const [open, setOpen] = useState(false);
    const router = useRouter();

    // 初期表示時にpropsからローカルstateを構築し、その後は楽観的更新のみで管理
    const [localMembers, setLocalMembers] = useState<Profile[]>(() =>
        profiles.filter((p) => p.role_id === role.id)
    );
    const [localAvailableUsers, setLocalAvailableUsers] = useState<Profile[]>(() =>
        profiles.filter((p) => p.role_id !== role.id)
    );

    const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

    const isCastRole = role.permissions?.target === "cast";
    const memberLabel = isCastRole ? "キャスト" : "スタッフ";

    const [view, setView] = useState<"applied" | "manage">("applied");
    const viewIndex = view === "applied" ? 0 : 1;

    const handleAssign = async (profileId: string) => {
        if (processingIds.has(profileId)) return;
        
        const targetUser = localAvailableUsers.find((p) => p.id === profileId);
        if (!targetUser) return;

        const prevMembers = localMembers;
        const prevAvailable = localAvailableUsers;

        setProcessingIds(prev => new Set(prev).add(profileId));
        // role_idを現在のロールIDに更新して追加
        setLocalMembers([...localMembers, { ...targetUser, role_id: role.id }]);
        setLocalAvailableUsers(localAvailableUsers.filter((p) => p.id !== profileId));

        try {
            console.log('Assigning role:', profileId, role.id);
            const result = await assignRole(profileId, role.id);
            console.log('Role assigned successfully:', result);
        } catch (error) {
            console.error('Error assigning role:', error);
            const message = error instanceof Error ? error.message : "エラーが発生しました";
            alert(message);
            setLocalMembers(prevMembers);
            setLocalAvailableUsers(prevAvailable);
        } finally {
            setProcessingIds(prev => {
                const next = new Set(prev);
                next.delete(profileId);
                return next;
            });
        }
    };

    const handleRemove = async (profileId: string) => {
        if (processingIds.has(profileId)) return;
        
        const targetUser = localMembers.find((p) => p.id === profileId);
        if (!targetUser) return;

        const prevMembers = localMembers;
        const prevAvailable = localAvailableUsers;

        setProcessingIds(prev => new Set(prev).add(profileId));
        setLocalMembers(localMembers.filter((p) => p.id !== profileId));
        // role_idをnullに更新して追加
        setLocalAvailableUsers([...localAvailableUsers, { ...targetUser, role_id: null }]);

        try {
            console.log('Removing role:', profileId);
            const result = await assignRole(profileId, null);
            console.log('Role removed successfully:', result);
        } catch (error) {
            console.error('Error removing role:', error);
            const message = error instanceof Error ? error.message : "エラーが発生しました";
            alert(message);
            setLocalMembers(prevMembers);
            setLocalAvailableUsers(prevAvailable);
        } finally {
            setProcessingIds(prev => {
                const next = new Set(prev);
                next.delete(profileId);
                return next;
            });
        }
    };

    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen);
        if (!newOpen) {
            // モーダルを閉じたときにページをリフレッシュ
            router.refresh();
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <Users className="mr-2 h-4 w-4" />
                    メンバー管理 ({localMembers.length})
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-white dark:bg-gray-800 w-[95%] rounded-lg p-6 max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="text-slate-900 dark:text-white">メンバー管理</DialogTitle>
                    <DialogDescription className="text-slate-500 dark:text-gray-400">
                        権限を持つユーザーを管理します。
                    </DialogDescription>
                </DialogHeader>

                {/* View toggle */}
                <div className="mt-4 mb-3 flex justify-center">
                    <div className="relative inline-flex h-9 items-center rounded-full bg-gray-100 dark:bg-gray-800 p-1">
                        <div
                            className="absolute h-7 rounded-full bg-white dark:bg-gray-700 shadow-sm transition-transform duration-300 ease-in-out"
                            style={{
                                width: "112px",
                                left: "4px",
                                transform: `translateX(calc(${viewIndex} * (112px + 0px)))`
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => setView("applied")}
                            className={cn(
                                "relative z-10 w-28 flex items-center justify-center h-7 rounded-full text-xs md:text-sm font-medium transition-colors duration-200",
                                view === "applied"
                                    ? "text-gray-900 dark:text-white"
                                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                            )}
                        >
                            権限適用中
                        </button>
                        <button
                            type="button"
                            onClick={() => setView("manage")}
                            className={cn(
                                "relative z-10 w-28 flex items-center justify-center h-7 rounded-full text-xs md:text-sm font-medium transition-colors duration-200",
                                view === "manage"
                                    ? "text-gray-900 dark:text-white"
                                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                            )}
                        >
                            メンバー追加
                        </button>
                    </div>
                </div>

                <div className="space-y-4">
                    {view === "applied" && (
                        <div className="space-y-2 mt-1">
                            <h4 className="font-medium mb-2 text-gray-900 dark:text-white">権限適用中の{memberLabel} ({localMembers.length}人)</h4>
                            <Command className="w-full border border-slate-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800" shouldFilter={true}>
                                <CommandInput placeholder="ユーザーを検索..." className="dark:text-white" />
                                <CommandList className="max-h-[300px] overflow-y-auto">
                                    {localMembers.length === 0 ? (
                                        <div className="text-gray-700 dark:text-gray-200 py-6 text-center text-sm">
                                            この権限が適用されている{memberLabel}はいません
                                        </div>
                                    ) : (
                                        <>
                                            <CommandEmpty className="text-gray-700 dark:text-gray-200 py-6 text-center text-sm">検索結果がありません</CommandEmpty>
                                            <CommandGroup className="p-2">
                                                {localMembers.map((member) => (
                                                    <CommandItem
                                                        key={member.id}
                                                        className="flex items-center justify-between dark:text-white data-[selected=true]:bg-transparent data-[selected=true]:text-inherit"
                                                    >
                                                        <div>
                                                            <p className="text-sm font-medium">
                                                                {member.display_name}
                                                                {member.id === currentProfileId && (
                                                                    <span className="ml-1 text-xs text-primary dark:text-primary-400">(自分)</span>
                                                                )}
                                                            </p>
                                                            {member.real_name && (
                                                                <p className="text-xs text-muted-foreground dark:text-gray-400">
                                                                    {member.real_name}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
                                                            disabled={processingIds.has(member.id)}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleRemove(member.id);
                                                            }}
                                                        >
                                                            <Minus className="h-4 w-4" />
                                                        </Button>
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </>
                                    )}
                                </CommandList>
                            </Command>
                        </div>
                    )}

                    {view === "manage" && (
                        <div className="space-y-2 mt-1">
                            <h4 className="font-medium mb-2 text-gray-900 dark:text-white">メンバー追加</h4>
                            <Command className="w-full border border-slate-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800" shouldFilter={true}>
                                <CommandInput placeholder="ユーザーを検索..." className="dark:text-white" />
                                <CommandList className="max-h-[300px] overflow-y-auto">
                                    {localAvailableUsers.length === 0 ? (
                                        <div className="text-gray-700 dark:text-gray-200 py-6 text-center text-sm">
                                            ユーザーが見つかりません
                                        </div>
                                    ) : (
                                        <>
                                            <CommandEmpty className="text-gray-700 dark:text-gray-200 py-6 text-center text-sm">検索結果がありません</CommandEmpty>
                                            <CommandGroup className="p-2">
                                                {localAvailableUsers.map((user) => (
                                                    <CommandItem
                                                        key={user.id}
                                                        className="flex items-center justify-between dark:text-white data-[selected=true]:bg-transparent data-[selected=true]:text-inherit"
                                                    >
                                                        <div>
                                                            <p className="text-sm font-medium">
                                                                {user.display_name}
                                                                {user.id === currentProfileId && (
                                                                    <span className="ml-1 text-xs text-primary dark:text-primary-400">(自分)</span>
                                                                )}
                                                            </p>
                                                            {user.real_name && (
                                                                <p className="text-xs text-muted-foreground dark:text-gray-400">
                                                                    {user.real_name}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {user.role_id && (
                                                                <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                                                                    他のロールあり
                                                                </span>
                                                            )}
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-900/30"
                                                                disabled={processingIds.has(user.id)}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleAssign(user.id);
                                                                }}
                                                            >
                                                                <Plus className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </>
                                    )}
                                </CommandList>
                            </Command>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
