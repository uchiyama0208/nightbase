"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { clockOut } from "./actions";
import { useRouter } from "next/navigation";

interface ClockOutModalProps {
    isOpen: boolean;
    onClose: () => void;
    timeCardId: string;
}

export function ClockOutModal({ isOpen, onClose, timeCardId }: ClockOutModalProps) {
    const [isPending, setIsPending] = useState(false);
    const router = useRouter();

    const handleClockOut = async () => {
        setIsPending(true);
        try {
            await clockOut(timeCardId);
            onClose();
            router.refresh();
        } catch (error) {
            console.error("Clock out failed:", error);
            alert("退勤打刻に失敗しました。もう一度お試しください。");
        } finally {
            setIsPending(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px] bg-white dark:bg-gray-800">
                <DialogHeader>
                    <DialogTitle className="text-gray-900 dark:text-white">退勤確認</DialogTitle>
                    <DialogDescription className="text-gray-600 dark:text-gray-400">
                        退勤打刻を行いますか？
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-3 pt-4">
                    <Button
                        onClick={handleClockOut}
                        disabled={isPending}
                        className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                    >
                        {isPending ? "登録中..." : "退勤する"}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="w-full border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                        キャンセル
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
