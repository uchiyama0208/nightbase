"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ChevronLeft, Loader2 } from "lucide-react";
import { clockOut, getActiveTimecardQuestions, type TimecardQuestion } from "./actions";
import { TimecardQuestionsForm } from "@/components/timecard/timecard-questions-form";

interface ClockOutModalProps {
    isOpen: boolean;
    onClose: () => void;
    timeCardId: string;
}

export function ClockOutModal({ isOpen, onClose, timeCardId }: ClockOutModalProps) {
    const [isPending, setIsPending] = useState(false);
    const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
    const [clockOutQuestions, setClockOutQuestions] = useState<TimecardQuestion[]>([]);
    const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({});
    const [isQuestionsValid, setIsQuestionsValid] = useState(true);
    const queryClient = useQueryClient();
    const { toast } = useToast();

    // Load questions when modal opens
    useEffect(() => {
        if (isOpen) {
            loadClockOutQuestions();
        } else {
            // Reset state when modal closes
            setClockOutQuestions([]);
            setQuestionAnswers({});
            setIsQuestionsValid(true);
        }
    }, [isOpen]);

    const loadClockOutQuestions = async () => {
        setIsLoadingQuestions(true);
        try {
            const questions = await getActiveTimecardQuestions("clock_out");
            setClockOutQuestions(questions);
            setQuestionAnswers({});
            // If no required questions, consider valid
            const hasRequired = questions.some(q => q.is_required);
            setIsQuestionsValid(!hasRequired);
        } catch (error) {
            console.error("Error loading questions:", error);
        } finally {
            setIsLoadingQuestions(false);
        }
    };

    const handleClockOut = async () => {
        setIsPending(true);
        try {
            await clockOut(
                timeCardId,
                clockOutQuestions.length > 0 ? questionAnswers : undefined
            );
            // 先にデータを再取得してから、モーダルを閉じる
            // 勤怠ページのキャッシュも無効化（次回アクセス時に再取得される）
            await Promise.all([
                queryClient.refetchQueries({ queryKey: ["timecard", "pageData"] }),
                queryClient.refetchQueries({ queryKey: ["dashboard", "pageData"] }),
                queryClient.invalidateQueries({ queryKey: ["attendance"] }),
            ]);
            onClose();
        } catch (error) {
            console.error("Clock out failed:", error);
            toast({
                title: "退勤打刻に失敗しました",
                description: "もう一度お試しください。",
                variant: "destructive",
            });
        } finally {
            setIsPending(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md w-[95%] max-h-[90vh] overflow-hidden rounded-2xl bg-white dark:bg-gray-900 p-0 flex flex-col">
                <DialogHeader className="sticky top-0 z-10 bg-white dark:bg-gray-900 flex !flex-row items-center gap-2 h-14 min-h-[3.5rem] flex-shrink-0 border-b border-gray-200 dark:border-gray-700 px-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 transition-colors"
                        aria-label="戻る"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <DialogTitle className="flex-1 text-center text-lg font-semibold text-gray-900 dark:text-white truncate">
                        退勤確認
                    </DialogTitle>
                    <div className="w-8 h-8" />
                </DialogHeader>
                <div className="flex-1 overflow-y-auto p-6">
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
                        退勤打刻を行いますか？
                    </p>

                    {/* Custom Questions */}
                    {isLoadingQuestions ? (
                        <div className="py-4 text-center text-gray-500">
                            <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                            <span className="text-sm">質問を読み込み中...</span>
                        </div>
                    ) : clockOutQuestions.length > 0 && (
                        <div className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
                            <TimecardQuestionsForm
                                questions={clockOutQuestions}
                                answers={questionAnswers}
                                onAnswersChange={setQuestionAnswers}
                                onValidationChange={setIsQuestionsValid}
                                isDarkMode={false}
                            />
                        </div>
                    )}

                    <div className="flex flex-col gap-3">
                        <Button
                            onClick={handleClockOut}
                            disabled={isPending || !isQuestionsValid}
                            className="w-full bg-blue-500 hover:bg-blue-600 text-white disabled:bg-gray-300 disabled:cursor-not-allowed"
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
                </div>
            </DialogContent>
        </Dialog>
    );
}
