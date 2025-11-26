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
import { Trash2 } from "lucide-react";
import { deleteStore } from "./actions";
import { useRouter } from "next/navigation";

export function DeleteStoreModal() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleDelete = async () => {
        setLoading(true);
        try {
            await deleteStore();
        } catch (error: any) {
            // Next.js redirect() throws a NEXT_REDIRECT error, which is expected behavior
            if (error?.digest?.startsWith('NEXT_REDIRECT')) {
                // Redirect is happening, this is success
                return;
            }
            console.error("Failed to delete store:", error);
            alert("店舗の削除に失敗しました。");
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
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="text-red-600">店舗データを削除しますか？</DialogTitle>
                    <DialogDescription>
                        この操作は取り消せません。
                        <br />
                        店舗に関連するすべてのデータ（スタッフ、キャスト、勤怠記録、設定など）が永久に削除されます。
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
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
