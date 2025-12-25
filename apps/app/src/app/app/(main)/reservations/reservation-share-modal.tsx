"use client";

import { useState, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Download, Link as LinkIcon, ChevronLeft } from "lucide-react";

interface ReservationShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    storeId: string;
    storeName: string;
}

export function ReservationShareModal({
    isOpen,
    onClose,
    storeId,
    storeName,
}: ReservationShareModalProps) {
    const [copiedUrl, setCopiedUrl] = useState(false);
    const qrRef = useRef<HTMLDivElement>(null);

    const reserveUrl = typeof window !== "undefined"
        ? `${window.location.origin}/reserve/${storeId}`
        : `/reserve/${storeId}`;

    const handleCopyUrl = async () => {
        await navigator.clipboard.writeText(reserveUrl);
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
    };

    const handleDownloadQR = () => {
        if (!qrRef.current) return;

        const canvas = qrRef.current.querySelector("canvas");
        if (!canvas) return;

        const link = document.createElement("a");
        link.download = `${storeName}_予約QRコード.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-sm p-0 overflow-hidden flex flex-col max-h-[90vh] rounded-2xl bg-white dark:bg-gray-900">
                <DialogHeader className="sticky top-0 z-10 bg-white dark:bg-gray-900 flex !flex-row items-center gap-2 h-14 min-h-[3.5rem] flex-shrink-0 border-b border-gray-200 dark:border-gray-700 px-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <DialogTitle className="flex-1 text-center text-lg font-semibold text-gray-900 dark:text-white truncate">
                        予約ページ共有
                    </DialogTitle>
                    <div className="w-8 h-8" />
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* QRコード */}
                    <div className="flex justify-center">
                        <div
                            ref={qrRef}
                            className="p-4 bg-white rounded-xl border border-gray-200 dark:border-gray-700"
                        >
                            <QRCodeCanvas
                                value={reserveUrl}
                                size={160}
                                level="H"
                                marginSize={1}
                            />
                        </div>
                    </div>

                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                        QRコードをスキャンまたはURLを共有
                    </p>

                    {/* アクションボタン */}
                    <div className="flex flex-col gap-2">
                        <Button
                            variant="outline"
                            onClick={handleDownloadQR}
                            className="w-full rounded-lg"
                        >
                            <Download className="h-5 w-5 mr-2" />
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
                </div>
            </DialogContent>
        </Dialog>
    );
}
