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
import { submitReservation, type CustomField } from "./actions";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

type ContactSetting = "hidden" | "optional" | "required";

interface Store {
    id: string;
    name: string;
    icon_url: string | null;
    business_start_time: string | null;
    business_end_time: string | null;
    closed_days: string[] | null;
    reservation_email_setting: ContactSetting;
    reservation_phone_setting: ContactSetting;
    reservation_cast_selection_enabled: boolean;
}

// 曜日名から曜日番号へのマッピング（Date.getDay()と同じ順序）
const DAY_NAME_TO_NUMBER: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
};

// 定休日かどうかを判定
function isClosedDay(dateString: string, closedDays: string[] | null): boolean {
    if (!closedDays || closedDays.length === 0) return false;

    const date = new Date(dateString + "T00:00:00+09:00");
    const dayOfWeek = date.getDay();

    return closedDays.some((dayName) => DAY_NAME_TO_NUMBER[dayName.toLowerCase()] === dayOfWeek);
}

interface Cast {
    id: string;
    display_name: string;
    status?: string | null;
}

interface ReservationFormProps {
    store: Store;
    casts: Cast[];
    customFields: CustomField[];
}

// 時間選択肢を生成（店舗の営業時間に基づく、30分刻み）
function generateTimeOptions(startTime: string | null, endTime: string | null) {
    const options: string[] = [];

    // デフォルト値: 18:00〜翌5:00
    const defaultStart = 18;
    const defaultEnd = 5;

    // 開始時間をパース（"HH:MM:SS" or "HH:MM" 形式）
    let startHour = defaultStart;
    if (startTime) {
        const parsed = parseInt(startTime.split(":")[0], 10);
        if (!isNaN(parsed)) startHour = parsed;
    }

    // 終了時間をパース
    let endHour = defaultEnd;
    if (endTime) {
        const parsed = parseInt(endTime.split(":")[0], 10);
        if (!isNaN(parsed)) endHour = parsed;
    }

    // 深夜営業の判定（終了時間が開始時間より小さい場合は翌日）
    const isOvernight = endHour <= startHour;

    if (isOvernight) {
        // 開始〜23:30
        for (let h = startHour; h <= 23; h++) {
            options.push(`${h.toString().padStart(2, "0")}:00`);
            options.push(`${h.toString().padStart(2, "0")}:30`);
        }
        // 0:00〜終了時間
        for (let h = 0; h <= endHour; h++) {
            options.push(`${h.toString().padStart(2, "0")}:00`);
            if (h < endHour) {
                options.push(`${h.toString().padStart(2, "0")}:30`);
            }
        }
    } else {
        // 通常営業（開始〜終了が同日）
        for (let h = startHour; h <= endHour; h++) {
            options.push(`${h.toString().padStart(2, "0")}:00`);
            if (h < endHour) {
                options.push(`${h.toString().padStart(2, "0")}:30`);
            }
        }
    }

    return options;
}

export function ReservationForm({ store, casts, customFields }: ReservationFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});

    const timeOptions = generateTimeOptions(store.business_start_time, store.business_end_time);
    // デフォルト予約時間: 営業開始時間または20:00
    const defaultTime = timeOptions.length > 0 ? timeOptions[0] : "20:00";

    // デフォルト日付（今日）
    const today = new Date().toLocaleDateString("ja-JP", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).replace(/\//g, "-");

    const [reservationDate, setReservationDate] = useState(today);

    // 選択した日付が定休日かどうか
    const isSelectedDateClosed = isClosedDay(reservationDate, store.closed_days);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        // バリデーション
        const emailRequired = store.reservation_email_setting === "required";
        const phoneRequired = store.reservation_phone_setting === "required";

        if (emailRequired && !email.trim()) {
            setError("メールアドレスを入力してください");
            setIsSubmitting(false);
            return;
        }

        if (phoneRequired && !phone.trim()) {
            setError("電話番号を入力してください");
            setIsSubmitting(false);
            return;
        }

        // カスタム質問の必須チェック
        for (const field of customFields) {
            if (field.is_required) {
                const value = customAnswers[field.id];
                if (!value || value.trim() === "") {
                    setError(`「${field.label}」を入力してください`);
                    setIsSubmitting(false);
                    return;
                }
            }
        }

        const formData = new FormData(e.currentTarget);
        formData.set("store_id", store.id);
        formData.set("email", email);
        formData.set("phone", phone);

        // カスタム回答をJSONで追加
        if (Object.keys(customAnswers).length > 0) {
            const answers = Object.entries(customAnswers)
                .map(([fieldId, value]) => ({ fieldId, value }));
            formData.set("custom_answers", JSON.stringify(answers));
        }

        const result = await submitReservation(formData);

        if (result.success) {
            setIsSuccess(true);
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
                        予約完了
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                        ご予約を承りました
                    </p>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    ご予約日時にお待ちしております。<br />
                    変更・キャンセルは店舗に直接お問い合わせください。
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
                    来店予約
                </p>
            </div>

            {/* フォーム */}
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* 予約日 */}
                <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                        予約日 <span className="text-red-500">*</span>
                    </label>
                    <Input
                        name="reservation_date"
                        type="date"
                        value={reservationDate}
                        onChange={(e) => setReservationDate(e.target.value)}
                        required
                        className="h-12 rounded-xl border-gray-200 bg-white text-base
                                   focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0
                                   dark:border-gray-700 dark:bg-gray-800"
                    />
                    {isSelectedDateClosed && (
                        <p className="text-sm text-red-500">
                            選択した日付は店休日のため予約できません
                        </p>
                    )}
                </div>

                {/* 予約時間 */}
                <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                        予約時間 <span className="text-red-500">*</span>
                    </label>
                    <Select name="reservation_time" defaultValue={defaultTime}>
                        <SelectTrigger className="h-12 rounded-xl border-gray-200 bg-white text-base dark:border-gray-700 dark:bg-gray-800">
                            <SelectValue placeholder="時間を選択" />
                        </SelectTrigger>
                        <SelectContent>
                            {timeOptions.map((time) => (
                                <SelectItem key={time} value={time}>
                                    {time}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

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

                {/* お名前（ひらがな） */}
                <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                        お名前（ひらがな） <span className="text-red-500">*</span>
                    </label>
                    <Input
                        name="guest_name_kana"
                        placeholder="やまだ たろう"
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

                {/* 指名キャスト（任意） */}
                {store.reservation_cast_selection_enabled && casts.length > 0 && (
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                            指名キャスト（任意）
                        </label>
                        <Select name="nominated_cast_id" defaultValue="none">
                            <SelectTrigger className="h-12 rounded-xl border-gray-200 bg-white text-base dark:border-gray-700 dark:bg-gray-800">
                                <SelectValue placeholder="指名なし" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">指名なし</SelectItem>
                                {casts.map((cast) => (
                                    <SelectItem key={cast.id} value={cast.id}>
                                        {cast.display_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {/* メールアドレス */}
                {store.reservation_email_setting !== "hidden" && (
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                            メールアドレス
                            {store.reservation_email_setting === "required" && (
                                <span className="text-red-500"> *</span>
                            )}
                            {store.reservation_email_setting === "optional" && (
                                <span className="text-gray-400 text-xs ml-1">(任意)</span>
                            )}
                        </label>
                        <Input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="example@mail.com"
                            required={store.reservation_email_setting === "required"}
                            className="h-12 rounded-xl border-gray-200 bg-white text-base
                                       focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0
                                       dark:border-gray-700 dark:bg-gray-800"
                        />
                    </div>
                )}

                {/* 電話番号 */}
                {store.reservation_phone_setting !== "hidden" && (
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                            電話番号
                            {store.reservation_phone_setting === "required" && (
                                <span className="text-red-500"> *</span>
                            )}
                            {store.reservation_phone_setting === "optional" && (
                                <span className="text-gray-400 text-xs ml-1">(任意)</span>
                            )}
                        </label>
                        <Input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="090-1234-5678"
                            required={store.reservation_phone_setting === "required"}
                            className="h-12 rounded-xl border-gray-200 bg-white text-base
                                       focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0
                                       dark:border-gray-700 dark:bg-gray-800"
                        />
                    </div>
                )}

                {/* カスタム質問 */}
                {customFields.map((field) => (
                    <div key={field.id} className="space-y-1.5">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                            {field.label}
                            {field.is_required && <span className="text-red-500"> *</span>}
                            {!field.is_required && (
                                <span className="text-gray-400 text-xs ml-1">(任意)</span>
                            )}
                        </label>

                        {/* テキスト入力 */}
                        {field.field_type === "text" && (
                            <Input
                                value={customAnswers[field.id] || ""}
                                onChange={(e) =>
                                    setCustomAnswers((prev) => ({
                                        ...prev,
                                        [field.id]: e.target.value,
                                    }))
                                }
                                className="h-12 rounded-xl border-gray-200 bg-white text-base
                                           focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0
                                           dark:border-gray-700 dark:bg-gray-800"
                            />
                        )}

                        {/* テキストエリア */}
                        {field.field_type === "textarea" && (
                            <Textarea
                                value={customAnswers[field.id] || ""}
                                onChange={(e) =>
                                    setCustomAnswers((prev) => ({
                                        ...prev,
                                        [field.id]: e.target.value,
                                    }))
                                }
                                rows={3}
                                className="rounded-xl border-gray-200 bg-white text-base
                                           focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0
                                           dark:border-gray-700 dark:bg-gray-800"
                            />
                        )}

                        {/* 選択肢 */}
                        {field.field_type === "select" && field.options && (
                            <Select
                                value={customAnswers[field.id] || ""}
                                onValueChange={(v) =>
                                    setCustomAnswers((prev) => ({
                                        ...prev,
                                        [field.id]: v,
                                    }))
                                }
                            >
                                <SelectTrigger className="h-12 rounded-xl border-gray-200 bg-white text-base dark:border-gray-700 dark:bg-gray-800">
                                    <SelectValue placeholder="選択してください" />
                                </SelectTrigger>
                                <SelectContent>
                                    {field.options.map((option) => (
                                        <SelectItem key={option} value={option}>
                                            {option}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}

                        {/* チェックボックス */}
                        {field.field_type === "checkbox" && (
                            <div className="flex items-center gap-2 py-2">
                                <Checkbox
                                    id={`custom-${field.id}`}
                                    checked={customAnswers[field.id] === "true"}
                                    onCheckedChange={(checked) =>
                                        setCustomAnswers((prev) => ({
                                            ...prev,
                                            [field.id]: checked ? "true" : "",
                                        }))
                                    }
                                />
                                <label
                                    htmlFor={`custom-${field.id}`}
                                    className="text-sm text-gray-700 dark:text-gray-200 cursor-pointer"
                                >
                                    はい
                                </label>
                            </div>
                        )}
                    </div>
                ))}

                {/* エラー表示 */}
                {error && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    </div>
                )}

                {/* 送信ボタン */}
                <Button
                    type="submit"
                    disabled={isSubmitting || isSelectedDateClosed}
                    className="w-full h-12 rounded-xl text-base font-medium"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            予約中...
                        </>
                    ) : (
                        "予約する"
                    )}
                </Button>
            </form>
        </div>
    );
}
