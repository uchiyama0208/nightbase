"use client";

import { AlertTriangle, User, ChevronLeft } from "lucide-react";
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
            <DialogContent className="sm:max-w-md p-0 overflow-hidden flex flex-col max-h-[90vh] rounded-2xl">
                <DialogHeader className="sticky top-0 z-10 bg-white dark:bg-gray-900 flex !flex-row items-center gap-2 h-14 min-h-[3.5rem] flex-shrink-0 border-b border-gray-200 dark:border-gray-700 px-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <DialogTitle className="flex-1 text-center text-lg font-semibold text-gray-900 dark:text-white truncate">
                        公式LINE未追加のユーザーがいます
                    </DialogTitle>
                    <div className="w-8 h-8" />
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* Summary */}
                    <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-sm">
                        <p className="text-blue-700 dark:text-blue-300">
                            公式LINE追加済み: <strong>{linkedCount}名</strong>に送信されます
                        </p>
                        <p className="text-blue-600 dark:text-blue-400 mt-1">
                            未追加: <strong>{unlinkedProfiles.length}名</strong>は通知を受け取れません
                        </p>
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        以下のユーザーは公式LINEを追加していないため、通知を受け取れません。
                    </p>

                    {/* Unlinked Profiles List */}
                    <div className="space-y-2">
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
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                        {profile.display_name || "名前なし"}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {profile.role === "cast" ? "キャスト" : "スタッフ"}
                                    </p>
                                </div>
                                <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">
                                    未追加
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col gap-2 px-4 py-3 border-t flex-shrink-0">
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
