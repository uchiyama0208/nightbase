"use client";

import Image from "next/image";

import { useMemo, useState, useTransition, useCallback, useRef, useEffect } from "react";
import { Invitation, cancelInvitation, getInvitationsData } from "./actions";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Filter, RefreshCw, ChevronLeft } from "lucide-react";
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

type MainTabType = "members" | "invitations-requests";
type RoleTabType = "all" | "cast" | "staff";
type InvitationStatusTabType = "pending" | "all";

export function InvitationList({
    initialInvitations,
    uninvitedProfiles: initialUninvitedProfiles,
    roles,
    initialJoinRequests = [],
    initialStoreSettings,
    canEdit = false,
    pagePermissions,
}: InvitationListProps) {
    const { toast } = useToast();
    const [invitations, setInvitations] = useState(initialInvitations);
    const [joinRequests, setJoinRequests] = useState(initialJoinRequests);
    const [uninvitedProfiles, setUninvitedProfiles] = useState(initialUninvitedProfiles);
    const [searchQuery, setSearchQuery] = useState("");
    const [roleFilter, setRoleFilter] = useState<RoleTabType>("all");
    const [invitationStatusFilter, setInvitationStatusFilter] = useState<InvitationStatusTabType>("pending");
    const [mainTab, setMainTab] = useState<MainTabType>("members");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [selectedInvitation, setSelectedInvitation] = useState<Invitation | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
    const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
    const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);

    // Join request modal
    const [selectedJoinRequest, setSelectedJoinRequest] = useState<JoinRequest | null>(null);
    const [isJoinRequestModalOpen, setIsJoinRequestModalOpen] = useState(false);

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

    // Split invitations into members (accepted) and pending invitations
    const acceptedMembers = useMemo(() =>
        invitations.filter(inv => inv.status === "accepted")
    , [invitations]);

    const pendingInvitations = useMemo(() =>
        invitations.filter(inv => inv.status !== "accepted")
    , [invitations]);

    const activeFilters = useMemo(() => [
        searchQuery.trim() && `"${searchQuery}"`,
    ].filter(Boolean) as string[], [searchQuery]);

    const hasFilters = activeFilters.length > 0;

    const getFilterSummary = useCallback(() => {
        if (!hasFilters) return "なし";
        return activeFilters.join("・");
    }, [hasFilters, activeFilters]);

    // Filter for members tab (accepted only)
    const filteredMembers = useMemo(() => acceptedMembers.filter((inv) => {
        const query = searchQuery.toLowerCase();
        const displayName = inv.profile?.display_name || "";
        const displayNameKana = inv.profile?.display_name_kana || "";
        const realName = inv.profile?.real_name || "";
        const matchesSearch = displayName.toLowerCase().includes(query) ||
                              displayNameKana.toLowerCase().includes(query) ||
                              realName.toLowerCase().includes(query);
        const matchesRole = roleFilter === "all" || inv.profile?.role === roleFilter;
        return matchesSearch && matchesRole;
    }), [acceptedMembers, searchQuery, roleFilter]);

    // Filter for invitations tab (pending/canceled/expired)
    const filteredInvitations = useMemo(() => pendingInvitations.filter((inv) => {
        const query = searchQuery.toLowerCase();
        const displayName = inv.profile?.display_name || "";
        const displayNameKana = inv.profile?.display_name_kana || "";
        const realName = inv.profile?.real_name || "";
        const matchesSearch = displayName.toLowerCase().includes(query) ||
                              displayNameKana.toLowerCase().includes(query) ||
                              realName.toLowerCase().includes(query);
        const matchesRole = roleFilter === "all" || inv.profile?.role === roleFilter;
        // Check if pending (not expired)
        const isPending = inv.status === "pending" && new Date(inv.expires_at) >= new Date();
        const matchesInvitationStatus = invitationStatusFilter === "all" || isPending;
        return matchesSearch && matchesRole && matchesInvitationStatus;
    }), [pendingInvitations, searchQuery, roleFilter, invitationStatusFilter]);

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
        const matchesInvitationStatus = invitationStatusFilter === "all" || req.status === "pending";
        return matchesSearch && matchesRole && matchesInvitationStatus;
    }), [joinRequests, searchQuery, roleFilter, invitationStatusFilter]);

    // Count for tabs
    const membersCount = useMemo(() => acceptedMembers.length, [acceptedMembers]);
    const pendingInvitationsCount = useMemo(() =>
        pendingInvitations.filter(inv => inv.status === "pending" && new Date(inv.expires_at) >= new Date()).length
    , [pendingInvitations]);
    const pendingJoinRequestsCount = useMemo(() =>
        joinRequests.filter(req => req.status === "pending").length
    , [joinRequests]);
    const invitationsAndRequestsCount = pendingInvitationsCount + pendingJoinRequestsCount;

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
                setUninvitedProfiles(response.data.uninvitedProfiles);
            }
        } catch (err) {
            console.error("Failed to refresh:", err);
        } finally {
            setIsRefreshing(false);
        }
    }, []);

    return (
        <div className="space-y-2">
            {/* Top row: Filter button + Plus button */}
            <div className="flex items-center justify-between">
                <button
                    type="button"
                    className={`flex items-center gap-1 px-1 py-1 rounded-lg transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${
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
                        <Button
                            onClick={() => setIsModalOpen(true)}
                            size="icon"
                            className="h-10 w-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white border-none shadow-md transition-all hover:scale-105 active:scale-95"
                        >
                            <Plus className="h-5 w-5" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Main Tab Navigation */}
            <div className="relative">
                <div className="flex w-full">
                    <button
                        ref={(el) => { mainTabsRef.current["members"] = el; }}
                        type="button"
                        onClick={() => setMainTab("members")}
                        className={`flex-1 py-2 text-sm font-medium transition-colors relative ${
                            mainTab === "members"
                                ? "text-gray-900 dark:text-white"
                                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                        }`}
                    >
                        参加中 ({membersCount})
                    </button>
                    <button
                        ref={(el) => { mainTabsRef.current["invitations-requests"] = el; }}
                        type="button"
                        onClick={() => setMainTab("invitations-requests")}
                        className={`flex-1 py-2 text-sm font-medium transition-colors relative ${
                            mainTab === "invitations-requests"
                                ? "text-gray-900 dark:text-white"
                                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                        }`}
                    >
                        招待・申請 {invitationsAndRequestsCount > 0 && `(${invitationsAndRequestsCount})`}
                    </button>
                </div>
                <div
                    className="absolute bottom-0 h-0.5 bg-gray-900 dark:bg-white transition-all duration-200"
                    style={{ left: mainIndicatorStyle.left, width: mainIndicatorStyle.width }}
                />
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gray-200 dark:bg-gray-700" />
            </div>

            {/* Role Filter Tags - only show for members tab */}
            {mainTab === "members" && (
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
            )}

            {/* Status Filter Tags - only show for invitations-requests tab */}
            {mainTab === "invitations-requests" && (
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => setInvitationStatusFilter("pending")}
                        className={`px-3 py-1 text-sm font-medium rounded-full transition-colors ${
                            invitationStatusFilter === "pending"
                                ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                        }`}
                    >
                        保留中
                    </button>
                    <button
                        type="button"
                        onClick={() => setInvitationStatusFilter("all")}
                        className={`px-3 py-1 text-sm font-medium rounded-full transition-colors ${
                            invitationStatusFilter === "all"
                                ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                        }`}
                    >
                        すべて
                    </button>
                </div>
            )}

            {/* Members Table (Accepted Invitations) */}
            {mainTab === "members" && (
                <div className="overflow-hidden rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                    <Table className="table-fixed">
                        <TableHeader>
                            <TableRow className="bg-gray-50 dark:bg-gray-800/50">
                                <TableHead className="text-center w-1/2 text-gray-900 dark:text-gray-100">名前</TableHead>
                                <TableHead className="text-center w-1/2 text-gray-900 dark:text-gray-100">ロール</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredMembers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={2} className="text-center py-8 text-gray-500">
                                        メンバーが見つかりません
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredMembers.map((inv) => (
                                    <TableRow
                                        key={inv.id}
                                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                        onClick={() => handleRowClick(inv)}
                                    >
                                        <TableCell className="font-medium text-center w-1/2">
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
                                        <TableCell className="text-sm text-center w-1/2">
                                            <Badge variant="outline" className={
                                                inv.profile?.role === "cast"
                                                    ? "bg-pink-50 text-pink-700 border-pink-200"
                                                    : inv.profile?.role === "staff"
                                                        ? "bg-blue-50 text-blue-700 border-blue-200"
                                                        : inv.profile?.role === "admin"
                                                            ? "bg-purple-50 text-purple-700 border-purple-200"
                                                            : "bg-gray-50 text-gray-500 border-gray-200"
                                            }>
                                                {inv.profile?.role === "cast" ? "キャスト" : inv.profile?.role === "staff" ? "スタッフ" : inv.profile?.role === "admin" ? "管理者" : inv.profile?.role}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Invitations & Requests Table */}
            {mainTab === "invitations-requests" && (
                <div className="overflow-hidden rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                    <Table className="table-fixed">
                        <TableHeader>
                            <TableRow className="bg-gray-50 dark:bg-gray-800/50">
                                <TableHead className="text-center w-1/3 text-gray-900 dark:text-gray-100">名前</TableHead>
                                <TableHead className="text-center w-1/3 text-gray-900 dark:text-gray-100">種別</TableHead>
                                <TableHead className="text-center w-1/3 text-gray-900 dark:text-gray-100">ステータス</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredInvitations.length === 0 && filteredJoinRequests.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                                        招待・申請がありません
                                    </TableCell>
                                </TableRow>
                            ) : (
                                <>
                                    {/* Pending Invitations */}
                                    {filteredInvitations.map((inv) => (
                                        <TableRow
                                            key={`inv-${inv.id}`}
                                            className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
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
                                            <TableCell className="text-sm text-center w-1/3">
                                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                                    招待
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center w-1/3">
                                                <div className="flex justify-center">
                                                    {getStatusBadge(inv.status, inv.expires_at)}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {/* Join Requests */}
                                    {filteredJoinRequests.map((req) => (
                                        <TableRow
                                            key={`req-${req.id}`}
                                            className={`${req.status === "pending" ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50" : ""}`}
                                            onClick={() => handleJoinRequestClick(req)}
                                        >
                                            <TableCell className="font-medium text-center w-1/3">
                                                {req.display_name || req.real_name}
                                            </TableCell>
                                            <TableCell className="text-sm text-center w-1/3">
                                                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                                                    申請
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm text-center w-1/3">
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
                                        </TableRow>
                                    ))}
                                </>
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
                storeId={storeId}
                storeSettings={initialStoreSettings}
                onProfileCreated={handleRefresh}
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
                <DialogContent className="sm:max-w-md rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                    <DialogHeader>
                        <DialogTitle className="text-gray-900 dark:text-white">招待のキャンセル</DialogTitle>
                        <DialogDescription className="text-gray-600 dark:text-gray-400">
                            本当にこの招待をキャンセルしますか？この操作は取り消せません。
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex justify-end gap-2">
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
                <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 p-0">
                    <DialogHeader className="flex !flex-row items-center gap-2 h-14 min-h-[3.5rem] flex-shrink-0 border-b border-gray-200 dark:border-gray-700 px-4">
                        <button
                            type="button"
                            onClick={() => setIsFilterDialogOpen(false)}
                            className="p-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        </button>
                        <DialogTitle className="flex-1 text-center text-gray-900 dark:text-white">フィルター</DialogTitle>
                        <div className="w-7" />
                    </DialogHeader>
                    <div className="space-y-4 p-6">
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
                    </div>
                    <DialogFooter className="flex flex-col gap-2 px-6 pb-6">
                        <Button
                            onClick={() => setIsFilterDialogOpen(false)}
                            className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            適用
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setIsFilterDialogOpen(false)}
                            className="w-full rounded-lg"
                        >
                            戻る
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}
