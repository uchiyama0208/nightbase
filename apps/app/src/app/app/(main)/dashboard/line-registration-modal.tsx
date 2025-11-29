"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageCircle, X } from "lucide-react";

interface LineRegistrationModalProps {
    isOpen: boolean;
    onClose: () => void;
    storeName?: string;
}

export function LineRegistrationModal({ isOpen, onClose, storeName }: LineRegistrationModalProps) {
    const handleLineLink = async () => {
        try {
            const response = await fetch("/api/line-link", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mode: "link-account" }),
            });

            if (!response.ok) {
                throw new Error("Failed to initiate LINE link");
            }

            const { authUrl } = await response.json();
            window.location.href = authUrl;
        } catch (error) {
            console.error("Error linking LINE:", error);
            alert("LINE連携の開始に失敗しました");
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <MessageCircle className="h-5 w-5 text-green-500" />
                        公式LINE登録のお願い
                    </DialogTitle>
                    <DialogDescription className="text-left space-y-3 pt-2">
                        <p>
                            {storeName}の公式LINEアカウントへの登録をお願いします。
                        </p>
                        <p className="text-sm">
                            公式LINEに登録いただくと、以下のメリットがあります:
                        </p>
                        <ul className="text-sm space-y-1 list-disc list-inside pl-2">
                            <li>シフトやお知らせの通知を受け取れます</li>
                            <li>LINEからログインできるようになります</li>
                            <li>店舗からの重要な連絡を見逃しません</li>
                        </ul>
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-3 pt-4">
                    <Button
                        onClick={handleLineLink}
                        className="w-full bg-green-500 hover:bg-green-600 text-white"
                    >
                        <MessageCircle className="mr-2 h-4 w-4" />
                        公式LINEに登録する
                    </Button>
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="w-full"
                    >
                        後で登録する
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
