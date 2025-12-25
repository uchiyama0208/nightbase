"use client";

import { useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Download, Link as LinkIcon, ChevronLeft } from "lucide-react";

interface QueueShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    storeId: string;
    storeName: string;
    isEnabled: boolean;
}

export function QueueShareModal({
    isOpen,
    onClose,
    storeId,
    storeName,
    isEnabled,
}: QueueShareModalProps) {
    const [copiedUrl, setCopiedUrl] = useState(false);
    const qrRef = useRef<HTMLDivElement>(null);

    const queueUrl = typeof window !== "undefined"
        ? `${window.location.origin}/queue/${storeId}`
        : `/queue/${storeId}`;

    const handleCopyUrl = async () => {
        await navigator.clipboard.writeText(queueUrl);
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
    };

    const handleDownloadQR = () => {
        if (!qrRef.current) return;

        const canvas = qrRef.current.querySelector("canvas");
        if (!canvas) return;

        const link = document.createElement("a");
        link.download = `${storeName}_順番待ちQRコード.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-sm rounded-2xl border border-gray-200 bg-white p-0 shadow-xl dark:border-gray-800 dark:bg-gray-900 max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader className="sticky top-0 z-10 bg-white dark:bg-gray-900 flex !flex-row items-center gap-2 h-14 min-h-[3.5rem] flex-shrink-0 border-b border-gray-200 dark:border-gray-700 px-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700"
                        aria-label="戻る"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <DialogTitle className="flex-1 text-center text-lg font-semibold text-gray-900 dark:text-white truncate">
                        共有
                    </DialogTitle>
                    <div className="w-8 h-8" />
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                    {!isEnabled ? (
                        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
                            <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                順番待ち機能を有効にすると共有できます
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* QRコード */}
                            <div className="flex justify-center">
                                <div
                                    ref={qrRef}
                                    className="p-4 bg-white rounded-xl border border-gray-200 dark:border-gray-700"
                                >
                                    <QRCodeCanvas
                                        value={queueUrl}
                                        size={160}
                                        level="H"
                                        marginSize={1}
                                    />
                                </div>
                            </div>

                            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                                QRコードをスキャンまたはURLを共有してください
                            </p>

                            {/* アクションボタン */}
                            <div className="flex flex-col gap-2">
                                <Button
                                    variant="outline"
                                    onClick={handleDownloadQR}
                                    className="w-full rounded-lg"
                                >
                                    <Download className="h-4 w-4 mr-2" />
                                    QR保存
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={handleCopyUrl}
                                    className="w-full rounded-lg"
                                >
                                    {copiedUrl ? (
                                        <>
                                            <Check className="h-4 w-4 mr-2 text-green-500" />
                                            コピー済み
                                        </>
                                    ) : (
                                        <>
                                            <LinkIcon className="h-4 w-4 mr-2" />
                                            URLコピー
                                        </>
                                    )}
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
