"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface ConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: "default" | "destructive";
    onConfirm: () => void | Promise<void>;
    loading?: boolean;
}

/**
 * 確認ダイアログコンポーネント
 * 削除確認やアクション確認に使用
 */
export function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel = "確認",
    cancelLabel = "キャンセル",
    variant = "default",
    onConfirm,
    loading = false,
}: ConfirmDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const actualLoading = loading || isLoading;

    const handleConfirm = async () => {
        setIsLoading(true);
        try {
            await onConfirm();
        } finally {
            setIsLoading(false);
        }
    };

    const titleColor = variant === "destructive"
        ? "text-red-600 dark:text-red-400"
        : "text-gray-900 dark:text-white";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md w-[95%] max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-gray-900 p-6">
                <DialogHeader className="mb-4">
                    <DialogTitle className={`text-lg font-semibold text-center ${titleColor}`}>
                        {title}
                    </DialogTitle>
                    {description && (
                        <DialogDescription className="text-sm text-gray-500 dark:text-gray-400 text-center mt-2">
                            {description}
                        </DialogDescription>
                    )}
                </DialogHeader>
                <DialogFooter className="flex flex-col gap-2">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={actualLoading}
                        className="w-full"
                    >
                        {cancelLabel}
                    </Button>
                    <Button
                        variant={variant === "destructive" ? "destructive" : "default"}
                        onClick={handleConfirm}
                        disabled={actualLoading}
                        className="w-full"
                    >
                        {actualLoading ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                処理中...
                            </>
                        ) : (
                            confirmLabel
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

interface DeleteConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title?: string;
    description?: string;
    itemName?: string;
    onConfirm: () => void | Promise<void>;
    loading?: boolean;
}

/**
 * 削除確認ダイアログ（ConfirmDialogのプリセット）
 */
export function DeleteConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    itemName,
    onConfirm,
    loading,
}: DeleteConfirmDialogProps) {
    const defaultTitle = itemName ? `${itemName}を削除しますか？` : "削除しますか？";
    const defaultDescription = "この操作は取り消せません。";

    return (
        <ConfirmDialog
            open={open}
            onOpenChange={onOpenChange}
            title={title ?? defaultTitle}
            description={description ?? defaultDescription}
            confirmLabel="削除する"
            cancelLabel="キャンセル"
            variant="destructive"
            onConfirm={onConfirm}
            loading={loading}
        />
    );
}
