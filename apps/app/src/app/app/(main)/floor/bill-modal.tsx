"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TableSession, BillSettings, Order } from "@/types/floor";
import { getBillSettings } from "../seats/bill-actions";
import { checkoutSession } from "./actions/session";
import { calculateBill, BillBreakdown } from "@/utils/bill-calculator";
import { Loader2, ChevronLeft } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";

interface BillModalProps {
    session: TableSession | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function BillModal({ session, open, onOpenChange }: BillModalProps) {
    const [breakdown, setBreakdown] = useState<BillBreakdown | null>(null);
    const [loading, setLoading] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);

    useEffect(() => {
        if (open && session) {
            calculate();
        }
    }, [open, session]);

    const calculate = async () => {
        if (!session) return;
        setLoading(true);
        try {
            const settings = await getBillSettings();
            if (!settings) {
                console.error("Bill settings not found");
                return;
            }
            // In a real app, we would fetch orders here or pass them as props
            // For now, assuming session object has orders populated (it does in our getActiveSessions query)
            const orders = (session as any).orders || [];

            const result = calculateBill(session, orders, settings);
            setBreakdown(result);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const [checkoutProcessing, setCheckoutProcessing] = useState(false);
    const { toast } = useToast();

    const handleCheckoutClick = () => {
        if (!session) return;
        setShowConfirmDialog(true);
    };

    const handleCheckoutConfirm = async () => {
        if (!session) return;

        setShowConfirmDialog(false);
        setCheckoutProcessing(true);
        try {
            await checkoutSession(session.id);
            toast({ title: "退店処理が完了しました" });
            onOpenChange(false);
        } catch (error) {
            toast({ title: "処理に失敗しました" });
        } finally {
            setCheckoutProcessing(false);
        }
    };

    if (!session) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md w-[95%] p-0 overflow-hidden flex flex-col max-h-[90vh] rounded-2xl bg-white dark:bg-gray-900">
                <DialogHeader className="sticky top-0 z-10 bg-white dark:bg-gray-900 flex !flex-row items-center gap-2 h-14 min-h-[3.5rem] flex-shrink-0 border-b border-gray-200 dark:border-gray-700 px-4">
                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 transition-colors"
                        aria-label="戻る"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <DialogTitle className="flex-1 text-center text-lg font-semibold text-gray-900 dark:text-white truncate">お会計詳細</DialogTitle>
                    <div className="w-8 h-8" />
                </DialogHeader>

                {loading ? (
                    <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                ) : breakdown ? (
                    <>
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        <div className="bg-muted/30 p-4 rounded-lg space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">滞在時間</span>
                                <span>{breakdown.timeCharge.durationMinutes}分</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">人数</span>
                                <span>{session.guest_count}名</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h3 className="font-semibold text-sm">セット料金</h3>
                            <div className="flex justify-between text-sm">
                                <span>基本セット ({breakdown.timeCharge.basePrice.toLocaleString()} x {session.guest_count})</span>
                                <span>¥{breakdown.timeCharge.basePrice.toLocaleString()}</span>
                            </div>
                            {breakdown.timeCharge.extensionPrice > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span>延長 ({breakdown.timeCharge.extensionMinutes}分)</span>
                                    <span>¥{breakdown.timeCharge.extensionPrice.toLocaleString()}</span>
                                </div>
                            )}
                        </div>

                        <Separator />

                        <div className="space-y-2">
                            <h3 className="font-semibold text-sm">指名・場内</h3>
                            {breakdown.castFees.shimeCount > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span>本指名 ({breakdown.castFees.shimeCount}件)</span>
                                    <span>¥{breakdown.castFees.shimeTotal.toLocaleString()}</span>
                                </div>
                            )}
                            {breakdown.castFees.jounaiCount > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span>場内指名 ({breakdown.castFees.jounaiCount}件)</span>
                                    <span>¥{breakdown.castFees.jounaiTotal.toLocaleString()}</span>
                                </div>
                            )}
                            {breakdown.castFees.total === 0 && <div className="text-sm text-muted-foreground">なし</div>}
                        </div>

                        <Separator />

                        <div className="space-y-2">
                            <h3 className="font-semibold text-sm">注文</h3>
                            <div className="flex justify-between text-sm">
                                <span>小計 ({breakdown.orders.items.length}点)</span>
                                <span>¥{breakdown.orders.total.toLocaleString()}</span>
                            </div>
                        </div>

                        <Separator className="my-4" />

                        <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                                <span>小計</span>
                                <span>¥{breakdown.subtotal.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>サービス料</span>
                                <span>¥{breakdown.serviceCharge.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>消費税</span>
                                <span>¥{breakdown.tax.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t">
                                <span>合計</span>
                                <span>¥{breakdown.total.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex-shrink-0 px-6 pb-6 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <Button
                            className="w-full"
                            size="lg"
                            onClick={handleCheckoutClick}
                            disabled={checkoutProcessing}
                        >
                            {checkoutProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            会計を確定して退店処理
                        </Button>
                    </div>
                    </>
                ) : (
                    <div>計算できませんでした</div>
                )}
            </DialogContent>

            <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <DialogContent className="sm:max-w-md w-[95%] max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-gray-900 p-6">
                    <DialogHeader className="flex flex-col items-center gap-2 mb-4">
                        <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white text-center">会計確定の確認</DialogTitle>
                        <DialogDescription className="text-sm text-gray-500 dark:text-gray-400 text-center mt-2">
                            会計を確定して退店処理を行いますか？
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex flex-col gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setShowConfirmDialog(false)}
                        >
                            キャンセル
                        </Button>
                        <Button
                            onClick={handleCheckoutConfirm}
                            disabled={checkoutProcessing}
                        >
                            {checkoutProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            確定する
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Dialog>
    );
}
