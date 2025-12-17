"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2, ChevronLeft } from "lucide-react";
import { addQueueEntry } from "./actions";
import type { QueueEntry } from "./types";

interface QueueAddModalProps {
    isOpen: boolean;
    onClose: () => void;
    storeId: string;
    onSuccess: (entry: QueueEntry) => void;
}

export function QueueAddModal({
    isOpen,
    onClose,
    storeId,
    onSuccess,
}: QueueAddModalProps) {
    const [isPending, startTransition] = useTransition();
    const [guestName, setGuestName] = useState("");
    const [contactValue, setContactValue] = useState("");
    const [partySize, setPartySize] = useState(1);

    const resetForm = () => {
        setGuestName("");
        setContactValue("");
        setPartySize(1);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleSubmit = () => {
        if (!guestName.trim()) return;

        startTransition(async () => {
            const result = await addQueueEntry({
                storeId,
                guestName: guestName.trim(),
                contactValue: contactValue.trim(),
                contactType: "email",
                partySize,
            });

            if (result.success && result.entry) {
                onSuccess(result.entry);
                handleClose();
            }
        });
    };

    const isValid = guestName.trim() !== "";

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900 max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="p-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <DialogTitle className="text-base font-semibold text-gray-900 dark:text-gray-50">
                            順番待ちを追加
                        </DialogTitle>
                        <div className="w-7" />
                    </div>
                </DialogHeader>

                <div className="space-y-4 mt-4">
                    {/* お名前 */}
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                            お名前 <span className="text-red-500">*</span>
                        </label>
                        <Input
                            value={guestName}
                            onChange={(e) => setGuestName(e.target.value)}
                            placeholder="山田 太郎"
                            className="h-10 rounded-lg"
                        />
                    </div>

                    {/* 人数 */}
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                            人数
                        </label>
                        <Select value={String(partySize)} onValueChange={(v) => setPartySize(parseInt(v, 10))}>
                            <SelectTrigger className="h-10 rounded-lg">
                                <SelectValue placeholder="人数を選択" />
                            </SelectTrigger>
                            <SelectContent>
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                                    <SelectItem key={num} value={String(num)}>
                                        {num}名
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* メールアドレス入力 */}
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                            メールアドレス
                        </label>
                        <Input
                            value={contactValue}
                            onChange={(e) => setContactValue(e.target.value)}
                            type="email"
                            placeholder="example@mail.com"
                            className="h-10 rounded-lg"
                        />
                    </div>
                </div>

                <DialogFooter className="mt-6 flex justify-end gap-2">
                    <Button
                        variant="outline"
                        onClick={handleClose}
                        className="rounded-lg"
                    >
                        キャンセル
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isPending || !isValid}
                        className="rounded-lg"
                    >
                        {isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            "追加"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
