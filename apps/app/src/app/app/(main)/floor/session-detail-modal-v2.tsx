"use client";

import { useState, useRef, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableSession, Table } from "@/types/floor";
import { UserPlus, ChevronLeft, MoreHorizontal, Receipt, ChevronDown, ChevronUp, Trash2, CheckCircle, RefreshCw, RotateCcw } from "lucide-react";
import { PlacementModal } from "./placement-modal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { closeSession, reopenSession, deleteSession } from "./actions/session";
import { getStoreSettings } from "./actions/store";
import {
    addCastFeeV2,
    removeCastFeeV2,
    updateCastFeeStatusV2,
    updateCastTagToFeeType,
    updateCastFeeTimesV2,
    changeCastFeeTypeV2,
} from "./actions/cast-fee";
import { addGuestToSessionV2, removeGuestFromSessionV2 } from "./actions/guest";
import { QuickOrderModal } from "./quick-order-modal";
import { UserEditModal } from "../users/user-edit-modal";
import { TAG_OPTIONS, getCurrentTag, getTagOption, type TagValue } from "./constants/tag-options";
import { formatTimeForInput, timeInputToISO, formatTimeSafe } from "./utils/format";

interface SessionDetailModalV2Props {
    isOpen: boolean;
    onClose: () => void;
    session: any; // V2構造のセッション
    table: Table | null;
    onUpdate: () => void;
    onOpenSlip?: (sessionId: string) => void;
    slipIsOpen?: boolean;
}

export function SessionDetailModalV2({ isOpen, onClose, session, table, onUpdate, onOpenSlip, slipIsOpen = false }: SessionDetailModalV2Props) {
    const [daySwitchTime, setDaySwitchTime] = useState<string>("05:00:00");

    useEffect(() => {
        getStoreSettings().then(settings => {
            if (settings?.day_switch_time) {
                setDaySwitchTime(settings.day_switch_time);
            }
        });
    }, []);

    const [isPlacementOpen, setIsPlacementOpen] = useState(false);
    const [placementMode, setPlacementMode] = useState<"guest" | "cast">("guest");
    const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
    const [showActions, setShowActions] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string; type: 'guest' | 'cast' } | null>(null);
    const [closeConfirm, setCloseConfirm] = useState(false);
    const [checkoutConfirm, setCheckoutConfirm] = useState(false);
    const [reopenConfirm, setReopenConfirm] = useState(false);
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [isReopening, setIsReopening] = useState(false);

    // User action menu state
    const [userActionMenu, setUserActionMenu] = useState<{
        oderId?: string;
        guestId: string;
        userId: string;
        userName: string;
        isGuest: boolean;
        profile: any;
    } | null>(null);
    const [quickOrderTarget, setQuickOrderTarget] = useState<string | null>(null);
    const [profileViewUser, setProfileViewUser] = useState<any>(null);
    const actionsMenuRef = useRef<HTMLDivElement>(null);

    // ポップオーバー外クリックで閉じる
    useEffect(() => {
        if (!showActions) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
                setShowActions(false);
            }
        };

        // 少し遅延させて登録（ボタンクリック自体を拾わないように）
        const timeoutId = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 0);

        return () => {
            clearTimeout(timeoutId);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showActions]);

    // タグ選択モーダル用state
    const [tagSelection, setTagSelection] = useState<{
        orderId: string;
        castName: string;
        currentTag: TagValue;
    } | null>(null);

    const isCompleted = session?.status === "completed";
    const [expandedGuestIds, setExpandedGuestIds] = useState<Set<string>>(new Set());
    const [hasInitializedExpanded, setHasInitializedExpanded] = useState(false);

    // V2構造からデータを取得
    const sessionGuests = session?.session_guests || [];
    const orders = session?.orders || [];

    // キャスト関連のオーダーを抽出（cast_idがあり、かつキャスト料金の種類または待機状態）
    const castOrders = orders.filter((o: any) =>
        o.cast_id != null &&
        (['指名料', '場内料金', '同伴料'].includes(o.item_name) || o.cast_status === 'waiting')
    );

    // ゲストごとのキャスト料金をグループ化
    const getCastOrdersForGuest = (guestId: string) => {
        return castOrders.filter((o: any) => o.guest_id === guestId);
    };

    // Initialize expanded state
    useEffect(() => {
        if (isOpen && session && !hasInitializedExpanded) {
            const guestsWithoutCasts = sessionGuests.filter((sg: any) => {
                const hasCast = castOrders.some((o: any) =>
                    o.guest_id === sg.guest_id && o.cast_status !== 'ended'
                );
                return !hasCast;
            }).map((sg: any) => sg.guest_id);

            setExpandedGuestIds(new Set(guestsWithoutCasts));
            setHasInitializedExpanded(true);
        }
        if (!isOpen) {
            setHasInitializedExpanded(false);
        }
    }, [isOpen, session, hasInitializedExpanded, sessionGuests, castOrders]);

    // Handle adding a guest
    const handleAddGuest = () => {
        setPlacementMode("guest");
        setIsPlacementOpen(true);
    };

    // Handle adding a cast to a guest
    const handleAddCast = (guestId: string) => {
        setSelectedGuestId(guestId);
        setPlacementMode("cast");
        setIsPlacementOpen(true);
    };

    // Cast selected from placement modal
    const handleCastSelected = async (profile: any) => {
        if (placementMode === "guest") {
            // ゲストを追加
            await addGuestToSessionV2(session.id, profile.id);
            onUpdate();
        } else if (placementMode === "cast" && selectedGuestId) {
            // キャストを追加 - 「待機」ステータスで追加（場内料金として作成、cast_status=waiting）
            await addCastFeeV2(
                session.id,
                profile.id,
                selectedGuestId,
                'companion', // 内部的には場内料金として作成
                session.pricing_system_id,
                'waiting' // 初期状態は「待機」
            );
            onUpdate();
        }
        setIsPlacementOpen(false);
    };

    // タグ変更ハンドラー（6つのタグから1つを選択）
    // 全てのタグ変更で cast_status を更新
    // 料金タイプ（指名/場内/同伴）の場合は item_name も変更
    const handleTagChange = async (orderId: string, newTag: TagValue) => {
        const tagOption = TAG_OPTIONS.find(t => t.value === newTag);
        if (!tagOption) return;

        if (tagOption.isStatus) {
            // 待機/接客中/終了 の場合は cast_status のみ更新
            await updateCastFeeStatusV2(orderId, newTag);
        } else {
            // 指名/場内/同伴 の場合
            const feeType = newTag as 'nomination' | 'companion' | 'douhan';

            // 現在のオーダーを取得
            const currentOrder = orders.find((o: any) => o.id === orderId);
            const currentItemName = currentOrder?.item_name || '';
            const isFeeType = ['指名料', '場内料金', '同伴料'].includes(currentItemName);

            if (isFeeType) {
                // 料金タイプから別の料金タイプへの変更
                // 元のオーダーの終了時間を現在時刻に設定し、新しいオーダーを追加
                await changeCastFeeTypeV2(orderId, feeType, session.pricing_system_id);
            } else {
                // 待機状態から料金タイプへの変更
                // 既存のオーダーを更新
                await updateCastTagToFeeType(orderId, feeType, session.pricing_system_id);
            }
        }
        setTagSelection(null);
        onUpdate();
    };

    // Delete cast
    const handleDeleteCast = async (orderId: string) => {
        await removeCastFeeV2(orderId);
        setDeleteConfirm(null);
        onUpdate();
    };

    // Delete guest
    const handleDeleteGuest = async (guestId: string) => {
        await removeGuestFromSessionV2(session.id, guestId);
        setDeleteConfirm(null);
        onUpdate();
    };

    // Checkout session
    const handleCheckout = async () => {
        setIsCheckingOut(true);
        try {
            await closeSession(session.id);
            setCheckoutConfirm(false);
            onClose();
            onUpdate();
        } catch (error) {
            console.error(error);
        } finally {
            setIsCheckingOut(false);
        }
    };

    // Reopen session
    const handleReopen = async () => {
        setIsReopening(true);
        try {
            await reopenSession(session.id);
            setReopenConfirm(false);
            onUpdate();
        } catch (error) {
            console.error(error);
        } finally {
            setIsReopening(false);
        }
    };

    // Delete session
    const handleDeleteSession = async () => {
        try {
            await deleteSession(session.id);
            setCloseConfirm(false);
            onClose();
            onUpdate();
        } catch (error) {
            console.error(error);
        }
    };

    if (!session) return null;

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-3 sm:p-4 md:p-5 rounded-2xl">
                    <DialogHeader className="mb-3 sm:mb-4 flex flex-row items-center justify-between gap-2 relative">
                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-0"
                            aria-label="戻る"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <DialogTitle className="flex-1 text-center text-lg font-bold text-gray-900 dark:text-white">
                            {table?.name || "テーブルなし"}
                        </DialogTitle>
                        <DialogDescription className="sr-only">セッション詳細</DialogDescription>
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setShowActions(!showActions)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700"
                            >
                                <MoreHorizontal className="h-5 w-5" />
                            </button>
                            {showActions && (
                                <div
                                    ref={actionsMenuRef}
                                    className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50"
                                >
                                    <button
                                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                        onClick={() => {
                                            setShowActions(false);
                                            setCloseConfirm(true);
                                        }}
                                    >
                                        セッションを削除
                                    </button>
                                </div>
                            )}
                        </div>
                    </DialogHeader>

                    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                        {/* Slip button */}
                        <div className="flex items-center justify-between gap-3 flex-shrink-0 mb-4">
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                <span>入店: {formatTimeSafe(session.start_time)}</span>
                                <span>-</span>
                                <span>退店: {formatTimeSafe(session.end_time)}</span>
                            </div>
                            <Button
                                type="button"
                                className="h-10 rounded-full bg-blue-600 text-white hover:bg-blue-700 shadow-md shrink-0 px-4"
                                onClick={() => onOpenSlip?.(session.id)}
                                aria-label="伝票を開く"
                            >
                                <Receipt className="h-5 w-5 mr-2" />
                                伝票
                            </Button>
                        </div>

                        {/* Scrollable content area */}
                        <div className="flex-1 min-h-0 overflow-y-auto space-y-4">
                        {/* Guest List */}
                        <div className="space-y-3">
                            {sessionGuests.map((sg: any) => {
                                const guest = sg.profiles;
                                if (!guest) return null;

                                const guestCastOrders = getCastOrdersForGuest(guest.id);
                                const isExpanded = expandedGuestIds.has(guest.id);
                                const activeCasts = guestCastOrders.filter((o: any) => o.cast_status !== 'ended');

                                return (
                                    <div key={sg.id} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800">
                                        {/* Guest Header */}
                                        <div
                                            className="flex items-center p-3 border-b cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                            onClick={() => {
                                                const newSet = new Set(expandedGuestIds);
                                                if (newSet.has(guest.id)) {
                                                    newSet.delete(guest.id);
                                                } else {
                                                    newSet.add(guest.id);
                                                }
                                                setExpandedGuestIds(newSet);
                                            }}
                                        >
                                            <Avatar
                                                className="h-10 w-10 mr-3 cursor-pointer ring-2 ring-transparent hover:ring-blue-500 transition-all"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setUserActionMenu({
                                                        guestId: guest.id,
                                                        userId: guest.id,
                                                        userName: guest.display_name || "不明",
                                                        isGuest: true,
                                                        profile: guest
                                                    });
                                                }}
                                            >
                                                <AvatarImage src={guest.avatar_url} />
                                                <AvatarFallback>
                                                    {guest.display_name?.[0] || "?"}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="font-medium text-sm flex-1 flex flex-col gap-1.5">
                                                <div className="flex items-center gap-2">
                                                    {guest.display_name || "不明"}
                                                    {activeCasts.length === 0 && (
                                                        <span className="text-xs font-bold text-red-500 border border-red-500 px-1.5 py-0.5 rounded-md">
                                                            オンリー
                                                        </span>
                                                    )}
                                                </div>
                                                {/* Cast status tags when collapsed */}
                                                {!isExpanded && guestCastOrders.length > 0 && (
                                                    <div className="flex flex-wrap gap-1">
                                                        {guestCastOrders.map((order: any) => {
                                                            const currentTag = getCurrentTag(order);
                                                            const tagOpt = getTagOption(currentTag);
                                                            return (
                                                                <span
                                                                    key={order.id}
                                                                    className={`text-xs px-1.5 py-0.5 rounded ${tagOpt.color}`}
                                                                >
                                                                    {order.profiles?.display_name || "?"}
                                                                    <span className="ml-1 opacity-75">({tagOpt.label})</span>
                                                                </span>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                            </div>
                                        </div>

                                        {/* Cast List (Expanded) */}
                                        {isExpanded && (
                                            <div className="p-3 space-y-2 bg-slate-50/50 dark:bg-slate-900/30">
                                                {guestCastOrders.map((order: any) => {
                                                    const cast = order.profiles;
                                                    const currentTag = getCurrentTag(order);
                                                    const tagOption = getTagOption(currentTag);

                                                    return (
                                                        <div key={order.id} className="flex items-start gap-2 p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                                                            <Avatar
                                                                className="h-8 w-8 cursor-pointer ring-2 ring-transparent hover:ring-pink-500 transition-all"
                                                                onClick={() => {
                                                                    setUserActionMenu({
                                                                        oderId: order.id,
                                                                        guestId: guest.id,
                                                                        userId: cast?.id,
                                                                        userName: cast?.display_name || "不明",
                                                                        isGuest: false,
                                                                        profile: cast
                                                                    });
                                                                }}
                                                            >
                                                                <AvatarImage src={cast?.avatar_url} />
                                                                <AvatarFallback className="text-xs">
                                                                    {cast?.display_name?.[0] || "?"}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className="text-sm font-medium truncate">
                                                                        {cast?.display_name || "不明"}
                                                                    </span>
                                                                    {/* Single Tag - tap to open selection modal */}
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setTagSelection({
                                                                            orderId: order.id,
                                                                            castName: cast?.display_name || "不明",
                                                                            currentTag: currentTag
                                                                        })}
                                                                        className={`px-2.5 py-1 rounded-full text-xs font-medium shadow-sm transition-all hover:opacity-80 ${tagOption.color}`}
                                                                    >
                                                                        {tagOption.label}
                                                                    </button>
                                                                </div>
                                                                {/* Time inputs - font-size 16px to prevent iOS zoom */}
                                                                <div className="flex items-center gap-2">
                                                                    <label className="relative flex items-center">
                                                                        <input
                                                                            type="time"
                                                                            defaultValue={formatTimeForInput(order.start_time)}
                                                                            onBlur={(e) => {
                                                                                const newStartTime = timeInputToISO(e.target.value, order.start_time);
                                                                                if (newStartTime && newStartTime !== order.start_time) {
                                                                                    updateCastFeeTimesV2(order.id, newStartTime, undefined);
                                                                                    onUpdate();
                                                                                }
                                                                            }}
                                                                            className="w-full min-w-[5.5rem] px-2 py-1 text-base border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-700 dark:text-gray-300"
                                                                        />
                                                                    </label>
                                                                    <span className="text-sm text-gray-400">-</span>
                                                                    <label className="relative flex items-center">
                                                                        <input
                                                                            type="time"
                                                                            defaultValue={formatTimeForInput(order.end_time)}
                                                                            onBlur={(e) => {
                                                                                const newEndTime = timeInputToISO(e.target.value, order.end_time || order.start_time);
                                                                                if (newEndTime && newEndTime !== order.end_time) {
                                                                                    updateCastFeeTimesV2(order.id, undefined, newEndTime);
                                                                                    onUpdate();
                                                                                }
                                                                            }}
                                                                            className="w-full min-w-[5.5rem] px-2 py-1 text-base border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-700 dark:text-gray-300"
                                                                        />
                                                                    </label>
                                                                </div>
                                                            </div>
                                                            {/* Delete button */}
                                                            <button
                                                                type="button"
                                                                onClick={() => setDeleteConfirm({ id: order.id, name: cast?.display_name || "キャスト", type: 'cast' })}
                                                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    );
                                                })}

                                                {/* Add Cast Button */}
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setDeleteConfirm({ id: guest.id, name: guest.display_name || "ゲスト", type: 'guest' })}
                                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="flex-1"
                                                        onClick={() => handleAddCast(guest.id)}
                                                    >
                                                        <UserPlus className="h-4 w-4 mr-1" />
                                                        キャスト追加
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Add Guest Button */}
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={handleAddGuest}
                            >
                                <UserPlus className="h-4 w-4 mr-2" />
                                ゲスト追加
                            </Button>
                        </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <DialogFooter className="mt-4 flex flex-col gap-2 shrink-0">
                        <div className="flex gap-2 w-full">
                            {isCompleted ? (
                                <Button
                                    className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
                                    onClick={() => setReopenConfirm(true)}
                                >
                                    <RotateCcw className="h-4 w-4 mr-2" />
                                    進行中に戻す
                                </Button>
                            ) : (
                                <Button
                                    className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
                                    onClick={() => setCheckoutConfirm(true)}
                                >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    会計終了
                                </Button>
                            )}
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Placement Modal */}
            <PlacementModal
                isOpen={isPlacementOpen}
                onClose={() => setIsPlacementOpen(false)}
                onProfileSelect={handleCastSelected}
                mode={placementMode}
                sessionId={session?.id}
            />

            {/* Delete Confirmation Modal */}
            <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
                <DialogContent className="max-w-sm rounded-2xl p-6">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">削除確認</DialogTitle>
                        <DialogDescription className="text-sm text-gray-600 dark:text-gray-400">
                            「{deleteConfirm?.name}」を削除しますか？
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4 flex flex-col-reverse gap-2">
                        <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="w-full">
                            キャンセル
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                if (deleteConfirm?.type === 'cast') {
                                    handleDeleteCast(deleteConfirm.id);
                                } else if (deleteConfirm?.type === 'guest') {
                                    handleDeleteGuest(deleteConfirm.id);
                                }
                            }}
                            className="w-full"
                        >
                            削除
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Session Delete Confirmation Modal */}
            <Dialog open={closeConfirm} onOpenChange={setCloseConfirm}>
                <DialogContent className="max-w-sm rounded-2xl p-6">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">セッション削除</DialogTitle>
                        <DialogDescription className="text-sm text-gray-600 dark:text-gray-400">
                            このセッションを削除しますか？この操作は取り消せません。
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4 flex flex-col-reverse gap-2">
                        <Button variant="outline" onClick={() => setCloseConfirm(false)} className="w-full">
                            キャンセル
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteSession} className="w-full">
                            削除
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Checkout Confirmation Modal */}
            <Dialog open={checkoutConfirm} onOpenChange={setCheckoutConfirm}>
                <DialogContent className="max-w-sm rounded-2xl p-6">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">会計終了</DialogTitle>
                        <DialogDescription className="text-sm text-gray-600 dark:text-gray-400">
                            会計を終了しますか？
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4 flex flex-col-reverse gap-2">
                        <Button variant="outline" onClick={() => setCheckoutConfirm(false)} disabled={isCheckingOut} className="w-full">
                            キャンセル
                        </Button>
                        <Button
                            className="w-full bg-blue-600 text-white hover:bg-blue-700"
                            disabled={isCheckingOut}
                            onClick={handleCheckout}
                        >
                            {isCheckingOut ? "処理中..." : "会計終了"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reopen Confirmation Modal */}
            <Dialog open={reopenConfirm} onOpenChange={setReopenConfirm}>
                <DialogContent className="max-w-sm rounded-2xl p-6">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">進行中に戻す</DialogTitle>
                        <DialogDescription className="text-sm text-gray-600 dark:text-gray-400">
                            このセッションを進行中に戻しますか？
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4 flex flex-col-reverse gap-2">
                        <Button variant="outline" onClick={() => setReopenConfirm(false)} disabled={isReopening} className="w-full">
                            キャンセル
                        </Button>
                        <Button
                            className="w-full bg-blue-600 text-white hover:bg-blue-700"
                            disabled={isReopening}
                            onClick={handleReopen}
                        >
                            {isReopening ? "処理中..." : "進行中に戻す"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* User Action Menu Modal */}
            <Dialog open={!!userActionMenu} onOpenChange={() => setUserActionMenu(null)}>
                <DialogContent className="max-w-xs rounded-2xl p-0 overflow-hidden">
                    <DialogHeader className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                        <DialogTitle className="text-base font-semibold text-gray-900 dark:text-white text-center">
                            {userActionMenu?.userName}
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            アクションを選択してください
                        </DialogDescription>
                    </DialogHeader>
                    <div className="p-3 flex flex-col gap-2">
                        <Button
                            variant="outline"
                            className="w-full h-12 justify-start gap-3 text-base"
                            onClick={() => {
                                if (userActionMenu) {
                                    const target = userActionMenu.isGuest
                                        ? `guest:${userActionMenu.userId}`
                                        : `cast:${userActionMenu.userId}`;
                                    setQuickOrderTarget(target);
                                    setUserActionMenu(null);
                                }
                            }}
                        >
                            <Receipt className="h-5 w-5" />
                            注文
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full h-12 justify-start gap-3 text-base"
                            onClick={() => {
                                if (userActionMenu) {
                                    setProfileViewUser(userActionMenu.profile);
                                    setUserActionMenu(null);
                                }
                            }}
                        >
                            <UserPlus className="h-5 w-5" />
                            プロフィール
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Quick Order Modal */}
            {quickOrderTarget && table && (
                <QuickOrderModal
                    session={session}
                    table={table}
                    open={!!quickOrderTarget}
                    onOpenChange={(open) => {
                        if (!open) setQuickOrderTarget(null);
                    }}
                    onOrderComplete={() => {
                        onUpdate();
                        setQuickOrderTarget(null);
                    }}
                    initialTarget={quickOrderTarget}
                />
            )}

            {/* User Profile Modal */}
            {profileViewUser && (
                <UserEditModal
                    profile={profileViewUser}
                    open={!!profileViewUser}
                    onOpenChange={(open) => {
                        if (!open) setProfileViewUser(null);
                    }}
                    isNested={true}
                />
            )}

            {/* Tag Selection Modal */}
            <Dialog open={!!tagSelection} onOpenChange={() => setTagSelection(null)}>
                <DialogContent className="max-w-xs rounded-2xl p-0 overflow-hidden">
                    <DialogHeader className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 mr-2"
                                onClick={() => setTagSelection(null)}
                            >
                                <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                            </Button>
                            <DialogTitle className="text-base font-semibold text-gray-900 dark:text-white flex-1 text-center pr-10">
                                {tagSelection?.castName}のステータス
                            </DialogTitle>
                        </div>
                        <DialogDescription className="sr-only">
                            ステータスを選択してください
                        </DialogDescription>
                    </DialogHeader>
                    {/* 上段: ステータス（待機/接客中/終了） */}
                    <div className="px-4 pt-3 pb-2">
                        <div className="grid grid-cols-3 gap-2">
                            {TAG_OPTIONS.filter(opt => opt.isStatus).map(opt => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => {
                                        if (tagSelection && tagSelection.currentTag !== opt.value) {
                                            handleTagChange(tagSelection.orderId, opt.value);
                                        } else {
                                            setTagSelection(null);
                                        }
                                    }}
                                    className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                        tagSelection?.currentTag === opt.value
                                            ? opt.color + ' ring-2 ring-offset-2 ring-current'
                                            : opt.color + ' opacity-60 hover:opacity-100'
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 区切り線 */}
                    <div className="border-t border-gray-200 dark:border-gray-700 mx-4" />

                    {/* 下段: 料金タイプ（指名/場内/同伴） */}
                    <div className="px-4 pt-2 pb-3">
                        <div className="grid grid-cols-3 gap-2">
                            {TAG_OPTIONS.filter(opt => !opt.isStatus).map(opt => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => {
                                        if (tagSelection && tagSelection.currentTag !== opt.value) {
                                            handleTagChange(tagSelection.orderId, opt.value);
                                        } else {
                                            setTagSelection(null);
                                        }
                                    }}
                                    className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                        tagSelection?.currentTag === opt.value
                                            ? opt.color + ' ring-2 ring-offset-2 ring-current'
                                            : opt.color + ' opacity-60 hover:opacity-100'
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="px-4 pb-4">
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => setTagSelection(null)}
                        >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            戻る
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
