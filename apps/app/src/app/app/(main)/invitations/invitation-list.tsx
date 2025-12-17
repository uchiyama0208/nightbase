"use client";

import Image from "next/image";

import { useMemo, useState, useTransition, useCallback, useRef, useEffect } from "react";
import { Invitation, cancelInvitation, updateJoinRequestSettings, getInvitationsData } from "./actions";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Filter, Settings, Copy, Check, Loader2, RefreshCw } from "lucide-react";
import { InvitationModal } from "./invitation-modal";
import { InvitationDetailModal } from "./invitation-detail-modal";
import { JoinRequestModal } from "./join-request-modal";
import { formatJSTDateTime, formatJSTDate } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

interface JoinRequest {
    id: string;
    profile_id: string;
    display_name: string;
    display_name_kana?: string;
    real_name: string;
    real_name_kana?: string;
    requested_role: string;
    status: "pending" | "approved" | "rejected";
    created_at: string;
}

interface StoreSettings {
    id: string;
    allow_join_requests: boolean;
    allow_join_by_code: boolean;
    allow_join_by_url: boolean;
}

interface PagePermissions {
    bottles: boolean;
    resumes: boolean;
    salarySystems: boolean;
    attendance: boolean;
    personalInfo: boolean;
}

interface InvitationListProps {
    initialInvitations: Invitation[];
    uninvitedProfiles: any[];
    roles: any[];
    initialJoinRequests?: JoinRequest[];
    initialStoreSettings?: StoreSettings;
    canEdit?: boolean;
    pagePermissions?: PagePermissions;
}

type MainTabType = "invitations" | "join-requests";
type RoleTabType = "all" | "cast" | "staff";

export function InvitationList({
    initialInvitations,
    uninvitedProfiles,
    roles,
    initialJoinRequests = [],
    initialStoreSettings,
    canEdit = false,
    pagePermissions,
}: InvitationListProps) {
    const { toast } = useToast();
    const [invitations, setInvitations] = useState(initialInvitations);
    const [joinRequests, setJoinRequests] = useState(initialJoinRequests);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [roleFilter, setRoleFilter] = useState<RoleTabType>("all");
    const [mainTab, setMainTab] = useState<MainTabType>("invitations");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [selectedInvitation, setSelectedInvitation] = useState<Invitation | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
    const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
    const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

    // Join request modal
    const [selectedJoinRequest, setSelectedJoinRequest] = useState<JoinRequest | null>(null);
    const [isJoinRequestModalOpen, setIsJoinRequestModalOpen] = useState(false);

    // Settings state
    const [allowJoinByCode, setAllowJoinByCode] = useState(initialStoreSettings?.allow_join_by_code ?? false);
    const [allowJoinByUrl, setAllowJoinByUrl] = useState(initialStoreSettings?.allow_join_by_url ?? false);
    const [isSaving, setIsSaving] = useState(false);
    const [copiedCode, setCopiedCode] = useState(false);
    const [copiedUrl, setCopiedUrl] = useState(false);
    const storeId = initialStoreSettings?.id || "";
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Vercel-style tabs for main navigation
    const mainTabsRef = useRef<{ [key: string]: HTMLButtonElement | null }>({});
    const [mainIndicatorStyle, setMainIndicatorStyle] = useState({ left: 0, width: 0 });


    useEffect(() => {
        const activeButton = mainTabsRef.current[mainTab];
        if (activeButton) {
            setMainIndicatorStyle({
                left: activeButton.offsetLeft,
                width: activeButton.offsetWidth,
            });
        }
    }, [mainTab]);


    // Auto-save settings
    const isInitialMount = useRef(true);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(async () => {
            setIsSaving(true);
            await updateJoinRequestSettings({
                allowJoinRequests: true,
                allowJoinByCode,
                allowJoinByUrl,
            });
            setIsSaving(false);
        }, 300);

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [allowJoinByCode, allowJoinByUrl]);

    const getJoinUrl = () => {
        const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
        return `${baseUrl}/join/${storeId}`;
    };

    const copyToClipboard = async (text: string, type: "code" | "url") => {
        try {
            await navigator.clipboard.writeText(text);
            if (type === "code") {
                setCopiedCode(true);
                setTimeout(() => setCopiedCode(false), 2000);
            } else {
                setCopiedUrl(true);
                setTimeout(() => setCopiedUrl(false), 2000);
            }
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };

    const shareToLine = () => {
        const url = getJoinUrl();
        const message = `参加URLをお送りします。\n${url}`;
        window.open(`https://line.me/R/msg/text/?${encodeURIComponent(message)}`, '_blank');
    };

    const activeFilters = useMemo(() => [
        searchQuery.trim() && `"${searchQuery}"`,
        statusFilter !== "all" && {
            pending: "招待中",
            accepted: "参加済み",
            canceled: "キャンセル",
            expired: "期限切れ",
        }[statusFilter],
    ].filter(Boolean) as string[], [searchQuery, statusFilter]);

    const hasFilters = activeFilters.length > 0;

    const getFilterSummary = useCallback(() => {
        if (!hasFilters) return "なし";
        return activeFilters.join("・");
    }, [hasFilters, activeFilters]);

    const filteredInvitations = useMemo(() => invitations.filter((inv) => {
        const query = searchQuery.toLowerCase();
        const displayName = inv.profile?.display_name || "";
        const displayNameKana = inv.profile?.display_name_kana || "";
        const realName = inv.profile?.real_name || "";
        const matchesSearch = displayName.toLowerCase().includes(query) ||
                              displayNameKana.toLowerCase().includes(query) ||
                              realName.toLowerCase().includes(query);
        const matchesStatus = statusFilter === "all" || inv.status === statusFilter;
        const matchesRole = roleFilter === "all" || inv.profile?.role === roleFilter;
        return matchesSearch && matchesStatus && matchesRole;
    }), [invitations, searchQuery, statusFilter, roleFilter]);

    const filteredJoinRequests = useMemo(() => joinRequests.filter((req) => {
        const query = searchQuery.toLowerCase();
        const displayName = req.display_name || "";
        const displayNameKana = req.display_name_kana || "";
        const realName = req.real_name || "";
        const realNameKana = req.real_name_kana || "";
        const matchesSearch = displayName.toLowerCase().includes(query) ||
                              displayNameKana.toLowerCase().includes(query) ||
                              realName.toLowerCase().includes(query) ||
                              realNameKana.toLowerCase().includes(query);
        const matchesRole = roleFilter === "all" || req.requested_role === roleFilter;
        return matchesSearch && matchesRole;
    }), [joinRequests, searchQuery, roleFilter]);

    // Count pending invitations
    const pendingInvitationsCount = useMemo(() =>
        invitations.filter(inv => inv.status === "pending" && new Date(inv.expires_at) >= new Date()).length
    , [invitations]);

    const handleConfirmCancel = useCallback(() => {
        if (!cancelTargetId) return;

        startTransition(async () => {
            try {
                await cancelInvitation(cancelTargetId);
                setInvitations((prev) =>
                    prev.map((inv) => (inv.id === cancelTargetId ? { ...inv, status: "canceled" } : inv))
                );
                if (selectedInvitation?.id === cancelTargetId) {
                    setSelectedInvitation((prev) => prev ? { ...prev, status: "canceled" } : null);
                }
            } catch {
                // Error is handled by the dialog closing
            }
            setIsCancelDialogOpen(false);
            setCancelTargetId(null);
        });
    }, [cancelTargetId, selectedInvitation?.id]);

    const getStatusBadge = useCallback((status: string, expiresAt: string) => {
        const isExpired = new Date(expiresAt) < new Date() && status === "pending";

        if (status === "canceled") return <Badge variant="destructive">キャンセル</Badge>;
        if (status === "accepted") return <Badge className="bg-green-500">参加済み</Badge>;
        if (isExpired) return <Badge variant="secondary">期限切れ</Badge>;
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">招待中</Badge>;
    }, []);

    const handleRowClick = useCallback((invitation: Invitation) => {
        setSelectedInvitation(invitation);
        setIsDetailModalOpen(true);
    }, []);

    const handleJoinRequestClick = useCallback((request: JoinRequest) => {
        // pending以外のステータスはモーダルを開かない
        if (request.status !== "pending") return;
        setSelectedJoinRequest(request);
        setIsJoinRequestModalOpen(true);
    }, []);

    const handleJoinRequestProcessed = useCallback((requestId: string, action: "approved" | "rejected" | "deleted") => {
        if (action === "approved") {
            // 承認: ステータスを更新してテーブルに残す
            setJoinRequests(prev => prev.map(r =>
                r.id === requestId ? { ...r, status: "approved" } : r
            ));
            toast({ title: "許可しました" });
        } else if (action === "rejected") {
            // 拒否: ステータスを更新してテーブルに残す
            setJoinRequests(prev => prev.map(r =>
                r.id === requestId ? { ...r, status: "rejected" } : r
            ));
            toast({ title: "拒否しました" });
        } else {
            // 削除: リストから削除
            setJoinRequests(prev => prev.filter(r => r.id !== requestId));
            toast({ title: "削除しました" });
        }
        setIsJoinRequestModalOpen(false);
    }, [toast]);

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        try {
            const response = await getInvitationsData();
            if (response.data) {
                setInvitations(response.data.invitations);
                setJoinRequests(response.data.joinRequests);
            }
        } catch (err) {
            console.error("Failed to refresh:", err);
        } finally {
            setIsRefreshing(false);
        }
    }, []);

    return (
        <div className="space-y-2">
            {/* Top row: Filter button + Settings + Plus button */}
            <div className="flex items-center justify-between">
                <button
                    type="button"
                    className={`flex items-center gap-1 px-1 py-1 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 ${
                        hasFilters ? "text-blue-600" : "text-gray-500 dark:text-gray-400"
                    }`}
                    onClick={() => setIsFilterDialogOpen(true)}
                >
                    <Filter className="h-5 w-5 shrink-0" />
                    <span className="text-sm text-gray-600 dark:text-gray-300 truncate">
                        フィルター: {getFilterSummary()}
                    </span>
                </button>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 rounded-full border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-md"
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                    >
                        <RefreshCw className={`h-5 w-5 text-gray-600 dark:text-gray-400 ${isRefreshing ? "animate-spin" : ""}`} />
                    </Button>
                    {canEdit && (
                        <>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-10 w-10 rounded-full border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-md"
                                onClick={() => setIsSettingsModalOpen(true)}
                            >
                                <Settings className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                            </Button>
                            {mainTab === "invitations" && (
                                <Button
                                    onClick={() => setIsModalOpen(true)}
                                    size="icon"
                                    className="h-10 w-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white border-none shadow-md transition-all hover:scale-105 active:scale-95"
                                >
                                    <Plus className="h-5 w-5" />
                                </Button>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Main Tab Navigation (招待 / 参加申請) */}
            <div className="relative">
                <div className="flex w-full">
                    <button
                        ref={(el) => { mainTabsRef.current["invitations"] = el; }}
                        type="button"
                        onClick={() => setMainTab("invitations")}
                        className={`flex-1 py-2 text-sm font-medium transition-colors relative ${
                            mainTab === "invitations"
                                ? "text-gray-900 dark:text-white"
                                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                        }`}
                    >
                        招待中 ({pendingInvitationsCount})
                    </button>
                    <button
                        ref={(el) => { mainTabsRef.current["join-requests"] = el; }}
                        type="button"
                        onClick={() => setMainTab("join-requests")}
                        className={`flex-1 py-2 text-sm font-medium transition-colors relative ${
                            mainTab === "join-requests"
                                ? "text-gray-900 dark:text-white"
                                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                        }`}
                    >
                        申請 ({joinRequests.length})
                    </button>
                </div>
                <div
                    className="absolute bottom-0 h-0.5 bg-gray-900 dark:bg-white transition-all duration-200"
                    style={{ left: mainIndicatorStyle.left, width: mainIndicatorStyle.width }}
                />
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gray-200 dark:bg-gray-700" />
            </div>

            {/* Role Filter Tags */}
            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={() => setRoleFilter("all")}
                    className={`px-3 py-1 text-sm font-medium rounded-full transition-colors ${
                        roleFilter === "all"
                            ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                >
                    全て
                </button>
                <button
                    type="button"
                    onClick={() => setRoleFilter("cast")}
                    className={`px-3 py-1 text-sm font-medium rounded-full transition-colors ${
                        roleFilter === "cast"
                            ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                >
                    キャスト
                </button>
                <button
                    type="button"
                    onClick={() => setRoleFilter("staff")}
                    className={`px-3 py-1 text-sm font-medium rounded-full transition-colors ${
                        roleFilter === "staff"
                            ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                >
                    スタッフ
                </button>
            </div>

            {/* Invitations Table */}
            {mainTab === "invitations" && (
                <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50 dark:bg-gray-800/50">
                                <TableHead className="text-center w-1/3 text-gray-900 dark:text-gray-100">名前</TableHead>
                                <TableHead className="text-center w-1/3 text-gray-900 dark:text-gray-100">ステータス</TableHead>
                                <TableHead className="text-center w-1/3 text-gray-900 dark:text-gray-100">有効期限</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredInvitations.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                                        招待が見つかりません
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredInvitations.map((inv) => (
                                    <TableRow
                                        key={inv.id}
                                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                        onClick={() => handleRowClick(inv)}
                                    >
                                        <TableCell className="font-medium text-center w-1/3">
                                            <div className="flex items-center justify-center gap-2">
                                                {inv.profile?.avatar_url && (
                                                    <Image
                                                        src={inv.profile.avatar_url}
                                                        alt={`${inv.profile.display_name}のアバター`}
                                                        className="rounded-full object-cover"
                                                        width={24}
                                                        height={24}
                                                    />
                                                )}
                                                {inv.profile?.display_name}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center w-1/3">
                                            <div className="flex justify-center">
                                                {getStatusBadge(inv.status, inv.expires_at)}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm text-gray-500 text-center w-1/3">
                                            {inv.status === "accepted" || !inv.expires_at
                                                ? "ー"
                                                : formatJSTDateTime(inv.expires_at)}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Join Requests Table */}
            {mainTab === "join-requests" && (
                <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50 dark:bg-gray-800/50">
                                <TableHead className="text-center w-1/4 text-gray-900 dark:text-gray-100">名前</TableHead>
                                <TableHead className="text-center w-1/4 text-gray-900 dark:text-gray-100">ロール</TableHead>
                                <TableHead className="text-center w-1/4 text-gray-900 dark:text-gray-100">ステータス</TableHead>
                                <TableHead className="text-center w-1/4 text-gray-900 dark:text-gray-100">申請日</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredJoinRequests.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                                        参加申請がありません
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredJoinRequests.map((req) => (
                                    <TableRow
                                        key={req.id}
                                        className={`${req.status === "pending" ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50" : ""}`}
                                        onClick={() => handleJoinRequestClick(req)}
                                    >
                                        <TableCell className="font-medium text-center w-1/4">
                                            {req.display_name || req.real_name}
                                        </TableCell>
                                        <TableCell className="text-sm text-center w-1/4">
                                            <Badge variant="outline" className={
                                                req.requested_role === "cast"
                                                    ? "bg-pink-50 text-pink-700 border-pink-200"
                                                    : req.requested_role === "staff"
                                                        ? "bg-blue-50 text-blue-700 border-blue-200"
                                                        : "bg-gray-50 text-gray-500 border-gray-200"
                                            }>
                                                {req.requested_role === "cast" ? "キャスト" : req.requested_role === "staff" ? "スタッフ" : req.requested_role}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm text-center w-1/4">
                                            <Badge variant="outline" className={
                                                req.status === "approved"
                                                    ? "bg-green-50 text-green-700 border-green-200"
                                                    : req.status === "rejected"
                                                        ? "bg-red-50 text-red-700 border-red-200"
                                                        : "bg-yellow-50 text-yellow-700 border-yellow-200"
                                            }>
                                                {req.status === "approved" ? "承認済み" : req.status === "rejected" ? "拒否" : "保留中"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm text-gray-500 text-center w-1/4">
                                            {formatJSTDate(req.created_at)}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}

            <InvitationModal
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
                uninvitedProfiles={uninvitedProfiles}
                roles={roles}
                pagePermissions={pagePermissions}
            />

            <InvitationDetailModal
                invitation={selectedInvitation}
                open={isDetailModalOpen}
                onOpenChange={setIsDetailModalOpen}
                onCancel={() => {
                    if (selectedInvitation) {
                        setInvitations((prev) =>
                            prev.map((inv) => (inv.id === selectedInvitation.id ? { ...inv, status: "canceled" } : inv))
                        );
                        setSelectedInvitation((prev) => prev ? { ...prev, status: "canceled" } : null);
                    }
                }}
            />

            {selectedJoinRequest && (
                <JoinRequestModal
                    request={selectedJoinRequest}
                    isOpen={isJoinRequestModalOpen}
                    onClose={() => setIsJoinRequestModalOpen(false)}
                    onRequestProcessed={handleJoinRequestProcessed}
                    storeRoles={roles}
                />
            )}

            {/* キャンセル確認ダイアログ */}
            <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
                <DialogContent className="max-w-md rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                    <DialogHeader>
                        <DialogTitle className="text-gray-900 dark:text-white">招待のキャンセル</DialogTitle>
                        <DialogDescription className="text-gray-600 dark:text-gray-400">
                            本当にこの招待をキャンセルしますか？この操作は取り消せません。
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4 flex justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setIsCancelDialogOpen(false)}
                            className="rounded-lg"
                        >
                            戻る
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleConfirmCancel}
                            disabled={isPending}
                            className="rounded-lg"
                        >
                            {isPending ? "キャンセル中..." : "キャンセルする"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* フィルターダイアログ */}
            <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
                <DialogContent className="max-w-md rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                    <DialogHeader>
                        <DialogTitle className="text-gray-900 dark:text-white">フィルター</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                名前で検索
                            </label>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="名前で検索..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-8 bg-white dark:bg-gray-800"
                                />
                            </div>
                        </div>
                        {mainTab === "invitations" && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                    ステータス
                                </label>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-full bg-white dark:bg-gray-800">
                                        <SelectValue placeholder="ステータス" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">全て</SelectItem>
                                        <SelectItem value="pending">招待中</SelectItem>
                                        <SelectItem value="accepted">参加済み</SelectItem>
                                        <SelectItem value="canceled">キャンセル</SelectItem>
                                        <SelectItem value="expired">期限切れ</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                    <DialogFooter className="flex justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setSearchQuery("");
                                setStatusFilter("all");
                            }}
                            className="rounded-lg"
                        >
                            リセット
                        </Button>
                        <Button
                            onClick={() => setIsFilterDialogOpen(false)}
                            className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            適用
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 設定モーダル */}
            <Dialog open={isSettingsModalOpen} onOpenChange={setIsSettingsModalOpen}>
                <DialogContent className="max-w-[calc(100vw-32px)] max-h-[calc(100vh-32px)] sm:max-w-md bg-white dark:bg-gray-900 overflow-y-auto">
                    <DialogHeader className="mb-4">
                        <DialogTitle className="text-gray-900 dark:text-white">
                            参加申請の設定
                        </DialogTitle>
                        <DialogDescription className="text-gray-600 dark:text-gray-400">
                            参加申請の受付方法を設定します。
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6">
                        {/* Allow by Code */}
                        <div className="space-y-3">
                            <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1">
                                    <Label htmlFor="allow-code" className="text-sm font-medium text-gray-900 dark:text-white">
                                        店舗コードで参加
                                    </Label>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        ユーザーが店舗コードを入力して参加申請を送ることができます。
                                    </p>
                                </div>
                                <Switch
                                    id="allow-code"
                                    checked={allowJoinByCode}
                                    onCheckedChange={setAllowJoinByCode}
                                    className="flex-shrink-0"
                                />
                            </div>
                            {allowJoinByCode && storeId && (
                                <div className="flex items-center gap-2">
                                    <Input
                                        value={storeId}
                                        readOnly
                                        className="font-mono text-sm bg-gray-50 dark:bg-gray-800"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={() => copyToClipboard(storeId, "code")}
                                        className="flex-shrink-0"
                                    >
                                        {copiedCode ? (
                                            <Check className="h-4 w-4 text-green-600" />
                                        ) : (
                                            <Copy className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Allow by URL */}
                        <div className="space-y-3">
                            <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1">
                                    <Label htmlFor="allow-url" className="text-sm font-medium text-gray-900 dark:text-white">
                                        専用URLで参加
                                    </Label>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        専用URLから新規登録して参加申請を送ることができます。
                                    </p>
                                </div>
                                <Switch
                                    id="allow-url"
                                    checked={allowJoinByUrl}
                                    onCheckedChange={setAllowJoinByUrl}
                                    className="flex-shrink-0"
                                />
                            </div>
                            {allowJoinByUrl && storeId && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Input
                                            value={getJoinUrl()}
                                            readOnly
                                            className="font-mono text-xs bg-gray-50 dark:bg-gray-800"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            onClick={() => copyToClipboard(getJoinUrl(), "url")}
                                            className="flex-shrink-0"
                                        >
                                            {copiedUrl ? (
                                                <Check className="h-4 w-4 text-green-600" />
                                            ) : (
                                                <Copy className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                    <Button
                                        type="button"
                                        className="w-full bg-[#06C755] hover:bg-[#05b54b] text-white"
                                        onClick={shareToLine}
                                    >
                                        LINEで共有
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Auto-save indicator */}
                        {isSaving && (
                            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                保存中...
                            </div>
                        )}
                    </div>

                    <DialogFooter className="mt-4 gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setIsSettingsModalOpen(false)}
                            className="w-full"
                        >
                            閉じる
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
