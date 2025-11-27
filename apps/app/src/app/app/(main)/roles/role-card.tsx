"use client";

import { Button } from "@/components/ui/button";
import { Shield, Trash2, Pencil, ChevronDown } from "lucide-react";
import { RoleFormDialog } from "./role-form-dialog";
import { RoleMembersDialog } from "./role-members-dialog";
import { deleteRole } from "./actions";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface RoleCardProps {
    role: {
        id: string;
        name: string;
        permissions: any;
        is_system_role?: boolean;
        created_at: string;
    };
    profiles: any[];
    currentProfileId: string;
}

export function RoleCard({ role, profiles, currentProfileId }: RoleCardProps) {
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Count active permissions
    const activePermissionsCount = [
        role.permissions?.can_manage_roles,
        role.permissions?.can_manage_users,
        role.permissions?.can_manage_settings,
        role.permissions?.can_use_timecard,
        role.permissions?.can_manage_attendance,
        role.permissions?.can_view_dashboard,
        role.permissions?.can_manage_menus,
        role.permissions?.can_manage_bottles,
    ].filter(Boolean).length;

    const createdAtLabel = role.created_at
        ? role.created_at.slice(0, 10).replace(/-/g, "/")
        : "";

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
                            {createdAtLabel} 作成
                        </p>
                    </div>
                </div>
                <div className="flex-1 mb-4">
                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="permissions" className="border-none">
                            <AccordionTrigger className="py-2 hover:no-underline">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground dark:text-gray-400">
                                    <span>権限設定</span>
                                    <span className="text-xs bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-400 px-2 py-0.5 rounded-full">
                                        {activePermissionsCount}個
                                    </span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground dark:text-gray-400 pl-2">
                                    {role.permissions?.can_manage_roles && <li>権限</li>}
                                    {role.permissions?.can_manage_users && <li>プロフィール情報{role.permissions?.hide_personal_info && " (個人情報非表示)"}</li>}
                                    {role.permissions?.can_manage_settings && <li>店舗設定</li>}
                                    {role.permissions?.can_use_timecard && <li>タイムカード</li>}
                                    {role.permissions?.can_manage_attendance && <li>出勤管理</li>}
                                    {role.permissions?.can_view_dashboard && <li>ダッシュボード</li>}
                                    {role.permissions?.can_manage_menus && <li>メニュー</li>}
                                    {role.permissions?.can_manage_bottles && <li>ボトルキープ</li>}
                                    {activePermissionsCount === 0 && (
                                        <li>権限なし</li>
                                    )}
                                </ul>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>
                <div className="flex flex-col gap-2 mt-auto pt-4 border-t">
                    <RoleMembersDialog
                        role={role}
                        profiles={profiles}
                        currentProfileId={currentProfileId}
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
