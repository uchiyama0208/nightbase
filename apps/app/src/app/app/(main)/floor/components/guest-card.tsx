import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronUp, ChevronDown, UserPlus, Trash2, MoreHorizontal } from "lucide-react";
import { updateCastAssignmentTimes } from "../actions";

interface GuestCardProps {
    guest: any;
    guestCasts: any[];
    isExpanded: boolean;
    onToggleExpand: () => void;
    onAddCast: (guestId: string) => void;
    onDeleteGuest: (assignmentId: string, name: string) => void;
    onDeleteCast: (id: string, name: string) => void;
    onStatusEdit: (id: string, name: string, currentStatus: string) => void;
    onUpdate: () => void;
    openMenuId: string | null;
    setOpenMenuId: (id: string | null) => void;
    castAssignments: any[];
    getStatusOption: (status: string) => any;
}

export function GuestCard({
    guest,
    guestCasts,
    isExpanded,
    onToggleExpand,
    onAddCast,
    onDeleteGuest,
    onDeleteCast,
    onStatusEdit,
    onUpdate,
    openMenuId,
    setOpenMenuId,
    castAssignments,
    getStatusOption,
}: GuestCardProps) {
    return (
        <div className="rounded-xl border bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
            {/* Guest Header */}
            <div
                className="flex items-center p-3 border-b cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                onClick={onToggleExpand}
            >
                <Avatar className="h-10 w-10 mr-3">
                    <AvatarImage src={guest.avatar_url} />
                    <AvatarFallback>
                        {guest.display_name?.[0] || "?"}
                    </AvatarFallback>
                </Avatar>
                <span className="font-medium text-sm flex-1 flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        {guest.display_name || "不明"}
                        {(() => {
                            const activeCasts = guestCasts.filter((c: any) =>
                                ['serving', 'jonai', 'shimei'].includes(c.status)
                            );

                            if (activeCasts.length > 0) {
                                return (
                                    <div className="flex flex-wrap gap-1">
                                        {activeCasts.map((cast: any) => (
                                            <span key={cast.id} className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-1.5 py-0.5 rounded-md">
                                                {cast.profiles?.display_name}
                                            </span>
                                        ))}
                                    </div>
                                );
                            } else {
                                return (
                                    <span className="text-xs font-bold text-red-500 border border-red-500 px-1.5 py-0.5 rounded-md">
                                        オンリー
                                    </span>
                                );
                            }
                        })()}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="shrink-0">待機:</span>
                        {(() => {
                            const waitingCasts = guestCasts.filter((c: any) => c.status === 'waiting');

                            if (waitingCasts.length > 0) {
                                return (
                                    <div className="flex flex-wrap gap-1">
                                        {waitingCasts.map((cast: any) => (
                                            <span key={cast.id} className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 px-1.5 py-0.5 rounded-md">
                                                {cast.profiles?.display_name}
                                            </span>
                                        ))}
                                    </div>
                                );
                            } else {
                                return <span>なし</span>;
                            }
                        })()}
                    </div>
                </span>
                <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700"
                >
                    {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                    ) : (
                        <ChevronDown className="h-4 w-4" />
                    )}
                </button>
            </div>

            {/* Accordion Body */}
            {isExpanded && (
                <div className="p-3 bg-slate-50/50 dark:bg-slate-900/50">
                    {/* Cast List (Tree View) */}
                    {guestCasts.length > 0 && (
                        <div className="pl-6 mb-3">
                            {guestCasts.map((cast: any) => (
                                <div
                                    key={cast.id}
                                    className="flex items-center relative"
                                >
                                    {/* Tree guide lines */}
                                    <div className="absolute left-0 top-0 bottom-0 w-px bg-slate-300 dark:bg-slate-600" style={{ left: '-12px' }} />
                                    <div className="absolute top-8 w-3 h-px bg-slate-300 dark:bg-slate-600" style={{ left: '-12px' }} />

                                    <div className="flex flex-col py-2 flex-1 gap-2 relative">
                                        {/* ... button */}
                                        <div className="absolute right-0 top-2">
                                            <button
                                                type="button"
                                                onClick={() => setOpenMenuId(openMenuId === `cast-${cast.id}` ? null : `cast-${cast.id}`)}
                                                className="inline-flex h-6 w-6 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700"
                                            >
                                                <MoreHorizontal className="h-4 w-4" />
                                            </button>
                                            {openMenuId === `cast-${cast.id}` && (
                                                <>
                                                    <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
                                                    <div className="absolute right-0 top-6 z-50 w-32 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg p-1 text-sm animate-in fade-in zoom-in-95 duration-100">
                                                        <button
                                                            type="button"
                                                            className="w-full text-left px-3 py-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                            onClick={() => {
                                                                onDeleteCast(cast.id, cast.profiles?.display_name || "不明");
                                                                setOpenMenuId(null);
                                                            }}
                                                        >
                                                            削除
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {/* Row 1: Icon, name, status */}
                                        <div className="flex items-center pr-8">
                                            <Avatar className="h-8 w-8 mr-2">
                                                <AvatarImage src={cast.profiles?.avatar_url} />
                                                <AvatarFallback className="text-xs">
                                                    {cast.profiles?.display_name?.[0] || "?"}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm font-medium">
                                                {cast.profiles?.display_name || "不明"}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => onStatusEdit(cast.id, cast.profiles?.display_name || "不明", cast.status || "waiting")}
                                                className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusOption(cast.status).color}`}
                                            >
                                                {getStatusOption(cast.status).label}
                                            </button>
                                        </div>

                                        {/* Row 2: Time inputs */}
                                        <div className="flex items-center gap-1 ml-10">
                                            <Input
                                                type="time"
                                                value={cast.start_time ? new Date(cast.start_time).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }) : ""}
                                                onChange={(e) => {
                                                    const baseDate = cast.start_time ? new Date(cast.start_time).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
                                                    const newStartTime = new Date(`${baseDate}T${e.target.value}`).toISOString();
                                                    updateCastAssignmentTimes(cast.id, newStartTime).then(() => onUpdate());
                                                }}
                                                className="h-7 w-20 text-base px-2"
                                            />
                                            <span className="text-xs text-muted-foreground">-</span>
                                            <Input
                                                type="time"
                                                value={cast.end_time ? new Date(cast.end_time).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }) : ""}
                                                onChange={(e) => {
                                                    if (!e.target.value) {
                                                        updateCastAssignmentTimes(cast.id, undefined, null).then(() => onUpdate());
                                                        return;
                                                    }
                                                    const baseDate = cast.start_time ? new Date(cast.start_time).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
                                                    const newEndTime = new Date(`${baseDate}T${e.target.value}`).toISOString();
                                                    updateCastAssignmentTimes(cast.id, undefined, newEndTime).then(() => onUpdate());
                                                }}
                                                className="h-7 w-20 text-base px-2"
                                                placeholder="--:--"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Actions Footer */}
                    <div className="flex gap-2 mt-2">
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="flex-1 h-9 text-xs"
                            onClick={() => onAddCast(guest.id)}
                        >
                            <UserPlus className="h-3 w-3 mr-1.5" />
                            キャスト追加
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-9 w-9 p-0 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                            onClick={() => {
                                const guestAssignment = castAssignments.find((a: any) => a.guest_id === guest.id && a.cast_id === guest.id);
                                if (guestAssignment) {
                                    onDeleteGuest(guestAssignment.id, guest.display_name || "不明");
                                }
                            }}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
