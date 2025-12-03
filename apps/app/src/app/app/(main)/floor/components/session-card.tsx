import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Zap } from "lucide-react";
import { TableSession, Table } from "@/types/floor";
import { formatTime } from "../utils/format";
import { groupGuestsByCasts } from "../utils/guest-grouping";

interface SessionCardProps {
    session: TableSession;
    table: Table | undefined;
    onSessionClick: (session: TableSession) => void;
    onQuickOrder: (session: TableSession, table: Table | null) => void;
}

export function SessionCard({ session, table, onSessionClick, onQuickOrder }: SessionCardProps) {
    const castAssignments = (session as any).cast_assignments || [];
    const guestGroups = groupGuestsByCasts(castAssignments);

    return (
        <Card
            className="cursor-pointer hover:shadow-md transition-shadow bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 p-3 flex flex-col"
            onClick={() => onSessionClick(session)}
        >
            <CardHeader className="p-0 mb-2 space-y-0">
                <CardTitle className="text-2xl mb-1 text-slate-900 dark:text-slate-100">
                    {table?.name || "不明"}
                </CardTitle>
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span className="text-xs sm:text-sm">{formatTime(session.start_time)}〜</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">{session.guest_count}名</Badge>
                </div>
            </CardHeader>
            <CardContent className="p-0 space-y-1.5 flex-1">
                {/* Guest and serving cast pairs */}
                {guestGroups.slice(0, 3).map((group, i) => (
                    <div key={i} className="flex items-center gap-1 text-[11px]">
                        {/* Guest */}
                        <div className="flex items-center gap-1 min-w-0">
                            <span className="truncate text-slate-700 dark:text-slate-300">
                                {group.guest?.display_name || "不明"}
                            </span>
                            {/* Only badge */}
                            {group.servingCasts.length === 0 && (
                                <span className="text-[10px] text-red-600 dark:text-red-400 font-medium shrink-0">
                                    オンリー
                                </span>
                            )}
                        </div>

                        {group.servingCasts.length > 0 && (
                            <div className="flex items-center gap-0.5 text-muted-foreground shrink-0">
                                <span className="text-[10px]">←</span>
                                {group.servingCasts.slice(0, 2).map((cast: any, j: number) => (
                                    <span key={j} className="text-pink-600 dark:text-pink-400 truncate max-w-[3rem]">
                                        {cast?.display_name?.slice(0, 3) || "?"}
                                    </span>
                                ))}
                                {group.servingCasts.length > 2 && (
                                    <span className="text-muted-foreground">+{group.servingCasts.length - 2}</span>
                                )}
                            </div>
                        )}
                    </div>
                ))}
                {guestGroups.length > 3 && (
                    <div className="text-[10px] text-muted-foreground">
                        他 {guestGroups.length - 3} 組
                    </div>
                )}
                {guestGroups.length === 0 && (
                    <div className="text-[10px] text-muted-foreground">
                        ゲスト未登録
                    </div>
                )}

                {/* Quick order button */}
                <div className="pt-1">
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-7 text-xs px-2 py-1"
                        onClick={(e) => {
                            e.stopPropagation();
                            onQuickOrder(session, table || null);
                        }}
                    >
                        <Zap className="h-3 w-3 mr-1" />
                        クイック注文
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
