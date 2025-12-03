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
import { deleteAccount } from "./actions";
import { useRouter } from "next/navigation";

export function DeleteAccountModal() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleDelete = async () => {
        setLoading(true);
        try {
            await deleteAccount();
        } catch (error: any) {
            // Next.js redirect() throws a NEXT_REDIRECT error, which is expected behavior
            if (error?.digest?.startsWith('NEXT_REDIRECT')) {
                // Redirect is happening, this is success
                return;
            }
            console.error("Failed to delete account:", error);
            alert("アカウントの削除に失敗しました。");
        } finally {
            setLoading(false);
            setOpen(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="destructive" className="w-full mt-6">
                    <Trash2 className="mr-2 h-4 w-4" />
                    アカウント削除
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="text-red-600">アカウントを削除しますか？</DialogTitle>
                    <DialogDescription>
                        この操作は取り消せません。
                        <br />
                        あなたのアカウント情報は削除されますが、過去の勤怠記録などのプロフィール情報は店舗に残ります。
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2">
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
