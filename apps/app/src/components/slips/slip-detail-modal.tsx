"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
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
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronLeft, ChevronRight, Plus, MoreHorizontal, Trash2, X, Check, Save, Printer, UserPlus, RotateCcw } from "lucide-react";
import {
    getSessionByIdV2,
    updateSessionTimes,
    updateSession,
    closeSession,
    reopenSession,
    checkoutSession,
    deleteSession,
} from "@/app/app/(main)/floor/actions/session";
import { createOrder, updateOrder, deleteOrder, deleteOrdersByName } from "@/app/app/(main)/floor/actions/order";
import { getMenus } from "@/app/app/(main)/floor/actions/menu";
import { getCasts, getGuests, addGuestToSessionV2, removeGuestFromSessionV2 } from "@/app/app/(main)/floor/actions/guest";
import { getStoreSettings } from "@/app/app/(main)/floor/actions/store";
import { PlacementModal } from "@/app/app/(main)/floor/placement-modal";
import { QuickOrderModal } from "@/app/app/(main)/floor/quick-order-modal";
import { getTables } from "@/app/app/(main)/seats/actions";
import { getPricingSystems } from "@/app/app/(main)/pricing-systems/actions";
import { Table as FloorTable, PricingSystem } from "@/types/floor";
import { PricingSystemModal } from "@/components/pricing-system-modal";
import { CommentSection } from "@/components/comment-section";

interface SlipDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    sessionId: string | null;
    onUpdate?: () => void;
    onSessionDeleted?: () => void; // セッション削除時のコールバック（フロア管理モーダルを閉じる用）
    editable?: boolean;
    initialTables?: any[];
    initialSessions?: any[];
    initialMenus?: any[];
    initialCasts?: any[];
    initialGuests?: any[];
    preventOutsideClose?: boolean; // 範囲外クリックで閉じないようにする（フロア管理モーダルから開く場合）
}

interface OrderItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
    castName?: string;
    castId?: string | null;
    guestId?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    created_at: string;
    menu_id?: string | null;
    item_name?: string | null;
    hide_from_slip?: boolean;
}

export function SlipDetailModal({
    isOpen,
    onClose,
    sessionId,
    onUpdate,
    onSessionDeleted,
    editable = true,
    initialTables,
    initialSessions,
    initialMenus,
    initialCasts,
    initialGuests,
    preventOutsideClose = false,
}: SlipDetailModalProps) {
    const [session, setSession] = useState<any>(null);
    const [orders, setOrders] = useState<OrderItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [tables, setTables] = useState<FloorTable[]>([]);
    const [pricingSystems, setPricingSystems] = useState<any[]>([]);
    const [menus, setMenus] = useState<any[]>([]);
    const [casts, setCasts] = useState<any[]>([]);
    const [guests, setGuests] = useState<any[]>([]);

    // Edit states
    const [isEditingHeader, setIsEditingHeader] = useState(false);
    const [editingSetFeeIds, setEditingSetFeeIds] = useState<string[]>([]);
    const [editingExtensionFeeIds, setEditingExtensionFeeIds] = useState<string[]>([]);
    const [editingDrinkIds, setEditingDrinkIds] = useState<string[]>([]);
    const [editingNominationIds, setEditingNominationIds] = useState<string[]>([]);
    const [editingDouhanIds, setEditingDouhanIds] = useState<string[]>([]);
    const [editingCompanionIds, setEditingCompanionIds] = useState<string[]>([]);
    const [editingGuestIds, setEditingGuestIds] = useState<string[]>([]);
    const [editingOrderValues, setEditingOrderValues] = useState<Record<string, { quantity?: number, amount?: number, castId?: string | null, guestId?: string | null, startTime?: string, endTime?: string }>>({});

    const [editTableId, setEditTableId] = useState("");
    const [editGuestCount, setEditGuestCount] = useState(0);
    const [editDate, setEditDate] = useState("");
    const [editStartTime, setEditStartTime] = useState("");
    const [editPricingSystemId, setEditPricingSystemId] = useState<string>("none");
    const [editMainGuestId, setEditMainGuestId] = useState<string>("none");
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");

    // Dialog states
    const [isQuickOrderOpen, setIsQuickOrderOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isCheckoutDialogOpen, setIsCheckoutDialogOpen] = useState(false);
    const [isReopenDialogOpen, setIsReopenDialogOpen] = useState(false);
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [isReopening, setIsReopening] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isAddingOrder, setIsAddingOrder] = useState(false);
    const [isRecalculating, setIsRecalculating] = useState(false);
    const [selectedFeeType, setSelectedFeeType] = useState<'nomination' | 'companion' | 'douhan' | null>(null);
    const [isDiscountDialogOpen, setIsDiscountDialogOpen] = useState(false);
    const [discountName, setDiscountName] = useState("");
    const [discountAmount, setDiscountAmount] = useState(0);
    const [discountIsNegative, setDiscountIsNegative] = useState(true); // true = 引く（マイナス）, false = 足す（プラス）
    const [isPlacementOpen, setIsPlacementOpen] = useState(false);
    const [isCastPlacementOpen, setIsCastPlacementOpen] = useState(false);
    const [editingDiscountIds, setEditingDiscountIds] = useState<string[]>([]);
    const [selectedCastForFee, setSelectedCastForFee] = useState<any>(null);
    const [isGuestSelectOpen, setIsGuestSelectOpen] = useState(false);
    const [storeSettings, setStoreSettings] = useState<any>(null);
    const [isPricingSystemModalOpen, setIsPricingSystemModalOpen] = useState(false);
    const [selectedPricingSystemForEdit, setSelectedPricingSystemForEdit] = useState<PricingSystem | null>(null);

    const { toast } = useToast();

    // Handle inert attribute for parent dialog when sub-modals are open
    useEffect(() => {
        const isSubModalOpen = isDiscountDialogOpen || isDeleteDialogOpen;
        const dialogs = document.querySelectorAll('[role="dialog"]');

        dialogs.forEach(dialog => {
            const title = dialog.querySelector('h2')?.textContent || '';
            if (title.includes('伝票詳細')) {
                if (isSubModalOpen) {
                    dialog.setAttribute('inert', '');
                } else {
                    dialog.removeAttribute('inert');
                }
            }
        });

        return () => {
            // Cleanup: remove inert when component unmounts
            dialogs.forEach(dialog => {
                dialog.removeAttribute('inert');
            });
        };
    }, [isDiscountDialogOpen, isDeleteDialogOpen]);

    useEffect(() => {
        if (isOpen && sessionId) {
            loadAllData();
            loadStoreSettings();
        }
    }, [isOpen, sessionId]);

    const loadStoreSettings = async () => {
        const settings = await getStoreSettings();
        setStoreSettings(settings);
    };

    const loadAllData = async (skipLoading: boolean = false) => {
        if (!sessionId) return;
        if (!skipLoading) {
            setLoading(true);
        }
        try {
            // すべてのデータを並列で取得
            const [currentSession, tablesData, pricingData, menusData, castsData, guestsData] = await Promise.all([
                getSessionByIdV2(sessionId),
                initialTables ? Promise.resolve(initialTables) : getTables(),
                getPricingSystems(),
                initialMenus ? Promise.resolve(initialMenus) : getMenus(),
                initialCasts ? Promise.resolve(initialCasts) : getCasts(),
                initialGuests ? Promise.resolve(initialGuests) : getGuests(),
            ]);

            setTables(tablesData);
            setPricingSystems(pricingData);
            setMenus(menusData);
            setCasts(castsData);
            setGuests(guestsData);

            if (currentSession) {
                setSession(currentSession);

                // Transform orders
                const orderItems: OrderItem[] = (currentSession.orders || []).map((order: any) => ({
                    id: order.id,
                    name: order.item_name || order.menus?.name || "不明",
                    price: order.amount || order.menus?.price || 0,
                    quantity: order.quantity ?? 0,
                    castName: order.profiles?.display_name,
                    castId: order.cast_id || null,
                    guestId: order.guest_id || null,
                    startTime: order.start_time || null,
                    endTime: order.end_time || null,
                    created_at: order.created_at,
                    menu_id: order.menu_id || null,
                    item_name: order.item_name || null,
                    hide_from_slip: order.menus?.hide_from_slip || false,
                }));

                setOrders(orderItems);

                // Initialize edit states
                setEditTableId(currentSession.table_id || "");
                setEditGuestCount(currentSession.guest_count || 0);
                // JSTでの日付を取得
                if (currentSession.start_time) {
                    const localDate = new Date(currentSession.start_time).toLocaleDateString("ja-JP", {
                        timeZone: "Asia/Tokyo",
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                    }).replace(/\//g, "-");
                    setEditDate(localDate);
                } else {
                    setEditDate("");
                }
                setEditStartTime(currentSession.start_time ? new Date(currentSession.start_time).toLocaleTimeString("ja-JP", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit" }) : "");
                setEditPricingSystemId(currentSession.pricing_system_id || "none");
                setEditMainGuestId(currentSession.main_guest_id || "none");
                setStartTime(currentSession.start_time ? new Date(currentSession.start_time).toLocaleTimeString("ja-JP", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit" }) : "");
                setEndTime(currentSession.end_time ? new Date(currentSession.end_time).toLocaleTimeString("ja-JP", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit" }) : "");
            }
        } catch (error) {
            console.error("Failed to load session data:", error);
            toast({ title: "データの読み込みに失敗しました" });
        } finally {
            if (!skipLoading) {
                setLoading(false);
            }
        }
    };

    const getSelectedPricingSystem = () => {
        if (!session?.pricing_system_id) return null;
        return pricingSystems.find(ps => ps.id === session.pricing_system_id) || null;
    };

    // Calculate Fee Schedule
    const getFeeTimeSchedule = () => {
        if (!session || !session.start_time) return {};
        const pricingSystem = getSelectedPricingSystem();
        if (!pricingSystem) return {};

        const schedule: Record<string, { start: string; end: string }> = {};
        const startTime = new Date(session.start_time);

        // Set Fee
        const setFeeOrder = orders.find(o => o.name === 'セット料金');
        const setEndTime = new Date(startTime.getTime() + pricingSystem.set_duration_minutes * 60000);

        if (setFeeOrder) {
            schedule[setFeeOrder.id] = {
                start: startTime.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }),
                end: setEndTime.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })
            };
        }

        // Extension Fees
        const extensionOrders = orders
            .filter(o => o.name === '延長料金')
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        let currentStartTime = setEndTime;

        extensionOrders.forEach(order => {
            const currentEndTime = new Date(currentStartTime.getTime() + pricingSystem.extension_duration_minutes * 60000);
            schedule[order.id] = {
                start: currentStartTime.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }),
                end: currentEndTime.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })
            };
            currentStartTime = currentEndTime;
        });

        return schedule;
    };

    const feeSchedule = getFeeTimeSchedule();

    // キャンセル時に元の値に戻す
    const handleCancelEdit = () => {
        if (session) {
            setEditTableId(session.table_id);
            setEditGuestCount(session.guest_count || 0);
            if (session.start_time) {
                const d = new Date(session.start_time);
                const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                setEditDate(localDate);
                setStartTime(d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }));
            }
            if (session.end_time) {
                setEndTime(new Date(session.end_time).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }));
            } else {
                setEndTime("");
            }
            setEditPricingSystemId(session.pricing_system_id || "none");
            setEditMainGuestId(session.main_guest_id || "none");
        }
        setIsEditingHeader(false);
    };

    const handleSaveHeader = async () => {
        if (!sessionId) return;
        try {
            // 編集で選択された日付を使用（editDateから年月日を取得）
            let year: number, month: number, day: number;
            if (editDate) {
                const [y, m, d] = editDate.split("-").map(Number);
                year = y;
                month = m - 1; // JavaScriptの月は0始まり
                day = d;
            } else {
                const now = new Date();
                year = now.getFullYear();
                month = now.getMonth();
                day = now.getDate();
            }

            // 入店時間を構築
            let newStartTime: string | undefined = undefined;
            if (startTime) {
                const [hours, minutes] = startTime.split(":").map(Number);
                const startDate = new Date(year, month, day, hours, minutes, 0, 0);
                newStartTime = startDate.toISOString();
            }

            // 退店時間を構築（空でもnullとして保存）
            let newEndTime: string | null = null;
            if (endTime && endTime.trim() !== "") {
                const [endHours, endMinutes] = endTime.split(":").map(Number);
                let endDate = new Date(year, month, day, endHours, endMinutes, 0, 0);
                
                // 退店時間が入店時間より前の場合は翌日として扱う
                if (startTime && endTime < startTime) {
                    endDate.setDate(endDate.getDate() + 1);
                }
                newEndTime = endDate.toISOString();
            }

            await updateSession(sessionId, {
                tableId: editTableId,
                guestCount: editGuestCount,
                startTime: newStartTime,
                endTime: newEndTime,
                pricingSystemId: editPricingSystemId === "none" ? null : editPricingSystemId,
                mainGuestId: editMainGuestId === "none" ? null : editMainGuestId,
            });

            toast({ title: "詳細を更新しました" });
            setIsEditingHeader(false);
            await loadAllData(true);
            onUpdate?.();
        } catch (error) {
            console.error(error);
            toast({ title: "更新に失敗しました" });
        }
    };

    const handleUpdateTimes = async () => {
        if (!sessionId || !session) return;
        try {
            const baseDate = new Date(session.start_time);
            const baseDateStr = baseDate.toISOString().slice(0, 10);

            let newStartIso: string | undefined = undefined;
            let newEndIso: string | null = null;

            if (startTime) {
                newStartIso = new Date(`${baseDateStr}T${startTime}`).toISOString();
            }

            if (endTime) {
                let endDateStr = baseDateStr;
                if (startTime && endTime < startTime) {
                    const nextDay = new Date(baseDate);
                    nextDay.setDate(nextDay.getDate() + 1);
                    endDateStr = nextDay.toISOString().slice(0, 10);
                }
                newEndIso = new Date(`${endDateStr}T${endTime}`).toISOString();
            }

            await updateSessionTimes(sessionId, newStartIso, newEndIso);
            toast({ title: "時間を更新しました" });
            await loadAllData();
            onUpdate?.();
        } catch (error) {
            console.error(error);
            toast({ title: "更新に失敗しました" });
        }
    };


    const handleDeleteOrder = async (orderId: string, itemName: string) => {
        if (!sessionId || !orderId || typeof orderId !== 'string') {
            toast({ title: "削除に失敗しました" });
            return;
        }

        // 楽観的UI: 即座にローカル状態から削除
        const deletedOrder = orders.find(o => o.id === orderId);
        setOrders(prev => prev.filter(o => o.id !== orderId));
        toast({ title: `${itemName}を削除しました` });

        try {
            await deleteOrder(orderId);
            // バックグラウンドで最新データを取得（loading表示なし）
            await loadAllData(true);
            onUpdate?.();
        } catch (error) {
            console.error(error);
            // エラー時は元の状態に戻す
            if (deletedOrder) {
                setOrders(prev => [...prev, deletedOrder].sort((a, b) =>
                    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                ));
            }
            toast({ title: "削除に失敗しました" });
        }
    };

    const handleEditOrderChange = (orderId: string, field: 'quantity' | 'amount' | 'castId' | 'guestId' | 'startTime' | 'endTime', value: any) => {
        setEditingOrderValues(prev => ({
            ...prev,
            [orderId]: {
                ...prev[orderId],
                [field]: value
            }
        }));
    };

    const handleSaveOrder = async (orderId: string, isExtension: boolean = false) => {
        if (!orderId || typeof orderId !== 'string') {
            toast({ title: "更新に失敗しました" });
            return;
        }

        const values = editingOrderValues[orderId];
        if (!values) return;

        const originalOrder = orders.find(o => o.id === orderId);
        if (!originalOrder) return;

        // 楽観的UI: 即座にローカル状態を更新
        const updatedOrder: OrderItem = { ...originalOrder };
        if (values.quantity !== undefined) updatedOrder.quantity = values.quantity;
        if (values.amount !== undefined) updatedOrder.price = values.amount;
        if (values.castId !== undefined) {
            updatedOrder.castId = values.castId === "none" ? null : values.castId;
            if (values.castId !== "none") {
                const selectedCast = casts.find(c => c.id === values.castId);
                updatedOrder.castName = selectedCast?.display_name;
            } else {
                updatedOrder.castName = undefined;
            }
        }
        if (values.guestId !== undefined) {
            updatedOrder.guestId = values.guestId === "none" ? null : values.guestId;
        }
        if (values.startTime !== undefined) {
            if (values.startTime) {
                const baseDate = session?.start_time
                    ? new Date(session.start_time).toISOString().slice(0, 10)
                    : new Date().toISOString().slice(0, 10);
                updatedOrder.startTime = new Date(`${baseDate}T${values.startTime}`).toISOString();
            } else {
                updatedOrder.startTime = null;
            }
        }
        if (values.endTime !== undefined) {
            if (values.endTime) {
                const baseDate = session?.start_time
                    ? new Date(session.start_time).toISOString().slice(0, 10)
                    : new Date().toISOString().slice(0, 10);
                updatedOrder.endTime = new Date(`${baseDate}T${values.endTime}`).toISOString();
            } else {
                updatedOrder.endTime = null;
            }
        }

        setOrders(prev => prev.map(o => o.id === orderId ? updatedOrder : o));
        setEditingOrderValues(prev => {
            const next = { ...prev };
            delete next[orderId];
            return next;
        });
        toast({ title: "更新しました" });

        try {
            const updates: { quantity?: number; amount?: number; castId?: string | null; guestId?: string | null; startTime?: string | null; endTime?: string | null } = {};

            if (values.quantity !== undefined) updates.quantity = values.quantity;
            if (values.amount !== undefined) updates.amount = values.amount;
            if (values.castId !== undefined) updates.castId = values.castId === "none" ? null : values.castId;
            if (values.guestId !== undefined) updates.guestId = values.guestId === "none" ? null : values.guestId;

            // Handle time conversions
            if (values.startTime !== undefined) {
                if (values.startTime) {
                    const baseDate = session?.start_time
                        ? new Date(session.start_time).toISOString().slice(0, 10)
                        : new Date().toISOString().slice(0, 10);
                    updates.startTime = new Date(`${baseDate}T${values.startTime}`).toISOString();
                } else {
                    updates.startTime = null;
                }
            }

            if (values.endTime !== undefined) {
                if (values.endTime) {
                    const baseDate = session?.start_time
                        ? new Date(session.start_time).toISOString().slice(0, 10)
                        : new Date().toISOString().slice(0, 10);
                    updates.endTime = new Date(`${baseDate}T${values.endTime}`).toISOString();
                } else {
                    updates.endTime = null;
                }
            }

            await updateOrder(orderId, updates);

            // バックグラウンドで最新データを取得（loading表示なし）
            await loadAllData(true);
            onUpdate?.();
        } catch (error) {
            console.error(error);
            // エラー時は元の状態に戻す
            if (originalOrder) {
                setOrders(prev => prev.map(o => o.id === orderId ? originalOrder : o));
            }
            setEditingOrderValues(prev => ({ ...prev, [orderId]: values }));
            toast({ title: "更新に失敗しました" });
        }
    };

    const handleRecalculate = async () => {
        if (!sessionId || !session) return;

        const pricingSystem = getSelectedPricingSystem();
        if (!pricingSystem) {
            toast({ title: "料金システムが設定されていません" });
            return;
        }

        if (!startTime || !endTime) {
            toast({ title: "入店時間と退店時間を設定してください" });
            return;
        }

        setIsRecalculating(true);
        try {

            // 1. セッション情報を更新
            // 編集で選択された日付を使用（editDateから年月日を取得）
            let year: number, month: number, day: number;
            if (editDate) {
                const [y, m, d] = editDate.split("-").map(Number);
                year = y;
                month = m - 1; // JavaScriptの月は0始まり
                day = d;
            } else if (session?.start_time) {
                const d = new Date(session.start_time);
                year = d.getFullYear();
                month = d.getMonth();
                day = d.getDate();
            } else {
                const now = new Date();
                year = now.getFullYear();
                month = now.getMonth();
                day = now.getDate();
            }

            // 入店時間を構築
            const [startHours, startMinutes] = startTime.split(":").map(Number);
            const sessionStartDate = new Date(year, month, day, startHours, startMinutes, 0, 0);
            const newStartIso = sessionStartDate.toISOString();

            // 退店時間を構築
            const [endHours, endMinutes] = endTime.split(":").map(Number);
            let sessionEndDate = new Date(year, month, day, endHours, endMinutes, 0, 0);

            // 退店時間が入店時間より前の場合は翌日として扱う
            if (endTime < startTime) {
                sessionEndDate.setDate(sessionEndDate.getDate() + 1);
            }
            const newEndIso = sessionEndDate.toISOString();

            await updateSession(sessionId, {
                tableId: editTableId,
                guestCount: editGuestCount,
                pricingSystemId: editPricingSystemId !== "none" ? editPricingSystemId : null,
                mainGuestId: editMainGuestId !== "none" ? editMainGuestId : null,
            });

            await updateSessionTimes(sessionId, newStartIso, newEndIso);

            // 2. 既存のセット料金、延長料金、指名料、同伴料、場内料金を削除
            await deleteOrdersByName(sessionId, "セット料金");
            await deleteOrdersByName(sessionId, "延長料金");
            await deleteOrdersByName(sessionId, "指名料");
            await deleteOrdersByName(sessionId, "同伴料");
            await deleteOrdersByName(sessionId, "場内料金");

            // 3. 滞在時間を計算（分単位）
            const startDate = new Date(newStartIso);
            const endDate = new Date(newEndIso);
            const durationMinutes = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60));

            // 4. 必要な料金を計算
            const setDurationMinutes = pricingSystem.set_duration_minutes || 0;
            const extensionDurationMinutes = pricingSystem.extension_duration_minutes || 0;

            if (setDurationMinutes === 0 || extensionDurationMinutes === 0) {
                toast({ title: "料金システムの設定が不正です" });
                return;
            }

            // 5. セット料金をゲスト別に作成
            const sessionGuests = session.session_guests || [];
            for (const sg of sessionGuests) {
                // ゲストごとにセット料金を作成（castIdにguestIdを使用してゲスト紐付け）
                await createOrder(
                    sessionId,
                    [{ menuId: "set-fee", quantity: 1, amount: pricingSystem.set_fee }],
                    sg.guest_id, // guestId
                    sg.guest_id  // castIdとしてguestIdを使用（ゲスト紐付け用）
                );
            }

            // 6. 延長料金を計算（セット時間を超えた場合）
            if (durationMinutes > setDurationMinutes) {
                const excessMinutes = durationMinutes - setDurationMinutes;
                const extensionCount = Math.ceil(excessMinutes / extensionDurationMinutes);
                const guestCount = sessionGuests.length || editGuestCount || 1;

                // 延長料金は人数分をまとめて作成
                for (let i = 0; i < extensionCount; i++) {
                    await createOrder(
                        sessionId,
                        [{ menuId: "extension-fee", quantity: guestCount, amount: pricingSystem.extension_fee }],
                        null,
                        null
                    );
                }
            }

            // 7. 既存の指名料からキャスト情報を取得して再作成（guestIdを維持）
            const nominationOrders = orders.filter(o => o.name === '指名料' && o.castId);
            const nominationSetDurationMinutes = pricingSystem.nomination_set_duration_minutes || 60;

            for (const order of nominationOrders) {
                if (!order.castId) continue;

                const orderStartTime = order.startTime ? new Date(order.startTime) : startDate;
                let orderEndTime = order.endTime ? new Date(order.endTime) : endDate;

                // 終了時間が退店時間を超えている場合は退店時間に調整
                if (orderEndTime.getTime() > endDate.getTime()) {
                    orderEndTime = endDate;
                }

                const castDurationMinutes = Math.floor((orderEndTime.getTime() - orderStartTime.getTime()) / (1000 * 60));
                if (castDurationMinutes <= 0) continue;

                const nominationCount = Math.max(1, Math.ceil(castDurationMinutes / nominationSetDurationMinutes));
                await createOrder(
                    sessionId,
                    [{
                        menuId: "nomination-fee",
                        quantity: nominationCount,
                        amount: pricingSystem.nomination_fee,
                        startTime: orderStartTime.toISOString(),
                        endTime: orderEndTime.toISOString()
                    }],
                    order.guestId || null, // guestIdを維持
                    order.castId
                );
            }

            // 8. 既存の同伴料からキャスト情報を取得して再作成（guestIdを維持）
            const douhanOrders = orders.filter(o => o.name === '同伴料' && o.castId);
            const douhanSetDurationMinutes = pricingSystem.douhan_set_duration_minutes || 60;

            for (const order of douhanOrders) {
                if (!order.castId) continue;

                const orderStartTime = order.startTime ? new Date(order.startTime) : startDate;
                let orderEndTime = order.endTime ? new Date(order.endTime) : endDate;

                // 終了時間が退店時間を超えている場合は退店時間に調整
                if (orderEndTime.getTime() > endDate.getTime()) {
                    orderEndTime = endDate;
                }

                const castDurationMinutes = Math.floor((orderEndTime.getTime() - orderStartTime.getTime()) / (1000 * 60));
                if (castDurationMinutes <= 0) continue;

                const douhanCount = Math.max(1, Math.ceil(castDurationMinutes / douhanSetDurationMinutes));
                await createOrder(
                    sessionId,
                    [{
                        menuId: "douhan-fee",
                        quantity: douhanCount,
                        amount: pricingSystem.douhan_fee || 0,
                        startTime: orderStartTime.toISOString(),
                        endTime: orderEndTime.toISOString()
                    }],
                    order.guestId || null, // guestIdを維持
                    order.castId
                );
            }

            // 9. 既存の場内料金からキャスト情報を取得して再作成（guestIdを維持）
            const companionOrders = orders.filter(o => o.name === '場内料金' && o.castId);
            const companionSetDurationMinutes = pricingSystem.companion_set_duration_minutes || 30;

            for (const order of companionOrders) {
                if (!order.castId) continue;

                const orderStartTime = order.startTime ? new Date(order.startTime) : startDate;
                let orderEndTime = order.endTime ? new Date(order.endTime) : endDate;

                // 終了時間が退店時間を超えている場合は退店時間に調整
                if (orderEndTime.getTime() > endDate.getTime()) {
                    orderEndTime = endDate;
                }

                const castDurationMinutes = Math.floor((orderEndTime.getTime() - orderStartTime.getTime()) / (1000 * 60));
                if (castDurationMinutes <= 0) continue;

                const companionCount = Math.max(1, Math.ceil(castDurationMinutes / companionSetDurationMinutes));
                await createOrder(
                    sessionId,
                    [{
                        menuId: "companion-fee",
                        quantity: companionCount,
                        amount: pricingSystem.companion_fee,
                        startTime: orderStartTime.toISOString(),
                        endTime: orderEndTime.toISOString()
                    }],
                    order.guestId || null, // guestIdを維持
                    order.castId
                );
            }

            toast({ title: "料金を再計算しました" });
            setIsEditingHeader(false);
            await loadAllData(true);
            onUpdate?.();
        } catch (error) {
            console.error(error);
            toast({ title: "再計算に失敗しました" });
        } finally {
            setIsRecalculating(false);
        }
    };

    const handleAddSetFee = async () => {
        if (!sessionId || !session) return;
        const pricingSystem = getSelectedPricingSystem();
        if (!pricingSystem) {
            toast({ title: "料金システムが設定されていません" });
            return;
        }

        const quantity = session.guest_count ?? 0;
        const tempId = `temp-${Date.now()}`;

        // 楽観的UI: 即座にローカル状態を更新
        const newOrder: OrderItem = {
            id: tempId,
            name: 'セット料金',
            price: pricingSystem.set_fee,
            quantity,
            created_at: new Date().toISOString(),
            menu_id: null,
            item_name: 'セット料金',
            hide_from_slip: false,
        };
        setOrders(prev => [...prev, newOrder]);
        toast({ title: "セット料金を追加しました" });

        try {
            await createOrder(
                sessionId,
                [{ menuId: "set-fee", quantity, amount: pricingSystem.set_fee }],
                null,
                null
            );
            // バックグラウンドで最新データを取得（loading表示なし）
            await loadAllData(true);
            onUpdate?.();
        } catch (error) {
            console.error(error);
            // エラー時は元の状態に戻す
            setOrders(prev => prev.filter(o => o.id !== tempId));
            toast({ title: "追加に失敗しました" });
        }
    };

    // ゲスト別セット料金の金額を更新
    const handleUpdateGuestSetFeeAmount = async (guestId: string, amount: number) => {
        if (!sessionId) return;

        // 既存のセット料金オーダーを検索（castIdにguestIdを使用）
        const existingOrder = orders.find(
            o => o.name === 'セット料金' && o.castId === guestId
        );

        if (existingOrder) {
            // 既存オーダーの金額を更新
            setOrders(prev => prev.map(o =>
                o.id === existingOrder.id ? { ...o, price: amount } : o
            ));
            try {
                await updateOrder(existingOrder.id, { amount });
                await loadAllData(true);
                onUpdate?.();
                toast({ title: "セット料金を更新しました" });
            } catch (error) {
                console.error(error);
                toast({ title: "更新に失敗しました" });
            }
        } else {
            // 新規作成（guestIdをcastIdとして使用してゲスト紐付け）
            const tempId = `temp-${Date.now()}`;
            const newOrder: OrderItem = {
                id: tempId,
                name: 'セット料金',
                price: amount,
                quantity: 1,
                created_at: new Date().toISOString(),
                menu_id: null,
                item_name: 'セット料金',
                castId: guestId,
                hide_from_slip: false,
            };
            setOrders(prev => [...prev, newOrder]);
            try {
                await createOrder(
                    sessionId,
                    [{ menuId: "set-fee", quantity: 1, amount }],
                    guestId, // castIdとしてguestIdを使用
                    guestId  // guestId
                );
                await loadAllData(true);
                onUpdate?.();
                toast({ title: "セット料金を追加しました" });
            } catch (error) {
                console.error(error);
                setOrders(prev => prev.filter(o => o.id !== tempId));
                toast({ title: "追加に失敗しました" });
            }
        }
    };

    const handleAddExtensionFee = async () => {
        if (!sessionId) return;
        const pricingSystem = getSelectedPricingSystem();
        if (!pricingSystem) {
            toast({ title: "料金システムが設定されていません" });
            return;
        }

        // Get Set Fee quantity to use for Extension Fee, or use guest_count
        const setFeeOrder = orders.find(o => o.name === 'セット料金');
        const quantity = setFeeOrder?.quantity ?? (session?.guest_count ?? 0);
        const tempId = `temp-${Date.now()}`;

        // 楽観的UI: 即座にローカル状態を更新
        const newOrder: OrderItem = {
            id: tempId,
            name: '延長料金',
            price: pricingSystem.extension_fee,
            quantity,
            created_at: new Date().toISOString(),
            menu_id: null,
            item_name: '延長料金',
            hide_from_slip: false,
        };
        setOrders(prev => [...prev, newOrder]);
        toast({ title: "延長料金を追加しました" });

        try {
            await createOrder(
                sessionId,
                [{ menuId: "extension-fee", quantity, amount: pricingSystem.extension_fee }],
                null,
                null
            );
            // バックグラウンドで最新データを取得（loading表示なし）
            await loadAllData(true);
            onUpdate?.();
        } catch (error) {
            console.error(error);
            // エラー時は元の状態に戻す
            setOrders(prev => prev.filter(o => o.id !== tempId));
            toast({ title: "追加に失敗しました" });
        }
    };

    const handleAddNominationFee = () => {
        setSelectedFeeType('nomination');
        setIsCastPlacementOpen(true);
    };

    const handleAddCompanionFee = () => {
        setSelectedFeeType('companion');
        setIsCastPlacementOpen(true);
    };

    const handleAddDouhanFee = () => {
        setSelectedFeeType('douhan');
        setIsCastPlacementOpen(true);
    };

    // 指名・場内指名・同伴の個別再計算
    const handleRecalculateFeeOrder = async (orderId: string, feeType: 'nomination' | 'companion' | 'douhan') => {
        const pricingSystem = getSelectedPricingSystem();
        if (!pricingSystem) {
            toast({ title: "料金システムが設定されていません" });
            return;
        }

        const values = editingOrderValues[orderId];
        if (!values?.startTime || !values?.endTime) {
            toast({ title: "開始時刻と終了時刻を入力してください" });
            return;
        }

        // 時間から日付を構築
        let year: number, month: number, day: number;
        if (editDate) {
            const [y, m, d] = editDate.split("-").map(Number);
            year = y;
            month = m - 1;
            day = d;
        } else if (session?.start_time) {
            const d = new Date(session.start_time);
            year = d.getFullYear();
            month = d.getMonth();
            day = d.getDate();
        } else {
            const now = new Date();
            year = now.getFullYear();
            month = now.getMonth();
            day = now.getDate();
        }

        const [startHours, startMinutes] = values.startTime.split(":").map(Number);
        const [endHours, endMinutes] = values.endTime.split(":").map(Number);

        const startDate = new Date(year, month, day, startHours, startMinutes);
        let endDate = new Date(year, month, day, endHours, endMinutes);

        // 終了時間が開始時間より前の場合は翌日
        if (values.endTime < values.startTime) {
            endDate.setDate(endDate.getDate() + 1);
        }

        const durationMinutes = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60));
        if (durationMinutes <= 0) {
            toast({ title: "時間の設定が不正です" });
            return;
        }

        let quantity: number;
        let amount: number;
        if (feeType === 'nomination') {
            const nominationSetDurationMinutes = pricingSystem.nomination_set_duration_minutes || 60;
            quantity = Math.max(1, Math.floor(durationMinutes / nominationSetDurationMinutes));
            amount = pricingSystem.nomination_fee;
        } else if (feeType === 'douhan') {
            // 同伴料は指名と同じ計算方法
            const douhanSetDurationMinutes = pricingSystem.nomination_set_duration_minutes || 60;
            quantity = Math.max(1, Math.floor(durationMinutes / douhanSetDurationMinutes));
            amount = pricingSystem.douhan_fee || 0;
        } else {
            const companionSetDurationMinutes = pricingSystem.companion_set_duration_minutes || 30;
            quantity = Math.ceil(durationMinutes / companionSetDurationMinutes);
            amount = pricingSystem.companion_fee;
        }

        // 編集中の値を更新
        setEditingOrderValues(prev => ({
            ...prev,
            [orderId]: {
                ...prev[orderId],
                quantity,
                amount,
            }
        }));

        // 楽観的UIで即座に反映
        setOrders(prev => prev.map(o =>
            o.id === orderId
                ? { ...o, quantity, price: amount }
                : o
        ));

        // DBに保存
        try {
            await updateOrder(orderId, {
                quantity,
                amount,
                startTime: startDate.toISOString(),
                endTime: endDate.toISOString(),
                castId: values.castId === "none" ? null : values.castId,
            });
            await loadAllData(true);
            toast({ title: "再計算しました" });
        } catch (error) {
            console.error(error);
            toast({ title: "更新に失敗しました" });
        }
    };

    const handleCastSelectForFee = async (profile: any) => {
        if (!sessionId || !selectedFeeType) return;

        // selectedFeeTypeの値を保存（onCloseでnullになる前に）
        const feeType = selectedFeeType;
        const sessionGuests = session?.session_guests || [];

        // ゲストが1人以上いる場合はゲスト選択モーダルを表示
        if (sessionGuests.length >= 1) {
            setSelectedCastForFee({ ...profile, feeType });
            setIsCastPlacementOpen(false);
            setIsGuestSelectOpen(true);
            return;
        }

        // ゲストが0人の場合は直接追加（guestIdはnull）
        await addCastFeeWithGuestDirect(profile, null, feeType);
    };

    // ゲスト選択後にキャスト料金を追加
    const handleGuestSelectForFee = async (guestId: string) => {
        if (!selectedCastForFee) return;
        const { feeType, ...profile } = selectedCastForFee;
        setIsGuestSelectOpen(false);
        await addCastFeeWithGuestDirect(profile, guestId, feeType);
        setSelectedCastForFee(null);
        setSelectedFeeType(null);
    };

    // キャスト料金追加の実処理
    const addCastFeeWithGuestDirect = async (profile: any, guestId: string | null, feeType: 'nomination' | 'companion' | 'douhan') => {
        if (!sessionId || !feeType) return;
        const pricingSystem = getSelectedPricingSystem();
        if (!pricingSystem) {
            toast({ title: "料金システムが設定されていません" });
            return;
        }

        let menuId: string;
        let amount: number;
        let feeName: string;

        if (feeType === 'nomination') {
            menuId = 'nomination-fee';
            amount = pricingSystem.nomination_fee;
            feeName = '指名料';
        } else if (feeType === 'douhan') {
            menuId = 'douhan-fee';
            amount = pricingSystem.douhan_fee || 0;
            feeName = '同伴料';
        } else {
            menuId = 'companion-fee';
            amount = pricingSystem.companion_fee;
            feeName = '場内料金';
        }

        const tempId = `temp-${Date.now()}`;

        // 指名・同伴の場合のみ入店時間・退店時間を設定、場内指名は空にする
        let orderStartTime: string | null = null;
        let orderEndTime: string | null = null;
        let quantity = 0;

        if (feeType === 'nomination' || feeType === 'douhan') {
            orderStartTime = session?.start_time || null;
            orderEndTime = session?.end_time || null;

            // 退店時間がある場合は滞在時間から回数を自動計算
            if (orderStartTime && orderEndTime) {
                const startDate = new Date(orderStartTime);
                const endDate = new Date(orderEndTime);
                const durationMinutes = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60));

                if (durationMinutes > 0) {
                    const nominationSetDurationMinutes = pricingSystem.nomination_set_duration_minutes || 60;
                    quantity = Math.max(1, Math.floor(durationMinutes / nominationSetDurationMinutes));
                }
            }
        }
        // 場内指名は開始・終了時間なし、quantity=0

        // 楽観的UI: 即座にローカル状態を更新
        const newOrder: OrderItem = {
            id: tempId,
            name: feeName,
            price: amount,
            quantity,
            castName: profile.display_name,
            castId: profile.id,
            startTime: orderStartTime,
            endTime: orderEndTime,
            created_at: new Date().toISOString(),
            menu_id: null,
            item_name: feeName,
            hide_from_slip: false,
        };
        setOrders(prev => [...prev, newOrder]);
        setIsCastPlacementOpen(false);
        toast({ title: `${feeName}を追加しました` });

        try {
            await createOrder(
                sessionId,
                [{ menuId, quantity, amount, startTime: orderStartTime, endTime: orderEndTime }],
                guestId,
                profile.id
            );
            // バックグラウンドで最新データを取得（loading表示なし）
            await loadAllData(true);
            onUpdate?.();
        } catch (error) {
            console.error(error);
            // エラー時は元の状態に戻す
            setOrders(prev => prev.filter(o => o.id !== tempId));
            setIsCastPlacementOpen(true);
            toast({ title: "追加に失敗しました" });
        }

        setSelectedFeeType(null);
    };


    const handleUpdateSetFeeQuantity = async (orderId: string, quantity: number, isExtension: boolean = false) => {
        if (!sessionId || !orderId || typeof orderId !== 'string') {
            toast({ title: "更新に失敗しました" });
            return;
        }
        const pricingSystem = getSelectedPricingSystem();
        if (!pricingSystem) return;

        const originalOrder = orders.find(o => o.id === orderId);
        if (!originalOrder) return;

        const unitPrice = isExtension ? pricingSystem.extension_fee : pricingSystem.set_fee;

        // 楽観的UI: 即座にローカル状態を更新
        const updatedOrder: OrderItem = { ...originalOrder, quantity, price: unitPrice };
        setOrders(prev => prev.map(o => o.id === orderId ? updatedOrder : o));
        toast({ title: "料金を更新しました" });

        try {
            await updateOrder(orderId, {
                quantity,
                amount: unitPrice // amount is unit price, not total
            });
            // バックグラウンドで最新データを取得（loading表示なし）
            await loadAllData(true);
            onUpdate?.();
        } catch (error) {
            console.error(error);
            // エラー時は元の状態に戻す
            if (originalOrder) {
                setOrders(prev => prev.map(o => o.id === orderId ? originalOrder : o));
            }
            toast({ title: "更新に失敗しました" });
        }
    };

    const handleAddDiscount = async () => {
        if (!sessionId || !discountName || discountAmount <= 0) {
            toast({ title: "項目名と金額を入力してください" });
            return;
        }

        const tempId = `temp-${Date.now()}`;
        // discountIsNegative が true なら引く（マイナス）、false なら足す（プラス）
        const finalAmount = discountIsNegative ? -discountAmount : discountAmount;

        // 楽観的UI: 即座にローカル状態を更新
        const newOrder: OrderItem = {
            id: tempId,
            name: discountName,
            price: finalAmount,
            quantity: 1,
            created_at: new Date().toISOString(),
            menu_id: null,
            item_name: discountName,
            hide_from_slip: false,
        };
        setOrders(prev => [...prev, newOrder]);
        setIsDiscountDialogOpen(false);
        const savedDiscountName = discountName;
        const savedDiscountAmount = discountAmount;
        const savedDiscountIsNegative = discountIsNegative;
        setDiscountName("");
        setDiscountAmount(0);
        toast({ title: "追加しました" });

        try {
            // temp-discountでitem_nameに項目名を設定
            await createOrder(
                sessionId,
                [{ menuId: "temp-discount", quantity: 1, amount: finalAmount, name: savedDiscountName }],
                null,
                null
            );
            // バックグラウンドで最新データを取得（loading表示なし）
            await loadAllData(true);
            onUpdate?.();
        } catch (error) {
            console.error(error);
            // エラー時は元の状態に戻す
            setOrders(prev => prev.filter(o => o.id !== tempId));
            setDiscountName(savedDiscountName);
            setDiscountAmount(savedDiscountAmount);
            setIsDiscountDialogOpen(true);
            toast({ title: "追加に失敗しました" });
        }
    };

    const handleDeleteSession = async () => {
        if (!sessionId) return;

        setIsDeleting(true);
        try {
            await deleteSession(sessionId);
            setIsDeleteDialogOpen(false);
            onClose();
            toast({ title: "伝票とセッションを削除しました" });
            onUpdate?.();
            onSessionDeleted?.();
        } catch (error) {
            toast({ title: "削除に失敗しました" });
        } finally {
            setIsDeleting(false);
        }
    };

    const calculateSubtotal = () => {
        return orders.reduce((sum, order) => sum + (order.price * order.quantity), 0);
    };

    const calculateServiceCharge = () => {
        return Math.floor(calculateSubtotal() * 0.2);
    };

    const calculateTax = () => {
        return Math.floor((calculateSubtotal() + calculateServiceCharge()) * 0.1);
    };

    const calculateTotal = () => {
        return calculateSubtotal() + calculateServiceCharge() + calculateTax();
    };

    // 金額丸め関数
    const roundAmount = (amount: number): number => {
        if (!storeSettings?.slip_rounding_enabled) {
            return amount;
        }

        const method = storeSettings.slip_rounding_method || 'round';
        const unit = storeSettings.slip_rounding_unit || 10;

        switch (method) {
            case 'round':
                return Math.round(amount / unit) * unit;
            case 'ceil':
                return Math.ceil(amount / unit) * unit;
            case 'floor':
                return Math.floor(amount / unit) * unit;
            default:
                return amount;
        }
    };

    const calculateRoundedTotal = () => {
        const originalTotal = calculateTotal();
        return roundAmount(originalTotal);
    };

    const calculateDifference = () => {
        const originalTotal = calculateTotal();
        const roundedTotal = calculateRoundedTotal();
        return roundedTotal - originalTotal;
    };

    const handleAddGuest = () => {
        setIsPlacementOpen(true);
    };

    const handleGuestSelect = async (profile: any) => {
        if (!sessionId || !session) return;

        const tempGuestId = `temp-${Date.now()}`;
        const newGuestCount = (session.guest_count || 0) + 1;

        // 楽観的UI: 即座にローカル状態を更新
        const tempGuest = {
            id: tempGuestId,
            guest_id: profile.id,
            profiles: {
                id: profile.id,
                display_name: profile.display_name,
                avatar_url: profile.avatar_url,
            },
        };
        setSession((prev: any) => ({
            ...prev!,
            guest_count: newGuestCount,
            session_guests: [...(prev?.session_guests || []), tempGuest],
        }));
        setEditGuestCount(newGuestCount);

        // 楽観的UI: この新しいゲストのセット料金を追加
        const pricingSystem = getSelectedPricingSystem();
        const tempSetFeeId = `temp-setfee-${Date.now()}`;
        if (pricingSystem) {
            const newSetFeeOrder: OrderItem = {
                id: tempSetFeeId,
                name: 'セット料金',
                price: pricingSystem.set_fee,
                quantity: 1,
                created_at: new Date().toISOString(),
                menu_id: null,
                item_name: 'セット料金',
                castId: profile.id,
                hide_from_slip: false,
            };
            setOrders(prev => [...prev, newSetFeeOrder]);
        }

        setIsPlacementOpen(false);
        toast({ title: "ゲストを追加しました" });

        try {
            // V2: session_guestsに追加（セット料金も自動作成される）
            await addGuestToSessionV2(sessionId, profile.id);

            // バックグラウンドで最新データを取得（loading表示なし）
            await loadAllData(true);
            onUpdate?.();
        } catch (error) {
            console.error(error);
            // エラー時は元の状態に戻す
            setSession((prev: any) => ({
                ...prev!,
                guest_count: session.guest_count || 0,
                session_guests: (prev?.session_guests || []).filter((sg: any) => sg.id !== tempGuestId),
            }));
            setIsPlacementOpen(true);
            toast({ title: "追加に失敗しました" });
        }
    };

    const handleRemoveGuest = async (sessionGuestId: string) => {
        if (!sessionId || !session) return;

        // V2: session_guestsから対象を探す
        const deletedGuest = session.session_guests?.find((sg: any) => sg.id === sessionGuestId);
        if (!deletedGuest) return;

        const guestId = deletedGuest.guest_id;
        const newGuestCount = Math.max(0, (session.guest_count || 0) - 1);

        // 楽観的UI: 即座にローカル状態を更新
        setSession((prev: any) => ({
            ...prev!,
            guest_count: newGuestCount,
            session_guests: (prev?.session_guests || []).filter((sg: any) => sg.id !== sessionGuestId),
        }));
        setEditGuestCount(newGuestCount);

        // 楽観的UI: このゲストのセット料金を削除
        const updatedOrders = orders.filter(o => !(o.name === 'セット料金' && o.castId === guestId));
        setOrders(updatedOrders);

        toast({ title: "ゲストを削除しました" });

        try {
            // V2: session_guestsから削除（セット料金とキャスト料金も自動削除される）
            await removeGuestFromSessionV2(sessionId, guestId);

            // バックグラウンドで最新データを取得（loading表示なし）
            await loadAllData(true);
            onUpdate?.();
        } catch (error) {
            console.error(error);
            // エラー時は元の状態に戻す
            if (deletedGuest) {
                setSession((prev: any) => ({
                    ...prev!,
                    guest_count: session.guest_count || 0,
                    session_guests: [...(prev?.session_guests || []), deletedGuest],
                }));
            }
            toast({ title: "削除に失敗しました" });
        }
    };


    if (!session) {
        return null;
    }

    const table = tables.find(t => t.id === session.table_id);
    const tableName = table?.name || "不明";

    // Get guest entries from session_guests (V2 structure)
    const guestAssignments = (session.session_guests || []).map((sg: any) => ({
        id: sg.id,
        guest_id: sg.guest_id,
        profiles: sg.profiles,
    }));

    return (
        <>
            {/* 印刷専用レイアウト */}
            <div className="hidden print:block print-slip">
                <style jsx global>{`
                    @media print {
                        body * {
                            visibility: hidden;
                        }
                        .print-slip, .print-slip * {
                            visibility: visible;
                        }
                        .print-slip {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                            padding: 20mm;
                        }
                        @page {
                            size: A4;
                            margin: 0;
                        }
                    }
                `}</style>
                <div className="max-w-[180mm] mx-auto bg-white p-8">
                    {/* ヘッダー */}
                    <div className="text-center mb-6">
                        <h1 className="text-3xl font-bold mb-2" style={{ color: '#1e40af' }}>御会計表</h1>
                        <div className="text-right text-sm">No. {session.id.slice(0, 8)}</div>
                    </div>

                    {/* 基本情報テーブル */}
                    <table className="w-full border-2 border-black mb-6" style={{ borderCollapse: 'collapse' }}>
                        <tbody>
                            <tr>
                                <td className="border border-black px-2 py-1 w-16">年</td>
                                <td className="border border-black px-2 py-1 w-16">月</td>
                                <td className="border border-black px-2 py-1 w-16">日</td>
                                <td className="border border-black px-2 py-1">テーブルNo.</td>
                                <td className="border border-black px-2 py-1">係名</td>
                            </tr>
                            <tr>
                                <td className="border border-black px-2 py-2">{new Date(session.start_time).getFullYear()}</td>
                                <td className="border border-black px-2 py-2">{new Date(session.start_time).getMonth() + 1}</td>
                                <td className="border border-black px-2 py-2">{new Date(session.start_time).getDate()}</td>
                                <td className="border border-black px-2 py-2">{tableName}</td>
                                <td className="border border-black px-2 py-2"></td>
                            </tr>
                            <tr>
                                <td className="border border-black px-2 py-1" colSpan={2}>入店時間<br /><span className="text-2xl">:</span></td>
                                <td className="border border-black px-2 py-1" colSpan={2}>退店時間<br /><span className="text-2xl">:</span></td>
                                <td className="border border-black px-2 py-1 text-right" rowSpan={5}>
                                    <div className="flex items-center justify-end">
                                        <span className="text-2xl font-bold mr-1">{session.guest_count}</span>
                                        <span>名様</span>
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <td className="border border-black px-2 py-2 text-center text-xl" colSpan={2}>
                                    {startTime || new Date(session.start_time).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                                </td>
                                <td className="border border-black px-2 py-2 text-center text-xl" colSpan={2}>
                                    {endTime || (session.end_time ? new Date(session.end_time).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : '')}
                                </td>
                            </tr>
                            {[...Array(3)].map((_, i) => {
                                const pricingSystem = getSelectedPricingSystem();
                                const labels = ['同伴入店', '初回料金', '', ''];
                                const label = labels[i] || '';
                                return (
                                    <tr key={i}>
                                        <td className="border border-black px-2 py-1" colSpan={2}>{label}（　　分）</td>
                                        <td className="border border-black px-2 py-2 text-center">×</td>
                                        <td className="border border-black px-2 py-2"></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {/* 指名・場内指名 */}
                    <table className="w-full border-2 border-black mb-4" style={{ borderCollapse: 'collapse' }}>
                        <tbody>
                            <tr>
                                <td className="border border-black px-2 py-2 w-24">指名</td>
                                <td className="border border-black px-2 py-2"></td>
                                <td className="border border-black px-2 py-2 text-right w-32">名×</td>
                            </tr>
                            <tr>
                                <td className="border border-black px-2 py-2">場内指名</td>
                                <td className="border border-black px-2 py-2"></td>
                                <td className="border border-black px-2 py-2 text-right">名×</td>
                            </tr>
                        </tbody>
                    </table>

                    {/* オーダー */}
                    <table className="w-full border-2 border-black mb-4" style={{ borderCollapse: 'collapse' }}>
                        <tbody>
                            <tr>
                                <td className="border border-black px-2 py-2 font-bold" colSpan={3}>オーダー</td>
                            </tr>
                            {orders.filter(o => !o.hide_from_slip && !o.name.includes('料金') && !o.name.includes('割引')).map((order, index) => (
                                <tr key={order.id}>
                                    <td className="border border-black px-2 py-2">{order.name}</td>
                                    <td className="border border-black px-2 py-2 text-right">{order.quantity}</td>
                                    <td className="border border-black px-2 py-2 text-right w-32">¥{(order.price * order.quantity).toLocaleString()}</td>
                                </tr>
                            ))}
                            {[...Array(Math.max(0, 8 - orders.filter(o => !o.hide_from_slip && !o.name.includes('料金') && !o.name.includes('割引')).length))].map((_, i) => (
                                <tr key={`empty-${i}`}>
                                    <td className="border border-black px-2 py-2">&nbsp;</td>
                                    <td className="border border-black px-2 py-2"></td>
                                    <td className="border border-black px-2 py-2"></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* 合計 */}
                    <table className="w-full border-2 border-black" style={{ borderCollapse: 'collapse' }}>
                        <tbody>
                            <tr>
                                <td className="border border-black px-2 py-2 font-bold">小　　　計</td>
                                <td className="border border-black px-2 py-2 text-right w-40">¥{calculateSubtotal().toLocaleString()}</td>
                            </tr>
                            <tr>
                                <td className="border border-black px-2 py-2">TAX・サービス料　＋　　　　％</td>
                                <td className="border border-black px-2 py-2 text-right">¥{(calculateServiceCharge() + calculateTax()).toLocaleString()}</td>
                            </tr>
                            <tr>
                                <td className="border border-black px-2 py-2">クレジットカード手数料　＋　　　　％</td>
                                <td className="border border-black px-2 py-2 text-right"></td>
                            </tr>
                            <tr>
                                <td className="border border-black px-2 py-3 text-xl font-bold">合計</td>
                                <td className="border border-black px-2 py-3 text-right text-xl font-bold">¥{calculateRoundedTotal().toLocaleString()}</td>
                            </tr>
                            {storeSettings?.slip_rounding_enabled && calculateDifference() !== 0 && (
                                <tr>
                                    <td className="border border-black px-2 py-2 text-sm text-gray-600">金額丸め適用</td>
                                    <td className="border border-black px-2 py-2 text-right text-sm text-gray-600">
                                        {calculateDifference() > 0 ? '+' : ''}¥{calculateDifference().toLocaleString()}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }} modal={true}>
                <DialogContent
                    className="p-0 overflow-hidden flex flex-col max-h-[90vh] rounded-2xl"
                    onPointerDownOutside={(e) => {
                        if (preventOutsideClose) {
                            e.preventDefault();
                        }
                        e.stopPropagation();
                    }}
                    onInteractOutside={(e) => {
                        if (preventOutsideClose) {
                            e.preventDefault();
                        }
                        e.stopPropagation();
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <DialogHeader className="sticky top-0 z-10 bg-white dark:bg-gray-900 flex !flex-row items-center gap-2 h-14 min-h-[3.5rem] flex-shrink-0 border-b border-gray-200 dark:border-gray-700 px-4 no-print">
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onClose(); }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 transition-colors"
                            aria-label="戻る"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <DialogTitle className="flex-1 text-center text-lg font-semibold text-gray-900 dark:text-white truncate">
                            {editable ? `${tableName} - 伝票詳細` : "伝票詳細"}
                        </DialogTitle>
                        <div className="flex items-center">
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="p-1 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors no-print"
                                aria-label="印刷"
                            >
                                <Printer className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                            </button>
                            {editable ? (
                                <DropdownMenu modal={false}>
                                    <DropdownMenuTrigger asChild>
                                        <button
                                            type="button"
                                            className="p-1 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors no-print"
                                            aria-label="メニュー"
                                        >
                                            <MoreHorizontal className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="bg-white dark:bg-gray-900 border-gray-200 dark:border-white/10 z-[300] p-1">
                                        <button
                                            type="button"
                                            onClick={() => setIsDeleteDialogOpen(true)}
                                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            削除
                                        </button>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            ) : (
                                <div className="w-7" />
                            )}
                        </div>
                    </DialogHeader>

                    {loading ? (
                        <div className="py-8 text-center text-muted-foreground flex-1">
                            読み込み中...
                        </div>
                    ) : (
                        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 pt-4">
                        <div className="space-y-3 pb-4 font-mono text-sm print-content">
                            {/* Header Info */}
                            <div className="border rounded-lg p-3 bg-muted/30 relative">
                                {isEditingHeader ? (
                                    <div className="grid grid-cols-1 gap-3">
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">日付</Label>
                                                <Input
                                                    type="date"
                                                    value={editDate}
                                                    onChange={(e) => setEditDate(e.target.value)}
                                                    className="h-10 text-base"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">人数</Label>
                                                <div className="h-9 text-base flex items-center px-3 bg-muted rounded-md">
                                                    {editGuestCount || 0}名
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">テーブル</Label>
                                                <Select value={editTableId} onValueChange={setEditTableId}>
                                                    <SelectTrigger className="h-10 text-base">
                                                        <SelectValue placeholder="テーブルを選択" />
                                                    </SelectTrigger>
                                                    <SelectContent className="z-[100]" position="popper" sideOffset={4}>
                                                        {tables.map((table) => (
                                                            <SelectItem key={table.id} value={table.id}>
                                                                {table.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div>
                                                <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">料金システム</Label>
                                                <Select value={editPricingSystemId} onValueChange={setEditPricingSystemId}>
                                                    <SelectTrigger className="h-10 text-base">
                                                        <SelectValue placeholder="選択" />
                                                    </SelectTrigger>
                                                    <SelectContent className="z-[100]" position="popper" sideOffset={4}>
                                                        <SelectItem value="none">なし</SelectItem>
                                                        {pricingSystems.map((ps) => (
                                                            <SelectItem key={ps.id} value={ps.id}>
                                                                {ps.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">入店時間</Label>
                                                <Input
                                                    type="time"
                                                    value={startTime}
                                                    onChange={(e) => setStartTime(e.target.value)}
                                                    className="h-10 text-base"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">退店時間</Label>
                                                <Input
                                                    type="time"
                                                    value={endTime}
                                                    onChange={(e) => setEndTime(e.target.value)}
                                                    className="h-10 text-base"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 mt-3">
                                            <Button
                                                className="h-11 text-blue-600 border-blue-600 hover:bg-blue-50 hover:text-blue-700"
                                                variant="outline"
                                                onClick={handleRecalculate}
                                                disabled={isRecalculating}
                                            >
                                                {isRecalculating ? "再計算中..." : "再計算"}
                                            </Button>
                                            <Button
                                                className="h-11 bg-blue-600 text-white hover:bg-blue-700"
                                                onClick={handleSaveHeader}
                                            >
                                                保存
                                            </Button>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            className="w-full mt-2 h-10"
                                            onClick={handleCancelEdit}
                                        >
                                            キャンセル
                                        </Button>
                                    </div>
                                ) : (
                                    <div
                                        className={`flex items-center gap-3 ${editable ? 'cursor-pointer' : ''}`}
                                        onClick={() => editable && setIsEditingHeader(true)}
                                    >
                                        <div className="flex-1 grid gap-3 text-sm">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <div className="text-muted-foreground text-xs mb-1">日付</div>
                                                    <div className="font-medium text-sm">{new Date(session.start_time).toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' })}</div>
                                                </div>
                                                <div>
                                                    <div className="text-muted-foreground text-xs mb-1">人数</div>
                                                    <div className="font-medium text-sm">{session.guest_count || 0}名</div>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <div className="text-muted-foreground text-xs mb-1">テーブル</div>
                                                    <div className="font-medium text-sm">{tables.find(t => t.id === session.table_id)?.name || '-'}</div>
                                                </div>
                                                <div>
                                                    <div className="text-muted-foreground text-xs mb-1">料金システム</div>
                                                    {session.pricing_system_id ? (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const ps = pricingSystems.find(p => p.id === session.pricing_system_id);
                                                                if (ps) {
                                                                    setSelectedPricingSystemForEdit(ps);
                                                                    setIsPricingSystemModalOpen(true);
                                                                }
                                                            }}
                                                            className="font-medium text-sm text-blue-600 dark:text-blue-400 hover:underline text-left"
                                                        >
                                                            {pricingSystems.find(p => p.id === session.pricing_system_id)?.name || '-'}
                                                        </button>
                                                    ) : (
                                                        <div className="font-medium text-sm">-</div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <div className="text-muted-foreground text-xs mb-1">入店</div>
                                                    <div className="font-medium text-sm">{startTime}</div>
                                                </div>
                                                <div>
                                                    <div className="text-muted-foreground text-xs mb-1">退店</div>
                                                    <div className="font-medium text-sm">{endTime}</div>
                                                </div>
                                            </div>
                                        </div>
                                        {editable && (
                                            <ChevronRight className="h-5 w-5 text-muted-foreground no-print" />
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Guests Section with Set Fee */}
                            <div className="border rounded-lg overflow-hidden relative">
                                <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b">
                                    <div className="flex items-center gap-3">
                                        <span className="font-medium text-xs">セット料金</span>
                                        {editable && isEditingHeader ? (
                                            <div className="flex items-center gap-1 text-xs">
                                                <Input
                                                    type="time"
                                                    value={startTime}
                                                    onChange={(e) => setStartTime(e.target.value)}
                                                    className="w-24 h-7 text-xs"
                                                />
                                                <span>〜</span>
                                                <Input
                                                    type="time"
                                                    value={endTime}
                                                    onChange={(e) => setEndTime(e.target.value)}
                                                    className="w-24 h-7 text-xs"
                                                />
                                            </div>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">
                                                {startTime && `${startTime}`}{endTime && ` 〜 ${endTime}`}
                                            </span>
                                        )}
                                    </div>
                                    {editable && (
                                        <div className="flex items-center gap-1 no-print">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleAddGuest();
                                                }}
                                            >
                                                <UserPlus className="h-5 w-5" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                                <div className="divide-y">
                                    {guestAssignments.length > 0 ? (
                                        guestAssignments.map((assignment: any) => {
                                            // このゲストのセット料金オーダーを検索
                                            const guestSetFeeOrder = orders.find(
                                                o => o.name === 'セット料金' && o.castId === assignment.guest_id
                                            );
                                            // ゲスト別セット料金がない場合、通常のセット料金を参照
                                            const generalSetFeeOrder = orders.find(
                                                o => o.name === 'セット料金' && !o.castId
                                            );
                                            const setFeeAmount = guestSetFeeOrder?.price ?? generalSetFeeOrder?.price ?? 0;
                                            const isEditingSet = editingGuestIds.includes(assignment.id);

                                            return (
                                                <div key={assignment.id} className="px-3 py-2 space-y-1">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <Avatar className="h-6 w-6">
                                                                <AvatarImage src={assignment.profiles?.avatar_url} />
                                                                <AvatarFallback className="text-[10px]">
                                                                    {assignment.profiles?.display_name?.[0] || "?"}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <span className="text-xs font-medium">{assignment.profiles?.display_name || "不明"}</span>
                                                        </div>
                                                        {editable && isEditingSet && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveGuest(assignment.id)}
                                                                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-red-500 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20 no-print"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                    {/* Set Fee for this guest */}
                                                    <div className="flex items-center justify-between pl-8 text-xs text-muted-foreground">
                                                        <span>セット料金</span>
                                                        <div className="flex items-center gap-2">
                                                            {editable && isEditingSet ? (
                                                                <div className="flex items-center gap-1">
                                                                    <span>¥</span>
                                                                    <Input
                                                                        type="number"
                                                                        min={0}
                                                                        value={editingOrderValues[assignment.id]?.amount ?? setFeeAmount}
                                                                        onChange={(e) => {
                                                                            const newAmount = parseInt(e.target.value) || 0;
                                                                            setEditingOrderValues(prev => ({
                                                                                ...prev,
                                                                                [assignment.id]: { ...prev[assignment.id], amount: newAmount }
                                                                            }));
                                                                        }}
                                                                        className="w-20 h-8 text-base text-right"
                                                                    />
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                                        onClick={async () => {
                                                                            const newAmount = editingOrderValues[assignment.id]?.amount ?? setFeeAmount;
                                                                            await handleUpdateGuestSetFeeAmount(assignment.guest_id, newAmount);
                                                                            setEditingGuestIds(prev => prev.filter(id => id !== assignment.id));
                                                                            setEditingOrderValues(prev => {
                                                                                const newValues = { ...prev };
                                                                                delete newValues[assignment.id];
                                                                                return newValues;
                                                                            });
                                                                        }}
                                                                    >
                                                                        <Check className="h-3 w-3" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-6 w-6"
                                                                        onClick={() => {
                                                                            setEditingGuestIds(prev => prev.filter(id => id !== assignment.id));
                                                                            setEditingOrderValues(prev => {
                                                                                const newValues = { ...prev };
                                                                                delete newValues[assignment.id];
                                                                                return newValues;
                                                                            });
                                                                        }}
                                                                    >
                                                                        <X className="h-3 w-3" />
                                                                    </Button>
                                                                </div>
                                                            ) : (
                                                                <div
                                                                    className={`flex items-center gap-2 ${editable ? 'cursor-pointer' : ''}`}
                                                                    onClick={() => editable && setEditingGuestIds(prev => [...prev, assignment.id])}
                                                                >
                                                                    <span>¥{setFeeAmount.toLocaleString()}</span>
                                                                    {editable && (
                                                                        <ChevronRight className="h-4 w-4 text-muted-foreground no-print" />
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                                            ゲストが登録されていません
                                        </div>
                                    )}
                                </div>
                                {/* Total Set Fee */}
                                {guestAssignments.length > 0 && (
                                    <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-t text-xs">
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">セット料金 合計</span>
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                            ¥{guestAssignments.reduce((total: number, assignment: any) => {
                                                const guestSetFeeOrder = orders.find(
                                                    o => o.name === 'セット料金' && o.castId === assignment.guest_id
                                                );
                                                const generalSetFeeOrder = orders.find(
                                                    o => o.name === 'セット料金' && !o.castId
                                                );
                                                const setFeeAmount = guestSetFeeOrder?.price ?? generalSetFeeOrder?.price ?? 0;
                                                return total + setFeeAmount;
                                            }, 0).toLocaleString()}
                                        </span>
                                    </div>
                                )}
                            </div>



                            {/* Extension Fee Section - Only show if editable */}
                            {/* Extension Fee Section - Only show if editable */}
                            {
                                editable && (
                                    <div className="border rounded-lg overflow-hidden relative">
                                        <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b">
                                            <span className="font-medium text-xs">延長料金</span>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={handleAddExtensionFee}
                                                    disabled={isAddingOrder}
                                                >
                                                    <Plus className="h-5 w-5" />
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="divide-y">
                                            {orders
                                                .filter(o => o.name === '延長料金')
                                                .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                                                .map((order, index) => {
                                                    const isEditing = editingExtensionFeeIds.includes(order.id);
                                                    return (
                                                        <div key={order.id} className="p-3 space-y-3">
                                                            <div
                                                                className={`flex justify-between text-xs items-center ${!isEditing ? 'cursor-pointer' : ''}`}
                                                                onClick={() => !isEditing && setEditingExtensionFeeIds(prev => [...prev, order.id])}
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{order.name} {index + 1}</span>
                                                                    <span className="text-muted-foreground">({order.quantity}名 × ¥{order.price.toLocaleString()})</span>
                                                                    <span>¥{(order.price * order.quantity).toLocaleString()}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2 ml-auto">
                                                                    {!isEditing ? (
                                                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                                    ) : (
                                                                        <>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-6 w-6 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                                                onClick={async (e) => {
                                                                                    e.stopPropagation();
                                                                                    await handleSaveOrder(order.id, true);
                                                                                    setEditingExtensionFeeIds(prev => prev.filter(id => id !== order.id));
                                                                                }}
                                                                            >
                                                                                <Save className="h-3 w-3" />
                                                                            </Button>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-6 w-6"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setEditingExtensionFeeIds(prev => prev.filter(id => id !== order.id));
                                                                                }}
                                                                            >
                                                                                <X className="h-3 w-3" />
                                                                            </Button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleDeleteOrder(order.id, `${order.name} ${index + 1}`);
                                                                                }}
                                                                                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-red-500 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                                                                            >
                                                                                <Trash2 className="h-4 w-4" />
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {isEditing ? (
                                                                <div className="grid grid-cols-3 gap-2">
                                                                    <div>
                                                                        <Label className="text-xs font-medium text-gray-700 dark:text-gray-200">人数</Label>
                                                                        <Input
                                                                            type="number"
                                                                            value={editingOrderValues[order.id]?.quantity ?? order.quantity}
                                                                            className="h-10 text-base"
                                                                            onChange={(e) => handleEditOrderChange(order.id, 'quantity', parseInt(e.target.value) || 0)}
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <Label className="text-xs font-medium text-gray-700 dark:text-gray-200">開始</Label>
                                                                        <Input
                                                                            type="time"
                                                                            value={feeSchedule[order.id]?.start || ""}
                                                                            readOnly
                                                                            className="h-10 text-base bg-muted"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <Label className="text-xs font-medium text-gray-700 dark:text-gray-200">終了</Label>
                                                                        <Input
                                                                            type="time"
                                                                            value={feeSchedule[order.id]?.end || ""}
                                                                            readOnly
                                                                            className="h-10 text-base bg-muted"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="grid grid-cols-3 gap-2 text-sm">
                                                                    <div>
                                                                        <div className="text-muted-foreground text-xs">人数</div>
                                                                        <div>{order.quantity}名</div>
                                                                    </div>
                                                                    <div>
                                                                        <div className="text-muted-foreground text-xs">開始</div>
                                                                        <div>{feeSchedule[order.id]?.start || "-"}</div>
                                                                    </div>
                                                                    <div>
                                                                        <div className="text-muted-foreground text-xs">終了</div>
                                                                        <div>{feeSchedule[order.id]?.end || "-"}</div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    </div>
                                )
                            }

                            {/* Menu Section */}
                            <div className="border rounded-lg overflow-hidden relative">
                                <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b">
                                    <span className="font-medium text-xs">メニュー</span>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={() => setIsQuickOrderOpen(true)}
                                        >
                                            <Plus className="h-5 w-5" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="divide-y">
                                    {orders
                                        .filter(o => {
                                            // メニューセクション: menu_idがあるもの（通常のメニューオーダー）のみ表示
                                            // セット料金、延長料金、指名料、場内料金は除外
                                            const specialFeeNames = ['セット料金', '延長料金', '指名料', '場内料金'];
                                            return o.menu_id !== null && !specialFeeNames.includes(o.name);
                                        })
                                        .map(order => {
                                            const isEditing = editingDrinkIds.includes(order.id);
                                            return (
                                                <div
                                                    key={order.id}
                                                    className={`p-3 flex justify-between items-center ${!isEditing ? 'cursor-pointer' : ''}`}
                                                    onClick={() => !isEditing && setEditingDrinkIds(prev => [...prev, order.id])}
                                                >
                                                    <div className="space-y-1 flex-1">
                                                        <div className="text-xs font-medium">{order.name}</div>
                                                        <div className="text-xs text-muted-foreground">
                                                            ¥{order.price.toLocaleString()} × {order.quantity}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3 ml-auto">
                                                        {isEditing ? (
                                                            <>
                                                                <div className="w-20">
                                                                    <Input
                                                                        type="number"
                                                                        value={editingOrderValues[order.id]?.quantity ?? order.quantity}
                                                                        className="h-10 text-base"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        onChange={(e) => handleEditOrderChange(order.id, 'quantity', parseInt(e.target.value) || 0)}
                                                                    />
                                                                </div>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                                    onClick={async (e) => {
                                                                        e.stopPropagation();
                                                                        await handleSaveOrder(order.id);
                                                                        setEditingDrinkIds(prev => prev.filter(id => id !== order.id));
                                                                    }}
                                                                >
                                                                    <Save className="h-5 w-5" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-6 w-6"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setEditingDrinkIds(prev => prev.filter(id => id !== order.id));
                                                                    }}
                                                                >
                                                                    <X className="h-3 w-3" />
                                                                </Button>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDeleteOrder(order.id, order.name);
                                                                    }}
                                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-red-500 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <div className="font-medium text-sm">
                                                                    ¥{(order.price * order.quantity).toLocaleString()}
                                                                </div>
                                                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>

                            {/* Nomination Section */}
                            <div className="border rounded-lg overflow-hidden relative">
                                <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b">
                                    <span className="font-medium text-xs">指名</span>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={handleAddNominationFee}
                                            disabled={isAddingOrder}
                                        >
                                            <Plus className="h-5 w-5" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="divide-y">
                                    {orders
                                        .filter(o => o.name === '指名料')
                                        .map(order => {
                                            const isEditing = editingNominationIds.includes(order.id);
                                            const formatTime = (timeStr: string | null | undefined) => {
                                                if (!timeStr) return "-";
                                                try {
                                                    return new Date(timeStr).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
                                                } catch {
                                                    return "-";
                                                }
                                            };
                                            // ゲスト名を取得
                                            const guestName = order.guestId
                                                ? session?.session_guests?.find((sg: any) => sg.guest_id === order.guestId)?.profiles?.display_name
                                                : null;
                                            return (
                                                <div key={order.id} className="p-3 space-y-3">
                                                    <div
                                                        className={`flex justify-between items-center ${!isEditing ? 'cursor-pointer' : ''}`}
                                                        onClick={() => {
                                                            if (!isEditing) {
                                                                setEditingNominationIds(prev => [...prev, order.id]);
                                                                setEditingOrderValues(prev => ({
                                                                    ...prev,
                                                                    [order.id]: {
                                                                        quantity: order.quantity,
                                                                        amount: order.price,
                                                                        castId: order.castId || "none",
                                                                        guestId: order.guestId || "none",
                                                                        startTime: order.startTime ? new Date(order.startTime).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }) : "",
                                                                        endTime: order.endTime ? new Date(order.endTime).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }) : "",
                                                                    }
                                                                }));
                                                            }
                                                        }}
                                                    >
                                                        <div className="space-y-1 flex-1">
                                                            <div className="text-xs font-medium">
                                                                {order.castName ? `${order.castName}` : '指名料'}
                                                                {guestName && <span className="text-muted-foreground ml-1">→ {guestName}</span>}
                                                            </div>
                                                            {!isEditing && (
                                                                <>
                                                                    <div className="text-xs text-muted-foreground">
                                                                        ¥{order.price.toLocaleString()} × {order.quantity} = ¥{(order.price * order.quantity).toLocaleString()}
                                                                    </div>
                                                                    <div className="text-xs text-muted-foreground">
                                                                        {formatTime(order.startTime)} - {formatTime(order.endTime)}
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 ml-auto">
                                                            {!isEditing ? (
                                                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDeleteOrder(order.id, order.name);
                                                                    }}
                                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-red-500 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {isEditing && (
                                                        <div className="grid grid-cols-1 gap-2">
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <div>
                                                                    <Label className="text-xs font-medium text-gray-700 dark:text-gray-200">キャスト</Label>
                                                                    <Select
                                                                        value={editingOrderValues[order.id]?.castId || "none"}
                                                                        onValueChange={(value) => handleEditOrderChange(order.id, 'castId', value)}
                                                                    >
                                                                        <SelectTrigger className="h-10 text-base">
                                                                            <SelectValue placeholder="キャストを選択" />
                                                                        </SelectTrigger>
                                                                        <SelectContent className="z-[100]" position="popper" sideOffset={4}>
                                                                            <SelectItem value="none">なし</SelectItem>
                                                                            {casts.map((cast) => (
                                                                                <SelectItem key={cast.id} value={cast.id}>
                                                                                    {cast.display_name}
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>
                                                                <div>
                                                                    <Label className="text-xs font-medium text-gray-700 dark:text-gray-200">ゲスト</Label>
                                                                    <Select
                                                                        value={editingOrderValues[order.id]?.guestId || "none"}
                                                                        onValueChange={(value) => handleEditOrderChange(order.id, 'guestId', value)}
                                                                    >
                                                                        <SelectTrigger className="h-10 text-base">
                                                                            <SelectValue placeholder="ゲストを選択" />
                                                                        </SelectTrigger>
                                                                        <SelectContent className="z-[100]" position="popper" sideOffset={4}>
                                                                            <SelectItem value="none">なし</SelectItem>
                                                                            {(session?.session_guests || []).map((sg: any) => (
                                                                                <SelectItem key={sg.guest_id} value={sg.guest_id}>
                                                                                    {sg.profiles?.display_name || "不明"}
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <div>
                                                                    <Label className="text-xs font-medium text-gray-700 dark:text-gray-200">金額</Label>
                                                                    <Input
                                                                        type="number"
                                                                        value={editingOrderValues[order.id]?.amount ?? order.price}
                                                                        className="h-10 text-base"
                                                                        onChange={(e) => handleEditOrderChange(order.id, 'amount', parseInt(e.target.value) || 0)}
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <Label className="text-xs font-medium text-gray-700 dark:text-gray-200">数量</Label>
                                                                    <Input
                                                                        type="number"
                                                                        value={editingOrderValues[order.id]?.quantity ?? order.quantity}
                                                                        className="h-10 text-base"
                                                                        onChange={(e) => handleEditOrderChange(order.id, 'quantity', parseInt(e.target.value) || 0)}
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <div>
                                                                    <Label className="text-xs font-medium text-gray-700 dark:text-gray-200">開始時刻</Label>
                                                                    <Input
                                                                        type="time"
                                                                        value={editingOrderValues[order.id]?.startTime || ""}
                                                                        className="h-10 text-base"
                                                                        onChange={(e) => handleEditOrderChange(order.id, 'startTime', e.target.value)}
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <Label className="text-xs font-medium text-gray-700 dark:text-gray-200">終了時刻</Label>
                                                                    <Input
                                                                        type="time"
                                                                        value={editingOrderValues[order.id]?.endTime || ""}
                                                                        className="h-10 text-base"
                                                                        onChange={(e) => handleEditOrderChange(order.id, 'endTime', e.target.value)}
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-2 mt-2">
                                                                <Button
                                                                    variant="outline"
                                                                    className="h-10"
                                                                    onClick={async () => {
                                                                        await handleRecalculateFeeOrder(order.id, 'nomination');
                                                                        setEditingNominationIds(prev => prev.filter(id => id !== order.id));
                                                                    }}
                                                                >
                                                                    再計算
                                                                </Button>
                                                                <Button
                                                                    className="h-10 bg-blue-600 text-white hover:bg-blue-700"
                                                                    onClick={async () => {
                                                                        await handleSaveOrder(order.id);
                                                                        setEditingNominationIds(prev => prev.filter(id => id !== order.id));
                                                                    }}
                                                                >
                                                                    保存
                                                                </Button>
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                className="h-10 w-full text-muted-foreground"
                                                                onClick={() => setEditingNominationIds(prev => prev.filter(id => id !== order.id))}
                                                            >
                                                                キャンセル
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>

                            {/* Douhan Section */}
                            <div className="border rounded-lg overflow-hidden relative">
                                <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b">
                                    <span className="font-medium text-xs">同伴</span>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={handleAddDouhanFee}
                                            disabled={isAddingOrder}
                                        >
                                            <Plus className="h-5 w-5" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="divide-y">
                                    {orders
                                        .filter(o => o.name === '同伴料')
                                        .map(order => {
                                            const isEditing = editingDouhanIds.includes(order.id);
                                            const formatTime = (timeStr: string | null | undefined) => {
                                                if (!timeStr) return "-";
                                                try {
                                                    return new Date(timeStr).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
                                                } catch {
                                                    return "-";
                                                }
                                            };
                                            // ゲスト名を取得
                                            const guestName = order.guestId
                                                ? session?.session_guests?.find((sg: any) => sg.guest_id === order.guestId)?.profiles?.display_name
                                                : null;
                                            return (
                                                <div key={order.id} className="p-3 space-y-3">
                                                    <div
                                                        className={`flex justify-between items-center ${!isEditing ? 'cursor-pointer' : ''}`}
                                                        onClick={() => {
                                                            if (!isEditing) {
                                                                setEditingDouhanIds(prev => [...prev, order.id]);
                                                                setEditingOrderValues(prev => ({
                                                                    ...prev,
                                                                    [order.id]: {
                                                                        quantity: order.quantity,
                                                                        amount: order.price,
                                                                        castId: order.castId || "none",
                                                                        guestId: order.guestId || "none",
                                                                        startTime: order.startTime ? new Date(order.startTime).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }) : "",
                                                                        endTime: order.endTime ? new Date(order.endTime).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }) : "",
                                                                    }
                                                                }));
                                                            }
                                                        }}
                                                    >
                                                        <div className="space-y-1 flex-1">
                                                            <div className="text-xs font-medium">
                                                                {order.castName ? `${order.castName}` : '同伴料'}
                                                                {guestName && <span className="text-muted-foreground ml-1">→ {guestName}</span>}
                                                            </div>
                                                            {!isEditing && (
                                                                <>
                                                                    <div className="text-xs text-muted-foreground">
                                                                        ¥{order.price.toLocaleString()} × {order.quantity} = ¥{(order.price * order.quantity).toLocaleString()}
                                                                    </div>
                                                                    <div className="text-xs text-muted-foreground">
                                                                        {formatTime(order.startTime)} - {formatTime(order.endTime)}
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 ml-auto">
                                                            {!isEditing ? (
                                                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDeleteOrder(order.id, order.name);
                                                                    }}
                                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-red-500 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {isEditing && (
                                                        <div className="grid grid-cols-1 gap-2">
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <div>
                                                                    <Label className="text-xs font-medium text-gray-700 dark:text-gray-200">キャスト</Label>
                                                                    <Select
                                                                        value={editingOrderValues[order.id]?.castId || "none"}
                                                                        onValueChange={(value) => handleEditOrderChange(order.id, 'castId', value)}
                                                                    >
                                                                        <SelectTrigger className="h-10 text-base">
                                                                            <SelectValue placeholder="キャストを選択" />
                                                                        </SelectTrigger>
                                                                        <SelectContent className="z-[100]" position="popper" sideOffset={4}>
                                                                            <SelectItem value="none">なし</SelectItem>
                                                                            {casts.map((cast) => (
                                                                                <SelectItem key={cast.id} value={cast.id}>
                                                                                    {cast.display_name}
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>
                                                                <div>
                                                                    <Label className="text-xs font-medium text-gray-700 dark:text-gray-200">ゲスト</Label>
                                                                    <Select
                                                                        value={editingOrderValues[order.id]?.guestId || "none"}
                                                                        onValueChange={(value) => handleEditOrderChange(order.id, 'guestId', value)}
                                                                    >
                                                                        <SelectTrigger className="h-10 text-base">
                                                                            <SelectValue placeholder="ゲストを選択" />
                                                                        </SelectTrigger>
                                                                        <SelectContent className="z-[100]" position="popper" sideOffset={4}>
                                                                            <SelectItem value="none">なし</SelectItem>
                                                                            {(session?.session_guests || []).map((sg: any) => (
                                                                                <SelectItem key={sg.guest_id} value={sg.guest_id}>
                                                                                    {sg.profiles?.display_name || "不明"}
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <div>
                                                                    <Label className="text-xs font-medium text-gray-700 dark:text-gray-200">金額</Label>
                                                                    <Input
                                                                        type="number"
                                                                        value={editingOrderValues[order.id]?.amount ?? order.price}
                                                                        className="h-10 text-base"
                                                                        onChange={(e) => handleEditOrderChange(order.id, 'amount', parseInt(e.target.value) || 0)}
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <Label className="text-xs font-medium text-gray-700 dark:text-gray-200">数量</Label>
                                                                    <Input
                                                                        type="number"
                                                                        value={editingOrderValues[order.id]?.quantity ?? order.quantity}
                                                                        className="h-10 text-base"
                                                                        onChange={(e) => handleEditOrderChange(order.id, 'quantity', parseInt(e.target.value) || 0)}
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <div>
                                                                    <Label className="text-xs font-medium text-gray-700 dark:text-gray-200">開始時刻</Label>
                                                                    <Input
                                                                        type="time"
                                                                        value={editingOrderValues[order.id]?.startTime || ""}
                                                                        className="h-10 text-base"
                                                                        onChange={(e) => handleEditOrderChange(order.id, 'startTime', e.target.value)}
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <Label className="text-xs font-medium text-gray-700 dark:text-gray-200">終了時刻</Label>
                                                                    <Input
                                                                        type="time"
                                                                        value={editingOrderValues[order.id]?.endTime || ""}
                                                                        className="h-10 text-base"
                                                                        onChange={(e) => handleEditOrderChange(order.id, 'endTime', e.target.value)}
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-2 mt-2">
                                                                <Button
                                                                    variant="outline"
                                                                    className="h-10"
                                                                    onClick={async () => {
                                                                        await handleRecalculateFeeOrder(order.id, 'douhan');
                                                                        setEditingDouhanIds(prev => prev.filter(id => id !== order.id));
                                                                    }}
                                                                >
                                                                    再計算
                                                                </Button>
                                                                <Button
                                                                    className="h-10 bg-blue-600 text-white hover:bg-blue-700"
                                                                    onClick={async () => {
                                                                        await handleSaveOrder(order.id);
                                                                        setEditingDouhanIds(prev => prev.filter(id => id !== order.id));
                                                                    }}
                                                                >
                                                                    保存
                                                                </Button>
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                className="h-10 w-full text-muted-foreground"
                                                                onClick={() => setEditingDouhanIds(prev => prev.filter(id => id !== order.id))}
                                                            >
                                                                キャンセル
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>

                            {/* Companion Section */}
                            <div className="border rounded-lg overflow-hidden relative">
                                <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b">
                                    <span className="font-medium text-xs">場内指名</span>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={handleAddCompanionFee}
                                            disabled={isAddingOrder}
                                        >
                                            <Plus className="h-5 w-5" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="divide-y">
                                    {orders
                                        .filter(o => o.name === '場内料金')
                                        .map(order => {
                                            const isEditing = editingCompanionIds.includes(order.id);
                                            const formatTime = (timeStr: string | null | undefined) => {
                                                if (!timeStr) return "-";
                                                try {
                                                    return new Date(timeStr).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
                                                } catch {
                                                    return "-";
                                                }
                                            };
                                            // ゲスト名を取得
                                            const guestName = order.guestId
                                                ? session?.session_guests?.find((sg: any) => sg.guest_id === order.guestId)?.profiles?.display_name
                                                : null;
                                            return (
                                                <div key={order.id} className="p-3 space-y-3">
                                                    <div
                                                        className={`flex justify-between items-center ${!isEditing ? 'cursor-pointer' : ''}`}
                                                        onClick={() => {
                                                            if (!isEditing) {
                                                                setEditingCompanionIds(prev => [...prev, order.id]);
                                                                setEditingOrderValues(prev => ({
                                                                    ...prev,
                                                                    [order.id]: {
                                                                        quantity: order.quantity,
                                                                        amount: order.price,
                                                                        castId: order.castId || "none",
                                                                        guestId: order.guestId || "none",
                                                                        startTime: order.startTime ? new Date(order.startTime).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }) : "",
                                                                        endTime: order.endTime ? new Date(order.endTime).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }) : "",
                                                                    }
                                                                }));
                                                            }
                                                        }}
                                                    >
                                                        <div className="space-y-1 flex-1">
                                                            <div className="text-xs font-medium">
                                                                {order.castName ? `${order.castName}` : '場内料金'}
                                                                {guestName && <span className="text-muted-foreground ml-1">→ {guestName}</span>}
                                                            </div>
                                                            {!isEditing && (
                                                                <>
                                                                    <div className="text-xs text-muted-foreground">
                                                                        ¥{order.price.toLocaleString()} × {order.quantity} = ¥{(order.price * order.quantity).toLocaleString()}
                                                                    </div>
                                                                    <div className="text-xs text-muted-foreground">
                                                                        {formatTime(order.startTime)} - {formatTime(order.endTime)}
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 ml-auto">
                                                            {!isEditing ? (
                                                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDeleteOrder(order.id, order.name);
                                                                    }}
                                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-red-500 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {isEditing && (
                                                        <div className="grid grid-cols-1 gap-2">
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <div>
                                                                    <Label className="text-xs font-medium text-gray-700 dark:text-gray-200">キャスト</Label>
                                                                    <Select
                                                                        value={editingOrderValues[order.id]?.castId || "none"}
                                                                        onValueChange={(value) => handleEditOrderChange(order.id, 'castId', value)}
                                                                    >
                                                                        <SelectTrigger className="h-10 text-base">
                                                                            <SelectValue placeholder="キャストを選択" />
                                                                        </SelectTrigger>
                                                                        <SelectContent className="z-[100]" position="popper" sideOffset={4}>
                                                                            <SelectItem value="none">なし</SelectItem>
                                                                            {casts.map((cast) => (
                                                                                <SelectItem key={cast.id} value={cast.id}>
                                                                                    {cast.display_name}
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>
                                                                <div>
                                                                    <Label className="text-xs font-medium text-gray-700 dark:text-gray-200">ゲスト</Label>
                                                                    <Select
                                                                        value={editingOrderValues[order.id]?.guestId || "none"}
                                                                        onValueChange={(value) => handleEditOrderChange(order.id, 'guestId', value)}
                                                                    >
                                                                        <SelectTrigger className="h-10 text-base">
                                                                            <SelectValue placeholder="ゲストを選択" />
                                                                        </SelectTrigger>
                                                                        <SelectContent className="z-[100]" position="popper" sideOffset={4}>
                                                                            <SelectItem value="none">なし</SelectItem>
                                                                            {(session?.session_guests || []).map((sg: any) => (
                                                                                <SelectItem key={sg.guest_id} value={sg.guest_id}>
                                                                                    {sg.profiles?.display_name || "不明"}
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <div>
                                                                    <Label className="text-xs font-medium text-gray-700 dark:text-gray-200">金額</Label>
                                                                    <Input
                                                                        type="number"
                                                                        value={editingOrderValues[order.id]?.amount ?? order.price}
                                                                        className="h-10 text-base"
                                                                        onChange={(e) => handleEditOrderChange(order.id, 'amount', parseInt(e.target.value) || 0)}
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <Label className="text-xs font-medium text-gray-700 dark:text-gray-200">数量</Label>
                                                                    <Input
                                                                        type="number"
                                                                        value={editingOrderValues[order.id]?.quantity ?? order.quantity}
                                                                        className="h-10 text-base"
                                                                        onChange={(e) => handleEditOrderChange(order.id, 'quantity', parseInt(e.target.value) || 0)}
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <div>
                                                                    <Label className="text-xs font-medium text-gray-700 dark:text-gray-200">開始時刻</Label>
                                                                    <Input
                                                                        type="time"
                                                                        value={editingOrderValues[order.id]?.startTime || ""}
                                                                        className="h-10 text-base"
                                                                        onChange={(e) => handleEditOrderChange(order.id, 'startTime', e.target.value)}
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <Label className="text-xs font-medium text-gray-700 dark:text-gray-200">終了時刻</Label>
                                                                    <Input
                                                                        type="time"
                                                                        value={editingOrderValues[order.id]?.endTime || ""}
                                                                        className="h-10 text-base"
                                                                        onChange={(e) => handleEditOrderChange(order.id, 'endTime', e.target.value)}
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-2 mt-2">
                                                                <Button
                                                                    variant="outline"
                                                                    className="h-10"
                                                                    onClick={async () => {
                                                                        await handleRecalculateFeeOrder(order.id, 'companion');
                                                                        setEditingCompanionIds(prev => prev.filter(id => id !== order.id));
                                                                    }}
                                                                >
                                                                    再計算
                                                                </Button>
                                                                <Button
                                                                    className="h-10 bg-blue-600 text-white hover:bg-blue-700"
                                                                    onClick={async () => {
                                                                        await handleSaveOrder(order.id);
                                                                        setEditingCompanionIds(prev => prev.filter(id => id !== order.id));
                                                                    }}
                                                                >
                                                                    保存
                                                                </Button>
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                className="h-10 w-full text-muted-foreground"
                                                                onClick={() => setEditingCompanionIds(prev => prev.filter(id => id !== order.id))}
                                                            >
                                                                キャンセル
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>

                            {/* Discount Section */}
                            {editable && (
                                <div className="border rounded-lg overflow-hidden relative">
                                    <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b">
                                        <span className="font-medium text-xs">その他</span>
                                        <div className="flex items-center gap-1 no-print">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6"
                                                onClick={() => {
                                                    setDiscountName("");
                                                    setDiscountAmount(0);
                                                    setDiscountIsNegative(true);
                                                    setIsDiscountDialogOpen(true);
                                                }}
                                                disabled={isAddingOrder}
                                            >
                                                <Plus className="h-5 w-5" />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="divide-y">
                                        {orders
                                            .filter(o => {
                                                // その他を識別: menu_idがnullでitem_nameが存在し、特殊料金名でない
                                                const specialFeeNames = ['セット料金', '延長料金', '指名料', '場内料金', '同伴料', '待機', 'ヘルプ', '接客中', '終了'];
                                                return o.menu_id === null &&
                                                    o.item_name &&
                                                    !specialFeeNames.includes(o.item_name);
                                            })
                                            .map(order => {
                                                const isEditing = editingDiscountIds.includes(order.id);
                                                const totalAmount = order.price * order.quantity;
                                                const isNegative = totalAmount < 0;
                                                return (
                                                    <div
                                                        key={order.id}
                                                        className={`p-3 flex justify-between items-center ${!isEditing ? 'cursor-pointer' : ''}`}
                                                        onClick={() => {
                                                            if (!isEditing) {
                                                                setEditingDiscountIds(prev => [...prev, order.id]);
                                                                setEditingOrderValues(prev => ({
                                                                    ...prev,
                                                                    [order.id]: {
                                                                        amount: Math.abs(order.price),
                                                                    }
                                                                }));
                                                            }
                                                        }}
                                                    >
                                                        <div className="space-y-1 flex-1">
                                                            <div className="text-xs font-medium">{order.name}</div>
                                                            <div className={`text-xs ${isNegative ? 'text-red-500' : 'text-green-600'}`}>
                                                                {isNegative ? '-' : '+'}¥{Math.abs(totalAmount).toLocaleString()}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3 ml-auto">
                                                            {isEditing ? (
                                                                <>
                                                                    <div className="w-24">
                                                                        <Input
                                                                            type="number"
                                                                            value={editingOrderValues[order.id]?.amount ?? Math.abs(order.price)}
                                                                            className="h-9 text-base"
                                                                            onClick={(e) => e.stopPropagation()}
                                                                            onChange={(e) => handleEditOrderChange(order.id, 'amount', -Math.abs(parseInt(e.target.value) || 0))}
                                                                        />
                                                                    </div>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                                        onClick={async (e) => {
                                                                            e.stopPropagation();
                                                                            await handleSaveOrder(order.id);
                                                                            setEditingDiscountIds(prev => prev.filter(id => id !== order.id));
                                                                        }}
                                                                    >
                                                                        <Save className="h-5 w-5" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-6 w-6"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setEditingDiscountIds(prev => prev.filter(id => id !== order.id));
                                                                        }}
                                                                    >
                                                                        <X className="h-3 w-3" />
                                                                    </Button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleDeleteOrder(order.id, order.name);
                                                                        }}
                                                                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-red-500 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <div className="font-medium text-sm text-red-600">
                                                                        -¥{Math.abs(order.price * order.quantity).toLocaleString()}
                                                                    </div>
                                                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </div>
                            )}

                            {/* Totals Section */}
                            <div className="border-t-2 border-dashed pt-3 space-y-1">
                                <div className="flex justify-between text-xs">
                                    <span>小計</span>
                                    <span>¥{calculateSubtotal().toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span>サービス料 (20%)</span>
                                    <span>¥{calculateServiceCharge().toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span>消費税 (10%)</span>
                                    <span>¥{calculateTax().toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between font-bold text-base border-t-2 border-double pt-2 mt-2">
                                    <span>合計</span>
                                    <span>¥{calculateRoundedTotal().toLocaleString()}</span>
                                </div>
                                {storeSettings?.slip_rounding_enabled && calculateDifference() !== 0 && (
                                    <div className="flex justify-between text-xs text-gray-600 border-t pt-1">
                                        <span>金額丸め適用</span>
                                        <span>{calculateDifference() > 0 ? '+' : ''}¥{calculateDifference().toLocaleString()}</span>
                                    </div>
                                )}
                            </div>

                            {/* Checkout/Reopen Button */}
                            {editable && session && (
                                <div className="pt-4 border-t mt-4 no-print space-y-2">
                                    {session.status === "completed" ? (
                                        <Button
                                            className="w-full h-11 bg-blue-600 text-white hover:bg-blue-700"
                                            onClick={() => setIsReopenDialogOpen(true)}
                                        >
                                            <RotateCcw className="h-5 w-5 mr-2" />
                                            進行中に戻す
                                        </Button>
                                    ) : (
                                        <Button
                                            className="w-full h-11 bg-blue-600 text-white hover:bg-blue-700"
                                            onClick={() => setIsCheckoutDialogOpen(true)}
                                        >
                                            会計終了
                                        </Button>
                                    )}
                                    <Button
                                        variant="outline"
                                        className="w-full h-11"
                                        onClick={onClose}
                                    >
                                        戻る
                                    </Button>
                                </div>
                            )}

                            {/* Comments Section - shared with floor modal */}
                            {sessionId && (
                                <CommentSection
                                    targetType="session"
                                    targetId={sessionId}
                                    isOpen={isOpen}
                                />
                            )}
                        </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog >

            {/* Quick Order Modal */}
            {
                editable && session && table && (
                    <QuickOrderModal
                        session={session}
                        table={table}
                        open={isQuickOrderOpen}
                        onOpenChange={setIsQuickOrderOpen}
                        onOrderComplete={async () => {
                            await loadAllData(true);
                            onUpdate?.();
                        }}
                    />
                )
            }

            {/* Cast Placement Modal for Nomination/Companion Fee */}
            {
                editable && (
                    <PlacementModal
                        isOpen={isCastPlacementOpen}
                        onClose={() => {
                            setIsCastPlacementOpen(false);
                            // ゲスト選択中でなければselectedFeeTypeをクリア
                            if (!isGuestSelectOpen && !selectedCastForFee) {
                                setSelectedFeeType(null);
                            }
                        }}
                        onProfileSelect={handleCastSelectForFee}
                        mode="cast"
                        profiles={casts}
                    />
                )
            }

            {/* Discount Dialog - Portal to body to avoid pointer-events issues */}
            {isDiscountDialogOpen && typeof document !== 'undefined' && createPortal(
                <>
                    <div
                        className="fixed inset-0 z-[500] bg-black/50 pointer-events-auto"
                        onClick={() => {
                            setIsDiscountDialogOpen(false);
                            setDiscountName("");
                            setDiscountAmount(0);
                        }}
                    />
                    <div className="fixed inset-0 z-[501] flex items-center justify-center pointer-events-none">
                        <div className="pointer-events-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900" style={{ pointerEvents: 'auto' }}>
                            <div className="mb-4 flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsDiscountDialogOpen(false);
                                        setDiscountName("");
                                        setDiscountAmount(0);
                                    }}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                                <h2 className="flex-1 text-center text-lg font-semibold text-gray-900 dark:text-white">その他を追加</h2>
                                <div className="h-8 w-8" />
                            </div>
                            <div className="space-y-4" style={{ pointerEvents: 'auto' }}>
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">項目名</Label>
                                    <input
                                        type="text"
                                        value={discountName}
                                        onChange={(e) => setDiscountName(e.target.value)}
                                        placeholder="項目名を入力"
                                        className="flex h-11 w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-base text-gray-900 placeholder:text-gray-400 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-950 dark:text-gray-50 dark:border-gray-800"
                                        style={{ pointerEvents: 'auto' }}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">種類</Label>
                                    <div className="relative inline-flex h-10 items-center rounded-full bg-gray-100 dark:bg-gray-800 p-1">
                                        <div
                                            className="absolute h-8 rounded-full bg-white dark:bg-gray-700 shadow-sm transition-transform duration-300 ease-in-out"
                                            style={{
                                                width: "calc(50% - 4px)",
                                                left: "4px",
                                                transform: `translateX(${discountIsNegative ? 0 : 100}%)`
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setDiscountIsNegative(true)}
                                            className={`relative z-10 w-24 flex items-center justify-center h-8 rounded-full text-sm font-medium transition-colors duration-200 ${discountIsNegative ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}
                                        >
                                            引く
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setDiscountIsNegative(false)}
                                            className={`relative z-10 w-24 flex items-center justify-center h-8 rounded-full text-sm font-medium transition-colors duration-200 ${!discountIsNegative ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}
                                        >
                                            足す
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">金額</Label>
                                    <input
                                        type="number"
                                        value={discountAmount || ''}
                                        onChange={(e) => setDiscountAmount(parseInt(e.target.value) || 0)}
                                        placeholder="0"
                                        className="flex h-11 w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-base text-gray-900 placeholder:text-gray-400 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-950 dark:text-gray-50 dark:border-gray-800"
                                        min={0}
                                        style={{ pointerEvents: 'auto' }}
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <Button
                                    variant="outline"
                                    className="h-[44px]"
                                    onClick={() => {
                                        setIsDiscountDialogOpen(false);
                                        setDiscountName("");
                                        setDiscountAmount(0);
                                    }}
                                >
                                    キャンセル
                                </Button>
                                <Button
                                    className="h-[44px]"
                                    onClick={handleAddDiscount}
                                    disabled={!discountName || discountAmount <= 0 || isAddingOrder}
                                >
                                    追加
                                </Button>
                            </div>
                        </div>
                    </div>
                </>,
                document.body
            )}

            {/* Delete Confirmation Dialog - Portal to body */}
            {isDeleteDialogOpen && typeof document !== 'undefined' && createPortal(
                <>
                    <div
                        className="fixed inset-0 z-[500] bg-black/50"
                        onClick={() => !isDeleting && setIsDeleteDialogOpen(false)}
                    />
                    <div className="fixed inset-0 z-[501] flex items-center justify-center pointer-events-none">
                        <div className="pointer-events-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">伝票を削除しますか？</h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                                この操作は取り消せません。伝票と関連するセッション、注文、キャスト割り当て情報もすべて削除されます。
                            </p>
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeleting}>
                                    キャンセル
                                </Button>
                                <Button variant="destructive" onClick={handleDeleteSession} disabled={isDeleting}>
                                    {isDeleting ? "削除中..." : "削除"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </>,
                document.body
            )}

            {/* Checkout Confirmation Dialog */}
            {isCheckoutDialogOpen && typeof document !== 'undefined' && createPortal(
                <>
                    <div
                        className="fixed inset-0 z-[500] bg-black/50"
                        onClick={() => !isCheckingOut && setIsCheckoutDialogOpen(false)}
                    />
                    <div className="fixed inset-0 z-[501] flex items-center justify-center pointer-events-none">
                        <div className="pointer-events-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">会計終了</h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                                会計を確定して退店処理を行いますか？
                            </p>
                            <div className="flex flex-col gap-2">
                                <Button
                                    className="w-full bg-blue-600 text-white hover:bg-blue-700"
                                    disabled={isCheckingOut}
                                    onClick={async () => {
                                        if (!sessionId) return;
                                        setIsCheckingOut(true);
                                        try {
                                            await closeSession(sessionId);
                                            toast({ title: "会計終了しました" });
                                            setIsCheckoutDialogOpen(false);
                                            onClose();
                                            onUpdate?.();
                                        } catch (error) {
                                            console.error(error);
                                            toast({ title: "会計終了に失敗しました" });
                                        } finally {
                                            setIsCheckingOut(false);
                                        }
                                    }}
                                >
                                    {isCheckingOut ? "処理中..." : "会計終了"}
                                </Button>
                                <Button variant="outline" className="w-full" onClick={() => setIsCheckoutDialogOpen(false)} disabled={isCheckingOut}>
                                    キャンセル
                                </Button>
                            </div>
                        </div>
                    </div>
                </>,
                document.body
            )}

            {/* Reopen Confirmation Dialog */}
            {isReopenDialogOpen && typeof document !== 'undefined' && createPortal(
                <>
                    <div
                        className="fixed inset-0 z-[500] bg-black/50"
                        onClick={() => !isReopening && setIsReopenDialogOpen(false)}
                    />
                    <div className="fixed inset-0 z-[501] flex items-center justify-center pointer-events-none">
                        <div className="pointer-events-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">進行中に戻す</h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                                このセッションを進行中に戻しますか？
                            </p>
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setIsReopenDialogOpen(false)} disabled={isReopening}>
                                    キャンセル
                                </Button>
                                <Button
                                    className="bg-blue-600 text-white hover:bg-blue-700"
                                    disabled={isReopening}
                                    onClick={async () => {
                                        if (!sessionId) return;
                                        setIsReopening(true);
                                        try {
                                            await reopenSession(sessionId);
                                            toast({ title: "進行中に戻しました" });
                                            setIsReopenDialogOpen(false);
                                            await loadAllData(true);
                                            onUpdate?.();
                                        } catch (error) {
                                            console.error(error);
                                            toast({ title: "進行中に戻すのに失敗しました" });
                                        } finally {
                                            setIsReopening(false);
                                        }
                                    }}
                                >
                                    {isReopening ? "処理中..." : "進行中に戻す"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </>,
                document.body
            )}

            {/* Placement Modal for Guest Selection */}
            <PlacementModal
                isOpen={isPlacementOpen}
                onClose={() => setIsPlacementOpen(false)}
                onProfileSelect={handleGuestSelect}
                mode="guest"
                sessionId={sessionId || undefined}
                profiles={guests}
            />

            {/* Guest Selection Modal for Cast Fee (when multiple guests) */}
            {isGuestSelectOpen && typeof document !== 'undefined' && createPortal(
                <>
                    <div
                        className="fixed inset-0 z-[500] bg-black/50"
                        onClick={() => {
                            setIsGuestSelectOpen(false);
                            setSelectedCastForFee(null);
                            setSelectedFeeType(null);
                        }}
                    />
                    <div className="fixed inset-0 z-[501] flex items-center justify-center pointer-events-none">
                        <div className="pointer-events-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900">
                            <div className="mb-4 flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsGuestSelectOpen(false);
                                        setSelectedCastForFee(null);
                                        setSelectedFeeType(null);
                                    }}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                                <h2 className="flex-1 text-center text-lg font-semibold text-gray-900 dark:text-white">
                                    ゲストを選択
                                </h2>
                                <div className="h-8 w-8" />
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                {selectedCastForFee?.display_name}の{selectedCastForFee?.feeType === 'nomination' ? '指名料' : selectedCastForFee?.feeType === 'douhan' ? '同伴料' : '場内料金'}を追加するゲストを選択してください
                            </p>
                            <div className="space-y-2">
                                {(session?.session_guests || []).map((sg: any) => {
                                    const guest = sg.profiles;
                                    if (!guest) return null;
                                    return (
                                        <button
                                            key={sg.id}
                                            type="button"
                                            onClick={() => handleGuestSelectForFee(sg.guest_id)}
                                            className="w-full flex items-center gap-3 p-3 rounded-3xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                        >
                                            <Avatar className="h-10 w-10">
                                                <AvatarImage src={guest.avatar_url} />
                                                <AvatarFallback>{guest.display_name?.[0] || "?"}</AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                                {guest.display_name || "不明"}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </>,
                document.body
            )}

            {/* Pricing System Edit Modal */}
            <PricingSystemModal
                isOpen={isPricingSystemModalOpen}
                onClose={() => {
                    setIsPricingSystemModalOpen(false);
                    setSelectedPricingSystemForEdit(null);
                }}
                system={selectedPricingSystemForEdit}
                onSaved={(updatedSystem) => {
                    // Update the pricing systems list
                    setPricingSystems(prev => prev.map(ps =>
                        ps.id === updatedSystem.id ? updatedSystem : ps
                    ));
                    loadAllData(true);
                }}
                onDeleted={(deletedId) => {
                    // Remove from pricing systems list
                    setPricingSystems(prev => prev.filter(ps => ps.id !== deletedId));
                    loadAllData(true);
                }}
            />
        </>
    );
}
