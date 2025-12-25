"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Check, Upload, X, Image as ImageIcon } from "lucide-react";
import { submitResumeForm } from "./actions";
import { toast } from "@/components/ui/use-toast";

interface TemplateField {
    id: string;
    field_type: string;
    label: string;
    options: string[] | null;
    is_required: boolean;
    sort_order: number;
}

interface PastEmployment {
    store_name: string;
    period: string;
    hourly_wage: string;
    monthly_sales: string;
    customer_count: string;
}

interface VisibleFields {
    name: boolean;
    name_kana: boolean;
    birth_date: boolean;
    phone_number: boolean;
    emergency_phone_number: boolean;
    desired_cast_name: boolean;
    zip_code: boolean;
    prefecture: boolean;
    city: boolean;
    street: boolean;
    building: boolean;
    past_employments: boolean;
    id_verification: boolean;
}

const defaultVisibleFields: VisibleFields = {
    name: true,
    name_kana: true,
    birth_date: true,
    phone_number: true,
    emergency_phone_number: true,
    desired_cast_name: true,
    zip_code: true,
    prefecture: true,
    city: true,
    street: true,
    building: true,
    past_employments: true,
    id_verification: false,
};

interface ResumeFormClientProps {
    template: any;
    fields: TemplateField[];
    storeName: string;
}

const prefectures = [
    "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
    "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
    "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県",
    "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府", "兵庫県",
    "奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県", "山口県",
    "徳島県", "香川県", "愛媛県", "高知県", "福岡県", "佐賀県", "長崎県",
    "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県"
];

export function ResumeFormClient({
    template,
    fields,
    storeName,
}: ResumeFormClientProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    // Get visible fields from template or use defaults
    const visibleFields: VisibleFields = template.visible_fields || defaultVisibleFields;

    // Fixed fields state
    const [lastName, setLastName] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastNameKana, setLastNameKana] = useState("");
    const [firstNameKana, setFirstNameKana] = useState("");
    const [birthDate, setBirthDate] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [emergencyPhoneNumber, setEmergencyPhoneNumber] = useState("");
    const [zipCode, setZipCode] = useState("");
    const [prefecture, setPrefecture] = useState("");
    const [city, setCity] = useState("");
    const [street, setStreet] = useState("");
    const [building, setBuilding] = useState("");
    const [desiredCastName, setDesiredCastName] = useState("");
    const [desiredCastNameKana, setDesiredCastNameKana] = useState("");

    // Past employments state
    const [pastEmployments, setPastEmployments] = useState<PastEmployment[]>([]);

    // Custom fields state
    const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});

    // ID verification images
    const [idVerificationImages, setIdVerificationImages] = useState<File[]>([]);
    const [idImagePreviews, setIdImagePreviews] = useState<string[]>([]);

    const addPastEmployment = () => {
        setPastEmployments([
            ...pastEmployments,
            {
                store_name: "",
                period: "",
                hourly_wage: "",
                monthly_sales: "",
                customer_count: "",
            },
        ]);
    };

    const removePastEmployment = (index: number) => {
        setPastEmployments(pastEmployments.filter((_, i) => i !== index));
    };

    const updatePastEmployment = (index: number, field: keyof PastEmployment, value: string) => {
        const updated = [...pastEmployments];
        updated[index] = { ...updated[index], [field]: value };
        setPastEmployments(updated);
    };

    const handleCustomAnswerChange = (fieldId: string, value: string) => {
        setCustomAnswers({ ...customAnswers, [fieldId]: value });
    };

    const handleIdImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const newFiles: File[] = [];
        const newPreviews: string[] = [];

        Array.from(files).forEach((file) => {
            if (file.type.startsWith("image/")) {
                newFiles.push(file);
                newPreviews.push(URL.createObjectURL(file));
            }
        });

        setIdVerificationImages([...idVerificationImages, ...newFiles]);
        setIdImagePreviews([...idImagePreviews, ...newPreviews]);
    };

    const removeIdImage = (index: number) => {
        // Revoke the object URL to prevent memory leaks
        URL.revokeObjectURL(idImagePreviews[index]);
        setIdVerificationImages(idVerificationImages.filter((_, i) => i !== index));
        setIdImagePreviews(idImagePreviews.filter((_, i) => i !== index));
    };

    // 郵便番号から住所を自動入力
    const fetchAddressFromZipCode = async (zip: string) => {
        // ハイフンを除去して7桁の数字のみにする
        const cleanZip = zip.replace(/-/g, "");
        if (cleanZip.length !== 7) return;

        try {
            const response = await fetch(
                `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${cleanZip}`
            );
            const data = await response.json();

            if (data.results && data.results.length > 0) {
                const result = data.results[0];
                setPrefecture(result.address1); // 都道府県
                setCity(result.address2 + result.address3); // 市区町村 + 町域
            }
        } catch (error) {
            console.error("Failed to fetch address:", error);
        }
    };

    const handleZipCodeChange = (value: string) => {
        setZipCode(value);
        // 7桁（ハイフンあり8桁）入力されたら住所を取得
        const cleanZip = value.replace(/-/g, "");
        if (cleanZip.length === 7) {
            fetchAddressFromZipCode(value);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            await submitResumeForm({
                templateId: template.id,
                storeId: template.store_id,
                fixedFields: {
                    last_name: lastName,
                    first_name: firstName,
                    last_name_kana: lastNameKana,
                    first_name_kana: firstNameKana,
                    birth_date: birthDate,
                    phone_number: phoneNumber,
                    emergency_phone_number: emergencyPhoneNumber,
                    zip_code: zipCode,
                    prefecture,
                    city,
                    street,
                    building,
                    desired_cast_name: desiredCastName,
                    desired_cast_name_kana: desiredCastNameKana,
                },
                pastEmployments,
                customAnswers,
                idVerificationImages,
            });

            setIsSubmitted(true);
        } catch (error) {
            console.error("Failed to submit:", error);
            toast({ title: "送信に失敗しました。もう一度お試しください。", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderCustomField = (field: TemplateField) => {
        const value = customAnswers[field.id] || "";

        switch (field.field_type) {
            case "text":
                return (
                    <Input
                        value={value}
                        onChange={(e) => handleCustomAnswerChange(field.id, e.target.value)}
                        required={field.is_required}
                    />
                );

            case "textarea":
                return (
                    <Textarea
                        value={value}
                        onChange={(e) => handleCustomAnswerChange(field.id, e.target.value)}
                        className="min-h-[100px]"
                        required={field.is_required}
                    />
                );

            case "number":
                return (
                    <Input
                        type="number"
                        value={value}
                        onChange={(e) => handleCustomAnswerChange(field.id, e.target.value)}
                        required={field.is_required}
                    />
                );

            case "select":
                return (
                    <Select
                        value={value}
                        onValueChange={(v) => handleCustomAnswerChange(field.id, v)}
                        required={field.is_required}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="選択してください" />
                        </SelectTrigger>
                        <SelectContent>
                            {field.options?.map((option) => (
                                <SelectItem key={option} value={option}>
                                    {option}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                );

            case "checkbox":
                return (
                    <div className="flex items-center gap-2">
                        <Checkbox
                            id={field.id}
                            checked={value === "true"}
                            onCheckedChange={(checked) =>
                                handleCustomAnswerChange(field.id, checked ? "true" : "false")
                            }
                        />
                        <label
                            htmlFor={field.id}
                            className="text-sm text-gray-700 dark:text-gray-300"
                        >
                            はい
                        </label>
                    </div>
                );

            case "date":
                return (
                    <Input
                        type="date"
                        value={value}
                        onChange={(e) => handleCustomAnswerChange(field.id, e.target.value)}
                        required={field.is_required}
                    />
                );

            default:
                return null;
        }
    };

    if (isSubmitted) {
        return (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 text-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    送信完了
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    履歴書を送信しました。
                </p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Header */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                    {template.name}
                </h1>
                {storeName && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        {storeName}
                    </p>
                )}
            </div>

            {/* Fixed Fields - 基本情報 */}
            {(visibleFields.name || visibleFields.name_kana || visibleFields.birth_date || visibleFields.phone_number || visibleFields.emergency_phone_number || visibleFields.desired_cast_name) && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                        基本情報
                    </h2>

                    {/* Name */}
                    {visibleFields.name && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                    姓 <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    placeholder="山田"
                                    className="rounded-lg"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                    名 <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    placeholder="花子"
                                    className="rounded-lg"
                                    required
                                />
                            </div>
                        </div>
                    )}

                    {/* Name Kana */}
                    {visibleFields.name_kana && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                    せい <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    value={lastNameKana}
                                    onChange={(e) => setLastNameKana(e.target.value)}
                                    placeholder="やまだ"
                                    className="rounded-lg"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                    めい <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    value={firstNameKana}
                                    onChange={(e) => setFirstNameKana(e.target.value)}
                                    placeholder="はなこ"
                                    className="rounded-lg"
                                    required
                                />
                            </div>
                        </div>
                    )}

                    {/* Birth Date */}
                    {visibleFields.birth_date && (
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                生年月日 <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                type="date"
                                value={birthDate}
                                onChange={(e) => setBirthDate(e.target.value)}
                                className="rounded-lg"
                                required
                            />
                        </div>
                    )}

                    {/* Phone Numbers */}
                    {(visibleFields.phone_number || visibleFields.emergency_phone_number) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {visibleFields.phone_number && (
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                        電話番号 <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        type="tel"
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                        placeholder="090-1234-5678"
                                        className="rounded-lg"
                                        required
                                    />
                                </div>
                            )}
                            {visibleFields.emergency_phone_number && (
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                        緊急連絡先
                                    </Label>
                                    <Input
                                        type="tel"
                                        value={emergencyPhoneNumber}
                                        onChange={(e) => setEmergencyPhoneNumber(e.target.value)}
                                        placeholder="03-1234-5678"
                                        className="rounded-lg"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Desired Cast Name */}
                    {visibleFields.desired_cast_name && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                    {template.target_role === "staff" ? "希望スタッフ名" : "希望キャスト名（源氏名）"}
                                </Label>
                                <Input
                                    value={desiredCastName}
                                    onChange={(e) => setDesiredCastName(e.target.value)}
                                    placeholder={template.target_role === "staff" ? "山田" : "あいり"}
                                    className="rounded-lg"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                    {template.target_role === "staff" ? "希望スタッフ名（かな）" : "希望キャスト名（かな）"}
                                </Label>
                                <Input
                                    value={desiredCastNameKana}
                                    onChange={(e) => setDesiredCastNameKana(e.target.value)}
                                    placeholder={template.target_role === "staff" ? "やまだ" : "あいり"}
                                    className="rounded-lg"
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Fixed Fields - 住所 */}
            {(visibleFields.zip_code || visibleFields.prefecture || visibleFields.city || visibleFields.street || visibleFields.building) && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                        住所
                    </h2>

                    {(visibleFields.zip_code || visibleFields.prefecture) && (
                        <div className="grid grid-cols-2 gap-4">
                            {visibleFields.zip_code && (
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">郵便番号</Label>
                                    <Input
                                        value={zipCode}
                                        onChange={(e) => handleZipCodeChange(e.target.value)}
                                        placeholder="123-4567"
                                        className="rounded-lg"
                                    />
                                </div>
                            )}
                            {visibleFields.prefecture && (
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">都道府県</Label>
                                    <Select value={prefecture} onValueChange={setPrefecture}>
                                        <SelectTrigger className="rounded-lg">
                                            <SelectValue placeholder="選択" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {prefectures.map((pref) => (
                                                <SelectItem key={pref} value={pref}>
                                                    {pref}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>
                    )}

                    {visibleFields.city && (
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">市区町村</Label>
                            <Input
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                placeholder="渋谷区"
                                className="rounded-lg"
                            />
                        </div>
                    )}

                    {visibleFields.street && (
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">番地</Label>
                            <Input
                                value={street}
                                onChange={(e) => setStreet(e.target.value)}
                                placeholder="1-2-3"
                                className="rounded-lg"
                            />
                        </div>
                    )}

                    {visibleFields.building && (
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">建物名・部屋番号</Label>
                            <Input
                                value={building}
                                onChange={(e) => setBuilding(e.target.value)}
                                placeholder="○○マンション 101号室"
                                className="rounded-lg"
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Past Employments */}
            {visibleFields.past_employments && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                            過去在籍店
                        </h2>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={addPastEmployment}
                            className="rounded-lg"
                        >
                            <Plus className="h-5 w-5 mr-1" />
                            追加
                        </Button>
                    </div>

                    {pastEmployments.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                            過去に在籍したお店がある場合は「追加」ボタンから入力してください
                        </p>
                    ) : (
                        <div className="space-y-4">
                            {pastEmployments.map((employment, index) => (
                                <div
                                    key={index}
                                    className="p-4 rounded-3xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 space-y-3"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                            在籍店 {index + 1}
                                        </span>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removePastEmployment(index)}
                                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </Button>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="space-y-1">
                                            <Label className="text-xs text-gray-600 dark:text-gray-400">店名</Label>
                                            <Input
                                                value={employment.store_name}
                                                onChange={(e) =>
                                                    updatePastEmployment(index, "store_name", e.target.value)
                                                }
                                                placeholder="○○クラブ"
                                                className="rounded-lg h-10"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-gray-600 dark:text-gray-400">期間</Label>
                                            <Input
                                                value={employment.period}
                                                onChange={(e) =>
                                                    updatePastEmployment(index, "period", e.target.value)
                                                }
                                                placeholder="2023/04 - 2024/03"
                                                className="rounded-lg h-10"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-gray-600 dark:text-gray-400">時給</Label>
                                            <Input
                                                value={employment.hourly_wage}
                                                onChange={(e) =>
                                                    updatePastEmployment(index, "hourly_wage", e.target.value)
                                                }
                                                placeholder="5000"
                                                className="rounded-lg h-10"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-gray-600 dark:text-gray-400">売上（万円）</Label>
                                            <Input
                                                value={employment.monthly_sales}
                                                onChange={(e) =>
                                                    updatePastEmployment(index, "monthly_sales", e.target.value)
                                                }
                                                placeholder="100"
                                                className="rounded-lg h-10"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-gray-600 dark:text-gray-400">持ち客数</Label>
                                            <Input
                                                value={employment.customer_count}
                                                onChange={(e) =>
                                                    updatePastEmployment(index, "customer_count", e.target.value)
                                                }
                                                placeholder="30"
                                                className="rounded-lg h-10"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* 追加ボタン（カードの下） */}
                            <Button
                                type="button"
                                variant="outline"
                                onClick={addPastEmployment}
                                className="w-full rounded-lg"
                            >
                                <Plus className="h-5 w-5 mr-1" />
                                過去在籍店を追加
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* ID Verification Images */}
            {visibleFields.id_verification && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                        身分証明証
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        運転免許証、マイナンバーカード、パスポートなどの身分証明証の画像をアップロードしてください
                    </p>

                    {/* Image Previews */}
                    {idImagePreviews.length > 0 && (
                        <div className="grid grid-cols-2 gap-3">
                            {idImagePreviews.map((preview, index) => (
                                <div key={index} className="relative group">
                                    <img
                                        src={preview}
                                        alt={`身分証明証 ${index + 1}`}
                                        className="w-full h-32 object-cover rounded-xl border border-gray-200 dark:border-gray-700"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeIdImage(index)}
                                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Upload Button */}
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <div className="flex flex-col items-center justify-center">
                            <Upload className="h-8 w-8 text-gray-400 dark:text-gray-500 mb-2" />
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                画像をアップロード
                            </span>
                            <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                PNG, JPG, HEIC
                            </span>
                        </div>
                        <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleIdImageUpload}
                            className="hidden"
                        />
                    </label>
                </div>
            )}

            {/* Custom Fields */}
            {fields.length > 0 && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                        その他
                    </h2>

                    {fields.map((field) => (
                        <div key={field.id} className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                {field.label}
                                {field.is_required && <span className="text-red-500 ml-1">*</span>}
                            </Label>
                            {renderCustomField(field)}
                        </div>
                    ))}
                </div>
            )}

            {/* Submit Button */}
            <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl h-12 text-base font-medium"
            >
                {isSubmitting ? "送信中..." : "送信する"}
            </Button>
        </form>
    );
}
