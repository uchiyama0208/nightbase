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
import { ChevronLeft, Trash2 } from "lucide-react";
import { deleteStore } from "./actions";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/use-toast";

export function DeleteStoreModal() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleDelete = async () => {
        setLoading(true);
        try {
            await deleteStore();
        } catch (error) {
            // Next.js redirect() throws a NEXT_REDIRECT error, which is expected behavior
            if (error && typeof error === 'object' && 'digest' in error && typeof error.digest === 'string' && error.digest.startsWith('NEXT_REDIRECT')) {
                // Redirect is happening, this is success
                return;
            }
            console.error("Failed to delete store:", error);
            toast({ title: "店舗の削除に失敗しました。", variant: "destructive" });
        } finally {
            setLoading(false);
            setOpen(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <div className="flex items-center justify-between p-4 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer group">
                    <div className="flex items-center space-x-4">
                        <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-md group-hover:bg-red-200 dark:group-hover:bg-red-900/50 transition-colors">
                            <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
                        </div>
                        <span className="font-medium text-red-600 dark:text-red-400">店舗データ削除</span>
                    </div>
                </div>
            </DialogTrigger>
            <DialogContent className="p-0 overflow-hidden flex flex-col max-h-[90vh] rounded-2xl">
                <DialogHeader className="sticky top-0 z-10 bg-white dark:bg-gray-900 flex !flex-row items-center gap-2 h-14 min-h-[3.5rem] flex-shrink-0 border-b border-gray-200 dark:border-gray-700 px-4">
                    <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 transition-colors"
                        aria-label="戻る"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <DialogTitle className="flex-1 text-center text-lg font-semibold text-red-600 truncate">店舗データを削除しますか？</DialogTitle>
                    <div className="w-8 h-8" />
                </DialogHeader>
                <div className="flex-1 overflow-y-auto p-6">
                    <DialogDescription className="text-sm text-gray-500 dark:text-gray-400 text-center">
                        この操作は取り消せません。
                        <br />
                        店舗に関連するすべてのデータ（スタッフ、キャスト、勤怠記録、設定など）が永久に削除されます。
                    </DialogDescription>
                </div>
                <DialogFooter className="flex flex-col gap-2 p-4 pt-0">
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                        キャンセル
                    </Button>
                    <Button variant="destructive" onClick={handleDelete} disabled={loading}>
                        {loading ? "削除中..." : "削除する"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
