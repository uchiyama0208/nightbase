"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { JoinRequestModal } from "./join-request-modal";
import { Users, Calendar } from "lucide-react";

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
            <div className="grid gap-4">
                {requests.map((request) => (
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
