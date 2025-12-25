import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, User, Users, Check, Loader2, Bell } from "lucide-react";
import type { QueueEntryData } from "../actions/reservation";
import { createSessionFromQueueEntry } from "../actions/reservation";

interface QueueCardProps {
    entry: QueueEntryData;
    onUpdate: () => void;
    onSessionCreated?: (sessionId: string) => void;
    onClick?: () => void;
}

export function QueueCard({ entry, onUpdate, onSessionCreated, onClick }: QueueCardProps) {
    const [isLoading, setIsLoading] = useState(false);

    // 作成時刻をフォーマット
    const formatCreatedTime = (createdAt: string) => {
        const date = new Date(createdAt);
        return date.toLocaleTimeString("ja-JP", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Tokyo",
        });
    };

    const handleVisited = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsLoading(true);

        // すぐにタブを切り替え（UIの即時反映）
        onSessionCreated?.("");

        // バックグラウンドでセッション作成
        createSessionFromQueueEntry(entry.id)
            .then((result) => {
                if (result.success) {
                    onUpdate();
                }
            })
            .catch((error) => {
                console.error("Error creating session from queue entry:", error);
            })
            .finally(() => {
                setIsLoading(false);
            });
    };

    const isNotified = entry.status === "notified";

    return (
        <Card
            className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 p-3 flex flex-col cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors shadow-sm"
            onClick={onClick}
        >
            <CardHeader className="p-0 mb-2 space-y-0">
                <div className="flex items-center gap-2 mb-1">
                    <Badge
                        variant={isNotified ? "default" : "secondary"}
                        className={`text-xs ${isNotified ? "bg-yellow-500 hover:bg-yellow-600" : ""}`}
                    >
                        {isNotified && <Bell className="h-3 w-3 mr-1" />}
                        No.{entry.queue_number}
                    </Badge>
                </div>
                <CardTitle className="text-lg mb-1 text-gray-900 dark:text-white">
                    {entry.guest_name}
                </CardTitle>
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span className="text-xs sm:text-sm">{formatCreatedTime(entry.created_at)}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                        <Users className="h-3 w-3 mr-1" />
                        {entry.party_size}名
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="p-0 space-y-1.5 flex-1">
                {/* 指名キャスト */}
                {entry.nominated_cast && (
                    <div className="flex items-center gap-1 text-xs">
                        <User className="h-3 w-3 text-pink-600 dark:text-pink-400" />
                        <span className="text-pink-600 dark:text-pink-400">
                            {entry.nominated_cast.display_name}
                        </span>
                        <span className="text-muted-foreground">指名</span>
                    </div>
                )}
                {!entry.nominated_cast && (
                    <div className="text-xs text-muted-foreground">
                        指名なし
                    </div>
                )}

                {/* 来店済みボタン */}
                <div className="pt-1">
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-7 text-xs px-2 py-1"
                        onClick={handleVisited}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <>
                                <Check className="h-3 w-3 mr-1" />
                                来店済みにする
                            </>
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
