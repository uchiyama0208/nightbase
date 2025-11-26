"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { JoinRequestModal } from "./join-request-modal";
import { Users, Calendar, Search } from "lucide-react";

interface JoinRequest {
    id: string;
    display_name: string;
    real_name: string;
    role: string;
    created_at: string;
    approval_status: string;
}

interface JoinRequestsListProps {
    requests: JoinRequest[];
}

export function JoinRequestsList({ requests: initialRequests }: JoinRequestsListProps) {
    const [requests, setRequests] = useState(initialRequests);
    const [searchQuery, setSearchQuery] = useState("");
    const [roleFilter, setRoleFilter] = useState<string>("all");
    const [selectedRequest, setSelectedRequest] = useState<JoinRequest | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleRequestClick = (request: JoinRequest) => {
        setSelectedRequest(request);
        setIsModalOpen(true);
    };

    const handleRequestProcessed = (requestId: string) => {
        setRequests(requests.filter(r => r.id !== requestId));
        setIsModalOpen(false);
    };

    const activeFilters = [
        searchQuery.trim() && "名前",
        roleFilter !== "all" && (roleFilter === "cast" ? "キャスト" : "スタッフ"),
    ].filter(Boolean) as string[];

    const filteredRequests = requests.filter((req) => {
        const nameMatch = searchQuery.trim().toLowerCase();
        const matchesSearch =
            !nameMatch ||
            req.display_name.toLowerCase().includes(nameMatch) ||
            req.real_name.toLowerCase().includes(nameMatch);
        const matchesRole = roleFilter === "all" || req.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    const getRoleBadge = (role: string) => {
        const colors: Record<string, string> = {
            cast: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
            staff: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
        };
        return colors[role] || "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    };

    const getRoleLabel = (role: string) => {
        const labels: Record<string, string> = {
            cast: "キャスト",
            staff: "スタッフ",
        };
        return labels[role] || role;
    };

    if (requests.length === 0) {
        return (
            <Card>
                <CardContent className="py-12 text-center">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">
                        現在、参加申請はありません
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-3">
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
                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="名前で検索"
                                className="pl-8"
                            />
                        </div>
                    </div>
                    {activeFilters.length > 0 && (
                        <div className="flex flex-wrap gap-2 text-xs text-blue-700 dark:text-blue-300">
                            {activeFilters.map((filter, index) => (
                                <span
                                    key={`${filter}-${index}`}
                                    className="bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full"
                                >
                                    {filter}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                <div className="grid gap-4">
                    {filteredRequests.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-600 dark:text-gray-400">
                                    条件に一致する参加申請はありません
                                </p>
                            </CardContent>
                        </Card>
                    ) : filteredRequests.map((request) => (
                    <Card
                        key={request.id}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => handleRequestClick(request)}
                    >
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                            {request.display_name}
                                        </h3>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadge(request.role)}`}>
                                            {getRoleLabel(request.role)}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        本名: {request.real_name}
                                    </p>
                                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-500">
                                        <Calendar className="h-3 w-3" />
                                        <span>
                                            {new Date(request.created_at).toLocaleDateString("ja-JP", {
                                                year: "numeric",
                                                month: "long",
                                                day: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </span>
                                    </div>
                                </div>
                                <Button variant="outline" size="sm">
                                    詳細を見る
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                    ))}
                </div>
            </div>

            {selectedRequest && (
                <JoinRequestModal
                    request={selectedRequest}
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onRequestProcessed={handleRequestProcessed}
                />
            )}
        </>
    );
}
