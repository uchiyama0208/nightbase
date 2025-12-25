"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Search, Loader2, Edit, Trash2, Eye, EyeOff } from "lucide-react";
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
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { formatJSTDateTime } from "@/lib/utils";

interface CmsEntry {
    id: string;
    type: string;
    slug: string;
    title: string;
    excerpt: string | null;
    cover_image_url: string | null;
    status: "draft" | "published";
    published_at: string | null;
    created_at: string;
    updated_at: string;
}

interface CmsListProps {
    type: "blog" | "case_study" | "manual";
    typeLabel: string;
    description: string;
    basePath: string;
}

export function CmsList({ type, typeLabel, description, basePath }: CmsListProps) {
    const [entries, setEntries] = useState<CmsEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "published">("all");
    const [deleteTarget, setDeleteTarget] = useState<CmsEntry | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        loadEntries();
    }, []);

    const loadEntries = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/admin/cms?type=${type}`);
            if (res.ok) {
                const data = await res.json();
                setEntries(data.entries || []);
            }
        } catch (error) {
            console.error("Failed to load entries:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;

        setIsDeleting(true);
        try {
            const res = await fetch(`/api/admin/cms/${deleteTarget.id}`, {
                method: "DELETE",
            });
            if (res.ok) {
                setEntries((prev) => prev.filter((e) => e.id !== deleteTarget.id));
                setDeleteTarget(null);
            }
        } catch (error) {
            console.error("Failed to delete entry:", error);
        } finally {
            setIsDeleting(false);
        }
    };

    const filteredEntries = entries.filter((entry) => {
        const matchesSearch = entry.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "all" || entry.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                        {typeLabel}管理
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {description}
                    </p>
                </div>
                <Link href={`${basePath}/new`} className="shrink-0">
                    <Button className="w-full sm:w-auto">
                        <Plus className="h-5 w-5 mr-2" />
                        新規作成
                    </Button>
                </Link>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="タイトルで検索..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 rounded-lg"
                    />
                </div>
                <div className="flex gap-2">
                    {(["all", "published", "draft"] as const).map((status) => (
                        <Button
                            key={status}
                            variant={statusFilter === status ? "default" : "outline"}
                            size="sm"
                            onClick={() => setStatusFilter(status)}
                            className="rounded-lg"
                        >
                            {status === "all" && "すべて"}
                            {status === "published" && "公開中"}
                            {status === "draft" && "下書き"}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                <div className="overflow-x-auto">
                    <Table className="min-w-[600px]">
                        <TableHeader>
                            <TableRow className="bg-gray-50 dark:bg-gray-800/50">
                                <TableHead className="text-gray-900 dark:text-gray-100 whitespace-nowrap">タイトル</TableHead>
                                <TableHead className="w-24 text-center text-gray-900 dark:text-gray-100 whitespace-nowrap">ステータス</TableHead>
                                <TableHead className="w-40 text-center text-gray-900 dark:text-gray-100 whitespace-nowrap">更新日時</TableHead>
                                <TableHead className="w-24 text-center text-gray-900 dark:text-gray-100 whitespace-nowrap">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                                </TableCell>
                            </TableRow>
                        ) : filteredEntries.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                    {searchQuery || statusFilter !== "all"
                                        ? "条件に一致する記事がありません"
                                        : `${typeLabel}がありません`}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredEntries.map((entry) => (
                                <TableRow
                                    key={entry.id}
                                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                >
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            {entry.cover_image_url && (
                                                <img
                                                    src={entry.cover_image_url}
                                                    alt=""
                                                    className="w-12 h-8 object-cover rounded"
                                                />
                                            )}
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white line-clamp-1">
                                                    {entry.title}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    /{entry.slug}
                                                </p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <span
                                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                                entry.status === "published"
                                                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                                            }`}
                                        >
                                            {entry.status === "published" ? (
                                                <>
                                                    <Eye className="h-3 w-3" />
                                                    公開中
                                                </>
                                            ) : (
                                                <>
                                                    <EyeOff className="h-3 w-3" />
                                                    下書き
                                                </>
                                            )}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-center text-sm text-gray-600 dark:text-gray-400">
                                        {formatJSTDateTime(entry.updated_at)}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <Link href={`${basePath}/${entry.id}`}>
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                    <Edit className="h-5 w-5" />
                                                </Button>
                                            </Link>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                onClick={() => setDeleteTarget(entry)}
                                            >
                                                <Trash2 className="h-5 w-5" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                    </Table>
                </div>
            </div>

            {/* Delete confirmation dialog */}
            <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <DialogContent className="sm:max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
                    <DialogHeader>
                        <DialogTitle className="text-base font-semibold text-gray-900 dark:text-white">
                            {typeLabel}を削除
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        「{deleteTarget?.title}」を削除しますか？この操作は取り消せません。
                    </p>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setDeleteTarget(null)}
                            className="rounded-lg"
                        >
                            キャンセル
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="rounded-lg"
                        >
                            {isDeleting ? "削除中..." : "削除"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
