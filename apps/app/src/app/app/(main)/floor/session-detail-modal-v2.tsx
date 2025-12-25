"use client";

import { useState, useRef, useEffect } from "react";
import { useGlobalLoading } from "@/components/global-loading";
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
import { UserPlus, ChevronLeft, MoreHorizontal, Receipt, ChevronDown, Trash2, CheckCircle, RefreshCw, RotateCcw, Search, MapPin } from "lucide-react";
import { VercelTabs } from "@/components/ui/vercel-tabs";
import { TableGrid } from "@/components/floor/table-grid";
import { CommentSection } from "@/components/comment-section";
import { PlacementModal } from "./placement-modal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { closeSession, reopenSession, deleteSession, updateSession } from "./actions/session";
import { useTables } from "./hooks";
import { getStoreSettings } from "./actions/store";
import {
    addCastFeeV2,
    removeCastFeeV2,
    updateCastFeeStatusV2,
    updateCastTagToFeeType,
    updateCastFeeTimesV2,
    changeCastFeeTypeV2,
    changeCastTagWithNewOrder,
} from "./actions/cast-fee";
import { addGuestToSessionV2, removeGuestFromSessionV2, changeSessionGuest, getGuests, updateGuestGridPosition, updateCastGridPosition } from "./actions/guest";
import { GridPlacement } from "@/components/floor/table-grid";
import { QuickOrderModal } from "./quick-order-modal";
import { UserEditModal } from "../users/user-edit-modal";
import { TAG_OPTIONS, getCurrentTag, getTagOption, type TagValue } from "./constants/tag-options";
import { formatTimeForInput, timeInputToISO, formatTimeSafe } from "./utils/format";

interface PagePermissions {
    bottles: boolean;
    resumes: boolean;
    salarySystems: boolean;
    attendance: boolean;
    personalInfo: boolean;
}

interface SessionDetailModalV2Props {
    isOpen: boolean;
    onClose: () => void;
    session: any; // V2構造のセッション
    table: Table | null;
    onUpdate: (sessionId?: string) => Promise<void> | void;
    onDeleteSession?: (sessionId: string) => void;
    onOpenSlip?: (sessionId: string) => void;
    slipIsOpen?: boolean;
    pagePermissions?: PagePermissions;
}

export function SessionDetailModalV2({ isOpen, onClose, session, table, onUpdate, onDeleteSession, onOpenSlip, slipIsOpen = false, pagePermissions }: SessionDetailModalV2Props) {
    const [daySwitchTime, setDaySwitchTime] = useState<string>("05:00:00");
    const { setIsLoading: setIsRefreshing } = useGlobalLoading();

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
    const [selectedSessionGuestId, setSelectedSessionGuestId] = useState<string | null>(null);
    const [showActions, setShowActions] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string; type: 'guest' | 'cast' } | null>(null);
    const [closeConfirm, setCloseConfirm] = useState(false);
    const [checkoutConfirm, setCheckoutConfirm] = useState(false);
    const [reopenConfirm, setReopenConfirm] = useState(false);
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [isReopening, setIsReopening] = useState(false);
    const [changeTableModalOpen, setChangeTableModalOpen] = useState(false);

    // User action menu state
    const [userActionMenu, setUserActionMenu] = useState<{
        orderId?: string;
        guestId: string;
        userId: string;
        userName: string;
        isGuest: boolean;
        profile: any;
        sessionGuestId?: string; // session_guests.id（ゲスト変更用）
        isNameOnlyGuest?: boolean; // 名前だけのゲストかどうか
    } | null>(null);
    const [changeGuestModalOpen, setChangeGuestModalOpen] = useState(false);
    const [changeGuestTargetId, setChangeGuestTargetId] = useState<string | null>(null);
    const [availableGuests, setAvailableGuests] = useState<any[]>([]);
    const [guestSearchQuery, setGuestSearchQuery] = useState("");
    const [quickOrderTarget, setQuickOrderTarget] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<"list" | "grid">("list");

    // Grid cell selection state
    const [cellSelectModal, setCellSelectModal] = useState<{ rowIndex: number; colIndex: number } | null>(null);
    const [placementActionModal, setPlacementActionModal] = useState<GridPlacement | null>(null);
    const [swapTargetPlacement, setSwapTargetPlacement] = useState<GridPlacement | null>(null);

    // ゲスト変更モーダルが開いたときにゲスト一覧を取得
    useEffect(() => {
        if (changeGuestModalOpen) {
            getGuests().then(setAvailableGuests);
            setGuestSearchQuery("");
        }
    }, [changeGuestModalOpen]);
    const [profileViewUser, setProfileViewUser] = useState<any>(null);
    const actionsMenuRef = useRef<HTMLDivElement>(null);

    // テーブル一覧を取得
    const { data: tables = [] } = useTables();

    // ordersから合計金額を計算（リアルタイム表示用）
    const calculateTotalAmount = () => {
        if (!session?.orders) return 0;
        return session.orders
            .filter((order: any) => order.status !== 'cancelled')
            .reduce((sum: number, order: any) => sum + (order.amount || 0), 0);
    };

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


    // キャスト関連のオーダーを抽出（cast_idがあり、かつキャスト関連のitem_nameまたはcast_statusがある）
    const CAST_ITEM_NAMES = ['指名料', '場内料金', '同伴料', '待機', '接客中', 'ヘルプ', '終了'];
    const castOrders = orders.filter((o: any) =>
        o.cast_id != null &&
        (CAST_ITEM_NAMES.includes(o.item_name) || o.cast_status != null)
    );

    // ゲストごとのキャスト料金をグループ化
    // guestId: profiles.id, sessionGuestId: session_guests.id
    const getCastOrdersForGuest = (guestId: string | null, sessionGuestId: string) => {
        return castOrders.filter((o: any) =>
            (guestId && o.guest_id === guestId) || o.session_guest_id === sessionGuestId
        );
    };

    // Build grid placements from session data
    const gridPlacements: GridPlacement[] = [
        // Guests with grid positions
        ...sessionGuests
            .filter((sg: any) => sg.grid_x != null && sg.grid_y != null)
            .map((sg: any) => ({
                id: sg.id,
                type: "guest" as const,
                grid_x: sg.grid_x,
                grid_y: sg.grid_y,
                display_name: sg.profiles?.display_name || sg.guest_name || "?",
            })),
        // Unique casts with grid positions (first order per cast)
        ...(() => {
            const seenCastIds = new Set<string>();
            return castOrders
                .filter((o: any) => {
                    if (o.grid_x == null || o.grid_y == null) return false;
                    if (seenCastIds.has(o.cast_id)) return false;
                    seenCastIds.add(o.cast_id);
                    return true;
                })
                .map((o: any) => ({
                    id: o.cast_id,
                    type: "cast" as const,
                    grid_x: o.grid_x,
                    grid_y: o.grid_y,
                    display_name: o.profiles?.display_name || "?",
                }));
        })(),
    ];

    // Handle grid cell click
    const handleGridCellClick = (rowIndex: number, colIndex: number, placement: GridPlacement | null) => {
        if (placement) {
            // Open action modal for placed item
            setPlacementActionModal(placement);
        } else {
            // Open selection modal for empty cell
            setCellSelectModal({ rowIndex, colIndex });
        }
    };

    // Handle placement removal
    const handleRemovePlacement = async () => {
        if (!placementActionModal) return;
        if (placementActionModal.type === "guest") {
            await updateGuestGridPosition(placementActionModal.id, null, null);
        } else {
            await updateCastGridPosition(session.id, placementActionModal.id, null, null);
        }
        setPlacementActionModal(null);
        onUpdate();
    };

    // Handle swap initiation
    const handleStartSwap = () => {
        if (!placementActionModal) return;
        setSwapTargetPlacement(placementActionModal);
        setPlacementActionModal(null);
    };

    // Handle swap cell click (when in swap mode)
    const handleSwapCellClick = async (rowIndex: number, colIndex: number, targetPlacement: GridPlacement | null) => {
        if (!swapTargetPlacement) return;

        const source = swapTargetPlacement;

        // Swap positions
        if (targetPlacement) {
            // Swap two placements
            if (source.type === "guest") {
                await updateGuestGridPosition(source.id, targetPlacement.grid_x, targetPlacement.grid_y);
            } else {
                await updateCastGridPosition(session.id, source.id, targetPlacement.grid_x, targetPlacement.grid_y);
            }
            if (targetPlacement.type === "guest") {
                await updateGuestGridPosition(targetPlacement.id, source.grid_x, source.grid_y);
            } else {
                await updateCastGridPosition(session.id, targetPlacement.id, source.grid_x, source.grid_y);
            }
        } else {
            // Move to empty cell
            if (source.type === "guest") {
                await updateGuestGridPosition(source.id, colIndex, rowIndex);
            } else {
                await updateCastGridPosition(session.id, source.id, colIndex, rowIndex);
            }
        }

        setSwapTargetPlacement(null);
        onUpdate();
    };

    // Handle placing guest/cast on grid
    const handlePlaceOnGrid = async (type: "guest" | "cast", id: string) => {
        if (!cellSelectModal) return;
        const { rowIndex, colIndex } = cellSelectModal;

        if (type === "guest") {
            await updateGuestGridPosition(id, colIndex, rowIndex);
        } else {
            await updateCastGridPosition(session.id, id, colIndex, rowIndex);
        }

        setCellSelectModal(null);
        onUpdate();
    };

    // Get unplaced guests and casts for selection modal
    const unplacedGuests = sessionGuests.filter((sg: any) =>
        sg.grid_x == null || sg.grid_y == null
    );
    const placedCastIds = new Set(gridPlacements.filter(p => p.type === "cast").map(p => p.id));
    const uniqueCasts = (() => {
        const seen = new Set<string>();
        return castOrders.filter((o: any) => {
            if (seen.has(o.cast_id)) return false;
            seen.add(o.cast_id);
            return true;
        });
    })();
    const unplacedCasts = uniqueCasts.filter((o: any) => !placedCastIds.has(o.cast_id));

    // Initialize expanded state - キャストが紐づいていないゲストはデフォルトで開く
    useEffect(() => {
        if (isOpen && session && !hasInitializedExpanded) {
            const guestsWithoutCasts = sessionGuests.filter((sg: any) => {
                // このゲストにキャストが一人も紐づいていないかチェック
                const guestCastOrders = castOrders.filter((o: any) =>
                    (sg.guest_id && o.guest_id === sg.guest_id) || o.session_guest_id === sg.id
                );
                return guestCastOrders.length === 0;
            }).map((sg: any) => sg.profiles?.id || sg.id);

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
    // guestId: profiles.id (null for name-only guests)
    // sessionGuestId: session_guests.id
    const handleAddCast = (guestId: string | null, sessionGuestId: string) => {
        setSelectedGuestId(guestId);
        setSelectedSessionGuestId(sessionGuestId);
        setPlacementMode("cast");
        setIsPlacementOpen(true);
    };

    // Cast selected from placement modal
    const handleCastSelected = async (profile: any) => {
        setIsPlacementOpen(false);

        // バックグラウンドで処理（awaitなし）
        (async () => {
            try {
                if (placementMode === "guest") {
                    // ゲストを追加
                    await addGuestToSessionV2(session.id, profile.id);
                } else if (placementMode === "cast" && selectedSessionGuestId) {
                    // キャストを追加 - 「待機」ステータスで追加（場内料金として作成、cast_status=waiting）
                    await addCastFeeV2(
                        session.id,
                        profile.id,
                        selectedGuestId, // profiles.id or null for name-only guests
                        'companion', // 内部的には場内料金として作成
                        session.pricing_system_id,
                        'waiting', // 初期状態は「待機」
                        selectedSessionGuestId // session_guests.id
                    );
                }
                onUpdate(session.id);
            } catch (error) {
                console.error("Failed to add:", error);
                onUpdate(session.id); // エラー時も再読み込み
            }
        })();
    };

    // タグ変更ハンドラー（6つのタグから1つを選択）
    // 指名/場内/同伴 が関わる変更は既存終了 + 新規作成（待機→指名は除く）
    const handleTagChange = async (orderId: string, newTag: TagValue) => {
        const tagOption = TAG_OPTIONS.find(t => t.value === newTag);
        if (!tagOption) return;

        setTagSelection(null);
        setIsRefreshing(true);
        try {
            const currentOrder = orders.find((o: any) => o.id === orderId);
            const currentStatus = currentOrder?.cast_status || '';

            const feeTypes = ['nomination', 'companion', 'douhan'];
            const isCurrentFeeType = feeTypes.includes(currentStatus);
            const isNewFeeType = feeTypes.includes(newTag);

            if (isNewFeeType) {
                // 新タグが指名/場内/同伴の場合
                const feeType = newTag as 'nomination' | 'companion' | 'douhan';

                if (currentStatus === 'waiting') {
                    // 待機から → タグ切り替えのみ
                    await updateCastTagToFeeType(orderId, feeType, session.pricing_system_id);
                } else {
                    // 接客中/終了/他の料金タイプから → 既存終了 + 新規作成
                    await changeCastTagWithNewOrder(orderId, newTag, session.pricing_system_id);
                }
            } else if (isCurrentFeeType) {
                // 現タグが指名/場内/同伴で、新タグが待機/接客中/終了 → 既存終了 + 新規作成
                await changeCastTagWithNewOrder(orderId, newTag, session.pricing_system_id);
            } else {
                // 両方とも待機/接客中/終了 → タグ切り替えのみ
                await updateCastFeeStatusV2(orderId, newTag);
            }
            await onUpdate(session.id);
        } finally {
            setIsRefreshing(false);
        }
    };

    // Delete cast
    const handleDeleteCast = async (orderId: string) => {
        setDeleteConfirm(null);
        setIsRefreshing(true);
        try {
            await removeCastFeeV2(orderId);
            await onUpdate(session.id);
        } finally {
            setIsRefreshing(false);
        }
    };

    // Delete guest
    const handleDeleteGuest = async (guestId: string) => {
        setDeleteConfirm(null);
        setIsRefreshing(true);
        try {
            await removeGuestFromSessionV2(session.id, guestId);
            await onUpdate(session.id);
        } finally {
            setIsRefreshing(false);
        }
    };

    // Checkout session
    const handleCheckout = async () => {
        setIsCheckingOut(true);
        try {
            await closeSession(session.id);
            setCheckoutConfirm(false);
            onClose();
            onUpdate(); // モーダルは既に閉じているのでちらつきなし
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

    // Delete session（楽観的UI）
    const handleDeleteSession = async () => {
        const sessionId = session.id;
        setCloseConfirm(false);

        // 楽観的UI: 即座にUIから削除
        onDeleteSession?.(sessionId);
        onClose();

        // バックグラウンドでサーバー処理
        try {
            await deleteSession(sessionId);
        } catch (error) {
            console.error("セッション削除エラー:", error);
            // エラー時はデータを再読み込み
            onUpdate(undefined);
        }
    };

    if (!session) return null;

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
                <DialogContent className="sm:max-w-3xl p-0 overflow-hidden flex flex-col max-h-[90vh] rounded-2xl bg-white dark:bg-gray-900">
                    <DialogHeader className="sticky top-0 z-10 bg-white dark:bg-gray-900 flex !flex-row items-center gap-2 h-14 min-h-[3.5rem] flex-shrink-0 border-b border-gray-200 dark:border-gray-700 px-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 transition-colors"
                            aria-label="戻る"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <DialogTitle className="flex-1 text-center text-lg font-semibold text-gray-900 dark:text-white truncate">
                            {table?.name || "テーブルなし"}
                        </DialogTitle>
                        <DialogDescription className="sr-only">セッション詳細</DialogDescription>
                        <div className="w-8 h-8 relative">
                            <button
                                type="button"
                                onClick={() => setShowActions(!showActions)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700"
                                aria-label="メニュー"
                            >
                                <MoreHorizontal className="h-5 w-5" />
                            </button>
                            {showActions && (
                                <div
                                    ref={actionsMenuRef}
                                    className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 py-1"
                                >
                                    {isCompleted ? (
                                        <button
                                            className="w-full px-4 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-2"
                                            onClick={() => {
                                                setShowActions(false);
                                                setReopenConfirm(true);
                                            }}
                                        >
                                            <RotateCcw className="h-4 w-4" />
                                            進行中に戻す
                                        </button>
                                    ) : (
                                        <button
                                            className="w-full px-4 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-2"
                                            onClick={() => {
                                                setShowActions(false);
                                                setCheckoutConfirm(true);
                                            }}
                                        >
                                            <CheckCircle className="h-4 w-4" />
                                            会計終了
                                        </button>
                                    )}
                                    <button
                                        className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                                        onClick={() => {
                                            setShowActions(false);
                                            setChangeTableModalOpen(true);
                                        }}
                                    >
                                        <MapPin className="h-4 w-4" />
                                        卓を変更
                                    </button>
                                    <button
                                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                                        onClick={() => {
                                            setShowActions(false);
                                            setCloseConfirm(true);
                                        }}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        セッションを削除
                                    </button>
                                </div>
                            )}
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto px-6 pb-4">
                        {/* Slip button */}
                        <div className="flex items-center justify-between gap-3 py-3">
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                <span>入店: {formatTimeSafe(session.start_time)}</span>
                            </div>
                            <Button
                                type="button"
                                className="h-10 rounded-full bg-blue-600 text-white hover:bg-blue-700 shadow-md shrink-0 px-4"
                                onClick={() => onOpenSlip?.(session.id)}
                                aria-label="伝票を開く"
                            >
                                <Receipt className="h-5 w-5 mr-2" />
                                ¥{calculateTotalAmount().toLocaleString()}
                            </Button>
                        </div>

                        {/* View Mode Toggle */}
                        {table?.layout_data?.grid && table.layout_data.grid.length > 0 && (
                            <VercelTabs
                                tabs={[
                                    { key: "list", label: "一覧" },
                                    { key: "grid", label: "グリッド" },
                                ]}
                                value={viewMode}
                                onChange={(v) => setViewMode(v as "list" | "grid")}
                                className="mb-4"
                            />
                        )}

                        {/* Content area */}
                        <div className="space-y-4">

                        {/* Grid View - 8x8 fixed grid, full width */}
                        {viewMode === "grid" && table?.layout_data?.grid && (
                            <div className="w-full py-4">
                                {swapTargetPlacement && (
                                    <div className="mb-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-center">
                                        <span className="text-sm text-yellow-800 dark:text-yellow-200">
                                            {swapTargetPlacement.display_name}の移動先を選択
                                        </span>
                                        <button
                                            className="ml-2 text-xs text-yellow-600 underline"
                                            onClick={() => setSwapTargetPlacement(null)}
                                        >
                                            キャンセル
                                        </button>
                                    </div>
                                )}
                                <TableGrid
                                    grid={table.layout_data.grid}
                                    placements={gridPlacements}
                                    onCellClick={swapTargetPlacement ? handleSwapCellClick : handleGridCellClick}
                                    className="!w-full [&>div]:w-full [&>div>div]:!w-[12.5%] [&>div>div]:!h-auto [&>div>div]:aspect-square"
                                />
                            </div>
                        )}

                        {/* List View - Guest List */}
                        {viewMode === "list" && (
                        <div className="space-y-3">
                            {sessionGuests.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                                    <UserPlus className="h-8 w-8 mb-2" />
                                    <p className="text-sm">ゲストが追加されていません</p>
                                </div>
                            )}
                            {sessionGuests.map((sg: any, guestIndex: number) => {
                                // guest_idがNULLの場合（名前だけのゲスト）は仮想プロファイルを作成
                                const guest = sg.profiles || (sg.guest_name ? {
                                    id: sg.id,
                                    display_name: sg.guest_name,
                                    avatar_url: null,
                                    role: "guest"
                                } : null);
                                if (!guest) return null;

                                const guestCastOrders = getCastOrdersForGuest(sg.guest_id, sg.id);
                                const isExpanded = expandedGuestIds.has(guest.id);
                                const activeCasts = guestCastOrders.filter((o: any) => o.cast_status !== 'ended' && o.cast_status !== 'waiting');

                                return (
                                    <div key={sg.id} className="border rounded-xl overflow-hidden bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                                        {/* Guest Header */}
                                        <div
                                            className="flex items-center p-3 border-b cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
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
                                                        profile: guest,
                                                        sessionGuestId: sg.id,
                                                        isNameOnlyGuest: !sg.guest_id
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
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDeleteConfirm({ id: guest.id, name: guest.display_name || "ゲスト", type: 'guest' });
                                                    }}
                                                    className="p-1.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                    aria-label="削除"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                                <ChevronDown className={`h-5 w-5 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} />
                                            </div>
                                        </div>

                                        {/* Cast List (Expanded) */}
                                        <div
                                            className={`grid transition-all duration-300 ease-in-out ${
                                                isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                                            }`}
                                        >
                                            <div className="overflow-hidden">
                                            <div className="p-2 space-y-2 bg-gray-50/50 dark:bg-gray-900/30">
                                                {guestCastOrders.map((order: any) => {
                                                    const cast = order.profiles;
                                                    const currentTag = getCurrentTag(order);
                                                    const tagOption = getTagOption(currentTag);

                                                    return (
                                                        <div key={order.id} className="flex items-start gap-2 p-2 bg-white dark:bg-gray-800 rounded-lg">
                                                            <Avatar
                                                                className="h-9 w-9 cursor-pointer ring-2 ring-transparent hover:ring-pink-500 transition-all shrink-0"
                                                                onClick={() => {
                                                                    setUserActionMenu({
                                                                        orderId: order.id,
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
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                                        {cast?.display_name || "不明"}
                                                                    </span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setTagSelection({
                                                                            orderId: order.id,
                                                                            castName: cast?.display_name || "不明",
                                                                            currentTag: currentTag
                                                                        })}
                                                                        className={`px-4 py-1.5 rounded-full text-sm font-semibold shrink-0 ${tagOption.color}`}
                                                                    >
                                                                        {tagOption.label}
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setDeleteConfirm({ id: order.id, name: cast?.display_name || "キャスト", type: 'cast' })}
                                                                        className="p-1 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 shrink-0 ml-auto"
                                                                        aria-label="削除"
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </button>
                                                                </div>
                                                                <div className="flex items-center gap-1 mt-1">
                                                                    <input
                                                                        key={`start-${order.id}-${order.start_time}`}
                                                                        type="time"
                                                                        defaultValue={formatTimeForInput(order.start_time)}
                                                                        onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                                                                        onBlur={(e) => {
                                                                            const newStartTime = timeInputToISO(e.target.value, order.start_time);
                                                                            if (newStartTime && newStartTime !== order.start_time) {
                                                                                updateCastFeeTimesV2(order.id, newStartTime, undefined);
                                                                                onUpdate(session.id);
                                                                            }
                                                                        }}
                                                                        className="text-base px-2 py-1 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:border-gray-400 dark:focus:border-gray-500 cursor-pointer"
                                                                    />
                                                                    <span className="text-gray-400">-</span>
                                                                    <input
                                                                        key={`end-${order.id}-${order.end_time}`}
                                                                        type="time"
                                                                        defaultValue={formatTimeForInput(order.end_time)}
                                                                        onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                                                                        onBlur={(e) => {
                                                                            const newEndTime = timeInputToISO(e.target.value, order.end_time || order.start_time);
                                                                            if (newEndTime && newEndTime !== order.end_time) {
                                                                                updateCastFeeTimesV2(order.id, undefined, newEndTime);
                                                                                onUpdate(session.id);
                                                                            }
                                                                        }}
                                                                        className="text-base px-2 py-1 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:border-gray-400 dark:focus:border-gray-500 cursor-pointer"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}

                                                {/* Add Cast Button */}
                                                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="w-full h-8"
                                                        onClick={() => handleAddCast(sg.guest_id, sg.id)}
                                                    >
                                                        <UserPlus className="h-5 w-5 mr-1" />
                                                        キャスト追加
                                                    </Button>
                                                </div>
                                            </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Add Guest Button */}
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={handleAddGuest}
                            >
                                <UserPlus className="h-5 w-5 mr-2" />
                                ゲスト追加
                            </Button>
                        </div>
                        )}

                        {/* Comments Section */}
                        {session?.id && (
                            <CommentSection
                                targetType="session"
                                targetId={session.id}
                                isOpen={isOpen}
                            />
                        )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Placement Modal */}
            <PlacementModal
                isOpen={isPlacementOpen}
                onClose={() => {
                    setIsPlacementOpen(false);
                    // 仮ゲスト追加後にデータを再取得
                    if (session?.id) onUpdate(session.id);
                }}
                onProfileSelect={handleCastSelected}
                mode={placementMode}
                sessionId={session?.id}
                targetGuestId={placementMode === "cast" ? (selectedGuestId ?? undefined) : undefined}
                pagePermissions={pagePermissions}
            />

            {/* Delete Confirmation Modal */}
            <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
                <DialogContent className="sm:max-w-sm rounded-2xl p-6">
                    <DialogHeader className="flex flex-col items-center gap-2 mb-4">
                        <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">削除確認</DialogTitle>
                        <DialogDescription className="text-sm text-gray-600 dark:text-gray-400">
                            「{deleteConfirm?.name}」を削除しますか？
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex flex-col-reverse gap-2">
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
                <DialogContent className="sm:max-w-sm rounded-2xl p-6">
                    <DialogHeader className="flex flex-col items-center gap-2 mb-4">
                        <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">セッション削除</DialogTitle>
                        <DialogDescription className="text-sm text-gray-600 dark:text-gray-400">
                            このセッションを削除しますか？この操作は取り消せません。
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex flex-col-reverse gap-2">
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
                <DialogContent className="sm:max-w-sm rounded-2xl p-6">
                    <DialogHeader className="flex flex-col items-center gap-2 mb-4">
                        <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">会計終了</DialogTitle>
                        <DialogDescription className="text-sm text-gray-600 dark:text-gray-400">
                            会計を終了しますか？
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex flex-col gap-2 sm:flex-col sm:space-x-0">
                        <Button
                            className="w-full bg-blue-600 text-white hover:bg-blue-700"
                            disabled={isCheckingOut}
                            onClick={handleCheckout}
                        >
                            {isCheckingOut ? "処理中..." : "会計終了"}
                        </Button>
                        <Button variant="outline" onClick={() => setCheckoutConfirm(false)} disabled={isCheckingOut} className="w-full">
                            キャンセル
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reopen Confirmation Modal */}
            <Dialog open={reopenConfirm} onOpenChange={setReopenConfirm}>
                <DialogContent className="sm:max-w-sm rounded-2xl p-6">
                    <DialogHeader className="flex flex-col items-center gap-2 mb-4">
                        <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">進行中に戻す</DialogTitle>
                        <DialogDescription className="text-sm text-gray-600 dark:text-gray-400">
                            このセッションを進行中に戻しますか？
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex flex-col-reverse gap-2">
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
                <DialogContent className="sm:max-w-xs rounded-2xl p-0 overflow-hidden">
                    <DialogHeader className="flex !flex-col items-center gap-2 h-14 min-h-[3.5rem] flex-shrink-0 border-b border-gray-200 dark:border-gray-700 justify-center">
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
                        {userActionMenu?.isGuest && (
                            <Button
                                variant="outline"
                                className="w-full h-12 justify-start gap-3 text-base"
                                onClick={() => {
                                    if (userActionMenu?.sessionGuestId) {
                                        setChangeGuestTargetId(userActionMenu.sessionGuestId);
                                        setChangeGuestModalOpen(true);
                                    }
                                    setUserActionMenu(null);
                                }}
                            >
                                <RefreshCw className="h-5 w-5" />
                                ゲストを変更
                            </Button>
                        )}
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
                        onUpdate(session.id);
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
                    hidePersonalInfo={!pagePermissions?.personalInfo}
                    pagePermissions={pagePermissions}
                />
            )}

            {/* Change Guest Modal */}
            <Dialog open={changeGuestModalOpen} onOpenChange={(open) => {
                if (!open) {
                    setChangeGuestModalOpen(false);
                    setChangeGuestTargetId(null);
                }
            }}>
                <DialogContent className="sm:max-w-md rounded-2xl p-0 overflow-hidden max-h-[80vh] flex flex-col">
                    <DialogHeader className="flex !flex-col items-center gap-2 h-14 min-h-[3.5rem] flex-shrink-0 border-b border-gray-200 dark:border-gray-700 justify-center px-4">
                        <DialogTitle className="text-base font-semibold text-gray-900 dark:text-white text-center">
                            ゲストを変更
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            変更先のゲストを選択してください
                        </DialogDescription>
                    </DialogHeader>
                    <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="ゲストを検索..."
                                value={guestSearchQuery}
                                onChange={(e) => setGuestSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3">
                        <div className="space-y-1">
                            {availableGuests
                                .filter((g) => !guestSearchQuery || g.display_name?.toLowerCase().includes(guestSearchQuery.toLowerCase()))
                                .map((guest) => (
                                    <button
                                        key={guest.id}
                                        type="button"
                                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                                        onClick={async () => {
                                            if (changeGuestTargetId) {
                                                try {
                                                    await changeSessionGuest(changeGuestTargetId, guest.id);
                                                    onUpdate(session.id);
                                                } catch (error) {
                                                    console.error("Failed to change guest:", error);
                                                }
                                            }
                                            setChangeGuestModalOpen(false);
                                            setChangeGuestTargetId(null);
                                        }}
                                    >
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage src={guest.avatar_url} />
                                            <AvatarFallback>{guest.display_name?.[0] || "?"}</AvatarFallback>
                                        </Avatar>
                                        <span className="font-medium">{guest.display_name || "不明"}</span>
                                    </button>
                                ))}
                            {availableGuests.filter((g) => !guestSearchQuery || g.display_name?.toLowerCase().includes(guestSearchQuery.toLowerCase())).length === 0 && (
                                <p className="text-center text-gray-500 py-8">ゲストが見つかりません</p>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Tag Selection Modal */}
            <Dialog open={!!tagSelection} onOpenChange={() => setTagSelection(null)}>
                <DialogContent className="sm:max-w-xs rounded-2xl p-0 overflow-hidden">
                    <DialogHeader className="relative flex items-center justify-center h-14 border-b border-gray-200 dark:border-gray-700 px-4 shrink-0">
                        <button
                            type="button"
                            onClick={() => setTagSelection(null)}
                            className="absolute left-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700"
                            aria-label="戻る"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <DialogTitle className="text-center text-base font-semibold text-gray-900 dark:text-white">
                            {tagSelection?.castName}のステータス
                        </DialogTitle>
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

                    {/* 戻るボタン */}
                    <div className="px-4 pb-4">
                        <Button
                            variant="outline"
                            className="w-full h-11"
                            onClick={() => setTagSelection(null)}
                        >
                            戻る
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Grid Cell Selection Modal */}
            <Dialog open={!!cellSelectModal} onOpenChange={() => setCellSelectModal(null)}>
                <DialogContent className="sm:max-w-xs rounded-2xl p-0 overflow-hidden max-h-[70vh] flex flex-col">
                    <DialogHeader className="relative flex items-center justify-center h-14 border-b border-gray-200 dark:border-gray-700 px-4 shrink-0">
                        <button
                            type="button"
                            onClick={() => setCellSelectModal(null)}
                            className="absolute left-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700"
                            aria-label="Close"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <DialogTitle className="text-center text-base font-semibold text-gray-900 dark:text-white">
                            配置する人を選択
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            グリッドに配置する人を選択してください
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto">
                        {/* Guests Section */}
                        {unplacedGuests.length > 0 && (
                            <div className="p-3">
                                <div className="text-xs font-medium text-blue-600 mb-2 flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                                    ゲスト
                                </div>
                                <div className="space-y-1">
                                    {unplacedGuests.map((sg: any) => {
                                        const displayName = sg.profiles?.display_name || sg.guest_name || "?";
                                        return (
                                            <button
                                                key={sg.id}
                                                type="button"
                                                onClick={() => handlePlaceOnGrid("guest", sg.id)}
                                                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                            >
                                                <Avatar className="w-8 h-8 border-2 border-blue-500">
                                                    <AvatarImage src={sg.profiles?.avatar_url} />
                                                    <AvatarFallback className="text-xs">{displayName[0]}</AvatarFallback>
                                                </Avatar>
                                                <span className="text-sm font-medium">{displayName}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Casts Section */}
                        {unplacedCasts.length > 0 && (
                            <div className="p-3 border-t border-gray-200 dark:border-gray-700">
                                <div className="text-xs font-medium text-pink-600 mb-2 flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-pink-500" />
                                    キャスト
                                </div>
                                <div className="space-y-1">
                                    {unplacedCasts.map((order: any) => {
                                        const displayName = order.profiles?.display_name || "?";
                                        return (
                                            <button
                                                key={order.cast_id}
                                                type="button"
                                                onClick={() => handlePlaceOnGrid("cast", order.cast_id)}
                                                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                            >
                                                <Avatar className="w-8 h-8 border-2 border-pink-500">
                                                    <AvatarImage src={order.profiles?.avatar_url} />
                                                    <AvatarFallback className="text-xs">{displayName[0]}</AvatarFallback>
                                                </Avatar>
                                                <span className="text-sm font-medium">{displayName}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Empty State */}
                        {unplacedGuests.length === 0 && unplacedCasts.length === 0 && (
                            <div className="p-6 text-center text-gray-500">
                                <p className="text-sm">配置できる人がいません</p>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Placement Action Modal */}
            <Dialog open={!!placementActionModal} onOpenChange={() => setPlacementActionModal(null)}>
                <DialogContent className="sm:max-w-xs rounded-2xl p-0 overflow-hidden">
                    <DialogHeader className="relative flex items-center justify-center h-14 border-b border-gray-200 dark:border-gray-700 px-4 shrink-0">
                        <button
                            type="button"
                            onClick={() => setPlacementActionModal(null)}
                            className="absolute left-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700"
                            aria-label="Close"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <DialogTitle className="text-center text-base font-semibold text-gray-900 dark:text-white">
                            {placementActionModal?.display_name}
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            アクションを選択してください
                        </DialogDescription>
                    </DialogHeader>
                    <div className="p-4 space-y-2">
                        <Button
                            variant="outline"
                            className="w-full h-12 justify-start gap-3 text-base"
                            onClick={() => {
                                if (placementActionModal) {
                                    const target = placementActionModal.type === "guest"
                                        ? `guest:${placementActionModal.id}`
                                        : `cast:${placementActionModal.id}`;
                                    setQuickOrderTarget(target);
                                    setPlacementActionModal(null);
                                }
                            }}
                        >
                            <Receipt className="h-5 w-5" />
                            注文
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full h-12 justify-start gap-3 text-base"
                            onClick={handleStartSwap}
                        >
                            <RefreshCw className="h-5 w-5" />
                            入れ替え
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full h-12 justify-start gap-3 text-base text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                            onClick={handleRemovePlacement}
                        >
                            <Trash2 className="h-4 w-4" />
                            削除
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Change Table Modal */}
            <Dialog open={changeTableModalOpen} onOpenChange={setChangeTableModalOpen}>
                <DialogContent className="sm:max-w-md rounded-2xl p-0 overflow-hidden max-h-[80vh] flex flex-col">
                    <DialogHeader className="flex !flex-col items-center gap-2 h-14 min-h-[3.5rem] flex-shrink-0 border-b border-gray-200 dark:border-gray-700 justify-center px-4">
                        <DialogTitle className="text-base font-semibold text-gray-900 dark:text-white text-center">
                            卓を変更
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            変更先の卓を選択してください
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto p-3">
                        <div className="space-y-1">
                            {/* テーブルなしオプション */}
                            <button
                                type="button"
                                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                                    !table ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600" : "hover:bg-gray-100 dark:hover:bg-gray-700"
                                }`}
                                onClick={async () => {
                                    if (session?.id) {
                                        try {
                                            await updateSession(session.id, { tableId: null });
                                            onUpdate(session.id);
                                        } catch (error) {
                                            console.error("Failed to change table:", error);
                                        }
                                    }
                                    setChangeTableModalOpen(false);
                                }}
                            >
                                <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                    <MapPin className="h-5 w-5 text-gray-500" />
                                </div>
                                <span className="font-medium">テーブルなし</span>
                            </button>
                            {tables.map((t) => (
                                <button
                                    key={t.id}
                                    type="button"
                                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                                        table?.id === t.id ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600" : "hover:bg-gray-100 dark:hover:bg-gray-700"
                                    }`}
                                    onClick={async () => {
                                        if (session?.id && table?.id !== t.id) {
                                            try {
                                                await updateSession(session.id, { tableId: t.id });
                                                onUpdate(session.id);
                                            } catch (error) {
                                                console.error("Failed to change table:", error);
                                            }
                                        }
                                        setChangeTableModalOpen(false);
                                    }}
                                >
                                    <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                        <span className="text-sm font-bold text-gray-600 dark:text-gray-300">
                                            {t.name?.[0] || "T"}
                                        </span>
                                    </div>
                                    <span className="font-medium">{t.name}</span>
                                    {table?.id === t.id && (
                                        <span className="ml-auto text-xs text-blue-600">現在の卓</span>
                                    )}
                                </button>
                            ))}
                            {tables.length === 0 && (
                                <p className="text-center text-gray-500 py-8">卓が登録されていません</p>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
