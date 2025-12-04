"use client";

import { AlertTriangle, User } from "lucide-react";
import Image from "next/image";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface UnlinkedProfile {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    role: string;
    line_user_id: string | null;
}

interface LineWarningModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    unlinkedProfiles: UnlinkedProfile[];
    linkedCount: number;
    isLoading?: boolean;
}

export function LineWarningModal({
    isOpen,
    onClose,
    onConfirm,
    unlinkedProfiles,
    linkedCount,
    isLoading,
}: LineWarningModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader className="mb-0">
                    <div className="flex items-center gap-2">
                        <div className="h-10 w-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                            LINE未連携のユーザーがいます
                        </DialogTitle>
                    </div>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        以下のユーザーはLINE連携していないため、LINEでの通知を受け取れません。
                    </p>

                    {/* Unlinked Profiles List */}
                    <div className="max-h-[200px] overflow-y-auto space-y-2">
                        {unlinkedProfiles.map((profile) => (
                            <div
                                key={profile.id}
                                className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800"
                            >
                                {profile.avatar_url ? (
                                    <Image
                                        src={profile.avatar_url}
                                        alt=""
                                        width={32}
                                        height={32}
                                        className="h-8 w-8 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                        <User className="h-4 w-4 text-gray-400" />
                                    </div>
                                )}
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                        {profile.display_name || "名前なし"}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {profile.role === "cast" ? "キャスト" : "スタッフ"}
                                    </p>
                                </div>
                                <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">
                                    LINE未連携
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Summary */}
                    <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-sm">
                        <p className="text-blue-700 dark:text-blue-300">
                            LINE連携済み: <strong>{linkedCount}名</strong>に送信されます
                        </p>
                        <p className="text-blue-600 dark:text-blue-400 mt-1">
                            未連携: <strong>{unlinkedProfiles.length}名</strong>は通知を受け取れません
                        </p>
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <Button onClick={onConfirm} disabled={isLoading} className="w-full">
                        {linkedCount}名に送信する
                    </Button>
                    <Button variant="ghost" onClick={onClose} disabled={isLoading} className="w-full">
                        キャンセル
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
