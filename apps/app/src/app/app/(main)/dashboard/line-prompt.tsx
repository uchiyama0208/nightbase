"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageCircle, ExternalLink } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface LinePromptProps {
    hasLineId: boolean;
}

const STORAGE_KEY = "line-prompt-dismissed";

export function LinePrompt({ hasLineId }: LinePromptProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [dontShowAgain, setDontShowAgain] = useState(false);

    useEffect(() => {
        // Only show for users who have LINE linked
        if (!hasLineId) {
            return;
        }

        // Check if user has dismissed the prompt
        const dismissed = localStorage.getItem(STORAGE_KEY);
        if (dismissed) {
            return;
        }

        // Check URL for is_friend parameter (LINE linked but not a friend)
        const params = new URLSearchParams(window.location.search);
        const isFriend = params.get("is_friend");

        if (isFriend === "false") {
            // LINE連携済みだが友だち登録していない - 即座に表示
            setIsOpen(true);
            // Remove the parameter from URL
            const url = new URL(window.location.href);
            url.searchParams.delete("is_friend");
            window.history.replaceState({}, "", url.toString());
        }
    }, [hasLineId]);

    const handleClose = () => {
        if (dontShowAgain) {
            localStorage.setItem(STORAGE_KEY, "true");
        }
        setIsOpen(false);
    };

    const handleAddFriend = () => {
        // Open LINE add friend link
        window.open("https://lin.ee/X1M3Hgi", "_blank");
        handleClose();
    };

    if (!isOpen) {
        return null;
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <MessageCircle className="h-5 w-5 text-[#06C755]" />
                        Nightbase公式LINE友だち追加
                    </DialogTitle>
                    <DialogDescription asChild>
                        <div className="text-left space-y-3 pt-2 text-sm text-slate-500 dark:text-slate-400">
                            <p>
                                Nightbase公式LINEアカウント（@100cgntz）の友だち追加をお願いします。
                            </p>
                        </div>
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-3 pt-4">
                    <Button
                        onClick={handleAddFriend}
                        className="w-full bg-[#06C755] hover:bg-[#05b34c] text-white"
                    >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        友だち追加する
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleClose}
                        className="w-full"
                    >
                        後で
                    </Button>
                    <div className="flex items-center gap-2 justify-center pt-2">
                        <Checkbox
                            id="dontShowAgain"
                            checked={dontShowAgain}
                            onCheckedChange={(checked) => setDontShowAgain(checked === true)}
                        />
                        <label htmlFor="dontShowAgain" className="text-sm text-gray-500 cursor-pointer">
                            今後表示しない
                        </label>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
