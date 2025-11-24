"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

export function LineFriendshipChecker() {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const url = typeof window !== "undefined" ? new URL(window.location.href) : null;
        const isFriend = url?.searchParams.get("is_friend");

        if (isFriend === "false") {
            setIsOpen(true);
        }
    }, []);

    const handleClose = () => {
        setIsOpen(false);
        // Remove the param from the URL
        const url = new URL(window.location.href);
        url.searchParams.delete("is_friend");
        window.history.replaceState({}, "", url.toString());
    };

    const handleAddFriend = () => {
        // Redirect to LINE Official Account
        window.open("https://lin.ee/L93zfbS", "_blank");
        handleClose();
    };

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
                        <img
                            src="https://upload.wikimedia.org/wikipedia/commons/4/41/LINE_logo.svg"
                            alt="LINEロゴ"
                            className="w-12 h-12"
                        />
                    </div>
                </div>
                <DialogFooter className="flex-col sm:flex-row gap-6">
                    <Button onClick={handleAddFriend} className="w-full sm:w-auto bg-[#06C755] hover:bg-[#05b64d] text-white">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        友だち追加する
                    </Button>
                    <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto text-gray-700 border-gray-300 hover:bg-gray-100">
                        あとで
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
