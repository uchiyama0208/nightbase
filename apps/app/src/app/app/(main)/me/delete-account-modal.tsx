"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Trash2, ChevronLeft } from "lucide-react";
import { deleteAccount } from "./actions";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/use-toast";

export function DeleteAccountModal() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleDelete = async () => {
        setLoading(true);
        try {
            await deleteAccount();
        } catch (error) {
            // Next.js redirect() throws a NEXT_REDIRECT error, which is expected behavior
            if (error && typeof error === 'object' && 'digest' in error && typeof error.digest === 'string' && error.digest.startsWith('NEXT_REDIRECT')) {
                // Redirect is happening, this is success
                return;
            }
            console.error("Failed to delete account:", error);
            toast({ title: "アカウントの削除に失敗しました。", variant: "destructive" });
        } finally {
            setLoading(false);
            setOpen(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <button
                    type="button"
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                    <div className="flex items-center space-x-4">
                        <div className="bg-red-100 dark:bg-red-900 p-2 rounded-md">
                            <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
                        </div>
                        <span className="font-medium text-red-600 dark:text-red-400">アカウント削除</span>
                    </div>
                </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md w-[95%] max-h-[90vh] overflow-hidden rounded-2xl bg-white dark:bg-gray-900 p-0 flex flex-col">
                <DialogHeader className="sticky top-0 z-10 bg-white dark:bg-gray-900 flex !flex-row items-center gap-2 h-14 min-h-[3.5rem] flex-shrink-0 border-b border-gray-200 dark:border-gray-700 px-4">
                    <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 transition-colors"
                        aria-label="戻る"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <DialogTitle className="flex-1 text-center text-lg font-semibold text-red-600 truncate">
                        アカウント削除
                    </DialogTitle>
                    <div className="w-8 h-8" />
                </DialogHeader>
                <div className="flex-1 overflow-y-auto p-6">
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
                        この操作は取り消せません。
                        <br />
                        あなたのアカウント情報は削除されますが、過去の勤怠記録などのプロフィール情報は店舗に残ります。
                    </p>
                    <div className="flex flex-col gap-2">
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                        キャンセル
                    </Button>
                    <Button variant="destructive" onClick={handleDelete} disabled={loading}>
                        {loading ? "削除中..." : "削除する"}
                    </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
