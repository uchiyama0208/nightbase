"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    PAGE_CATEGORIES,
    CATEGORY_LABELS,
    PAGE_LABELS,
    PageKey,
    PermissionLevel,
    PagePermissions,
} from "./constants";
import { createRole, updateRole, deleteRole } from "./actions";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronLeft, Trash2 } from "lucide-react";

interface Role {
    id: string;
    name: string;
    for_role: "staff" | "cast";
    permissions: Record<string, string>;
    is_system_role?: boolean;
}

interface RoleFormModalProps {
    open: boolean;
    onClose: () => void;
    forRole: "staff" | "cast";
    role?: Role | null;
    onRoleUpdate?: (updatedRole: Role) => void;
    onRoleDelete?: (deletedRoleId: string) => void;
}

const PERMISSION_LABELS: Record<PermissionLevel, string> = {
    none: "なし",
    view: "閲覧",
    edit: "編集",
};

export function RoleFormModal({ open, onClose, forRole, role, onRoleUpdate, onRoleDelete }: RoleFormModalProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [name, setName] = useState("");
    const [permissions, setPermissions] = useState<PagePermissions>({});
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["shift"]));
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

    const isEditing = !!role;

    useEffect(() => {
        if (open) {
            if (role) {
                setName(role.name);
                setPermissions(role.permissions as PagePermissions);
            } else {
                setName("");
                // デフォルト権限を設定
                const defaultPermissions: PagePermissions = {};
                Object.values(PAGE_CATEGORIES).flat().forEach(key => {
                    defaultPermissions[key] = "none";
                });
                // 基本的なページはデフォルトでアクセス可能に
                if (forRole === "cast") {
                    defaultPermissions["timecard"] = "view";
                    defaultPermissions["my-shifts"] = "view";
                    defaultPermissions["board"] = "view";
                }
                setPermissions(defaultPermissions);
            }
            setExpandedCategories(new Set(["shift"]));
        }
    }, [open, role, forRole]);

    const toggleCategory = (category: string) => {
        setExpandedCategories(prev => {
            const next = new Set(prev);
            if (next.has(category)) {
                next.delete(category);
            } else {
                next.add(category);
            }
            return next;
        });
    };

    const setPermission = (key: PageKey, level: PermissionLevel) => {
        setPermissions(prev => ({
            ...prev,
            [key]: level,
        }));
    };

    const setCategoryPermission = (category: keyof typeof PAGE_CATEGORIES, level: PermissionLevel) => {
        const keys = PAGE_CATEGORIES[category];
        setPermissions(prev => {
            const next = { ...prev };
            keys.forEach(key => {
                next[key] = level;
            });
            return next;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setLoading(true);
        try {
            if (isEditing && role) {
                await updateRole(role.id, {
                    name: name.trim(),
                    for_role: forRole,
                    permissions,
                });
                // Call callback for immediate UI update
                if (onRoleUpdate) {
                    onRoleUpdate({
                        ...role,
                        name: name.trim(),
                        permissions,
                    });
                }
            } else {
                await createRole({
                    name: name.trim(),
                    for_role: forRole,
                    permissions,
                });
                router.refresh();
            }
            onClose();
        } catch (error: any) {
            alert(error.message || "エラーが発生しました");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!role) return;
        setDeleting(true);
        try {
            await deleteRole(role.id);
            setDeleteConfirmOpen(false);
            onClose();
            // Call callback for immediate UI update
            if (onRoleDelete) {
                onRoleDelete(role.id);
            } else {
                router.refresh();
            }
        } catch (error: any) {
            alert(error.message || "エラーが発生しました");
        } finally {
            setDeleting(false);
        }
    };

    return (
        <>
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white p-0 dark:border-gray-800 dark:bg-gray-900">
                <DialogHeader className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                    <div className="flex items-center">
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1 -ml-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors absolute left-5"
                        >
                            <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        </button>
                        <DialogTitle className="text-gray-900 dark:text-white flex-1 text-center">
                            {isEditing ? "権限セットを編集" : "権限セットを作成"}
                        </DialogTitle>
                        {isEditing && !role?.is_system_role && (
                            <button
                                type="button"
                                onClick={() => setDeleteConfirmOpen(true)}
                                className="p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors absolute right-5"
                            >
                                <Trash2 className="h-5 w-5 text-red-500 dark:text-red-400" />
                            </button>
                        )}
                    </div>
                </DialogHeader>

                <form onSubmit={handleSubmit}>
                    <div className="px-6 py-4 space-y-6">
                        {/* Name */}
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-gray-900 dark:text-white">
                                権限セット名
                            </Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="例: フロアスタッフ"
                                required
                                className="rounded-lg"
                            />
                        </div>

                        {/* Permissions by Category */}
                        <div className="space-y-3">
                            <Label className="text-gray-900 dark:text-white">ページ権限</Label>

                            {(Object.keys(PAGE_CATEGORIES) as Array<keyof typeof PAGE_CATEGORIES>).map((category) => {
                                const keys = PAGE_CATEGORIES[category];
                                const isExpanded = expandedCategories.has(category);

                                // カテゴリ内の権限状態をチェック
                                const allEdit = keys.every(k => permissions[k] === "edit");
                                const allView = keys.every(k => permissions[k] === "view");
                                const allNone = keys.every(k => !permissions[k] || permissions[k] === "none");

                                return (
                                    <div
                                        key={category}
                                        className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                                    >
                                        {/* Category Header */}
                                        <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 px-4 py-3">
                                            <button
                                                type="button"
                                                onClick={() => toggleCategory(category)}
                                                className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white"
                                            >
                                                <ChevronDown className={cn(
                                                    "h-4 w-4 transition-transform",
                                                    isExpanded ? "" : "-rotate-90"
                                                )} />
                                                {CATEGORY_LABELS[category]}
                                            </button>

                                            {/* Quick Set Buttons */}
                                            <div className="flex gap-1 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => setCategoryPermission(category, "none")}
                                                    className={cn(
                                                        "min-w-[36px] px-2 py-1 text-xs rounded-md transition-colors",
                                                        allNone
                                                            ? "bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white"
                                                            : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                    )}
                                                >
                                                    なし
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setCategoryPermission(category, "view")}
                                                    className={cn(
                                                        "min-w-[36px] px-2 py-1 text-xs rounded-md transition-colors",
                                                        allView
                                                            ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                                                            : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                    )}
                                                >
                                                    閲覧
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setCategoryPermission(category, "edit")}
                                                    className={cn(
                                                        "min-w-[36px] px-2 py-1 text-xs rounded-md transition-colors",
                                                        allEdit
                                                            ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                                                            : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                    )}
                                                >
                                                    編集
                                                </button>
                                            </div>
                                        </div>

                                        {/* Category Items */}
                                        {isExpanded && (
                                            <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                                {keys.map((key) => (
                                                    <div
                                                        key={key}
                                                        className="flex items-center justify-between px-4 py-2.5 bg-white dark:bg-gray-900"
                                                    >
                                                        <span className="text-sm text-gray-700 dark:text-gray-300 shrink-0 mr-2">
                                                            {PAGE_LABELS[key]}
                                                        </span>
                                                        <div className="flex gap-1 shrink-0">
                                                            {(["none", "view", "edit"] as PermissionLevel[]).map((level) => (
                                                                <button
                                                                    key={level}
                                                                    type="button"
                                                                    onClick={() => setPermission(key, level)}
                                                                    className={cn(
                                                                        "min-w-[36px] px-2 py-1 text-xs rounded-md transition-colors",
                                                                        permissions[key] === level || (!permissions[key] && level === "none")
                                                                            ? level === "edit"
                                                                                ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                                                                                : level === "view"
                                                                                    ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                                                                                    : "bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300"
                                                                            : "text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                                                                    )}
                                                                >
                                                                    {PERMISSION_LABELS[level]}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <DialogFooter className="px-6 py-4 border-t border-gray-200 dark:border-gray-800">
                        <Button
                            type="submit"
                            disabled={loading || !name.trim()}
                            className="w-full rounded-lg"
                        >
                            {loading ? "保存中..." : "保存"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
            <DialogContent className="max-w-md rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                <DialogHeader>
                    <DialogTitle className="text-gray-900 dark:text-white">権限セットを削除</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-gray-600 dark:text-gray-400 py-2">
                    「{role?.name}」を削除しますか？
                </p>
                <DialogFooter className="gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setDeleteConfirmOpen(false)}
                        className="rounded-lg"
                    >
                        キャンセル
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={deleting}
                        className="rounded-lg"
                    >
                        {deleting ? "削除中..." : "削除する"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        </>
    );
}
