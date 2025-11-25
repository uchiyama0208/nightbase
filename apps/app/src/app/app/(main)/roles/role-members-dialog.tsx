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
import { Users, Check, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

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
}

export function RoleMembersDialog({ role, profiles }: RoleMembersDialogProps) {
    const [open, setOpen] = useState(false);

    const roleTarget = role.permissions?.target === "cast" ? "cast" : "staff";

    // ロールのtargetに基づいてプロフィールをフィルタリング
    const filteredProfiles = profiles.filter((p) => p.role === roleTarget);

    const members = filteredProfiles.filter((p) => p.role_id === role.id);
    const nonMembers = filteredProfiles.filter((p) => p.role_id !== role.id);

    const handleAssign = async (profileId: string) => {
        try {
            await assignRole(profileId, role.id);
        } catch (error) {
            console.error(error);
            alert("エラーが発生しました");
        }
    };

    const handleRemove = async (profileId: string) => {
        try {
            await assignRole(profileId, null);
        } catch (error) {
            console.error(error);
            alert("エラーが発生しました");
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <Users className="mr-2 h-4 w-4" />
                    メンバー管理 ({members.length})
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-white dark:bg-gray-800 w-[95%] rounded-lg p-6 max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="text-slate-900 dark:text-white">{role.name} - メンバー管理</DialogTitle>
                    <DialogDescription className="text-slate-500 dark:text-gray-400">
                        このロールを持つユーザーを管理します。
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 dark:border-gray-700 bg-slate-50/80 dark:bg-gray-900/50 p-4 sm:p-5">
                        <h4 className="font-medium mb-2 text-gray-900 dark:text-white">現在のメンバー</h4>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                            {members.length === 0 && (
                                <p className="text-sm text-muted-foreground dark:text-gray-400">メンバーはいません</p>
                            )}
                            {members.map((member) => (
                                <div
                                    key={member.id}
                                    className="flex items-center justify-between p-2 bg-secondary/50 dark:bg-gray-800 rounded-md"
                                >
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">{member.display_name}</p>
                                        {member.real_name && (
                                            <p className="text-xs text-muted-foreground dark:text-gray-400">
                                                {member.real_name}
                                            </p>
                                        )}
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                        onClick={() => handleRemove(member.id)}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 dark:border-gray-700 bg-slate-50/80 dark:bg-gray-900/50 p-4 sm:p-5">
                        <h4 className="font-medium mb-2 text-gray-900 dark:text-white">メンバーを追加</h4>
                        <Command className="w-full border border-slate-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800">
                            <CommandInput placeholder="ユーザーを検索..." className="dark:text-white" />
                            <CommandList>
                                <CommandEmpty className="text-gray-700 dark:text-gray-200">ユーザーが見つかりません</CommandEmpty>
                                <CommandGroup>
                                    {nonMembers.map((user) => (
                                        <CommandItem
                                            key={user.id}
                                            onSelect={() => handleAssign(user.id)}
                                            className="flex items-center justify-between dark:text-white"
                                        >
                                            <div>
                                                <p className="text-sm font-medium">{user.display_name}</p>
                                                {user.real_name && (
                                                    <p className="text-xs text-muted-foreground dark:text-gray-400">
                                                        {user.real_name}
                                                    </p>
                                                )}
                                            </div>
                                            {user.role_id && (
                                                <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                                                    他のロールあり
                                                </span>
                                            )}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
