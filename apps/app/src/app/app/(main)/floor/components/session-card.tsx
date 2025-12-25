import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Zap, ClipboardList } from "lucide-react";
import { TableSession, Table } from "@/types/floor";
import { formatTime } from "../utils/format";
import { getTagOption, type TagValue } from "../constants/tag-options";

interface SessionCardProps {
    session: any; // V2構造
    table: Table | undefined;
    onSessionClick: (session: any) => void;
    onQuickOrder: (session: any, table: Table | null) => void;
}

// 特別料金のリスト（未完了注文カウントから除外するもの）
const SPECIAL_FEE_NAMES = ["セット料金", "指名料", "場内料金", "同伴料", "延長料金", "待機", "接客中", "ヘルプ", "終了"];


// V2構造からゲストとキャストのグループを生成
function groupGuestsFromV2(session: any) {
    const sessionGuests = session?.session_guests || [];
    const orders = session?.orders || [];

    // キャスト関連のオーダーを抽出（cast_idがあり、かつアクティブなキャスト、待機・終了以外）
    const castOrders = orders.filter((o: any) =>
        o.cast_id != null &&
        o.cast_status !== 'ended' &&
        o.cast_status !== 'waiting'
    );

    return sessionGuests.map((sg: any) => {
        const guest = sg.profiles;
        // 仮ゲストの場合はsession_guests.guest_nameを使用
        const guestName = guest?.display_name || sg.guest_name || null;

        const guestCastOrders = castOrders.filter((o: any) =>
            o.guest_id === sg.guest_id
        );

        // 1ゲストにつき1キャストのみ表示
        const firstCast = guestCastOrders[0];

        return {
            guest,
            guestName,
            servingCast: firstCast ? {
                profile: firstCast.profiles,
                status: firstCast.cast_status,
            } : null,
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
            className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 p-3 flex flex-col h-full shadow-sm"
            onClick={() => onSessionClick(session)}
        >
            <CardHeader className="p-0 mb-2 space-y-0">
                <CardTitle className="text-lg mb-1 text-gray-900 dark:text-white">
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
                        <div key={i} className="flex items-center gap-1 text-xs">
                            {/* Guest */}
                            <div className="flex items-center gap-1 min-w-0">
                                <span className="truncate text-gray-700 dark:text-gray-300">
                                    {group.guestName || "不明"}
                                </span>
                                {/* Only badge */}
                                {!group.servingCast && (
                                    <span className="text-[10px] text-red-600 dark:text-red-400 font-medium shrink-0">
                                        オンリー
                                    </span>
                                )}
                            </div>

                            {group.servingCast && (() => {
                                const tagOption = getTagOption(group.servingCast.status as TagValue);
                                return (
                                    <div className="flex items-center gap-1 shrink-0">
                                        <span className="text-[10px] text-muted-foreground">←</span>
                                        <span
                                            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${tagOption.color}`}
                                        >
                                            <span className="truncate max-w-[2.5rem]">
                                                {group.servingCast.profile?.display_name?.slice(0, 3) || "?"}
                                            </span>
                                            <span className="opacity-80">
                                                {tagOption.label}
                                            </span>
                                        </span>
                                    </div>
                                );
                            })()}
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
                    <div className="flex items-center gap-1 mt-2 text-xs text-amber-600 dark:text-amber-400">
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
