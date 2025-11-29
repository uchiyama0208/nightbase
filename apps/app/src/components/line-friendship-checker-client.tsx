"use client";

import Image from "next/image";

import { useCallback, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { updateLineFriendshipPreference } from "@/app/actions/user-preferences";

interface LineFriendshipCheckerClientProps {
    shouldHide: boolean;
}

export function LineFriendshipCheckerClient({ shouldHide }: LineFriendshipCheckerClientProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [dontShowAgain, setDontShowAgain] = useState(false);

    const persistPreferenceIfNeeded = useCallback(async () => {
        if (!dontShowAgain) return;

        try {
            await updateLineFriendshipPreference(true);
        } catch (error) {
            console.error("Failed to save preference:", error);
        }
    }, [dontShowAgain]);

    const removeIsFriendQueryParam = useCallback(() => {
        const url = new URL(window.location.href);
        url.searchParams.delete("is_friend");
        window.history.replaceState({}, "", url.toString());
    }, []);

    useEffect(() => {
        // Don't show if user has previously opted out
        if (shouldHide) {
            return;
        }

        const url = typeof window !== "undefined" ? new URL(window.location.href) : null;
        const isFriend = url?.searchParams.get("is_friend");

        if (isFriend === "false") {
            setIsOpen(true);
        }
    }, [shouldHide]);

    const handleClose = useCallback(async () => {
        await persistPreferenceIfNeeded();
        setIsOpen(false);
        removeIsFriendQueryParam();
    }, [persistPreferenceIfNeeded, removeIsFriendQueryParam]);

    const handleAddFriend = useCallback(async () => {
        window.open("https://lin.ee/L93zfbS", "_blank");
        await handleClose();
    }, [handleClose]);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="w-[90%] sm:max-w-md bg-white dark:bg-white rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="text-gray-900">LINE公式アカウントと連携</DialogTitle>
                    <DialogDescription className="text-gray-600">
                        Nightbaseを便利に利用するために、公式LINEアカウントの友だち追加をお願いします。
                        通知や重要なメッセージを受け取ることができます。
                    </DialogDescription>
                </DialogHeader>
                <div className="flex items-center justify-center py-4">
                    <div className="bg-green-50 p-4 rounded-full">
                        <Image
                            src="https://upload.wikimedia.org/wikipedia/commons/4/41/LINE_logo.svg"
                            alt="LINEロゴ"
                            className="w-12 h-12"
                            width={48}
                            height={48}
                        />
                    </div>
                </div>
                <DialogFooter className="flex-col gap-4">
                    <div className="flex items-center gap-2 justify-center sm:justify-start">
                        <input
                            type="checkbox"
                            id="dontShowAgain"
                            checked={dontShowAgain}
                            onChange={(e) => setDontShowAgain(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <label htmlFor="dontShowAgain" className="text-sm text-gray-600 cursor-pointer">
                            今後表示しない
                        </label>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 w-full">
                        <Button onClick={handleAddFriend} className="w-full sm:w-auto bg-[#06C755] hover:bg-[#05b64d] text-white">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            友だち追加する
                        </Button>
                        <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto text-gray-700 border-gray-300 hover:bg-gray-100">
                            あとで
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
