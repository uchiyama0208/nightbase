"use client";

import { useState, useRef, useEffect } from "react";
import { QRCodeCanvas } from "qrcode.react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, Copy, Check, Download, Link as LinkIcon, ChevronLeft } from "lucide-react";
import { updateQueueSettings } from "./actions";
import type { QueueSettings } from "./types";

interface QueueSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    storeId: string;
    storeName: string;
    initialSettings: QueueSettings;
}

type TabType = "settings" | "share";

export function QueueSettingsModal({
    isOpen,
    onClose,
    storeId,
    storeName,
    initialSettings,
}: QueueSettingsModalProps) {
    const [activeTab, setActiveTab] = useState<TabType>("settings");
    const [isEnabled, setIsEnabled] = useState(initialSettings.queue_enabled);
    const [message, setMessage] = useState(initialSettings.queue_notification_message);
    const [isSaving, setIsSaving] = useState(false);
    const [copiedUrl, setCopiedUrl] = useState(false);
    const qrRef = useRef<HTMLDivElement>(null);

    // Vercel-style tabs
    const tabsRef = useRef<{ [key: string]: HTMLButtonElement | null }>({});
    const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

    useEffect(() => {
        const activeButton = tabsRef.current[activeTab];
        if (activeButton) {
            setIndicatorStyle({
                left: activeButton.offsetLeft,
                width: activeButton.offsetWidth,
            });
        }
    }, [activeTab, isOpen]);

    const queueUrl = typeof window !== "undefined"
        ? `${window.location.origin}/queue/${storeId}`
        : `/queue/${storeId}`;

    const handleSave = async () => {
        setIsSaving(true);
        const result = await updateQueueSettings(storeId, {
            queue_enabled: isEnabled,
            queue_notification_message: message,
        });
        setIsSaving(false);

        if (result.success) {
            onClose();
        }
    };

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

    const handleShareToLine = () => {
        const text = `${storeName} - 順番待ち登録`;
        const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(text + "\n" + queueUrl)}`;
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
                            順番待ち設定
                        </DialogTitle>
                        <div className="w-7" />
                    </div>
                </DialogHeader>

                {/* Vercel-style Tab Navigation */}
                <div className="relative mt-4">
                    <div className="flex w-full">
                        <button
                            ref={(el) => { tabsRef.current["settings"] = el; }}
                            type="button"
                            onClick={() => setActiveTab("settings")}
                            className={`flex-1 py-2 text-sm font-medium transition-colors relative ${
                                activeTab === "settings"
                                    ? "text-gray-900 dark:text-white"
                                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                            }`}
                        >
                            設定
                        </button>
                        <button
                            ref={(el) => { tabsRef.current["share"] = el; }}
                            type="button"
                            onClick={() => setActiveTab("share")}
                            className={`flex-1 py-2 text-sm font-medium transition-colors relative ${
                                activeTab === "share"
                                    ? "text-gray-900 dark:text-white"
                                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                            }`}
                        >
                            共有
                        </button>
                    </div>
                    <div
                        className="absolute bottom-0 h-0.5 bg-gray-900 dark:bg-white transition-all duration-200"
                        style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
                    />
                    <div className="absolute bottom-0 left-0 right-0 h-px bg-gray-200 dark:bg-gray-700" />
                </div>

                {/* 設定タブ */}
                {activeTab === "settings" && (
                    <div className="space-y-6 py-4">
                        {/* 有効/無効切り替え */}
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    順番待ち機能を有効にする
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    有効にするとゲストが順番待ち登録できます
                                </p>
                            </div>
                            <Switch
                                checked={isEnabled}
                                onCheckedChange={setIsEnabled}
                            />
                        </div>

                        {/* 通知メッセージ */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                                通知メッセージ
                            </label>
                            <Textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="お待たせいたしました。まもなくご案内できます。"
                                className="min-h-[100px] rounded-lg border-gray-200 bg-white
                                           focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0
                                           dark:border-gray-700 dark:bg-gray-800"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                ゲストに通知を送る際に使用されます
                            </p>
                        </div>

                        <DialogFooter className="flex justify-end gap-2 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                                className="rounded-lg"
                            >
                                キャンセル
                            </Button>
                            <Button
                                type="button"
                                onClick={handleSave}
                                disabled={isSaving}
                                className="rounded-lg"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        保存中...
                                    </>
                                ) : (
                                    "保存"
                                )}
                            </Button>
                        </DialogFooter>
                    </div>
                )}

                {/* 共有タブ */}
                {activeTab === "share" && (
                    <div className="space-y-4 py-4">
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
                                            size={180}
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
                            </>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
