"use client";

import Image from "next/image";

import { useState, useTransition } from "react";
import { Invitation, cancelInvitation } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { format } from "date-fns";
import { ja } from "date-fns/locale";

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

    const filteredInvitations = invitations.filter((inv) => {
        const matchesSearch = (inv.profile?.display_name || "").toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "all" || inv.status === statusFilter;
        const matchesRole = roleFilter === "all" || inv.profile?.role === roleFilter;
        return matchesSearch && matchesStatus && matchesRole;
    });

    const handleCancel = async (id: string) => {
        if (!confirm("本当にこの招待をキャンセルしますか？")) return;

        startTransition(async () => {
            try {
                await cancelInvitation(id);
                setInvitations((prev) =>
                    prev.map((inv) => (inv.id === id ? { ...inv, status: "canceled" } : inv))
                );
                // Also update selected invitation if it's the one being canceled
                if (selectedInvitation?.id === id) {
                    setSelectedInvitation((prev) => prev ? { ...prev, status: "canceled" } : null);
                }
            } catch (error) {
                alert("キャンセルに失敗しました");
            }
        });
    };

    const handleCopyUrl = (token: string, id: string) => {
        const url = `${window.location.origin}/invite/${token}`;
        navigator.clipboard.writeText(url);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const getStatusBadge = (status: string, expiresAt: string) => {
        const isExpired = new Date(expiresAt) < new Date() && status === "pending";

        if (status === "canceled") return <Badge variant="destructive">キャンセル</Badge>;
        if (status === "accepted") return <Badge className="bg-green-500">参加済み</Badge>;
        if (isExpired) return <Badge variant="secondary">期限切れ</Badge>;
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">招待中</Badge>;
    };

    const handleRowClick = (invitation: Invitation) => {
        setSelectedInvitation(invitation);
        setIsDetailModalOpen(true);
    };

    return (
        <div className="space-y-4">
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

                <div className="flex flex-row justify-between items-center">
                    <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-full overflow-x-auto max-w-[calc(100%-50px)]">
                        <button
                            onClick={() => setRoleFilter("all")}
                            className={`px-3 sm:px-4 py-1.5 text-xs sm:text-sm rounded-full whitespace-nowrap transition-all ${roleFilter === "all"
                                ? "bg-white dark:bg-gray-700 shadow-sm font-medium"
                                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                                }`}
                        >
                            全て
                        </button>
                        <button
                            onClick={() => setRoleFilter("cast")}
                            className={`px-3 sm:px-4 py-1.5 text-xs sm:text-sm rounded-full whitespace-nowrap transition-all ${roleFilter === "cast"
                                ? "bg-white dark:bg-gray-700 shadow-sm font-medium"
                                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                                }`}
                        >
                            キャスト
                        </button>
                        <button
                            onClick={() => setRoleFilter("staff")}
                            className={`px-3 sm:px-4 py-1.5 text-xs sm:text-sm rounded-full whitespace-nowrap transition-all ${roleFilter === "staff"
                                ? "bg-white dark:bg-gray-700 shadow-sm font-medium"
                                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                                }`}
                        >
                            スタッフ
                        </button>
                    </div>
                    <Button
                        onClick={() => setIsModalOpen(true)}
                        size="icon"
                        className="rounded-full w-10 h-10 bg-blue-600 hover:bg-blue-700 shrink-0"
                    >
                        <Plus className="h-5 w-5" />
                    </Button>
                </div>
            </div>

            <div className="rounded-md border bg-white dark:bg-gray-800">
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
                                        {inv.status === "accepted"
                                            ? "ー"
                                            : format(new Date(inv.expires_at), "yyyy/MM/dd HH:mm", { locale: ja })}
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
        </div>
    );
}
