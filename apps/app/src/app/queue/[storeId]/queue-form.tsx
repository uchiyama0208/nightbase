"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2, Check } from "lucide-react";
import { submitQueueEntry } from "./actions";

interface Store {
    id: string;
    name: string;
    icon_url: string | null;
}

interface QueueFormProps {
    store: Store;
    waitingCount: number;
}

export function QueueForm({ store, waitingCount }: QueueFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [queueNumber, setQueueNumber] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        formData.set("store_id", store.id);
        formData.set("contact_type", "email");

        const result = await submitQueueEntry(formData);

        if (result.success) {
            setIsSuccess(true);
            setQueueNumber(result.queueNumber ?? null);
        } else {
            setError(result.error || "登録に失敗しました");
        }

        setIsSubmitting(false);
    };

    if (isSuccess) {
        return (
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-700 p-8 text-center space-y-6">
                <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                    <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        登録完了
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                        順番待ちの登録が完了しました
                    </p>
                </div>
                {queueNumber && (
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                            あなたの受付番号
                        </p>
                        <p className="text-4xl font-bold text-gray-900 dark:text-white">
                            {queueNumber}
                        </p>
                    </div>
                )}
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    順番が近づきましたらご連絡いたします。<br />
                    しばらくお待ちください。
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-700 p-6 space-y-6">
            {/* ヘッダー */}
            <div className="text-center space-y-2">
                {store.icon_url && (
                    <img
                        src={store.icon_url}
                        alt={store.name}
                        className="w-16 h-16 mx-auto rounded-full object-cover"
                    />
                )}
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    {store.name}
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                    順番待ち登録
                </p>
            </div>

            {/* 待ち組数表示 */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                    現在の待ち組数
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {waitingCount}<span className="text-lg font-normal ml-1">組</span>
                </p>
            </div>

            {/* フォーム */}
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* お名前 */}
                <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                        お名前 <span className="text-red-500">*</span>
                    </label>
                    <Input
                        name="guest_name"
                        placeholder="山田 太郎"
                        required
                        className="h-12 rounded-xl border-gray-200 bg-white text-base
                                   focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0
                                   dark:border-gray-700 dark:bg-gray-800"
                    />
                </div>

                {/* 人数 */}
                <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                        人数 <span className="text-red-500">*</span>
                    </label>
                    <Select name="party_size" defaultValue="1">
                        <SelectTrigger className="h-12 rounded-xl border-gray-200 bg-white text-base dark:border-gray-700 dark:bg-gray-800">
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
                        メールアドレス <span className="text-red-500">*</span>
                    </label>
                    <Input
                        name="contact_value"
                        type="email"
                        placeholder="example@mail.com"
                        required
                        className="h-12 rounded-xl border-gray-200 bg-white text-base
                                   focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0
                                   dark:border-gray-700 dark:bg-gray-800"
                    />
                </div>

                {/* エラー表示 */}
                {error && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    </div>
                )}

                {/* 送信ボタン */}
                <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-12 rounded-xl text-base font-medium"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                            登録中...
                        </>
                    ) : (
                        "順番待ちに登録する"
                    )}
                </Button>
            </form>

            {/* 注意書き */}
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                ご登録いただいた連絡先に、順番が近づいた際にお知らせいたします。
            </p>
        </div>
    );
}
