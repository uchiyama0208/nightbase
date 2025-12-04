"use client";

import { useMemo, useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Search, Settings } from "lucide-react";
import { JoinRequestModal } from "./join-request-modal";
import { formatJSTDateTime } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface JoinRequest {
    id: string;
    display_name: string;
    real_name: string;
    role: string;
    created_at: string;
    approval_status: string;
}

interface JoinRequestsTableProps {
    requests: JoinRequest[];
    onSettingsClick?: () => void;
}

export function JoinRequestsTable({ requests: initialRequests, onSettingsClick }: JoinRequestsTableProps) {
    const [requests, setRequests] = useState(initialRequests);
    const [searchQuery, setSearchQuery] = useState("");
    const [roleFilter, setRoleFilter] = useState<string>("all");
    const [selectedRequest, setSelectedRequest] = useState<JoinRequest | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const activeFilters = [
        searchQuery.trim() && "検索",
        roleFilter !== "all" && (roleFilter === "cast" ? "キャスト" : "スタッフ"),
    ].filter(Boolean) as string[];
    const hasFilters = activeFilters.length > 0;

    const suggestionItems = useMemo(
        () =>
            Array.from(
                new Set(
                    initialRequests
                        .map((req) => req.display_name || req.real_name)
                        .filter(Boolean),
                ),
            ) as string[],
        [initialRequests],
    );

    const filteredRequests = requests.filter((req) => {
        const matchesSearch =
            (req.display_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (req.real_name || "").toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = roleFilter === "all" || req.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    const handleRowClick = (request: JoinRequest) => {
        setSelectedRequest(request);
        setIsModalOpen(true);
    };

    const handleRequestProcessed = (requestId: string) => {
        setRequests(requests.filter(r => r.id !== requestId));
        setIsModalOpen(false);
    };

    return (
        <div className="space-y-4">
            {/* Role filter toggle and settings button on the same row */}
            <div className="flex items-center justify-between">
                <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-full">
                    <button
                        onClick={() => setRoleFilter("all")}
                        className={`px-4 py-1.5 text-sm rounded-full transition-all ${roleFilter === "all"
                            ? "bg-white dark:bg-gray-700 shadow-sm font-medium"
                            : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                            }`}
                    >
                        全て
                    </button>
                    <button
                        onClick={() => setRoleFilter("cast")}
                        className={`px-4 py-1.5 text-sm rounded-full transition-all ${roleFilter === "cast"
                            ? "bg-white dark:bg-gray-700 shadow-sm font-medium"
                            : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                            }`}
                    >
                        キャスト
                    </button>
                    <button
                        onClick={() => setRoleFilter("staff")}
                        className={`px-4 py-1.5 text-sm rounded-full transition-all ${roleFilter === "staff"
                            ? "bg-white dark:bg-gray-700 shadow-sm font-medium"
                            : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                            }`}
                    >
                        スタッフ
                    </button>
                </div>

                {/* Settings Button - same row as toggle */}
                {onSettingsClick && (
                    <Button
                        size="icon"
                        className="h-10 w-10 rounded-full bg-blue-600 text-white hover:bg-blue-700 border-none shadow-md transition-all hover:scale-105 active:scale-95 flex-shrink-0"
                        onClick={onSettingsClick}
                    >
                        <Settings className="h-5 w-5" />
                    </Button>
                )}
            </div>

            {/* Filter accordion - separate row */}
            <div className="flex items-center">
                <Accordion type="single" collapsible className="w-full sm:w-auto">
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
                                <div className="flex flex-col gap-3">
                                    <div className="relative w-full sm:w-72">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="名前で検索"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-8"
                                        />
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                </Accordion>
            </div>

            <div className="rounded-3xl border bg-white dark:bg-gray-800">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="text-center w-1/2">名前</TableHead>
                            <TableHead className="text-center w-1/2">申請日時</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredRequests.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={2} className="text-center py-8 text-gray-500">
                                    参加申請が見つかりません
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredRequests.map((req) => (
                                <TableRow
                                    key={req.id}
                                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                    onClick={() => handleRowClick(req)}
                                >
                                    <TableCell className="font-medium text-center w-1/2">{req.display_name || req.real_name}</TableCell>
                                    <TableCell className="text-sm text-gray-500 text-center w-1/2">
                                        {formatJSTDateTime(req.created_at)}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {selectedRequest && (
                <JoinRequestModal
                    request={selectedRequest}
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onRequestProcessed={handleRequestProcessed}
                />
            )}
        </div>
    );
}
