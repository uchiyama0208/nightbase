"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
    CAST_AVAILABLE_PAGES,
    CAST_PAGE_LABELS,
} from "./constants";
import { Switch } from "@/components/ui/switch";
import { createRole, updateRole, deleteRole } from "./actions";
import type { StoreFeatures } from "@/app/app/data-access";

// Map from pageKey to storeFeatures key
const PAGE_TO_FEATURE_MAP: Record<string, keyof StoreFeatures> = {
    "timecard": "show_timecard",
    "my-shifts": "show_my_shifts",
    "attendance": "show_attendance",
    "shifts": "show_shifts",
    "pickup": "show_pickup",
    "users": "show_users",
    "invitations": "show_invitations",
    "resumes": "show_resumes",
    "roles": "show_roles",
    "floor": "show_floor",
    "slips": "show_slips",
    "menus": "show_menus",
    "bottles": "show_bottles",
    "reservations": "show_reservations",
    "queue": "show_queue",
    "orders": "show_orders",
    "sales": "show_sales",
    "payroll": "show_payroll",
    "pricing-systems": "show_pricing_systems",
    "salary-systems": "show_salary_systems",
    "seats": "show_seats",
    "shopping": "show_shopping",
    "board": "show_board",
    "ranking": "show_ranking",
    "sns": "show_sns",
    "ai-create": "show_ai_create",
    "services": "show_services",
};
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronLeft, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useGlobalLoading } from "@/components/global-loading";

interface Role {
    id: string;
    name: string;
    for_role: "staff" | "cast";
    permissions: Record<string, string>;
    is_system_role?: boolean;
    created_at: string;
}

interface RoleFormModalProps {
    open: boolean;
    onClose: () => void;
    forRole: "staff" | "cast";
    role?: Role | null;
    onRoleUpdate?: (updatedRole: Role) => void;
    onRoleDelete?: (deletedRoleId: string) => void;
    storeFeatures?: StoreFeatures | null;
}

const PERMISSION_LABELS: Record<PermissionLevel, string> = {
    none: "なし",
    view: "閲覧",
    edit: "編集",
};

// Helper to check if a page is visible based on storeFeatures
function isPageVisible(pageKey: PageKey, storeFeatures: StoreFeatures | null | undefined): boolean {
    if (!storeFeatures) return true;
    const featureKey = PAGE_TO_FEATURE_MAP[pageKey];
    if (!featureKey) return true;
    return storeFeatures[featureKey] ?? true;
}

export function RoleFormModal({ open, onClose, forRole, role, onRoleUpdate, onRoleDelete, storeFeatures }: RoleFormModalProps) {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { showLoading, hideLoading } = useGlobalLoading();
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [name, setName] = useState("");
    const [permissions, setPermissions] = useState<PagePermissions>({});
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["shift"]));
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [currentRoleId, setCurrentRoleId] = useState<string | null>(null);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    const isEditing = !!role || !!currentRoleId;

    useEffect(() => {
        if (open) {
            if (role) {
                setName(role.name);
                setPermissions(role.permissions as PagePermissions);
                setCurrentRoleId(role.id);
            } else {
                setName("");
                setCurrentRoleId(null);
                // デフォルト権限を設定
                const defaultPermissions: PagePermissions = {};
                if (forRole === "cast") {
                    // キャスト用: 利用可能なページのみ設定（表示=edit、非表示=none）
                    CAST_AVAILABLE_PAGES.forEach(key => {
                        defaultPermissions[key] = "edit"; // デフォルトは全て表示
                    });
                } else {
                    // スタッフ用: 全てのページを設定
                    Object.values(PAGE_CATEGORIES).flat().forEach(key => {
                        defaultPermissions[key] = "none";
                    });
                }
                setPermissions(defaultPermissions);
            }
            setExpandedCategories(new Set(["shift"]));
        }
    }, [open, role, forRole]);

    // クリーンアップ: モーダルが閉じられた時にデバウンスタイマーをクリア
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    // 自動保存関数
    const autoSave = useCallback(async (newName: string, newPermissions: PagePermissions) => {
        const roleId = role?.id || currentRoleId;
        if (!roleId || !newName.trim()) return;

        showLoading("保存中...");
        try {
            await updateRole(roleId, {
                name: newName.trim(),
                for_role: forRole,
                permissions: newPermissions,
            });
            // Call callback for immediate UI update
            if (onRoleUpdate && role) {
                onRoleUpdate({
                    ...role,
                    name: newName.trim(),
                    permissions: newPermissions,
                });
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "エラーが発生しました";
            toast({
                title: "エラー",
                description: message,
                variant: "destructive",
            });
        } finally {
            hideLoading();
        }
    }, [role, currentRoleId, forRole, onRoleUpdate, showLoading, hideLoading, toast]);

    // デバウンス付き自動保存をトリガー
    const triggerAutoSave = useCallback((newName: string, newPermissions: PagePermissions) => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
            autoSave(newName, newPermissions);
        }, 800);
    }, [autoSave]);

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
        const newPermissions = {
            ...permissions,
            [key]: level,
        };
        setPermissions(newPermissions);
        // 編集モード時のみ自動保存
        if (isEditing) {
            triggerAutoSave(name, newPermissions);
        }
    };

    const setCategoryPermission = (category: keyof typeof PAGE_CATEGORIES, level: PermissionLevel) => {
        // Only set permissions for visible pages
        const keys = PAGE_CATEGORIES[category].filter(k => isPageVisible(k, storeFeatures));
        const newPermissions = { ...permissions };
        keys.forEach(key => {
            newPermissions[key] = level;
        });
        setPermissions(newPermissions);
        // 編集モード時のみ自動保存
        if (isEditing) {
            triggerAutoSave(name, newPermissions);
        }
    };

    // 新規作成のみ（編集モードでは自動保存を使用）
    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || isEditing) return;

        setLoading(true);
        try {
            const newRole = await createRole({
                name: name.trim(),
                for_role: forRole,
                permissions,
            });
            // 作成後、自動保存モードに移行
            if (newRole?.id) {
                setCurrentRoleId(newRole.id);
            }
            await queryClient.invalidateQueries({ queryKey: ["roles"] });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "エラーが発生しました";
            toast({
                title: "エラー",
                description: message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    // 名前変更時の自動保存
    const handleNameChange = (newName: string) => {
        setName(newName);
        // 編集モード時のみ自動保存
        if (isEditing) {
            triggerAutoSave(newName, permissions);
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
                await queryClient.invalidateQueries({ queryKey: ["roles"] });
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "エラーが発生しました";
            toast({
                title: "エラー",
                description: message,
                variant: "destructive",
            });
        } finally {
            setDeleting(false);
        }
    };

    return (
        <>
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="p-0 overflow-hidden flex flex-col max-h-[90vh] rounded-2xl sm:max-w-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
                <DialogHeader className="sticky top-0 z-10 bg-white dark:bg-gray-900 flex !flex-row items-center gap-2 h-14 min-h-[3.5rem] flex-shrink-0 border-b border-gray-200 dark:border-gray-700 px-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <DialogTitle className="flex-1 text-center text-lg font-semibold text-gray-900 dark:text-white truncate">
                        {isEditing ? "権限セットを編集" : "権限セットを作成"}
                    </DialogTitle>
                    {isEditing && !role?.is_system_role ? (
                        <button
                            type="button"
                            onClick={() => setDeleteConfirmOpen(true)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    ) : (
                        <div className="w-8 h-8" />
                    )}
                </DialogHeader>

                <form onSubmit={handleCreate} className="flex-1 overflow-y-auto">
                    <div className="p-6 space-y-6">
                        {/* Name */}
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                権限セット名
                            </Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => handleNameChange(e.target.value)}
                                placeholder={forRole === "cast" ? "例: レギュラー" : "例: フロアスタッフ"}
                                required
                                className="rounded-lg"
                            />
                        </div>

                        {/* Permissions by Category */}
                        <div className="space-y-3">
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                {forRole === "cast" ? "表示するページ" : "ページ権限"}
                            </Label>

                            {/* キャスト用: シンプルな表示/非表示トグル */}
                            {forRole === "cast" ? (
                                <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
                                    {CAST_AVAILABLE_PAGES
                                        .filter((key) => isPageVisible(key, storeFeatures))
                                        .map((key) => (
                                        <div
                                            key={key}
                                            className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900"
                                        >
                                            <span className="text-sm text-gray-700 dark:text-gray-300">
                                                {CAST_PAGE_LABELS[key]}
                                            </span>
                                            <Switch
                                                checked={permissions[key] === "edit"}
                                                onCheckedChange={(checked) => setPermission(key, checked ? "edit" : "none")}
                                            />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                            /* スタッフ用: 従来の閲覧/編集/なし設定 */
                            (Object.keys(PAGE_CATEGORIES) as Array<keyof typeof PAGE_CATEGORIES>).map((category) => {
                                // Filter keys by feature visibility
                                const keys = PAGE_CATEGORIES[category].filter(k => isPageVisible(k, storeFeatures));
                                if (keys.length === 0) return null; // Skip empty categories
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
                                                            : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700"
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
                                                            : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700"
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
                                                            : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700"
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
                                                                            : "text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
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
                            })
                            )}
                        </div>
                    </div>

                    {/* 新規作成時のみ作成ボタンを表示（編集モードは自動保存） */}
                    {!isEditing && (
                        <DialogFooter className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 gap-2">
                            <Button
                                type="submit"
                                disabled={loading || !name.trim()}
                                className="w-full rounded-lg"
                            >
                                {loading ? "作成中..." : "作成"}
                            </Button>
                        </DialogFooter>
                    )}
                </form>
            </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
            <DialogContent className="sm:max-w-md rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
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
