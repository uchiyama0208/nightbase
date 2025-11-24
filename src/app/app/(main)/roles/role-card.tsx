"use client";

import { Button } from "@/components/ui/button";
import { Shield, Trash2, Pencil } from "lucide-react";
import { RoleFormDialog } from "./role-form-dialog";
import { RoleMembersDialog } from "./role-members-dialog";
import { deleteRole } from "./actions";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";

interface RoleCardProps {
    role: {
        id: string;
        name: string;
        permissions: any;
        is_system_role?: boolean;
        created_at: string;
    };
    profiles: any[];
}

export function RoleCard({ role, profiles }: RoleCardProps) {
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await deleteRole(role.id);
            setIsDeleteDialogOpen(false);
        } catch (error) {
            console.error(error);
            alert("削除に失敗しました。メンバーが割り当てられている可能性があります。");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <>
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-card dark:bg-gray-800 text-card-foreground dark:text-white shadow-sm p-6 flex flex-col h-full">
                <div className="flex items-center gap-4 mb-4">
                    <div className="p-2 bg-primary/10 dark:bg-primary/20 rounded-full">
                        <Shield className="h-6 w-6 text-primary dark:text-primary-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">{role.name}</h3>
                        <p className="text-xs text-muted-foreground dark:text-gray-400">
                            {new Date(role.created_at).toLocaleDateString()} 作成
                        </p>
                    </div>
                </div>
                <div className="text-sm text-muted-foreground dark:text-gray-400 flex-1 mb-4">
                    <ul className="list-disc list-inside space-y-1">
                        {role.permissions?.can_manage_roles && <li>権限管理</li>}
                        {role.permissions?.can_manage_users && <li>プロフィール情報</li>}
                        {role.permissions?.can_manage_settings && <li>店舗設定</li>}
                        {role.permissions?.can_use_timecard && <li>タイムカード</li>}
                        {role.permissions?.can_manage_attendance && <li>勤怠</li>}
                        {role.permissions?.can_view_dashboard && <li>ダッシュボード</li>}
                        {!Object.values(role.permissions || {}).some(Boolean) && (
                            <li>権限なし</li>
                        )}
                    </ul>
                </div>
                <div className="flex flex-col gap-2 mt-auto pt-4 border-t">
                    <RoleMembersDialog
                        role={role}
                        profiles={profiles}
                    />
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-destructive hover:text-destructive"
                            onClick={() => setIsDeleteDialogOpen(true)}
                            disabled={role.is_system_role}
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            削除
                        </Button>
                        <RoleFormDialog
                            role={role}
                            trigger={
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1"
                                    disabled={role.is_system_role}
                                >
                                    <Pencil className="mr-2 h-4 w-4" />
                                    編集
                                </Button>
                            }
                        />
                    </div>
                </div>
            </div>

            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="sm:max-w-[425px] bg-white dark:bg-gray-800 w-[95%] rounded-lg p-6">
                    <DialogHeader>
                        <DialogTitle>ロールを削除</DialogTitle>
                        <DialogDescription className="text-gray-500 dark:text-gray-400">
                            「{role.name}」を削除しますか？
                            <br />
                            <span className="text-destructive font-semibold">※この操作は取り消せません。</span>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex flex-col gap-4">
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="w-full"
                        >
                            {isDeleting ? "削除中..." : "削除する"}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setIsDeleteDialogOpen(false)}
                            disabled={isDeleting}
                            className="w-full"
                        >
                            キャンセル
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
