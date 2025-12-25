"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Eye, EyeOff, Filter, X, ChevronLeft, Settings2, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { formatJSTDate } from "@/lib/utils";
import { ResumeSubmissionDetailModal } from "./resume-submission-detail-modal";
import { ResumeTemplateModal } from "./resume-template-modal";
import { createBrowserClient } from "@supabase/ssr";
import { VercelTabs } from "@/components/ui/vercel-tabs";

interface ResumeSubmission {
    id: string;
    store_id: string;
    template_id: string;
    token: string;
    status: string;
    profile_id: string | null;
    last_name: string | null;
    first_name: string | null;
    last_name_kana: string | null;
    first_name_kana: string | null;
    birth_date: string | null;
    phone_number: string | null;
    emergency_phone_number: string | null;
    zip_code: string | null;
    prefecture: string | null;
    city: string | null;
    street: string | null;
    building: string | null;
    desired_cast_name: string | null;
    desired_cast_name_kana: string | null;
    submitted_at: string | null;
    created_at: string;
    id_verification_images: string[] | null;
    resume_templates: {
        id: string;
        name: string;
    } | null;
}

interface TemplateField {
    id: string;
    field_type: string;
    label: string;
    options: string[] | null;
    is_required: boolean;
    sort_order: number;
}

interface ResumeTemplate {
    id: string;
    name: string;
    is_active: boolean;
    target_role: "cast" | "staff";
    created_at: string;
    resume_template_fields: TemplateField[];
    resume_submissions: { count: number }[];
}

interface ResumesClientProps {
    submissions: ResumeSubmission[];
    templates: ResumeTemplate[];
    storeId: string;
    canEdit?: boolean;
}

type TabType = "cast" | "staff";

export function ResumesClient({
    submissions: initialSubmissions,
    templates,
    storeId,
    canEdit = false,
}: ResumesClientProps) {
    const router = useRouter();
    const [submissions, setSubmissions] = useState<ResumeSubmission[]>(initialSubmissions);
    const [activeTab, setActiveTab] = useState<TabType>("cast");
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [selectedSubmission, setSelectedSubmission] = useState<ResumeSubmission | null>(null);
    const [selectedTemplate, setSelectedTemplate] = useState<ResumeTemplate | null>(null);
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [isTemplateListOpen, setIsTemplateListOpen] = useState(false);
    const [isFormatListOpen, setIsFormatListOpen] = useState(false);
    const [templateModalDefaultTab, setTemplateModalDefaultTab] = useState<"share" | "edit">("share");

    // Filter states
    const [nameQuery, setNameQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "hired">("all");
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // Supabase Realtime subscription
    useEffect(() => {
        const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const channel = supabase
            .channel("resume_submissions_changes")
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "resume_submissions",
                    filter: `store_id=eq.${storeId}`,
                },
                async (payload) => {
                    // Fetch the full submission with template info
                    const { data: newSubmission } = await supabase
                        .from("resume_submissions")
                        .select(`
                            *,
                            resume_templates (
                                id,
                                name,
                                target_role
                            )
                        `)
                        .eq("id", payload.new.id)
                        .single();

                    if (newSubmission) {
                        setSubmissions((prev) => [newSubmission as ResumeSubmission, ...prev]);
                    }
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "resume_submissions",
                    filter: `store_id=eq.${storeId}`,
                },
                async (payload) => {
                    // Fetch the updated submission with template info
                    const { data: updatedSubmission } = await supabase
                        .from("resume_submissions")
                        .select(`
                            *,
                            resume_templates (
                                id,
                                name,
                                target_role
                            )
                        `)
                        .eq("id", payload.new.id)
                        .single();

                    if (updatedSubmission) {
                        setSubmissions((prev) =>
                            prev.map((s) =>
                                s.id === updatedSubmission.id ? (updatedSubmission as ResumeSubmission) : s
                            )
                        );
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [storeId]);

    // Update submissions when initialSubmissions changes (e.g., after router.refresh())
    useEffect(() => {
        setSubmissions(initialSubmissions);
    }, [initialSubmissions]);

    const tabs = [
        { key: "cast", label: "キャスト" },
        { key: "staff", label: "スタッフ" },
    ];

    const getFullName = (submission: ResumeSubmission) => {
        if (submission.last_name && submission.first_name) {
            return `${submission.last_name} ${submission.first_name}`;
        }
        return "-";
    };

    // Filter submissions by template's target_role and apply filters
    const castSubmissions = useMemo(() => {
        return submissions.filter((s) => {
            if ((s as any).resume_templates?.target_role !== "cast") return false;

            // Apply name filter
            if (nameQuery.trim()) {
                const fullName = getFullName(s).toLowerCase();
                const desiredName = (s.desired_cast_name || "").toLowerCase();
                const term = nameQuery.trim().toLowerCase();
                if (!fullName.includes(term) && !desiredName.includes(term)) return false;
            }

            // Apply status filter
            if (statusFilter === "pending" && s.profile_id) return false;
            if (statusFilter === "hired" && !s.profile_id) return false;

            return true;
        });
    }, [submissions, nameQuery, statusFilter]);

    const staffSubmissions = useMemo(() => {
        return submissions.filter((s) => {
            if ((s as any).resume_templates?.target_role !== "staff") return false;

            // Apply name filter
            if (nameQuery.trim()) {
                const fullName = getFullName(s).toLowerCase();
                const desiredName = (s.desired_cast_name || "").toLowerCase();
                const term = nameQuery.trim().toLowerCase();
                if (!fullName.includes(term) && !desiredName.includes(term)) return false;
            }

            // Apply status filter
            if (statusFilter === "pending" && s.profile_id) return false;
            if (statusFilter === "hired" && !s.profile_id) return false;

            return true;
        });
    }, [submissions, nameQuery, statusFilter]);

    // Active filters for display
    const activeFilters = useMemo(() => [
        nameQuery.trim() && "名前",
        statusFilter !== "all" && (statusFilter === "pending" ? "未対応" : "採用済み"),
    ].filter(Boolean) as string[], [nameQuery, statusFilter]);
    const hasFilters = activeFilters.length > 0;

    const getAge = (birthDate: string | null) => {
        if (!birthDate) return "-";
        const birth = new Date(birthDate);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return `${age}歳`;
    };

    const getSubmissionCount = (template: ResumeTemplate) => {
        return template.resume_submissions?.[0]?.count || 0;
    };

    const handleOpenTemplateModal = (template?: ResumeTemplate, defaultTab: "share" | "edit" = "share") => {
        setSelectedTemplate(template || null);
        setTemplateModalDefaultTab(defaultTab);
        setIsTemplateModalOpen(true);
    };

    const handleCloseTemplateModal = () => {
        setIsTemplateModalOpen(false);
        setSelectedTemplate(null);
    };

    const handleTemplateCreated = (newTemplate: ResumeTemplate) => {
        // 少し遅延させて新規作成モーダルが閉じてから編集モーダルを開く
        setTimeout(() => {
            setSelectedTemplate(newTemplate);
            setIsTemplateModalOpen(true);
        }, 100);
    };

    const renderSubmissionsTable = (filteredSubmissions: ResumeSubmission[], targetRole: "cast" | "staff") => (
        <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <Table className="table-fixed w-full">
                <TableHeader>
                    <TableRow className="bg-gray-50 dark:bg-gray-800/50">
                        <TableHead className="w-1/4 sm:w-1/5 text-center text-xs text-gray-500 dark:text-gray-400">応募日</TableHead>
                        <TableHead className="w-1/4 sm:w-1/5 text-center text-xs text-gray-500 dark:text-gray-400">応募者名</TableHead>
                        <TableHead className="w-1/4 sm:w-1/5 text-center text-xs text-gray-500 dark:text-gray-400">希望名</TableHead>
                        <TableHead className="hidden sm:table-cell sm:w-1/5 text-center text-xs text-gray-500 dark:text-gray-400">電話番号</TableHead>
                        <TableHead className="w-1/4 sm:w-1/5 text-center text-xs text-gray-500 dark:text-gray-400">状態</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredSubmissions.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center py-12 text-gray-500 dark:text-gray-400">
                                <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                                <p className="text-sm">履歴書がありません</p>
                                <p className="text-xs mt-1">応募者がフォームから送信すると表示されます</p>
                            </TableCell>
                        </TableRow>
                    ) : (
                        filteredSubmissions.map((submission) => (
                            <TableRow
                                key={submission.id}
                                className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                                onClick={() => setSelectedSubmission(submission)}
                            >
                                <TableCell className="text-center text-sm text-gray-500 dark:text-gray-400">
                                    {submission.submitted_at ? formatJSTDate(submission.submitted_at) : "-"}
                                </TableCell>
                                <TableCell className="text-center text-sm font-medium text-gray-900 dark:text-white">
                                    {getFullName(submission)}
                                </TableCell>
                                <TableCell className="text-center text-sm text-gray-900 dark:text-white">
                                    {submission.desired_cast_name || "-"}
                                </TableCell>
                                <TableCell className="hidden sm:table-cell text-center text-sm text-gray-900 dark:text-white">
                                    {submission.phone_number || "-"}
                                </TableCell>
                                <TableCell className="text-center">
                                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${
                                        submission.profile_id
                                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                            : submission.status === "rejected"
                                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                            : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                    }`}>
                                        {submission.profile_id ? "採用済み" : submission.status === "rejected" ? "不採用" : "未対応"}
                                    </span>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );

    return (
        <>
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
                {/* Filter button */}
                <button
                    type="button"
                    className={`flex items-center gap-1 px-1 py-1 rounded-lg transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${
                        hasFilters ? "text-blue-600" : "text-gray-500 dark:text-gray-400"
                    }`}
                    onClick={() => setIsFilterOpen(true)}
                >
                    <Filter className="h-5 w-5 shrink-0" />
                    <span className="text-sm text-gray-600 dark:text-gray-300 truncate">
                        フィルター: {hasFilters ? activeFilters.join("・") : "なし"}
                    </span>
                </button>
                <div className="flex-1" />
                {/* Refresh button */}
                <Button
                    variant="outline"
                    size="icon"
                    onClick={async () => {
                        setIsRefreshing(true);
                        router.refresh();
                        setTimeout(() => setIsRefreshing(false), 500);
                    }}
                    disabled={isRefreshing}
                    className="h-10 w-10 rounded-full"
                >
                    <RefreshCw className={`h-5 w-5 ${isRefreshing ? "animate-spin" : ""}`} />
                </Button>
                {/* Format button */}
                {canEdit && (
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setIsFormatListOpen(true)}
                        className="h-10 w-10 rounded-full"
                    >
                        <Settings2 className="h-5 w-5" />
                    </Button>
                )}
                {/* Share button */}
                {canEdit && (
                    <Button
                        size="icon"
                        onClick={() => setIsTemplateListOpen(true)}
                        className="h-10 w-10 rounded-full bg-blue-600 text-white hover:bg-blue-700 border-none shadow-md transition-all hover:scale-105 active:scale-95"
                    >
                        <Plus className="h-5 w-5" />
                    </Button>
                )}
            </div>

            {/* Vercel-style Tab Navigation */}
            <VercelTabs
                tabs={tabs}
                value={activeTab}
                onChange={(val) => setActiveTab(val as TabType)}
                className="mb-4"
            />

            {/* Content */}
            {activeTab === "cast" && renderSubmissionsTable(castSubmissions, "cast")}
            {activeTab === "staff" && renderSubmissionsTable(staffSubmissions, "staff")}

            {/* Submission Detail Modal */}
            {selectedSubmission && (
                <ResumeSubmissionDetailModal
                    isOpen={selectedSubmission !== null}
                    onClose={() => setSelectedSubmission(null)}
                    submission={selectedSubmission}
                />
            )}

            {/* Template Modal */}
            <ResumeTemplateModal
                isOpen={isTemplateModalOpen}
                onClose={handleCloseTemplateModal}
                template={selectedTemplate}
                storeId={storeId}
                onCreated={handleTemplateCreated}
                defaultTab={templateModalDefaultTab}
            />

            {/* Filter Modal */}
            <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                <DialogContent className="sm:max-w-sm max-h-[90vh] overflow-hidden !rounded-2xl border border-gray-200 bg-white !p-0 shadow-xl dark:border-gray-800 dark:bg-gray-900">
                    <DialogHeader className="flex !flex-row items-center gap-2 h-14 min-h-[3.5rem] flex-shrink-0 border-b border-gray-200 dark:border-gray-700 px-4">
                        <button
                            type="button"
                            onClick={() => setIsFilterOpen(false)}
                            className="p-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        </button>
                        <DialogTitle className="flex-1 text-center text-base font-semibold text-gray-900 dark:text-white">
                            フィルター
                        </DialogTitle>
                        <div className="w-7" />
                    </DialogHeader>
                    <div className="flex flex-col gap-4 mt-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                名前で検索
                            </label>
                            <div className="relative">
                                <Input
                                    placeholder="名前を入力..."
                                    value={nameQuery}
                                    onChange={(e) => setNameQuery(e.target.value)}
                                    className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 pr-9 text-base text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                {nameQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setNameQuery("")}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:text-gray-200 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                状態で絞り込み
                            </label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setStatusFilter("all")}
                                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                                        statusFilter === "all"
                                            ? "bg-blue-600 text-white"
                                            : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                                    }`}
                                >
                                    すべて
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStatusFilter("pending")}
                                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                                        statusFilter === "pending"
                                            ? "bg-yellow-500 text-white"
                                            : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                                    }`}
                                >
                                    未対応
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStatusFilter("hired")}
                                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                                        statusFilter === "hired"
                                            ? "bg-green-600 text-white"
                                            : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                                    }`}
                                >
                                    採用済み
                                </button>
                            </div>
                        </div>
                        <Button
                            className="w-full rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                            onClick={() => setIsFilterOpen(false)}
                        >
                            適用
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setIsFilterOpen(false)}
                            className="w-full rounded-lg"
                        >
                            戻る
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Template List Modal */}
            <Dialog open={isTemplateListOpen} onOpenChange={setIsTemplateListOpen}>
                <DialogContent className="sm:max-w-md max-h-[90vh] overflow-hidden !rounded-2xl border border-gray-200 bg-white !p-0 shadow-xl dark:border-gray-800 dark:bg-gray-900">
                    <DialogHeader className="flex !flex-row items-center gap-2 h-14 min-h-[3.5rem] flex-shrink-0 border-b border-gray-200 dark:border-gray-700 px-4">
                        <button
                            type="button"
                            onClick={() => setIsTemplateListOpen(false)}
                            className="p-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        </button>
                        <DialogTitle className="flex-1 text-center text-base font-semibold text-gray-900 dark:text-white">
                            履歴書選択
                        </DialogTitle>
                        <div className="w-8 h-8" />
                    </DialogHeader>
                    {/* Filter Tags */}
                    <div className="flex gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                        <button
                            type="button"
                            onClick={() => setActiveTab("cast")}
                            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                                activeTab === "cast"
                                    ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                            }`}
                        >
                            キャスト
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab("staff")}
                            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                                activeTab === "staff"
                                    ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                            }`}
                        >
                            スタッフ
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4">
                        {templates.length === 0 ? (
                            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                                <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                                <p className="text-sm">フォーマットがありません</p>
                                <p className="text-xs mt-1">設定ボタンから作成してください</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {templates
                                    .filter(t => t.target_role === activeTab)
                                    .map((template) => (
                                        <div
                                            key={template.id}
                                            className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-3 transition-colors cursor-pointer ${
                                                template.target_role === "cast"
                                                    ? "hover:border-purple-300 dark:hover:border-purple-600"
                                                    : "hover:border-blue-300 dark:hover:border-blue-600"
                                            }`}
                                            onClick={() => {
                                                setIsTemplateListOpen(false);
                                                handleOpenTemplateModal(template);
                                            }}
                                        >
                                            <div className="flex items-center gap-2">
                                                <h4 className="flex-1 text-sm font-medium text-gray-900 dark:text-white">
                                                    {template.name}
                                                </h4>
                                                {template.is_active ? (
                                                    <Eye className="h-4 w-4 text-green-500" />
                                                ) : (
                                                    <EyeOff className="h-4 w-4 text-gray-400" />
                                                )}
                                            </div>
                                            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                回答 {getSubmissionCount(template)}件
                                            </div>
                                        </div>
                                    ))}
                                {templates.filter(t => t.target_role === activeTab).length === 0 && (
                                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                        <p className="text-sm">該当するフォーマットがありません</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Format List Modal (for editing) */}
            <Dialog open={isFormatListOpen} onOpenChange={setIsFormatListOpen}>
                <DialogContent className="sm:max-w-md max-h-[90vh] overflow-hidden !rounded-2xl border border-gray-200 bg-white !p-0 shadow-xl dark:border-gray-800 dark:bg-gray-900">
                    <DialogHeader className="flex !flex-row items-center gap-2 h-14 min-h-[3.5rem] flex-shrink-0 border-b border-gray-200 dark:border-gray-700 px-4">
                        <button
                            type="button"
                            onClick={() => setIsFormatListOpen(false)}
                            className="p-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        </button>
                        <DialogTitle className="flex-1 text-center text-base font-semibold text-gray-900 dark:text-white">
                            フォーマット一覧
                        </DialogTitle>
                        <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                                setIsFormatListOpen(false);
                                handleOpenTemplateModal(undefined, "edit");
                            }}
                            className="h-8 w-8"
                        >
                            <Plus className="h-5 w-5" />
                        </Button>
                    </DialogHeader>
                    {/* Filter Tags */}
                    <div className="flex gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                        <button
                            type="button"
                            onClick={() => setActiveTab("cast")}
                            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                                activeTab === "cast"
                                    ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                            }`}
                        >
                            キャスト
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab("staff")}
                            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                                activeTab === "staff"
                                    ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                            }`}
                        >
                            スタッフ
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4">
                        {templates.length === 0 ? (
                            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                                <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                                <p className="text-sm">フォーマットがありません</p>
                                <p className="text-xs mt-1">右上のボタンから作成してください</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {templates
                                    .filter(t => t.target_role === activeTab)
                                    .map((template) => (
                                        <div
                                            key={template.id}
                                            className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-3 transition-colors cursor-pointer ${
                                                template.target_role === "cast"
                                                    ? "hover:border-purple-300 dark:hover:border-purple-600"
                                                    : "hover:border-blue-300 dark:hover:border-blue-600"
                                            }`}
                                            onClick={() => {
                                                setIsFormatListOpen(false);
                                                handleOpenTemplateModal(template, "edit");
                                            }}
                                        >
                                            <div className="flex items-center gap-2">
                                                <h4 className="flex-1 text-sm font-medium text-gray-900 dark:text-white">
                                                    {template.name}
                                                </h4>
                                                {template.is_active ? (
                                                    <Eye className="h-4 w-4 text-green-500" />
                                                ) : (
                                                    <EyeOff className="h-4 w-4 text-gray-400" />
                                                )}
                                            </div>
                                            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                回答 {getSubmissionCount(template)}件
                                            </div>
                                        </div>
                                    ))}
                                {templates.filter(t => t.target_role === activeTab).length === 0 && (
                                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                        <p className="text-sm">該当するフォーマットがありません</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
