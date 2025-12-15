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
import { Switch } from "@/components/ui/switch";
import { Loader2, Check, Download, Link as LinkIcon, ChevronLeft } from "lucide-react";
import { updateReservationSettings } from "./actions";

interface ReservationSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    storeId: string;
    storeName: string;
    initialSettings: {
        reservation_enabled: boolean;
    };
}

export function ReservationSettingsModal({
    isOpen,
    onClose,
    storeId,
    storeName,
    initialSettings,
}: ReservationSettingsModalProps) {
    const [isEnabled, setIsEnabled] = useState(initialSettings.reservation_enabled);
    const [isSaving, setIsSaving] = useState(false);
    const [copiedUrl, setCopiedUrl] = useState(false);
    const qrRef = useRef<HTMLDivElement>(null);

    const reserveUrl = typeof window !== "undefined"
        ? `${window.location.origin}/reserve/${storeId}`
        : `/reserve/${storeId}`;

    const handleToggleEnabled = async (checked: boolean) => {
        setIsEnabled(checked);
        setIsSaving(true);
        await updateReservationSettings(storeId, {
            reservation_enabled: checked,
        });
        setIsSaving(false);
    };

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

    const handleShareToLine = () => {
        const text = `${storeName} - 来店予約`;
        const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(text + "\n" + reserveUrl)}`;
        window.open(lineUrl, "_blank");
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900 max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <DialogTitle className="text-base font-semibold text-gray-900 dark:text-gray-50">
                            予約ページ共有
                        </DialogTitle>
                        <div className="w-7" />
                    </div>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* 有効/無効切り替え */}
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                予約機能を有効にする
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                有効にするとゲストが来店予約できます
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            {isSaving && (
                                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                            )}
                            <Switch
                                checked={isEnabled}
                                onCheckedChange={handleToggleEnabled}
                                disabled={isSaving}
                            />
                        </div>
                    </div>

                    {/* 共有セクション（有効時のみ表示） */}
                    {isEnabled && (
                        <div className="space-y-4 pt-2 border-t border-gray-200 dark:border-gray-700">
                            <p className="text-sm font-medium text-gray-900 dark:text-white pt-2">
                                共有
                            </p>

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
                                <Button
                                    onClick={handleShareToLine}
                                    className="w-full rounded-lg bg-[#06C755] hover:bg-[#05b34c] text-white"
                                >
                                    <svg
                                        className="h-5 w-5 mr-2"
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                    >
                                        <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                                    </svg>
                                    LINEで共有
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
