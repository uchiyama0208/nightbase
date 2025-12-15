"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, X } from "lucide-react";

export function LineFriendPopup() {
    const [open, setOpen] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        // Check if user has dismissed this popup before
        const hasDismissed = localStorage.getItem("line_friend_popup_dismissed");
        if (hasDismissed) {
            setDismissed(true);
            return;
        }

        // Check for is_friend parameter in URL
        const params = new URLSearchParams(window.location.search);
        const isFriend = params.get("is_friend");

        // Only show popup if is_friend is explicitly "false" (not a friend/blocked)
        if (isFriend === "false" && !dismissed) {
            // Delay showing the popup to ensure page has fully loaded
            const timer = setTimeout(() => {
                setOpen(true);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [dismissed]);

    const handleDismiss = (rememberChoice: boolean) => {
        setOpen(false);
        if (rememberChoice) {
            localStorage.setItem("line_friend_popup_dismissed", "true");
            setDismissed(true);
        }
    };

    const handleAddFriend = () => {
        // Open LINE add friend link
        window.open("https://line.me/R/ti/p/@100cgntz", "_blank");
        handleDismiss(true);
    };

    return (
        <Dialog open={open} onOpenChange={(newOpen: boolean) => !newOpen && handleDismiss(false)}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-xl">公式LINEを友だち追加 account</DialogTitle>
                    <DialogDescription className="text-base pt-2">
                        お得な情報やお知らせを受け取るには、公式LINEアカウントを友だち追加してください。
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-3 pt-4">
                    <Button
                        onClick={handleAddFriend}
                        className="w-full bg-[#06C755] hover:bg-[#05b34c] text-white font-medium"
                    >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        友だち追加する
                    </Button>

                    <Button
                        onClick={() => handleDismiss(true)}
                        variant="ghost"
                        className="w-full"
                    >
                        次回から表示しない
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
