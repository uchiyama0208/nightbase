import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Zap, ClipboardList } from "lucide-react";
import { TableSession, Table } from "@/types/floor";
import { formatTime } from "../utils/format";

interface SessionCardProps {
    session: any; // V2構造
    table: Table | undefined;
    onSessionClick: (session: any) => void;
    onQuickOrder: (session: any, table: Table | null) => void;
}

// 特別料金のリスト
const SPECIAL_FEE_NAMES = ["セット料金", "指名料", "場内料金", "同伴料", "延長料金"];

// V2構造からゲストとキャストのグループを生成
function groupGuestsFromV2(session: any) {
    const sessionGuests = session?.session_guests || [];
    const orders = session?.orders || [];

    // キャスト関連のオーダーを抽出（cast_idがあり、かつキャスト料金の種類のみ）
    const castOrders = orders.filter((o: any) =>
        o.cast_id != null &&
        ['指名料', '場内料金', '同伴料'].includes(o.item_name)
    );

    return sessionGuests.map((sg: any) => {
        const guest = sg.profiles;
        const guestCastOrders = castOrders.filter((o: any) =>
            o.guest_id === sg.guest_id && o.cast_status !== 'ended'
        );

        return {
            guest,
            servingCasts: guestCastOrders.map((o: any) => o.profiles).filter(Boolean),
        };
    });
}

// 未完了注文数をカウント
function getPendingOrderCount(session: any): number {
    const orders = session?.orders || [];
    return orders.filter((o: any) => {
        // 特別料金は除外
        if (!o.menu_id && o.item_name && SPECIAL_FEE_NAMES.includes(o.item_name)) {
            return false;
        }
        // 未完了の注文のみカウント
        return o.status !== "completed" && o.status !== "cancelled";
    }).length;
}

export function SessionCard({ session, table, onSessionClick, onQuickOrder }: SessionCardProps) {
    const guestGroups = groupGuestsFromV2(session);
    const pendingOrderCount = getPendingOrderCount(session);

    return (
        <Card
            className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 p-3 flex flex-col h-full shadow-sm"
            onClick={() => onSessionClick(session)}
        >
            <CardHeader className="p-0 mb-2 space-y-0">
                <CardTitle className="text-lg mb-1 text-slate-900 dark:text-slate-100">
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
            <CardContent className="p-0 flex-1 flex flex-col">
                {/* Guest and serving cast pairs */}
                <div className="space-y-1.5">
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
                </div>

                {/* Pending orders count */}
                {pendingOrderCount > 0 && (
                    <div className="flex items-center gap-1 mt-2 text-[11px] text-amber-600 dark:text-amber-400">
                        <ClipboardList className="h-3 w-3" />
                        <span>未完了注文: {pendingOrderCount}件</span>
                    </div>
                )}

                {/* Spacer to push quick order button to bottom */}
                <div className="flex-1" />

                {/* Quick order button - always at bottom */}
                <div className="pt-2 mt-2">
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
