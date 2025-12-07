"use client";

import Image from "next/image";

import { useMemo, useState, useTransition, useCallback } from "react";
import { Invitation, cancelInvitation } from "./actions";
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
import { Plus, Search, Ban, Copy, Check } from "lucide-react";
import { InvitationModal } from "./invitation-modal";
import { InvitationDetailModal } from "./invitation-detail-modal";
import { formatJSTDateTime } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface InvitationListProps {
    initialInvitations: Invitation[];
    uninvitedProfiles: any[];
    roles: any[];
}

export function InvitationList({
    initialInvitations,
    uninvitedProfiles,
    roles,
}: InvitationListProps) {
    const [invitations, setInvitations] = useState(initialInvitations);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [roleFilter, setRoleFilter] = useState<string>("all");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [selectedInvitation, setSelectedInvitation] = useState<Invitation | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
    const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);

    const activeFilters = useMemo(() => [
        searchQuery.trim() && "検索",
        statusFilter !== "all" && "ステータス",
        roleFilter !== "all" && (roleFilter === "cast" ? "キャスト" : "スタッフ"),
    ].filter(Boolean) as string[], [searchQuery, statusFilter, roleFilter]);
    const hasFilters = activeFilters.length > 0;

    const suggestionItems = useMemo(
        () =>
            Array.from(
                new Set(
                    initialInvitations
                        .map((inv) => inv.profile?.display_name || inv.profile?.real_name || "")
                        .filter(Boolean),
                ),
            ),
        [initialInvitations],
    );

    const filteredInvitations = useMemo(() => invitations.filter((inv) => {
        const matchesSearch = (inv.profile?.display_name || inv.profile?.real_name || "")
            .toLowerCase()
            .includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "all" || inv.status === statusFilter;
        const matchesRole = roleFilter === "all" || inv.profile?.role === roleFilter;
        return matchesSearch && matchesStatus && matchesRole;
    }), [invitations, searchQuery, statusFilter, roleFilter]);

    const handleCancelClick = useCallback((id: string) => {
        setCancelTargetId(id);
        setIsCancelDialogOpen(true);
    }, []);

    const handleConfirmCancel = useCallback(() => {
        if (!cancelTargetId) return;

        startTransition(async () => {
            try {
                await cancelInvitation(cancelTargetId);
                setInvitations((prev) =>
                    prev.map((inv) => (inv.id === cancelTargetId ? { ...inv, status: "canceled" } : inv))
                );
                // Also update selected invitation if it's the one being canceled
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

    const handleCopyUrl = useCallback((token: string, id: string) => {
        const url = `${window.location.origin}/invite/${token}`;
        navigator.clipboard.writeText(url);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    }, []);

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

    const roleIndex = useMemo(() => {
        if (roleFilter === "all") return 0;
        if (roleFilter === "cast") return 1;
        if (roleFilter === "staff") return 2;
        return 0;
    }, [roleFilter]);

    return (
        <div className="space-y-4">
            {/* Top row: role toggle + plus button (match users page) */}
            <div className="flex items-center justify-between">
                <div className="relative inline-flex h-10 items-center rounded-full bg-gray-100 dark:bg-gray-800 p-1">
                    <div
                        className="absolute h-8 rounded-full bg-white dark:bg-gray-700 shadow-sm transition-transform duration-300 ease-in-out"
                        style={{
                            width: "80px",
                            left: "4px",
                            transform: `translateX(calc(${roleIndex} * (80px + 0px)))`,
                        }}
                    />
                    <button
                        type="button"
                        onClick={() => setRoleFilter("all")}
                        className={`relative z-10 w-20 flex items-center justify-center h-8 rounded-full text-sm font-medium transition-colors duration-200 ${roleFilter === "all"
                            ? "text-gray-900 dark:text-white"
                            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}
                    >
                        全て
                    </button>
                    <button
                        type="button"
                        onClick={() => setRoleFilter("cast")}
                        className={`relative z-10 w-20 flex items-center justify-center h-8 rounded-full text-sm font-medium transition-colors duration-200 ${roleFilter === "cast"
                            ? "text-gray-900 dark:text-white"
                            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}
                    >
                        キャスト
                    </button>
                    <button
                        type="button"
                        onClick={() => setRoleFilter("staff")}
                        className={`relative z-10 w-20 flex items-center justify-center h-8 rounded-full text-sm font-medium transition-colors duration-200 ${roleFilter === "staff"
                            ? "text-gray-900 dark:text-white"
                            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}
                    >
                        スタッフ
                    </button>
                </div>

                <Button
                    onClick={() => setIsModalOpen(true)}
                    size="icon"
                    className="h-10 w-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white border-none shadow-md transition-all hover:scale-105 active:scale-95"
                >
                    <Plus className="h-5 w-5" />
                </Button>
            </div>

            {/* Filter accordion (below toggle, like users page) */}
            <Accordion type="single" collapsible className="w-full">
                <AccordionItem
                    value="filters"
                    className="rounded-2xl border border-gray-200 bg-white px-2 dark:border-gray-700 dark:bg-gray-800"
                >
                    <AccordionTrigger className="px-2 text-sm font-semibold text-gray-900 dark:text-white">
                        <div className="flex w-full items-center justify-between pr-2">
                            <span>フィルター</span>
                            {hasFilters && (
                                <span className="text-xs text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/40 px-2 py-0.5 rounded-full">
                                    {activeFilters.join("・")}
                                </span>
                            )}
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-2">
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-row gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="名前で検索..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-8 bg-white dark:bg-gray-800"
                                    />
                                </div>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-[130px] sm:w-[180px] bg-white dark:bg-gray-800">
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
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>

            <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="text-center w-1/3">名前</TableHead>
                            <TableHead className="text-center w-1/3">ステータス</TableHead>
                            <TableHead className="text-center w-1/3">有効期限</TableHead>
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

            <InvitationModal
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
                uninvitedProfiles={uninvitedProfiles}
                roles={roles}
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
        </div>
    );
}
