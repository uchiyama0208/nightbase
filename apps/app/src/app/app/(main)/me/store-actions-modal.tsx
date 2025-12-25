"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Search, Loader2, ChevronLeft } from "lucide-react";
import { searchStoreByCode, createNewStore, submitJoinRequestFromMe } from "./store-actions";

const INDUSTRIES = [
    { value: "キャバクラ", label: "キャバクラ" },
    { value: "ガールズバー", label: "ガールズバー" },
    { value: "ホストクラブ", label: "ホストクラブ" },
    { value: "ラウンジ", label: "ラウンジ" },
    { value: "クラブ", label: "クラブ" },
    { value: "スナック", label: "スナック" },
    { value: "バー", label: "バー" },
    { value: "その他", label: "その他" },
];

const PREFECTURES = [
    "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
    "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
    "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県",
    "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府", "兵庫県",
    "奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県", "山口県",
    "徳島県", "香川県", "愛媛県", "高知県", "福岡県", "佐賀県", "長崎県",
    "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県"
];

interface Store {
    id: string;
    name: string;
    industry: string | null;
    prefecture: string | null;
}

export function StoreActionsModal() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const mode = searchParams.get("mode");

    const [isOpen, setIsOpen] = useState(false);
    const [step, setStep] = useState<"search" | "found" | "profile" | "create-form">("search");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Join store state
    const [storeCode, setStoreCode] = useState("");
    const [foundStore, setFoundStore] = useState<Store | null>(null);
    const [role, setRole] = useState<"cast" | "staff">("cast");
    const [displayName, setDisplayName] = useState("");
    const [displayNameKana, setDisplayNameKana] = useState("");

    // Create store state
    const [storeName, setStoreName] = useState("");
    const [industry, setIndustry] = useState("");
    const [prefecture, setPrefecture] = useState("");
    const [ownerDisplayName, setOwnerDisplayName] = useState("");
    const [ownerDisplayNameKana, setOwnerDisplayNameKana] = useState("");

    useEffect(() => {
        if (mode === "join" || mode === "create") {
            setIsOpen(true);
            if (mode === "create") {
                setStep("create-form");
            } else {
                setStep("search");
            }
        } else {
            setIsOpen(false);
        }
    }, [mode]);

    const handleClose = () => {
        setIsOpen(false);
        router.push("/app/me");
        // Reset state
        setStep("search");
        setStoreCode("");
        setFoundStore(null);
        setError(null);
        setRole("cast");
        setDisplayName("");
        setDisplayNameKana("");
        setStoreName("");
        setIndustry("");
        setPrefecture("");
        setOwnerDisplayName("");
        setOwnerDisplayNameKana("");
    };

    const handleSearchStore = async () => {
        if (!storeCode.trim()) {
            setError("店舗コードを入力してください");
            return;
        }

        setIsLoading(true);
        setError(null);

        const result = await searchStoreByCode(storeCode.trim());

        if (result.success && result.store) {
            setFoundStore(result.store);
            setStep("found");
        } else {
            setError(result.error || "店舗が見つかりませんでした");
        }

        setIsLoading(false);
    };

    const handleSubmitJoinRequest = async () => {
        if (!displayName.trim() || !displayNameKana.trim()) {
            setError("表示名を入力してください");
            return;
        }

        if (!foundStore) return;

        setIsLoading(true);
        setError(null);

        const result = await submitJoinRequestFromMe({
            storeId: foundStore.id,
            role,
            displayName: displayName.trim(),
            displayNameKana: displayNameKana.trim(),
        });

        if (result.success) {
            router.push("/onboarding/pending-approval");
        } else {
            setError(result.error || "参加申請に失敗しました");
            setIsLoading(false);
        }
    };

    const handleCreateStore = async () => {
        if (!storeName.trim()) {
            setError("店舗名を入力してください");
            return;
        }
        if (!industry) {
            setError("業種を選択してください");
            return;
        }
        if (!prefecture) {
            setError("都道府県を選択してください");
            return;
        }
        if (!ownerDisplayName.trim() || !ownerDisplayNameKana.trim()) {
            setError("表示名を入力してください");
            return;
        }

        setIsLoading(true);
        setError(null);

        const result = await createNewStore({
            storeName: storeName.trim(),
            industry,
            prefecture,
            ownerDisplayName: ownerDisplayName.trim(),
            ownerDisplayNameKana: ownerDisplayNameKana.trim(),
        });

        if (result.success) {
            router.push("/app/dashboard");
        } else {
            setError(result.error || "店舗の作成に失敗しました");
            setIsLoading(false);
        }
    };

    if (mode === "join") {
        return (
            <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
                <DialogContent className="sm:max-w-lg bg-white dark:bg-gray-900 p-0 overflow-hidden flex flex-col max-h-[90vh]">
                    <DialogHeader className="sticky top-0 z-10 bg-white dark:bg-gray-900 flex !flex-row items-center gap-2 h-14 min-h-[3.5rem] flex-shrink-0 border-b border-gray-200 dark:border-gray-700 px-4">
                        <button
                            type="button"
                            onClick={step === "search" ? handleClose : step === "found" ? () => setStep("search") : () => setStep("found")}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 transition-colors"
                            aria-label="戻る"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <DialogTitle className="flex-1 text-center text-lg font-semibold text-gray-900 dark:text-white truncate">
                            {step === "search" && "店舗に参加"}
                            {step === "found" && "店舗が見つかりました"}
                            {step === "profile" && "プロフィール入力"}
                        </DialogTitle>
                        <div className="w-8 h-8" />
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto">
                        <p className="text-sm text-gray-600 dark:text-gray-400 px-4 pt-4">
                            {step === "search" && "店舗コードを入力して参加申請を送信します"}
                            {step === "found" && "この店舗に参加申請を送信しますか？"}
                            {step === "profile" && "参加時のプロフィールを入力してください"}
                        </p>

                    {step === "search" && (
                        <div className="space-y-4 p-4">
                            <div className="space-y-2">
                                <Label htmlFor="store-code" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                    店舗コード
                                </Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="store-code"
                                        placeholder="店舗コードを入力"
                                        value={storeCode}
                                        onChange={(e) => setStoreCode(e.target.value)}
                                        className="flex-1"
                                    />
                                    <Button
                                        onClick={handleSearchStore}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Search className="h-5 w-5" />
                                        )}
                                    </Button>
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {step === "found" && foundStore && (
                        <div className="space-y-4 p-4">
                            <div className="flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/50">
                                    <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white">
                                        {foundStore.name}
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        {foundStore.industry} • {foundStore.prefecture}
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <Button onClick={() => setStep("profile")} className="flex-1">
                                    次へ
                                </Button>
                            </div>
                        </div>
                    )}

                    {step === "profile" && (
                        <div className="space-y-4 p-4">
                            <div className="space-y-2">
                                <Label htmlFor="role" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                    役割
                                </Label>
                                <Select value={role} onValueChange={(v) => setRole(v as "cast" | "staff")}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="cast">キャスト</SelectItem>
                                        <SelectItem value="staff">スタッフ</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="display-name" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                    表示名 <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="display-name"
                                    placeholder="山田 花子"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="display-name-kana" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                    表示名（ひらがな） <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="display-name-kana"
                                    placeholder="やまだ はなこ"
                                    value={displayNameKana}
                                    onChange={(e) => setDisplayNameKana(e.target.value)}
                                />
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                                </div>
                            )}

                            <div className="pt-2">
                                <Button onClick={handleSubmitJoinRequest} disabled={isLoading} className="w-full">
                                    {isLoading ? "送信中..." : "参加申請を送信"}
                                </Button>
                            </div>
                        </div>
                    )}
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    if (mode === "create") {
        return (
            <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
                <DialogContent className="sm:max-w-lg bg-white dark:bg-gray-900 max-h-[90vh] overflow-hidden p-0 flex flex-col">
                    <DialogHeader className="sticky top-0 z-10 bg-white dark:bg-gray-900 flex !flex-row items-center gap-2 h-14 min-h-[3.5rem] flex-shrink-0 border-b border-gray-200 dark:border-gray-700 px-4">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 transition-colors"
                            aria-label="戻る"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <DialogTitle className="flex-1 text-center text-lg font-semibold text-gray-900 dark:text-white truncate">
                            新規店舗を作成
                        </DialogTitle>
                        <div className="w-8 h-8" />
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            新しい店舗を登録して管理を始めます
                        </p>
                        <div className="space-y-2">
                            <Label htmlFor="store-name" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                店舗名 <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="store-name"
                                placeholder="店舗名を入力"
                                value={storeName}
                                onChange={(e) => setStoreName(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="industry" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                業種 <span className="text-red-500">*</span>
                            </Label>
                            <Select value={industry} onValueChange={setIndustry}>
                                <SelectTrigger>
                                    <SelectValue placeholder="選択してください" />
                                </SelectTrigger>
                                <SelectContent>
                                    {INDUSTRIES.map((ind) => (
                                        <SelectItem key={ind.value} value={ind.value}>
                                            {ind.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="prefecture" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                都道府県 <span className="text-red-500">*</span>
                            </Label>
                            <Select value={prefecture} onValueChange={setPrefecture}>
                                <SelectTrigger>
                                    <SelectValue placeholder="選択してください" />
                                </SelectTrigger>
                                <SelectContent>
                                    {PREFECTURES.map((pref) => (
                                        <SelectItem key={pref} value={pref}>
                                            {pref}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="border-t pt-4 mt-4">
                            <p className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                                あなたのプロフィール
                            </p>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="owner-display-name" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                        表示名 <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="owner-display-name"
                                        placeholder="山田 太郎"
                                        value={ownerDisplayName}
                                        onChange={(e) => setOwnerDisplayName(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="owner-display-name-kana" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                        表示名（ひらがな） <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="owner-display-name-kana"
                                        placeholder="やまだ たろう"
                                        value={ownerDisplayNameKana}
                                        onChange={(e) => setOwnerDisplayNameKana(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                            </div>
                        )}

                        <div className="pt-2">
                            <Button onClick={handleCreateStore} disabled={isLoading} className="w-full">
                                {isLoading ? "作成中..." : "店舗を作成"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    return null;
}
