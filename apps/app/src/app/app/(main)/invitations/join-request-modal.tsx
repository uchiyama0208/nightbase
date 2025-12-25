"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { approveJoinRequest, rejectJoinRequest, deleteJoinRequest } from "./join-request-actions";
import { CheckCircle, XCircle, AlertTriangle, ChevronLeft, Trash2, ExternalLink } from "lucide-react";
import Link from "next/link";

interface JoinRequest {
    id: string;
    profile_id: string;
    display_name: string;
    display_name_kana?: string;
    real_name: string;
    real_name_kana?: string;
    requested_role: string;
    status: "pending" | "approved" | "rejected";
    created_at: string;
}

interface StoreRole {
    id: string;
    name: string;
    for_role: "staff" | "cast";
}

interface JoinRequestModalProps {
    request: JoinRequest;
    isOpen: boolean;
    onClose: () => void;
    onRequestProcessed: (requestId: string, action: "approved" | "rejected" | "deleted") => void;
    storeRoles: StoreRole[];
}

export function JoinRequestModal({ request, isOpen, onClose, onRequestProcessed, storeRoles }: JoinRequestModalProps) {
    const [selectedRole, setSelectedRole] = useState("none");

    // 申請者のロール（cast/staff）に応じてフィルター
    const requestedRoleType = request.requested_role === "cast" ? "cast" : "staff";
    const filteredStoreRoles = storeRoles.filter(r => r.for_role === requestedRoleType);
    const [displayName, setDisplayName] = useState(request.display_name || "");
    const [displayNameKana, setDisplayNameKana] = useState(request.display_name_kana || "");
    const [realName, setRealName] = useState(request.real_name || "");
    const [realNameKana, setRealNameKana] = useState(request.real_name_kana || "");
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showRejectConfirm, setShowRejectConfirm] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const handleApprove = async () => {
        setIsProcessing(true);
        setError(null);
        const roleToSave = selectedRole === "none" ? null : selectedRole;
        const result = await approveJoinRequest(
            request.id,
            roleToSave,
            displayName || undefined,
            displayNameKana || undefined,
            realName || undefined,
            realNameKana || undefined
        );
        if (result.success) {
            onRequestProcessed(request.id, "approved");
        } else {
            setError(result.error || "承認に失敗しました");
        }
        setIsProcessing(false);
    };

    const handleRejectConfirm = () => {
        setShowRejectConfirm(true);
    };

    const handleReject = async () => {
        setIsProcessing(true);
        setError(null);
        const result = await rejectJoinRequest(request.id);
        if (result.success) {
            setShowRejectConfirm(false);
            onRequestProcessed(request.id, "rejected");
        } else {
            setError(result.error || "拒否に失敗しました");
        }
        setIsProcessing(false);
    };

    const handleDeleteConfirm = () => {
        setShowDeleteConfirm(true);
    };

    const handleDelete = async () => {
        setIsProcessing(true);
        setError(null);
        const result = await deleteJoinRequest(request.id);
        if (result.success) {
            setShowDeleteConfirm(false);
            onRequestProcessed(request.id, "deleted");
        } else {
            setError(result.error || "削除に失敗しました");
        }
        setIsProcessing(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[calc(100vw-32px)] max-h-[calc(100vh-32px)] sm:max-w-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white !p-0 overflow-hidden flex flex-col rounded-2xl">
                <DialogHeader className="sticky top-0 z-10 bg-white dark:bg-gray-900 flex !flex-row items-center gap-2 h-14 min-h-[3.5rem] flex-shrink-0 border-b border-gray-200 dark:border-gray-700 px-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 transition-colors"
                        aria-label="戻る"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <DialogTitle className="flex-1 text-center text-lg font-semibold text-gray-900 dark:text-white truncate">
                        参加申請の確認
                    </DialogTitle>
                    <button
                        type="button"
                        onClick={handleDeleteConfirm}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        aria-label="削除"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                    <DialogDescription className="sr-only">
                        申請者の情報を確認し、承認または拒否してください
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="role" className="text-sm font-medium text-gray-700 dark:text-gray-200">権限ロール</Label>
                            <Link
                                href="/app/roles"
                                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                                onClick={(e) => e.stopPropagation()}
                            >
                                権限を管理
                                <ExternalLink className="h-3 w-3" />
                            </Link>
                        </div>
                        <Select value={selectedRole} onValueChange={setSelectedRole}>
                            <SelectTrigger id="role">
                                <SelectValue placeholder="権限を選択" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">権限なし</SelectItem>
                                {requestedRoleType === "staff" && (
                                    <SelectItem value="admin">管理者</SelectItem>
                                )}
                                {filteredStoreRoles.map((role) => (
                                    <SelectItem key={role.id} value={role.name}>
                                        {role.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="displayName" className="text-sm font-medium text-gray-700 dark:text-gray-200">表示名</Label>
                        <Input
                            id="displayName"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="表示名を入力"
                            className="bg-white dark:bg-gray-900"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="displayNameKana" className="text-sm font-medium text-gray-700 dark:text-gray-200">表示名（ふりがな）</Label>
                        <Input
                            id="displayNameKana"
                            value={displayNameKana}
                            onChange={(e) => setDisplayNameKana(e.target.value)}
                            placeholder="ひらがなで入力"
                            className="bg-white dark:bg-gray-900"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="realName" className="text-sm font-medium text-gray-700 dark:text-gray-200">本名</Label>
                        <Input
                            id="realName"
                            value={realName}
                            onChange={(e) => setRealName(e.target.value)}
                            placeholder="本名を入力"
                            className="bg-white dark:bg-gray-900"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="realNameKana" className="text-sm font-medium text-gray-700 dark:text-gray-200">本名（ふりがな）</Label>
                        <Input
                            id="realNameKana"
                            value={realNameKana}
                            onChange={(e) => setRealNameKana(e.target.value)}
                            placeholder="ひらがなで入力"
                            className="bg-white dark:bg-gray-900"
                        />
                    </div>

                    <div>
                        <Label className="text-sm text-gray-600 dark:text-gray-400">申請日時</Label>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                            {new Date(request.created_at).toLocaleString("ja-JP", {
                                timeZone: "Asia/Tokyo",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                            })}
                        </p>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                        </div>
                    )}

                    <div className="flex gap-3 pt-4">
                        <Button
                            onClick={handleRejectConfirm}
                            disabled={isProcessing}
                            variant="outline"
                            className="flex-1 border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                            <XCircle className="h-4 w-4 mr-2" />
                            拒否する
                        </Button>
                        <Button
                            onClick={handleApprove}
                            disabled={isProcessing}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            <CheckCircle className="h-5 w-5 mr-2" />
                            {isProcessing ? "処理中..." : "許可する"}
                        </Button>
                    </div>
                </div>
            </DialogContent>

            {/* Reject Confirmation Dialog */}
            <Dialog open={showRejectConfirm} onOpenChange={setShowRejectConfirm}>
                <DialogContent className="sm:max-w-md bg-white dark:bg-gray-900">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                            申請を拒否
                        </DialogTitle>
                        <DialogDescription className="text-gray-600 dark:text-gray-400">
                            この申請を拒否してもよろしいですか？
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setShowRejectConfirm(false)}
                            disabled={isProcessing}
                        >
                            キャンセル
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleReject}
                            disabled={isProcessing}
                        >
                            {isProcessing ? "処理中..." : "拒否する"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <DialogContent className="sm:max-w-md bg-white dark:bg-gray-900">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                            <Trash2 className="h-5 w-5 text-red-500" />
                            申請データを削除
                        </DialogTitle>
                        <DialogDescription className="text-gray-600 dark:text-gray-400">
                            この申請データを完全に削除してもよろしいですか？この操作は取り消せません。
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setShowDeleteConfirm(false)}
                            disabled={isProcessing}
                        >
                            キャンセル
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={isProcessing}
                        >
                            {isProcessing ? "処理中..." : "削除する"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Dialog>
    );
}
