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
            <DialogContent className="max-w-[calc(100vw-32px)] max-h-[calc(100vh-32px)] sm:max-w-[500px] bg-white dark:bg-gray-800 text-gray-900 dark:text-white !p-0 overflow-y-auto">
                <div className="sticky top-0 flex items-center justify-between p-4 sm:p-6 pb-2 bg-white dark:bg-gray-800 z-10">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <DialogTitle className="text-gray-900 dark:text-white text-base font-semibold">参加申請の確認</DialogTitle>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleDeleteConfirm}
                        className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                        <Trash2 className="h-5 w-5" />
                    </Button>
                </div>
                <DialogHeader className="sr-only">
                    <DialogDescription>
                        申請者の情報を確認し、承認または拒否してください
                    </DialogDescription>
                </DialogHeader>

                <div className="px-4 sm:px-6 pb-4 space-y-4">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="role" className="text-gray-900 dark:text-white">権限ロール</Label>
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
                        <Label htmlFor="displayName" className="text-gray-900 dark:text-white">表示名</Label>
                        <Input
                            id="displayName"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="表示名を入力"
                            className="bg-white dark:bg-gray-900"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="displayNameKana" className="text-gray-900 dark:text-white">表示名（ふりがな）</Label>
                        <Input
                            id="displayNameKana"
                            value={displayNameKana}
                            onChange={(e) => setDisplayNameKana(e.target.value)}
                            placeholder="ひらがなで入力"
                            className="bg-white dark:bg-gray-900"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="realName" className="text-gray-900 dark:text-white">本名</Label>
                        <Input
                            id="realName"
                            value={realName}
                            onChange={(e) => setRealName(e.target.value)}
                            placeholder="本名を入力"
                            className="bg-white dark:bg-gray-900"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="realNameKana" className="text-gray-900 dark:text-white">本名（ふりがな）</Label>
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
                        <p className="text-gray-900 dark:text-white">
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
                            <CheckCircle className="h-4 w-4 mr-2" />
                            {isProcessing ? "処理中..." : "許可する"}
                        </Button>
                    </div>
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        className="w-full text-blue-600 hover:text-blue-700 hover:bg-transparent"
                    >
                        戻る
                    </Button>
                </div>
            </DialogContent>

            {/* Reject Confirmation Dialog */}
            <Dialog open={showRejectConfirm} onOpenChange={setShowRejectConfirm}>
                <DialogContent className="sm:max-w-[400px] bg-white dark:bg-gray-900">
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
                <DialogContent className="sm:max-w-[400px] bg-white dark:bg-gray-900">
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
