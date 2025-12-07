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
import { approveJoinRequest, rejectJoinRequest } from "./join-request-actions";
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";

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
    const [error, setError] = useState<string | null>(null);
    const [showRejectConfirm, setShowRejectConfirm] = useState(false);

    const handleApprove = async () => {
        setIsProcessing(true);
        setError(null);
        const result = await approveJoinRequest(request.id, selectedRole);
        if (result.success) {
            onRequestProcessed(request.id);
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
            onRequestProcessed(request.id);
        } else {
            setError(result.error || "拒否に失敗しました");
        }
        setIsProcessing(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[calc(100vw-32px)] max-h-[calc(100vh-32px)] sm:max-w-[500px] bg-white dark:bg-gray-800 text-gray-900 dark:text-white !p-4 sm:!p-6 my-4">
                <DialogHeader>
                    <DialogTitle className="text-gray-900 dark:text-white">参加申請の確認</DialogTitle>
                    <DialogDescription>
                        申請者の情報を確認し、承認または拒否してください
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div className="space-y-4">
                        <div>
                            <Label className="text-sm text-gray-600 dark:text-gray-400">名前</Label>
                            <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                {request.display_name || request.real_name}
                            </p>
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

                        <div className="space-y-2">
                            <Label htmlFor="role" className="text-gray-900 dark:text-white">権限ロール</Label>
                            <Select value={selectedRole} onValueChange={setSelectedRole}>
                                <SelectTrigger id="role">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="cast">キャスト</SelectItem>
                                    <SelectItem value="staff">スタッフ</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                承認時に付与する権限を選択してください
                            </p>
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                        </div>
                    )}

                    <div className="flex gap-3 pt-4 border-t">
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
        </Dialog>
    );
}
