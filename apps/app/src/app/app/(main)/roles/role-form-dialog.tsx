"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect } from "react";
import { createRole, updateRole, RoleFormData } from "./actions";
import { Plus, Pencil } from "lucide-react";

interface RoleFormDialogProps {
    role?: {
        id: string;
        name: string;
        permissions: any;
    };
    trigger?: React.ReactNode;
    target?: "staff" | "cast";
}

export function RoleFormDialog({ role, trigger, target = "staff" }: RoleFormDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState("");
    const [permissions, setPermissions] = useState({
        can_manage_roles: false,
        can_manage_users: false,
        can_manage_settings: false,
        can_use_timecard: false,
        can_manage_attendance: false,
        can_view_dashboard: false,
        can_manage_menus: false,
        can_manage_bottles: false,
        hide_personal_info: false,
        target: target,
    });

    useEffect(() => {
        if (open && role) {
            setName(role.name);
            setPermissions({
                can_manage_roles: role.permissions?.can_manage_roles || false,
                can_manage_users: role.permissions?.can_manage_users || false,
                can_manage_settings: role.permissions?.can_manage_settings || false,
                can_use_timecard: role.permissions?.can_use_timecard || false,
                can_manage_attendance: role.permissions?.can_manage_attendance || false,
                can_view_dashboard: role.permissions?.can_view_dashboard || false,
                can_manage_menus: role.permissions?.can_manage_menus || false,
                can_manage_bottles: role.permissions?.can_manage_bottles || false,
                hide_personal_info: role.permissions?.hide_personal_info || false,
                target: role.permissions?.target === "cast" ? "cast" : "staff",
            });
        } else if (open && !role) {
            setName("");
            setPermissions({
                can_manage_roles: false,
                can_manage_users: false,
                can_manage_settings: false,
                can_use_timecard: target === "cast",
                can_manage_attendance: false,
                can_view_dashboard: false,
                can_manage_menus: false,
                can_manage_bottles: false,
                hide_personal_info: false,
                target,
            });
        }
    }, [open, role, target]);

    const togglePermission = (key: keyof typeof permissions) => {
        setPermissions((p) => ({
            ...p,
            [key]: !p[key],
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const data: RoleFormData = { name, permissions };
            if (role) {
                await updateRole(role.id, data);
            } else {
                await createRole(data);
            }
            setOpen(false);
        } catch (error) {
            console.error(error);
            alert("エラーが発生しました");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button className="whitespace-nowrap">
                        <Plus className="mr-2 h-4 w-4" />
                        新規作成
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto my-4 sm:my-0">
                <DialogHeader>
                    <DialogTitle className="text-slate-900 dark:text-white">{role ? "権限を編集" : "権限作成"}</DialogTitle>
                    <DialogDescription className="text-slate-500 dark:text-gray-400">
                        権限名と設定を設定してください。
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name" className="text-gray-900 dark:text-gray-200">権限名</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="例: 店長"
                            required
                            className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400"
                        />
                    </div>
                    <div className="space-y-3">
                        <Label className="text-gray-900 dark:text-gray-200">権限設定</Label>
                        <div className="space-y-3 rounded-2xl bg-gray-50/80 dark:bg-gray-900/40 p-3">
                            {target === "staff" && (
                                <>
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        className="flex w-full items-center gap-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/80 px-4 py-3 text-left active:scale-[0.98] transition"
                                        onClick={() => togglePermission("can_manage_roles")}
                                    >
                                        <Checkbox
                                            id="can_manage_roles"
                                            checked={permissions.can_manage_roles}
                                            onCheckedChange={(checked) =>
                                                setPermissions((p) => ({
                                                    ...p,
                                                    can_manage_roles: checked as boolean,
                                                }))
                                            }
                                            className="pointer-events-none border-gray-300 dark:border-gray-600 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                        />
                                        <Label htmlFor="can_manage_roles" className="text-gray-800 dark:text-gray-100 text-sm font-medium">権限</Label>
                                    </div>
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        className="flex w-full items-center gap-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/80 px-4 py-3 text-left active:scale-[0.98] transition"
                                        onClick={() => togglePermission("can_manage_users")}
                                    >
                                        <Checkbox
                                            id="can_manage_users"
                                            checked={permissions.can_manage_users}
                                            onCheckedChange={(checked) =>
                                                setPermissions((p) => ({
                                                    ...p,
                                                    can_manage_users: checked as boolean,
                                                }))
                                            }
                                            className="pointer-events-none border-gray-300 dark:border-gray-600 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                        />
                                        <Label htmlFor="can_manage_users" className="text-gray-800 dark:text-gray-100 text-sm font-medium">プロフィール情報</Label>
                                    </div>
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        className="flex w-full items-center gap-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/80 px-4 py-3 text-left active:scale-[0.98] transition ml-4"
                                        onClick={() => togglePermission("hide_personal_info")}
                                    >
                                        <Checkbox
                                            id="hide_personal_info"
                                            checked={permissions.hide_personal_info}
                                            onCheckedChange={(checked) =>
                                                setPermissions((p) => ({
                                                    ...p,
                                                    hide_personal_info: checked as boolean,
                                                }))
                                            }
                                            className="pointer-events-none border-gray-300 dark:border-gray-600 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                        />
                                        <Label htmlFor="hide_personal_info" className="text-gray-700 dark:text-gray-300 text-xs">個人情報を非表示</Label>
                                    </div>
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        className="flex w-full items-center gap-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/80 px-4 py-3 text-left active:scale-[0.98] transition"
                                        onClick={() => togglePermission("can_manage_settings")}
                                    >
                                        <Checkbox
                                            id="can_manage_settings"
                                            checked={permissions.can_manage_settings}
                                            onCheckedChange={(checked) =>
                                                setPermissions((p) => ({
                                                    ...p,
                                                    can_manage_settings: checked as boolean,
                                                }))
                                            }
                                            className="pointer-events-none border-gray-300 dark:border-gray-600 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                        />
                                        <Label htmlFor="can_manage_settings" className="text-gray-800 dark:text-gray-100 text-sm font-medium">店舗設定</Label>
                                    </div>
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        className="flex w-full items-center gap-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/80 px-4 py-3 text-left active:scale-[0.98] transition"
                                        onClick={() => togglePermission("can_manage_attendance")}
                                    >
                                        <Checkbox
                                            id="can_manage_attendance"
                                            checked={permissions.can_manage_attendance}
                                            onCheckedChange={(checked) =>
                                                setPermissions((p) => ({
                                                    ...p,
                                                    can_manage_attendance: checked as boolean,
                                                }))
                                            }
                                            className="pointer-events-none border-gray-300 dark:border-gray-600 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                        />
                                        <Label htmlFor="can_manage_attendance" className="text-gray-800 dark:text-gray-100 text-sm font-medium">出勤管理</Label>
                                    </div>
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        className="flex w-full items-center gap-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/80 px-4 py-3 text-left active:scale-[0.98] transition"
                                        onClick={() => togglePermission("can_view_dashboard")}
                                    >
                                        <Checkbox
                                            id="can_view_dashboard"
                                            checked={permissions.can_view_dashboard}
                                            onCheckedChange={(checked) =>
                                                setPermissions((p) => ({
                                                    ...p,
                                                    can_view_dashboard: checked as boolean,
                                                }))
                                            }
                                            className="pointer-events-none border-gray-300 dark:border-gray-600 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                        />
                                        <Label htmlFor="can_view_dashboard" className="text-gray-800 dark:text-gray-100 text-sm font-medium">ダッシュボード</Label>
                                    </div>
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        className="flex w-full items-center gap-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/80 px-4 py-3 text-left active:scale-[0.98] transition"
                                        onClick={() => togglePermission("can_manage_menus")}
                                    >
                                        <Checkbox
                                            id="can_manage_menus"
                                            checked={permissions.can_manage_menus}
                                            onCheckedChange={(checked) =>
                                                setPermissions((p) => ({
                                                    ...p,
                                                    can_manage_menus: checked as boolean,
                                                }))
                                            }
                                            className="pointer-events-none border-gray-300 dark:border-gray-600 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                        />
                                        <Label htmlFor="can_manage_menus" className="text-gray-800 dark:text-gray-100 text-sm font-medium">メニュー</Label>
                                    </div>
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        className="flex w-full items-center gap-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/80 px-4 py-3 text-left active:scale-[0.98] transition"
                                        onClick={() => togglePermission("can_manage_bottles")}
                                    >
                                        <Checkbox
                                            id="can_manage_bottles"
                                            checked={permissions.can_manage_bottles}
                                            onCheckedChange={(checked) =>
                                                setPermissions((p) => ({
                                                    ...p,
                                                    can_manage_bottles: checked as boolean,
                                                }))
                                            }
                                            className="pointer-events-none border-gray-300 dark:border-gray-600 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                        />
                                        <Label htmlFor="can_manage_bottles" className="text-gray-800 dark:text-gray-100 text-sm font-medium">ボトルキープ</Label>
                                    </div>
                                </>
                            )}
                            <div
                                role="button"
                                tabIndex={0}
                                className="flex w-full items-center gap-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/80 px-4 py-3 text-left active:scale-[0.98] transition"
                                onClick={() => togglePermission("can_use_timecard")}
                            >
                                <Checkbox
                                    id="can_use_timecard"
                                    checked={permissions.can_use_timecard}
                                    onCheckedChange={(checked) =>
                                        setPermissions((p) => ({
                                            ...p,
                                            can_use_timecard: checked as boolean,
                                        }))
                                    }
                                    className="pointer-events-none border-gray-300 dark:border-gray-600 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                />
                                <Label htmlFor="can_use_timecard" className="text-gray-800 dark:text-gray-100 text-sm font-medium">タイムカード</Label>
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            キャンセル
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? "保存中..." : "保存"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
