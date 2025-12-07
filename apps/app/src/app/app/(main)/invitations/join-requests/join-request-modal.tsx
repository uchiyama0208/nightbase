"use client";

import { useState, useCallback } from "react";
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
import { approveJoinRequest, rejectJoinRequest } from "./actions";
import { CheckCircle, XCircle } from "lucide-react";

interface JoinRequest {
    id: string;
    display_name: string;
    real_name: string;
    role: string;
    created_at: string;
}

interface JoinRequestModalProps {
    request: JoinRequest;
    isOpen: boolean;
    onClose: () => void;
    onRequestProcessed: (requestId: string) => void;
}

export function JoinRequestModal({ request, isOpen, onClose, onRequestProcessed }: JoinRequestModalProps) {
    const [selectedRole, setSelectedRole] = useState(request.role);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isRejectConfirmOpen, setIsRejectConfirmOpen] = useState(false);

    const handleApprove = useCallback(async () => {
        setIsProcessing(true);
        const result = await approveJoinRequest(request.id, selectedRole);
        if (result.success) {
            onRequestProcessed(request.id);
        }
        setIsProcessing(false);
    }, [request.id, selectedRole, onRequestProcessed]);

    const handleRejectClick = useCallback(() => {
        setIsRejectConfirmOpen(true);
    }, []);

    const handleConfirmReject = useCallback(async () => {
        setIsProcessing(true);
        const result = await rejectJoinRequest(request.id);
        if (result.success) {
            onRequestProcessed(request.id);
        }
        setIsProcessing(false);
        setIsRejectConfirmOpen(false);
    }, [request.id, onRequestProcessed]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="text-gray-900 dark:text-white">参加申請の確認</DialogTitle>
                    <DialogDescription>
                        申請者の情報を確認し、承認または拒否してください
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div className="space-y-4">
                        <div>
                            <Label className="text-sm text-gray-600 dark:text-gray-400">表示名</Label>
                            <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                {request.display_name}
                            </p>
                        </div>

                        <div>
                            <Label className="text-sm text-gray-600 dark:text-gray-400">本名</Label>
                            <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                {request.real_name}
                            </p>
                        </div>

                        <div>
                            <Label className="text-sm text-gray-600 dark:text-gray-400">申請日時</Label>
                            <p className="text-gray-900 dark:text-white">
                                {new Date(request.created_at).toLocaleDateString("ja-JP", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="role">ロール</Label>
                            <Select value={selectedRole} onValueChange={setSelectedRole}>
                                <SelectTrigger id="role">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="cast">キャスト</SelectItem>
                                    <SelectItem value="staff">スタッフ</SelectItem>
                                    <SelectItem value="admin">管理者</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                申請時のロールから変更できます
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t">
                        <Button
                            onClick={handleApprove}
                            disabled={isProcessing}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            {isProcessing ? "処理中..." : "許可する"}
                        </Button>
                        <Button
                            onClick={handleRejectClick}
                            disabled={isProcessing}
                            variant="destructive"
                            className="flex-1"
                        >
                            <XCircle className="h-4 w-4 mr-2" />
                            拒否する
                        </Button>
                    </div>
                </div>
            </DialogContent>

            {/* 拒否確認ダイアログ */}
            <Dialog open={isRejectConfirmOpen} onOpenChange={setIsRejectConfirmOpen}>
                <DialogContent className="max-w-md rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                    <DialogHeader>
                        <DialogTitle className="text-gray-900 dark:text-white">申請の拒否</DialogTitle>
                        <DialogDescription className="text-gray-600 dark:text-gray-400">
                            この申請を拒否してもよろしいですか？この操作は取り消せません。
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4 flex justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setIsRejectConfirmOpen(false)}
                            className="rounded-lg"
                        >
                            戻る
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleConfirmReject}
                            disabled={isProcessing}
                            className="rounded-lg"
                        >
                            {isProcessing ? "処理中..." : "拒否する"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Dialog>
    );
}
