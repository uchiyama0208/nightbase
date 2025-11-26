"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Search } from "lucide-react";
import { JoinRequestModal } from "./join-request-modal";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

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
}

export function JoinRequestsTable({ requests: initialRequests }: JoinRequestsTableProps) {
    const [requests, setRequests] = useState(initialRequests);
    const [searchQuery, setSearchQuery] = useState("");
    const [roleFilter, setRoleFilter] = useState<string>("all");
    const [selectedRequest, setSelectedRequest] = useState<JoinRequest | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const filteredRequests = requests.filter((req) => {
        const matchesSearch =
            req.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            req.real_name.toLowerCase().includes(searchQuery.toLowerCase());
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
            <div className="flex flex-col gap-2">
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem
                        value="filters"
                        className="rounded-2xl border border-gray-200 bg-white px-2 dark:border-gray-700 dark:bg-gray-800"
                    >
                        <AccordionTrigger className="px-2 text-sm font-semibold text-gray-900 dark:text-white">
                            フィルター
                        </AccordionTrigger>
                        <AccordionContent className="px-2">
                            <div className="flex flex-wrap gap-2 w-full sm:w-auto items-center">
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
                                    <TableCell className="font-medium text-center w-1/2">{req.real_name}</TableCell>
                                    <TableCell className="text-sm text-gray-500 text-center w-1/2">
                                        {format(new Date(req.created_at), "yyyy/MM/dd HH:mm", { locale: ja })}
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
