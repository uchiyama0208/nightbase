"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import type { ImportResult } from "./types";

interface ImportResultModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    result: ImportResult | null;
    title?: string;
}

export function ImportResultModal({
    open,
    onOpenChange,
    result,
    title = "インポート結果",
}: ImportResultModalProps) {
    if (!result) return null;

    const hasErrors = result.errors.length > 0;
    const isSuccess = result.success && result.imported > 0;
    const isPartialSuccess = result.success && result.imported === 0 && (result.duplicates > 0 || result.skipped > 0);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {result.success ? (
                            isPartialSuccess ? (
                                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                            ) : (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                            )
                        ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                        )}
                        {title}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Summary */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
                            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                {result.imported}
                            </div>
                            <div className="text-xs text-green-600 dark:text-green-400">
                                インポート
                            </div>
                        </div>
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 text-center">
                            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                                {result.duplicates}
                            </div>
                            <div className="text-xs text-yellow-600 dark:text-yellow-400">
                                重複スキップ
                            </div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                            <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                                {result.skipped}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                                エラースキップ
                            </div>
                        </div>
                    </div>

                    {/* Error List */}
                    {hasErrors && (
                        <div className="space-y-2">
                            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                エラー詳細
                            </div>
                            <div className="max-h-48 overflow-y-auto space-y-1">
                                {result.errors.map((error, idx) => (
                                    <div
                                        key={idx}
                                        className="text-sm bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded px-3 py-2"
                                    >
                                        {error.row > 0 && (
                                            <span className="font-medium">
                                                {error.row}行目:
                                            </span>
                                        )}{" "}
                                        {error.message}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Close Button */}
                    <div className="flex justify-end">
                        <Button onClick={() => onOpenChange(false)}>
                            閉じる
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
