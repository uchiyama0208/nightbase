"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
    Send,
    Sparkles,
    Image as ImageIcon,
    Calendar,
    Loader2,
    AlertCircle,
    Users,
} from "lucide-react";
import {
    type SnsAccount,
    type SnsTemplate,
    generateSnsContent,
    getTemplatePreview,
    getTodayCasts,
    createScheduledPost,
    postNow,
} from "./actions";
import { TEMPLATE_VARIABLES } from "./constants";

interface PostComposerProps {
    storeId: string;
    storeName: string;
    accounts: SnsAccount[];
    templates: SnsTemplate[];
    hasConnectedAccounts: boolean;
    onNeedAccountConnect: () => void;
}

export function PostComposer({
    storeId,
    storeName,
    accounts,
    templates,
    hasConnectedAccounts,
    onNeedAccountConnect,
}: PostComposerProps) {
    const router = useRouter();
    const [content, setContent] = useState("");
    const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
    const [instagramType, setInstagramType] = useState<"post" | "story">("post");
    const [imageStyle, setImageStyle] = useState<"none" | "photo_collage" | "text_design">("none");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // AI Modal
    const [showAIModal, setShowAIModal] = useState(false);
    const [aiPrompt, setAiPrompt] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);

    // Schedule Modal
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [scheduleDate, setScheduleDate] = useState("");
    const [scheduleTime, setScheduleTime] = useState("");

    // Template Modal
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
    const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);

    // Cast list for image generation
    const [todayCasts, setTodayCasts] = useState<{ id: string; display_name: string; avatar_url: string | null }[]>([]);

    const togglePlatform = (platform: string) => {
        setSelectedPlatforms((prev) =>
            prev.includes(platform)
                ? prev.filter((p) => p !== platform)
                : [...prev, platform]
        );
    };

    const handleAIGenerate = async () => {
        if (!aiPrompt.trim()) return;

        setIsGenerating(true);
        try {
            const generated = await generateSnsContent(aiPrompt);
            setContent(generated);
            setShowAIModal(false);
            setAiPrompt("");
        } catch (error) {
            console.error("Error generating content:", error);
            setErrorMessage("AIによる生成に失敗しました");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleApplyTemplate = async () => {
        if (!selectedTemplateId) return;

        const template = templates.find(t => t.id === selectedTemplateId);
        if (!template) return;

        setIsLoadingTemplate(true);
        try {
            const preview = await getTemplatePreview(template.content);
            setContent(preview);
            if (template.image_style) {
                setImageStyle(template.image_style as any);
            }
            setShowTemplateModal(false);
        } catch (error) {
            console.error("Error applying template:", error);
            setErrorMessage("テンプレートの適用に失敗しました");
        } finally {
            setIsLoadingTemplate(false);
        }
    };

    const handleLoadCasts = async () => {
        try {
            const casts = await getTodayCasts();
            setTodayCasts(casts);
        } catch (error) {
            console.error("Error loading casts:", error);
        }
    };

    const handlePostNow = async () => {
        if (!content.trim() || selectedPlatforms.length === 0) {
            setErrorMessage("投稿内容とSNSを選択してください");
            return;
        }

        if (!hasConnectedAccounts) {
            onNeedAccountConnect();
            return;
        }

        setIsSubmitting(true);
        setErrorMessage(null);

        try {
            const formData = new FormData();
            formData.append("content", content);
            formData.append("platforms", JSON.stringify(selectedPlatforms));
            if (selectedPlatforms.includes("instagram")) {
                formData.append("instagram_type", instagramType);
            }

            await postNow(formData);
            setContent("");
            setSelectedPlatforms([]);
            router.refresh();
        } catch (error: any) {
            console.error("Error posting:", error);
            setErrorMessage(error.message || "投稿に失敗しました");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSchedulePost = async () => {
        if (!content.trim() || selectedPlatforms.length === 0) {
            setErrorMessage("投稿内容とSNSを選択してください");
            return;
        }

        if (!scheduleDate || !scheduleTime) {
            setErrorMessage("日時を選択してください");
            return;
        }

        setIsSubmitting(true);
        setErrorMessage(null);

        try {
            const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}:00`);

            const formData = new FormData();
            formData.append("content", content);
            formData.append("platforms", JSON.stringify(selectedPlatforms));
            formData.append("scheduled_at", scheduledAt.toISOString());
            formData.append("image_style", imageStyle);
            if (selectedPlatforms.includes("instagram")) {
                formData.append("instagram_type", instagramType);
            }

            await createScheduledPost(formData);
            setContent("");
            setSelectedPlatforms([]);
            setShowScheduleModal(false);
            router.refresh();
        } catch (error: any) {
            console.error("Error scheduling post:", error);
            setErrorMessage(error.message || "スケジュール登録に失敗しました");
        } finally {
            setIsSubmitting(false);
        }
    };

    const xAccount = accounts.find(a => a.platform === "x");
    const instaAccount = accounts.find(a => a.platform === "instagram");

    return (
        <div className="space-y-4">
            {/* Error message */}
            {errorMessage && (
                <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <p className="text-sm text-red-600 dark:text-red-400">
                        {errorMessage}
                    </p>
                </div>
            )}

            {/* Main card */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 sm:p-6 space-y-5">
                {/* Quick actions */}
                <div className="flex flex-wrap gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowTemplateModal(true)}
                        className="gap-1.5"
                    >
                        <FileText className="h-4 w-4" />
                        テンプレート
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAIModal(true)}
                        className="gap-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white border-none hover:from-purple-600 hover:to-pink-600 hover:text-white"
                    >
                        <Sparkles className="h-4 w-4" />
                        AI生成
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleLoadCasts}
                        className="gap-1.5"
                    >
                        <Users className="h-4 w-4" />
                        出勤キャスト
                    </Button>
                </div>

                {/* Today's casts preview */}
                {todayCasts.length > 0 && (
                    <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-3">
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                            本日の出勤キャスト ({todayCasts.length}名)
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {todayCasts.map((cast) => (
                                <div
                                    key={cast.id}
                                    className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white dark:bg-gray-700 text-xs"
                                >
                                    {cast.avatar_url ? (
                                        <img
                                            src={cast.avatar_url}
                                            alt=""
                                            className="h-4 w-4 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="h-4 w-4 rounded-full bg-gray-200 dark:bg-gray-600" />
                                    )}
                                    <span className="text-gray-900 dark:text-white">
                                        {cast.display_name}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                const names = todayCasts.map(c => c.display_name).join("、");
                                setContent((prev) => prev + (prev ? "\n\n" : "") + `本日の出勤キャスト\n${names}`);
                            }}
                            className="mt-2 text-xs"
                        >
                            テキストに追加
                        </Button>
                    </div>
                )}

                {/* Content textarea */}
                <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                        投稿内容
                    </Label>
                    <Textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="投稿内容を入力..."
                        className="min-h-[150px] resize-none"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-right">
                        {content.length} / 280文字
                    </p>
                </div>

                {/* Image style selection */}
                <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                        画像
                    </Label>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => setImageStyle("none")}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                imageStyle === "none"
                                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                            }`}
                        >
                            なし
                        </button>
                        <button
                            type="button"
                            onClick={() => setImageStyle("photo_collage")}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                imageStyle === "photo_collage"
                                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                            }`}
                        >
                            📷 キャスト写真
                        </button>
                        <button
                            type="button"
                            onClick={() => setImageStyle("text_design")}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                imageStyle === "text_design"
                                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                            }`}
                        >
                            🎨 デザイン画像
                        </button>
                    </div>
                </div>

                {/* Platform selection */}
                <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                        投稿先SNS
                    </Label>
                    <div className="flex flex-wrap gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                                checked={selectedPlatforms.includes("x")}
                                onCheckedChange={() => togglePlatform("x")}
                                disabled={!xAccount?.is_connected}
                            />
                            <span className={`text-sm ${!xAccount?.is_connected ? "text-gray-400" : "text-gray-700 dark:text-gray-300"}`}>
                                X (Twitter)
                                {!xAccount?.is_connected && " - 未連携"}
                            </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                                checked={selectedPlatforms.includes("instagram")}
                                onCheckedChange={() => togglePlatform("instagram")}
                                disabled={!instaAccount?.is_connected}
                            />
                            <span className={`text-sm ${!instaAccount?.is_connected ? "text-gray-400" : "text-gray-700 dark:text-gray-300"}`}>
                                Instagram
                                {!instaAccount?.is_connected && " - 未連携"}
                            </span>
                        </label>
                    </div>

                    {/* Instagram type */}
                    {selectedPlatforms.includes("instagram") && (
                        <div className="mt-2 ml-6">
                            <Select value={instagramType} onValueChange={(v: "post" | "story") => setInstagramType(v)}>
                                <SelectTrigger className="w-40">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="post">通常投稿</SelectItem>
                                    <SelectItem value="story">ストーリー</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>

                {/* Action buttons */}
                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-2">
                    <Button
                        variant="outline"
                        onClick={() => setShowScheduleModal(true)}
                        disabled={isSubmitting || !content.trim() || selectedPlatforms.length === 0}
                        className="rounded-lg h-11 sm:h-10 gap-2"
                    >
                        <Calendar className="h-4 w-4" />
                        スケジュール
                    </Button>
                    <Button
                        onClick={handlePostNow}
                        disabled={isSubmitting || !content.trim() || selectedPlatforms.length === 0}
                        className="rounded-lg bg-blue-600 text-white hover:bg-blue-700 h-11 sm:h-10 gap-2"
                    >
                        {isSubmitting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="h-4 w-4" />
                        )}
                        今すぐ投稿
                    </Button>
                </div>
            </div>

            {/* AI Generation Modal */}
            <Dialog open={showAIModal} onOpenChange={setShowAIModal}>
                <DialogContent className="max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-gray-50">
                            <Sparkles className="h-5 w-5 text-purple-500" />
                            AIで投稿文を生成
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            どんな投稿を作成しますか？
                        </p>
                        <Textarea
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            placeholder="例: 今日の出勤情報をお知らせする投稿"
                            className="min-h-[100px] resize-none"
                            disabled={isGenerating}
                        />
                    </div>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setShowAIModal(false)}
                            disabled={isGenerating}
                            className="rounded-lg"
                        >
                            キャンセル
                        </Button>
                        <Button
                            onClick={handleAIGenerate}
                            disabled={isGenerating || !aiPrompt.trim()}
                            className="rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white border-none hover:from-purple-600 hover:to-pink-600"
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    生成中...
                                </>
                            ) : (
                                "生成する"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Template Modal */}
            <Dialog open={showTemplateModal} onOpenChange={setShowTemplateModal}>
                <DialogContent className="max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
                    <DialogHeader>
                        <DialogTitle className="text-base font-semibold text-gray-900 dark:text-gray-50">
                            テンプレートを選択
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        {templates.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                                テンプレートがありません
                            </p>
                        ) : (
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {templates.map((template) => (
                                    <button
                                        key={template.id}
                                        type="button"
                                        onClick={() => setSelectedTemplateId(template.id)}
                                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                                            selectedTemplateId === template.id
                                                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                                                : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                                        }`}
                                    >
                                        <p className="font-medium text-sm text-gray-900 dark:text-white">
                                            {template.name}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                                            {template.content}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setShowTemplateModal(false)}
                            className="rounded-lg"
                        >
                            キャンセル
                        </Button>
                        <Button
                            onClick={handleApplyTemplate}
                            disabled={!selectedTemplateId || isLoadingTemplate}
                            className="rounded-lg"
                        >
                            {isLoadingTemplate ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    適用中...
                                </>
                            ) : (
                                "適用"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Schedule Modal */}
            <Dialog open={showScheduleModal} onOpenChange={setShowScheduleModal}>
                <DialogContent className="max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
                    <DialogHeader>
                        <DialogTitle className="text-base font-semibold text-gray-900 dark:text-gray-50">
                            投稿をスケジュール
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>日付</Label>
                            <Input
                                type="date"
                                value={scheduleDate}
                                onChange={(e) => setScheduleDate(e.target.value)}
                                min={new Date().toISOString().split("T")[0]}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>時刻</Label>
                            <Select value={scheduleTime} onValueChange={setScheduleTime}>
                                <SelectTrigger>
                                    <SelectValue placeholder="時刻を選択" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Array.from({ length: 24 }, (_, i) => (
                                        <SelectItem key={i} value={`${String(i).padStart(2, "0")}:00`}>
                                            {String(i).padStart(2, "0")}:00
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setShowScheduleModal(false)}
                            disabled={isSubmitting}
                            className="rounded-lg"
                        >
                            キャンセル
                        </Button>
                        <Button
                            onClick={handleSchedulePost}
                            disabled={isSubmitting || !scheduleDate || !scheduleTime}
                            className="rounded-lg"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    登録中...
                                </>
                            ) : (
                                "スケジュール登録"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// Import for FileText icon used in quick actions
import { FileText } from "lucide-react";
