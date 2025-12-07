"use client";

import Image from "next/image";

import { Invitation, cancelInvitation } from "./actions";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Ban, ChevronLeft } from "lucide-react";
import { useState, useTransition, useCallback } from "react";
import { formatJSTDateTime } from "@/lib/utils";

interface InvitationDetailModalProps {
    invitation: Invitation | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCancel?: () => void; // Callback to refresh list
}

export function InvitationDetailModal({
    invitation,
    open,
    onOpenChange,
    onCancel,
}: InvitationDetailModalProps) {
    const [copied, setCopied] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);

    if (!invitation) return null;

    const inviteUrl = `${window.location.origin}/invite/${invitation.token}`;
    const isExpired = new Date(invitation.expires_at) < new Date() && invitation.status === "pending";
    const canCancel = invitation.status === "pending" && !isExpired;

    const handleCopy = () => {
        navigator.clipboard.writeText(inviteUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleCancelClick = () => {
        setIsCancelConfirmOpen(true);
    };

    const handleConfirmCancel = () => {
        startTransition(async () => {
            try {
                await cancelInvitation(invitation.id);
                if (onCancel) onCancel();
                setIsCancelConfirmOpen(false);
                onOpenChange(false);
            } catch {
                setIsCancelConfirmOpen(false);
            }
        });
    };

    const getStatusBadge = () => {
        if (invitation.status === "canceled") return <Badge variant="destructive">キャンセル</Badge>;
        if (invitation.status === "accepted") return <Badge className="bg-green-500">参加済み</Badge>;
        if (isExpired) return <Badge variant="secondary">期限切れ</Badge>;
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">招待中</Badge>;
    };

    const getExpiresAtLabel = () => {
        // 参加済み、または有効期限が設定されていない場合は「ー」を表示
        if (invitation.status === "accepted" || !invitation.expires_at) {
            return "ー";
        }

        return formatJSTDateTime(invitation.expires_at);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[calc(100vw-32px)] sm:max-w-[400px] max-h-[calc(100vh-32px)] overflow-y-auto bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                <DialogHeader>
                    <div className="relative flex items-center justify-center py-2">
                        <button
                            onClick={() => onOpenChange(false)}
                            className="absolute left-0 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                            <ChevronLeft className="h-5 w-5 text-gray-500" />
                        </button>
                        <DialogTitle className="text-gray-900 dark:text-white">招待詳細</DialogTitle>
                    </div>
                    <DialogDescription>
                        招待のステータスや詳細を確認できます。
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">招待プロフィール</Label>
                            <div className="font-medium flex items-center gap-2">
                                {invitation.profile?.avatar_url && (
                                    <Image
                                        src={invitation.profile.avatar_url}
                                        alt={`${invitation.profile.display_name}のアバター`}
                                        className="rounded-full object-cover"
                                        width={24}
                                        height={24}
                                    />
                                )}
                                {invitation.profile?.display_name}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">ロール</Label>
                            <div className="font-medium">
                                {invitation.profile?.role === "cast" ? "キャスト" : "スタッフ"}
                                {invitation.role &&
                                    invitation.role.name !== "staff" &&
                                    invitation.role.name !== "cast" &&
                                    invitation.role.name !== "スタッフ" &&
                                    invitation.role.name !== "キャスト" && (
                                        <span className="text-sm text-gray-500 ml-1">({invitation.role.name})</span>
                                    )}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">ステータス</Label>
                            <div>{getStatusBadge()}</div>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">有効期限</Label>
                            <div className="font-medium">
                                {getExpiresAtLabel()}
                            </div>
                        </div>
                    </div>

                    {invitation.status === "pending" && !isExpired && (
                        <>
                            <div className="space-y-2">
                                <Label>招待リンク</Label>
                                <div className="flex items-center space-x-2">
                                    <Input readOnly value={inviteUrl} className="font-mono text-sm" />
                                    <Button type="button" size="icon" variant="outline" onClick={handleCopy}>
                                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>

                            <div className="flex justify-center">
                                <Image
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(inviteUrl)}`}
                                    alt="招待QRコード"
                                    className="border rounded-lg p-2"
                                    width={150}
                                    height={150}
                                    unoptimized
                                />
                            </div>

                            <div className="space-y-3">
                                <Button
                                    type="button"
                                    className="w-full bg-[#06C755] hover:bg-[#05b54b] text-white"
                                    onClick={() => window.open(`https://line.me/R/msg/text/?${encodeURIComponent(`招待リンクをお送りします。\n${inviteUrl}`)}`, '_blank')}
                                >
                                    LINEで共有
                                </Button>
                                {canCancel && (
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        onClick={handleCancelClick}
                                        disabled={isPending}
                                        className="w-full"
                                    >
                                        <Ban className="mr-2 h-4 w-4" />
                                        招待をキャンセル
                                    </Button>
                                )}
                            </div>
                        </>
                    )}

                    <Button type="button" variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
                        閉じる
                    </Button>
                </div>
            </DialogContent>

            {/* キャンセル確認ダイアログ */}
            <Dialog open={isCancelConfirmOpen} onOpenChange={setIsCancelConfirmOpen}>
                <DialogContent className="max-w-md rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                    <DialogHeader>
                        <DialogTitle className="text-gray-900 dark:text-white">招待のキャンセル</DialogTitle>
                        <DialogDescription className="text-gray-600 dark:text-gray-400">
                            本当にこの招待をキャンセルしますか？この操作は取り消せません。
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4 flex justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setIsCancelConfirmOpen(false)}
                            className="rounded-lg"
                        >
                            戻る
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleConfirmCancel}
                            disabled={isPending}
                            className="rounded-lg"
                        >
                            {isPending ? "キャンセル中..." : "キャンセルする"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Dialog>
    );
}
