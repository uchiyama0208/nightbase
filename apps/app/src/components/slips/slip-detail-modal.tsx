"use client";

import { useState, useEffect } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronLeft, Plus, MoreHorizontal, Trash2, Pencil, X, Check, Save, Printer, UserPlus } from "lucide-react";
import { getSessionById, updateSessionTimes, createOrder, updateSession, closeSession, checkoutSession, deleteSession, getMenus, getCasts, getGuests, updateOrder, deleteOrder, deleteOrdersByName, assignCast, removeCastAssignment, getStoreSettings } from "@/app/app/(main)/floor/actions";
import { PlacementModal } from "@/app/app/(main)/floor/placement-modal";
import { QuickOrderModal } from "@/app/app/(main)/floor/quick-order-modal";
import { getTables } from "@/app/app/(main)/seats/actions";
import { getPricingSystems } from "@/app/app/(main)/pricing-systems/actions";
import { Table as FloorTable } from "@/types/floor";

interface SlipDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    sessionId: string | null;
    onUpdate?: () => void;
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
    const [editingCompanionIds, setEditingCompanionIds] = useState<string[]>([]);
    const [editingGuestIds, setEditingGuestIds] = useState<string[]>([]);
    const [editingOrderValues, setEditingOrderValues] = useState<Record<string, { quantity?: number, amount?: number, castId?: string | null, startTime?: string, endTime?: string }>>({});

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
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [isAddingOrder, setIsAddingOrder] = useState(false);
    const [isRecalculating, setIsRecalculating] = useState(false);
    const [selectedFeeType, setSelectedFeeType] = useState<'nomination' | 'companion' | null>(null);
    const [isDiscountDialogOpen, setIsDiscountDialogOpen] = useState(false);
    const [discountName, setDiscountName] = useState("");
    const [discountAmount, setDiscountAmount] = useState(0);
    const [isPlacementOpen, setIsPlacementOpen] = useState(false);
    const [isCastPlacementOpen, setIsCastPlacementOpen] = useState(false);
    const [editingDiscountIds, setEditingDiscountIds] = useState<string[]>([]);
    const [storeSettings, setStoreSettings] = useState<any>(null);

    const { toast } = useToast();

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
                getSessionById(sessionId),
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
                    startTime: order.start_time || null,
                    endTime: order.end_time || null,
                    created_at: order.created_at,
                    menu_id: order.menu_id || null,
                    item_name: order.item_name || null,
                    hide_from_slip: order.menus?.hide_from_slip || false,
                }));

                setOrders(orderItems);

                // Initialize edit states
                setEditTableId(currentSession.table_id);
                setEditGuestCount(currentSession.guest_count || 0);
                // ローカル日付を取得（タイムゾーンを考慮）
                if (currentSession.start_time) {
                    const d = new Date(currentSession.start_time);
                    const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    setEditDate(localDate);
                } else {
                    setEditDate("");
                }
                setEditStartTime(currentSession.start_time ? new Date(currentSession.start_time).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }) : "");
                setEditPricingSystemId(currentSession.pricing_system_id || "none");
                setEditMainGuestId(currentSession.main_guest_id || "none");
                setStartTime(currentSession.start_time ? new Date(currentSession.start_time).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }) : "");
                setEndTime(currentSession.end_time ? new Date(currentSession.end_time).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }) : "");
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

            const oldGuestCount = session?.guest_count || 0;
            const newGuestCount = editGuestCount || 0;

            console.log("Saving times:", { editDate, startTime, endTime, newStartTime, newEndTime });

            await updateSession(sessionId, {
                tableId: editTableId,
                guestCount: editGuestCount,
                startTime: newStartTime,
                endTime: newEndTime,
                pricingSystemId: editPricingSystemId === "none" ? null : editPricingSystemId,
                mainGuestId: editMainGuestId === "none" ? null : editMainGuestId,
            });

            // 人数が変更された場合、セット料金と延長料金の人数を自動更新
            if (oldGuestCount !== newGuestCount) {
                const setFeeOrders = orders.filter(o => o.name === 'セット料金');
                const extensionFeeOrders = orders.filter(o => o.name === '延長料金');

                for (const order of setFeeOrders) {
                    if (order.quantity !== newGuestCount) {
                        await updateOrder(order.id, { quantity: newGuestCount });
                    }
                }

                for (const order of extensionFeeOrders) {
                    if (order.quantity !== newGuestCount) {
                        await updateOrder(order.id, { quantity: newGuestCount });
                    }
                }
            }

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

    const handleEditOrderChange = (orderId: string, field: 'quantity' | 'amount' | 'castId' | 'startTime' | 'endTime', value: any) => {
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
            const updates: { quantity?: number; amount?: number; castId?: string | null; startTime?: string | null; endTime?: string | null } = {};

            if (values.quantity !== undefined) updates.quantity = values.quantity;
            if (values.amount !== undefined) updates.amount = values.amount;
            if (values.castId !== undefined) updates.castId = values.castId === "none" ? null : values.castId;

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

            if (!isExtension && values.startTime) {
                const baseDate = session?.start_time
                    ? new Date(session.start_time).toISOString().slice(0, 10)
                    : new Date().toISOString().slice(0, 10);
                const newStartIso = new Date(`${baseDate}T${values.startTime}`).toISOString();
                await updateSessionTimes(sessionId!, newStartIso, session.end_time);
                setStartTime(values.startTime);
            }

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

            // 2. 既存のセット料金、延長料金、指名料を削除（場内料金は変更しない）
            await deleteOrdersByName(sessionId, "セット料金");
            await deleteOrdersByName(sessionId, "延長料金");
            await deleteOrdersByName(sessionId, "指名料");

            // 3. 人数を取得（削除後に使用）
            const guestCount = editGuestCount || 1;

            // 4. 滞在時間を計算（分単位）
            const startDate = new Date(newStartIso);
            const endDate = new Date(newEndIso);
            const durationMinutes = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60));

            // 5. 必要な料金を計算
            const setDurationMinutes = pricingSystem.set_duration_minutes || 0;
            const extensionDurationMinutes = pricingSystem.extension_duration_minutes || 0;

            if (setDurationMinutes === 0 || extensionDurationMinutes === 0) {
                toast({ title: "料金システムの設定が不正です" });
                return;
            }

            const ordersToCreate: { menuId: string; quantity: number; amount: number }[] = [];

            if (durationMinutes <= setDurationMinutes) {
                // セット料金のみ（滞在時間がセット料金の時間以内）
                ordersToCreate.push({
                    menuId: "set-fee",
                    quantity: guestCount,
                    amount: pricingSystem.set_fee,
                });
            } else {
                // セット料金を追加（最初のセット料金分）
                ordersToCreate.push({
                    menuId: "set-fee",
                    quantity: guestCount,
                    amount: pricingSystem.set_fee,
                });

                // セット料金の時間を超えた分を延長料金として計算
                const excessMinutes = durationMinutes - setDurationMinutes;
                const extensionCount = Math.ceil(excessMinutes / extensionDurationMinutes);

                // 延長料金を必要な回数分追加
                for (let i = 0; i < extensionCount; i++) {
                    ordersToCreate.push({
                        menuId: "extension-fee",
                        quantity: guestCount,
                        amount: pricingSystem.extension_fee,
                    });
                }
            }

            // 5. 新しい料金を追加
            for (const order of ordersToCreate) {
                await createOrder(sessionId, [order], null, null);
            }

            // 6. 既存の指名料からキャスト情報を取得して再作成（場内料金は変更しない）
            const nominationOrders = orders.filter(o => o.name === '指名料' && o.castId);

            // 指名セット時間を取得
            const nominationSetDurationMinutes = pricingSystem.nomination_set_duration_minutes || 60;

            // 指名料を再作成（キャストごとにグループ化）
            const nominationCastIds = [...new Set(nominationOrders.map(o => o.castId))];
            for (const castId of nominationCastIds) {
                if (!castId) continue;
                const castOrder = nominationOrders.find(o => o.castId === castId);
                const orderStartTime = castOrder?.startTime ? new Date(castOrder.startTime) : startDate;
                const orderEndTime = castOrder?.endTime ? new Date(castOrder.endTime) : endDate;
                const castDurationMinutes = Math.floor((orderEndTime.getTime() - orderStartTime.getTime()) / (1000 * 60));

                if (castDurationMinutes <= 0) continue;

                const nominationCount = Math.max(1, Math.floor(castDurationMinutes / nominationSetDurationMinutes));
                await createOrder(
                    sessionId,
                    [{ menuId: "nomination-fee", quantity: nominationCount, amount: pricingSystem.nomination_fee, startTime: castOrder?.startTime, endTime: castOrder?.endTime }],
                    null,
                    castId
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

    // 指名・場内指名の個別再計算
    const handleRecalculateFeeOrder = async (orderId: string, feeType: 'nomination' | 'companion') => {
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
        const pricingSystem = getSelectedPricingSystem();
        if (!pricingSystem) {
            toast({ title: "料金システムが設定されていません" });
            return;
        }

        const menuId = selectedFeeType === 'nomination' ? 'nomination-fee' : 'companion-fee';
        const amount = selectedFeeType === 'nomination' ? pricingSystem.nomination_fee : pricingSystem.companion_fee;
        const feeName = selectedFeeType === 'nomination' ? '指名料' : '場内料金';
        const tempId = `temp-${Date.now()}`;

        // 指名の場合のみ入店時間・退店時間を設定、場内指名は空にする
        let orderStartTime: string | null = null;
        let orderEndTime: string | null = null;
        let quantity = 0;

        if (selectedFeeType === 'nomination') {
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
                null,
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
            toast({ title: "割引名と割引額を入力してください" });
            return;
        }

        const tempId = `temp-${Date.now()}`;

        // 楽観的UI: 即座にローカル状態を更新
        const newOrder: OrderItem = {
            id: tempId,
            name: discountName,
            price: -discountAmount,
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
        setDiscountName("");
        setDiscountAmount(0);
        toast({ title: "割引を追加しました" });

        try {
            // 割引はマイナス値で保存（temp-discountでitem_nameに割引名を設定）
            await createOrder(
                sessionId,
                [{ menuId: "temp-discount", quantity: 1, amount: -savedDiscountAmount, name: savedDiscountName }],
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

        try {
            await deleteSession(sessionId);
            await loadAllData();
            setIsDeleteDialogOpen(false);
            onClose();
            toast({ title: "伝票とセッションを削除しました" });
            onUpdate?.();
        } catch (error) {
            toast({ title: "削除に失敗しました" });
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

        const tempAssignmentId = `temp-${Date.now()}`;
        const newGuestCount = (session.guest_count || 0) + 1;

        // 楽観的UI: 即座にローカル状態を更新
        const tempAssignment = {
            id: tempAssignmentId,
            cast_id: profile.id,
            guest_id: profile.id,
            status: "waiting",
            profiles: {
                display_name: profile.display_name,
                avatar_url: profile.avatar_url,
            },
        };
        setSession((prev: any) => ({
            ...prev!,
            guest_count: newGuestCount,
            cast_assignments: [...(prev?.cast_assignments || []), tempAssignment],
        }));
        setEditGuestCount(newGuestCount);

        // 楽観的UI: セット料金と延長料金の人数を即座に更新
        const updatedOrders = orders.map(order => {
            if (order.name === 'セット料金' || order.name === '延長料金') {
                return { ...order, quantity: newGuestCount };
            }
            return order;
        });
        setOrders(updatedOrders);

        setIsPlacementOpen(false);
        toast({ title: "ゲストを追加しました" });

        try {
            // ゲストをcast_assignmentsに追加（ゲスト自身として）
            await assignCast(
                sessionId,
                profile.id,
                "waiting",
                profile.id, // guestId = castId（ゲスト自身）
                null, // gridX
                null  // gridY
            );

            // 人数を更新
            await updateSession(sessionId, {
                guestCount: newGuestCount
            });

            // セット料金と延長料金の人数を自動更新（更新されたordersを使用）
            const setFeeOrders = updatedOrders.filter(o => o.name === 'セット料金');
            const extensionFeeOrders = updatedOrders.filter(o => o.name === '延長料金');

            for (const order of setFeeOrders) {
                await updateOrder(order.id, { quantity: newGuestCount });
            }

            for (const order of extensionFeeOrders) {
                await updateOrder(order.id, { quantity: newGuestCount });
            }

            // バックグラウンドで最新データを取得（loading表示なし）
            await loadAllData(true);
            onUpdate?.();
        } catch (error) {
            console.error(error);
            // エラー時は元の状態に戻す
            setSession((prev: any) => ({
                ...prev!,
                guest_count: session.guest_count || 0,
                cast_assignments: (prev?.cast_assignments || []).filter((a: any) => a.id !== tempAssignmentId),
            }));
            setIsPlacementOpen(true);
            toast({ title: "追加に失敗しました" });
        }
    };

    const handleRemoveGuest = async (assignmentId: string) => {
        if (!sessionId || !session) return;

        const deletedAssignment = session.cast_assignments?.find((a: any) => a.id === assignmentId);
        const newGuestCount = Math.max(0, (session.guest_count || 0) - 1);

        // 楽観的UI: 即座にローカル状態を更新
        setSession((prev: any) => ({
            ...prev!,
            guest_count: newGuestCount,
            cast_assignments: (prev?.cast_assignments || []).filter((a: any) => a.id !== assignmentId),
        }));
        setEditGuestCount(newGuestCount);

        // 楽観的UI: セット料金と延長料金の人数を即座に更新
        const updatedOrders = orders.map(order => {
            if (order.name === 'セット料金' || order.name === '延長料金') {
                return { ...order, quantity: newGuestCount };
            }
            return order;
        });
        setOrders(updatedOrders);

        toast({ title: "ゲストを削除しました" });

        try {
            await removeCastAssignment(assignmentId);

            // 人数を更新
            await updateSession(sessionId, {
                guestCount: newGuestCount
            });

            // セット料金と延長料金の人数を自動更新（更新されたordersを使用）
            const setFeeOrders = updatedOrders.filter(o => o.name === 'セット料金');
            const extensionFeeOrders = updatedOrders.filter(o => o.name === '延長料金');

            for (const order of setFeeOrders) {
                await updateOrder(order.id, { quantity: newGuestCount });
            }

            for (const order of extensionFeeOrders) {
                await updateOrder(order.id, { quantity: newGuestCount });
            }

            // バックグラウンドで最新データを取得（loading表示なし）
            await loadAllData(true);
            onUpdate?.();
        } catch (error) {
            console.error(error);
            // エラー時は元の状態に戻す
            if (deletedAssignment) {
                setSession((prev: any) => ({
                    ...prev!,
                    guest_count: session.guest_count || 0,
                    cast_assignments: [...(prev?.cast_assignments || []), deletedAssignment],
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

    // Get guest entries from cast_assignments (where cast_id === guest_id)
    const guestAssignments = (session.cast_assignments || []).filter(
        (assignment: any) => assignment.cast_id === assignment.guest_id && assignment.profiles
    );

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

            <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }} modal={!preventOutsideClose}>
                <DialogContent
                    className="max-w-md max-h-[90vh] flex flex-col p-4"
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
                    <DialogHeader className="flex flex-row items-center justify-between border-b pb-4 space-y-0 no-print flex-shrink-0">
                        <Button variant="ghost" size="icon" className="-ml-2" onClick={(e) => { e.stopPropagation(); onClose(); }}>
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <DialogTitle className="flex items-center gap-2">
                            {editable ? `${tableName} - 伝票詳細` : "伝票詳細"}
                        </DialogTitle>
                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => window.print()} className="no-print">
                                <Printer className="h-5 w-5" />
                            </Button>
                            {editable ? (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="-mr-2 no-print">
                                            <MoreHorizontal className="h-5 w-5" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="bg-white dark:bg-slate-900 border-gray-200 dark:border-white/10">
                                        <DropdownMenuItem
                                            className="text-destructive focus:text-destructive focus:bg-red-50 dark:focus:bg-red-900/20"
                                            onClick={() => setIsDeleteDialogOpen(true)}
                                        >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            削除
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            ) : (
                                <div className="w-10" />
                            )}
                        </div>
                    </DialogHeader>

                    {loading ? (
                        <div className="py-8 text-center text-muted-foreground flex-1">
                            読み込み中...
                        </div>
                    ) : (
                        <div className="space-y-3 pb-4 font-mono text-sm print-content flex-1 overflow-y-auto min-h-0">
                            {/* Header Info */}
                            <div className="border rounded-lg p-3 bg-muted/30 relative">
                                {editable && !isEditingHeader && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-foreground no-print"
                                        onClick={() => setIsEditingHeader(true)}
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                )}

                                {isEditingHeader ? (
                                    <div className="grid grid-cols-1 gap-3">
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <Label className="text-sm text-muted-foreground">日付</Label>
                                                <Input
                                                    type="date"
                                                    value={editDate}
                                                    onChange={(e) => setEditDate(e.target.value)}
                                                    className="h-11 text-base"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-sm text-muted-foreground">人数</Label>
                                                <div className="h-11 text-base flex items-center px-3 bg-muted rounded-md">
                                                    {editGuestCount || 0}名
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <Label className="text-sm text-muted-foreground">テーブル</Label>
                                                <Select value={editTableId} onValueChange={setEditTableId}>
                                                    <SelectTrigger className="h-11 text-base">
                                                        <SelectValue placeholder="テーブルを選択" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {tables.map((table) => (
                                                            <SelectItem key={table.id} value={table.id}>
                                                                {table.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div>
                                                <Label className="text-sm text-muted-foreground">料金システム</Label>
                                                <Select value={editPricingSystemId} onValueChange={setEditPricingSystemId}>
                                                    <SelectTrigger className="h-11 text-base">
                                                        <SelectValue placeholder="選択" />
                                                    </SelectTrigger>
                                                    <SelectContent>
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
                                                <Label className="text-sm text-muted-foreground">入店時間</Label>
                                                <Input
                                                    type="time"
                                                    value={startTime}
                                                    onChange={(e) => setStartTime(e.target.value)}
                                                    className="h-11 text-base"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-sm text-muted-foreground">退店時間</Label>
                                                <Input
                                                    type="time"
                                                    value={endTime}
                                                    onChange={(e) => setEndTime(e.target.value)}
                                                    className="h-11 text-base"
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
                                                onClick={() => {
                                                    handleSaveHeader();
                                                    setIsEditingHeader(false);
                                                }}
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
                                    <div className="grid gap-3 text-sm">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <div className="text-muted-foreground text-xs mb-1">日付</div>
                                                <div className="font-medium text-sm">{new Date(session.start_time).toLocaleDateString('ja-JP')}</div>
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
                                                <div className="font-medium text-sm">
                                                    {pricingSystems.find(p => p.id === session.pricing_system_id)?.name || '-'}
                                                </div>
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
                                )}
                            </div>

                            {/* Guests Section */}
                            {/* Guests Section */}
                            <div className="border rounded-lg overflow-hidden relative">
                                <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b">
                                    <span className="font-medium text-xs">ゲスト一覧</span>
                                    {editable && (
                                        <div className="flex items-center gap-1 no-print">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6"
                                                onClick={handleAddGuest}
                                            >
                                                <UserPlus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                                <div className="divide-y">
                                    {guestAssignments.length > 0 ? (
                                        guestAssignments.map((assignment: any) => (
                                            <div key={assignment.id} className="flex items-center justify-between px-3 py-2">
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="h-6 w-6">
                                                        <AvatarImage src={assignment.profiles?.avatar_url} />
                                                        <AvatarFallback className="text-[10px]">
                                                            {assignment.profiles?.display_name?.[0] || "?"}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <span className="text-xs">{assignment.profiles?.display_name || "不明"}</span>
                                                </div>
                                                {editable && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10 no-print"
                                                        onClick={() => handleRemoveGuest(assignment.id)}
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                                            ゲストが登録されていません
                                        </div>
                                    )}
                                </div>
                            </div>



                            {/* Set Fee Section - Only show if editable */}
                            {/* Set Fee Section - Only show if editable */}
                            {editable && (
                                <div className="border rounded-lg overflow-hidden relative">
                                    <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b">
                                        <span className="font-medium text-xs">セット料金</span>
                                        <div className="flex items-center gap-1 no-print">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6"
                                                onClick={handleAddSetFee}
                                                disabled={isAddingOrder}
                                            >
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="divide-y">
                                        {orders
                                            .filter(o => o.name === 'セット料金')
                                            .map(order => {
                                                const isEditing = editingSetFeeIds.includes(order.id);
                                                return (
                                                    <div key={order.id} className="p-3 space-y-3">
                                                        <div className="flex justify-between text-xs items-center">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-medium">{order.name}</span>
                                                                <span className="text-muted-foreground">({order.quantity}名 × ¥{order.price.toLocaleString()})</span>
                                                                <span>¥{(order.price * order.quantity).toLocaleString()}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 ml-auto">
                                                                {!isEditing ? (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-6 w-6"
                                                                        onClick={() => setEditingSetFeeIds(prev => [...prev, order.id])}
                                                                    >
                                                                        <Pencil className="h-3 w-3" />
                                                                    </Button>
                                                                ) : (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                                        onClick={() => setEditingSetFeeIds(prev => prev.filter(id => id !== order.id))}
                                                                    >
                                                                        <Check className="h-4 w-4" />
                                                                    </Button>
                                                                )}
                                                                {isEditing && (
                                                                    <>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-6 w-6 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                                            onClick={async () => {
                                                                                await handleSaveOrder(order.id);
                                                                                setEditingSetFeeIds(prev => prev.filter(id => id !== order.id));
                                                                            }}
                                                                        >
                                                                            <Save className="h-3 w-3" />
                                                                        </Button>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                                            onClick={() => handleDeleteOrder(order.id, order.name)}
                                                                        >
                                                                            <Trash2 className="h-3 w-3" />
                                                                        </Button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {isEditing ? (
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <div>
                                                                    <Label className="text-xs text-muted-foreground">人数</Label>
                                                                    <Input
                                                                        type="number"
                                                                        value={editingOrderValues[order.id]?.quantity ?? order.quantity}
                                                                        className="h-11 text-base"
                                                                        onChange={(e) => handleEditOrderChange(order.id, 'quantity', parseInt(e.target.value) || 0)}
                                                                    />
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                                                <div>
                                                                    <div className="text-muted-foreground text-xs">人数</div>
                                                                    <div>{order.quantity}名</div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </div>
                            )}
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
                                                    <Plus className="h-4 w-4" />
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
                                                            <div className="flex justify-between text-xs items-center">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-medium">{order.name} {index + 1}</span>
                                                                    <span className="text-muted-foreground">({order.quantity}名 × ¥{order.price.toLocaleString()})</span>
                                                                    <span>¥{(order.price * order.quantity).toLocaleString()}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2 ml-auto">
                                                                    {!isEditing ? (
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-6 w-6"
                                                                            onClick={() => setEditingExtensionFeeIds(prev => [...prev, order.id])}
                                                                        >
                                                                            <Pencil className="h-3 w-3" />
                                                                        </Button>
                                                                    ) : (
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                                            onClick={() => setEditingExtensionFeeIds(prev => prev.filter(id => id !== order.id))}
                                                                        >
                                                                            <Check className="h-4 w-4" />
                                                                        </Button>
                                                                    )}
                                                                    {isEditing && (
                                                                        <>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-6 w-6 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                                                onClick={async () => {
                                                                                    await handleSaveOrder(order.id, true);
                                                                                    setEditingExtensionFeeIds(prev => prev.filter(id => id !== order.id));
                                                                                }}
                                                                            >
                                                                                <Save className="h-3 w-3" />
                                                                            </Button>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                                                onClick={() => handleDeleteOrder(order.id, `${order.name} ${index + 1}`)}
                                                                            >
                                                                                <Trash2 className="h-3 w-3" />
                                                                            </Button>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {isEditing ? (
                                                                <div className="grid grid-cols-3 gap-2">
                                                                    <div>
                                                                        <Label className="text-xs text-muted-foreground">人数</Label>
                                                                        <Input
                                                                            type="number"
                                                                            value={editingOrderValues[order.id]?.quantity ?? order.quantity}
                                                                            className="h-11 text-base"
                                                                            onChange={(e) => handleEditOrderChange(order.id, 'quantity', parseInt(e.target.value) || 0)}
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <Label className="text-xs text-muted-foreground">開始</Label>
                                                                        <Input
                                                                            type="time"
                                                                            value={feeSchedule[order.id]?.start || ""}
                                                                            readOnly
                                                                            className="h-11 text-base bg-muted"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <Label className="text-xs text-muted-foreground">終了</Label>
                                                                        <Input
                                                                            type="time"
                                                                            value={feeSchedule[order.id]?.end || ""}
                                                                            readOnly
                                                                            className="h-11 text-base bg-muted"
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
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="divide-y">
                                    {orders
                                        .filter(o => o.name !== 'セット料金' && o.name !== '延長料金' && o.name !== '指名料' && o.name !== '場内料金')
                                        .map(order => {
                                            const isEditing = editingDrinkIds.includes(order.id);
                                            return (
                                                <div key={order.id} className="p-3 flex justify-between items-center">
                                                    <div className="space-y-1 flex-1">
                                                        <div className="text-xs font-medium">{order.name}</div>
                                                        <div className="text-xs text-muted-foreground">
                                                            ¥{order.price.toLocaleString()} × {order.quantity}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3 ml-auto">
                                                        {!isEditing ? (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6"
                                                                onClick={() => setEditingDrinkIds(prev => [...prev, order.id])}
                                                            >
                                                                <Pencil className="h-3 w-3" />
                                                            </Button>
                                                        ) : (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                                onClick={() => setEditingDrinkIds(prev => prev.filter(id => id !== order.id))}
                                                            >
                                                                <Check className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                        {isEditing ? (
                                                            <>
                                                                <div className="w-20">
                                                                    <Input
                                                                        type="number"
                                                                        value={editingOrderValues[order.id]?.quantity ?? order.quantity}
                                                                        className="h-9 text-sm"
                                                                        onChange={(e) => handleEditOrderChange(order.id, 'quantity', parseInt(e.target.value) || 0)}
                                                                    />
                                                                </div>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                                    onClick={async () => {
                                                                        await handleSaveOrder(order.id);
                                                                        setEditingDrinkIds(prev => prev.filter(id => id !== order.id));
                                                                    }}
                                                                >
                                                                    <Save className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                                    onClick={() => handleDeleteOrder(order.id, order.name)}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </>
                                                        ) : (
                                                            <div className="font-medium text-sm">
                                                                ¥{(order.price * order.quantity).toLocaleString()}
                                                            </div>
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
                                            <Plus className="h-4 w-4" />
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
                                            return (
                                                <div key={order.id} className="p-3 space-y-3">
                                                    <div className="flex justify-between items-center">
                                                        <div className="space-y-1 flex-1">
                                                            <div className="text-xs font-medium">
                                                                {order.castName ? `${order.castName}` : '指名料'}
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
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-6 w-6"
                                                                    onClick={() => {
                                                                        setEditingNominationIds(prev => [...prev, order.id]);
                                                                        setEditingOrderValues(prev => ({
                                                                            ...prev,
                                                                            [order.id]: {
                                                                                quantity: order.quantity,
                                                                                amount: order.price,
                                                                                castId: order.castId || "none",
                                                                                startTime: order.startTime ? new Date(order.startTime).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }) : "",
                                                                                endTime: order.endTime ? new Date(order.endTime).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }) : "",
                                                                            }
                                                                        }));
                                                                    }}
                                                                >
                                                                    <Pencil className="h-3 w-3" />
                                                                </Button>
                                                            ) : (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                                    onClick={() => handleDeleteOrder(order.id, order.name)}
                                                                >
                                                                    <Trash2 className="h-3 w-3" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {isEditing && (
                                                        <div className="grid grid-cols-1 gap-2">
                                                            <div>
                                                                <Label className="text-xs text-muted-foreground">キャスト</Label>
                                                                <Select
                                                                    value={editingOrderValues[order.id]?.castId || "none"}
                                                                    onValueChange={(value) => handleEditOrderChange(order.id, 'castId', value)}
                                                                >
                                                                    <SelectTrigger className="h-11 text-base">
                                                                        <SelectValue placeholder="キャストを選択" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="none">なし</SelectItem>
                                                                        {casts.map((cast) => (
                                                                            <SelectItem key={cast.id} value={cast.id}>
                                                                                {cast.display_name}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <div>
                                                                    <Label className="text-xs text-muted-foreground">金額</Label>
                                                                    <Input
                                                                        type="number"
                                                                        value={editingOrderValues[order.id]?.amount ?? order.price}
                                                                        className="h-11 text-base"
                                                                        onChange={(e) => handleEditOrderChange(order.id, 'amount', parseInt(e.target.value) || 0)}
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <Label className="text-xs text-muted-foreground">数量</Label>
                                                                    <Input
                                                                        type="number"
                                                                        value={editingOrderValues[order.id]?.quantity ?? order.quantity}
                                                                        className="h-11 text-base"
                                                                        onChange={(e) => handleEditOrderChange(order.id, 'quantity', parseInt(e.target.value) || 0)}
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <div>
                                                                    <Label className="text-xs text-muted-foreground">開始時刻</Label>
                                                                    <Input
                                                                        type="time"
                                                                        value={editingOrderValues[order.id]?.startTime || ""}
                                                                        className="h-11 text-base"
                                                                        onChange={(e) => handleEditOrderChange(order.id, 'startTime', e.target.value)}
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <Label className="text-xs text-muted-foreground">終了時刻</Label>
                                                                    <Input
                                                                        type="time"
                                                                        value={editingOrderValues[order.id]?.endTime || ""}
                                                                        className="h-11 text-base"
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
                                            <Plus className="h-4 w-4" />
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
                                            return (
                                                <div key={order.id} className="p-3 space-y-3">
                                                    <div className="flex justify-between items-center">
                                                        <div className="space-y-1 flex-1">
                                                            <div className="text-xs font-medium">
                                                                {order.castName ? `${order.castName}` : '場内料金'}
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
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-6 w-6"
                                                                    onClick={() => {
                                                                        setEditingCompanionIds(prev => [...prev, order.id]);
                                                                        setEditingOrderValues(prev => ({
                                                                            ...prev,
                                                                            [order.id]: {
                                                                                quantity: order.quantity,
                                                                                amount: order.price,
                                                                                castId: order.castId || "none",
                                                                                startTime: order.startTime ? new Date(order.startTime).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }) : "",
                                                                                endTime: order.endTime ? new Date(order.endTime).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }) : "",
                                                                            }
                                                                        }));
                                                                    }}
                                                                >
                                                                    <Pencil className="h-3 w-3" />
                                                                </Button>
                                                            ) : (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                                    onClick={() => handleDeleteOrder(order.id, order.name)}
                                                                >
                                                                    <Trash2 className="h-3 w-3" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {isEditing && (
                                                        <div className="grid grid-cols-1 gap-2">
                                                            <div>
                                                                <Label className="text-xs text-muted-foreground">キャスト</Label>
                                                                <Select
                                                                    value={editingOrderValues[order.id]?.castId || "none"}
                                                                    onValueChange={(value) => handleEditOrderChange(order.id, 'castId', value)}
                                                                >
                                                                    <SelectTrigger className="h-11 text-base">
                                                                        <SelectValue placeholder="キャストを選択" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="none">なし</SelectItem>
                                                                        {casts.map((cast) => (
                                                                            <SelectItem key={cast.id} value={cast.id}>
                                                                                {cast.display_name}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <div>
                                                                    <Label className="text-xs text-muted-foreground">金額</Label>
                                                                    <Input
                                                                        type="number"
                                                                        value={editingOrderValues[order.id]?.amount ?? order.price}
                                                                        className="h-11 text-base"
                                                                        onChange={(e) => handleEditOrderChange(order.id, 'amount', parseInt(e.target.value) || 0)}
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <Label className="text-xs text-muted-foreground">数量</Label>
                                                                    <Input
                                                                        type="number"
                                                                        value={editingOrderValues[order.id]?.quantity ?? order.quantity}
                                                                        className="h-11 text-base"
                                                                        onChange={(e) => handleEditOrderChange(order.id, 'quantity', parseInt(e.target.value) || 0)}
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <div>
                                                                    <Label className="text-xs text-muted-foreground">開始時刻</Label>
                                                                    <Input
                                                                        type="time"
                                                                        value={editingOrderValues[order.id]?.startTime || ""}
                                                                        className="h-11 text-base"
                                                                        onChange={(e) => handleEditOrderChange(order.id, 'startTime', e.target.value)}
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <Label className="text-xs text-muted-foreground">終了時刻</Label>
                                                                    <Input
                                                                        type="time"
                                                                        value={editingOrderValues[order.id]?.endTime || ""}
                                                                        className="h-11 text-base"
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
                                        <span className="font-medium text-xs">割引</span>
                                        <div className="flex items-center gap-1 no-print">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6"
                                                onClick={() => {
                                                    setDiscountName("");
                                                    setDiscountAmount(0);
                                                    setDiscountName("割引");
                                                    setIsDiscountDialogOpen(true);
                                                }}
                                                disabled={isAddingOrder}
                                            >
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="divide-y">
                                        {orders
                                            .filter(o => {
                                                // 割引を識別: menu_idがnullでitem_nameが存在し、特殊料金名でなく、かつamountがマイナス値
                                                const specialFeeNames = ['セット料金', '延長料金', '指名料', '場内料金'];
                                                return o.menu_id === null &&
                                                    o.item_name &&
                                                    !specialFeeNames.includes(o.item_name) &&
                                                    (o.price < 0 || (o.price * o.quantity) < 0);
                                            })
                                            .map(order => {
                                                const isEditing = editingDiscountIds.includes(order.id);
                                                return (
                                                    <div key={order.id} className="p-3 flex justify-between items-center">
                                                        <div className="space-y-1 flex-1">
                                                            <div className="text-xs font-medium">{order.name}</div>
                                                            <div className="text-xs text-muted-foreground">
                                                                ¥{Math.abs(order.price * order.quantity).toLocaleString()}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3 ml-auto">
                                                            {!isEditing ? (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-6 w-6"
                                                                    onClick={() => {
                                                                        setEditingDiscountIds(prev => [...prev, order.id]);
                                                                        setEditingOrderValues(prev => ({
                                                                            ...prev,
                                                                            [order.id]: {
                                                                                amount: Math.abs(order.price),
                                                                            }
                                                                        }));
                                                                    }}
                                                                >
                                                                    <Pencil className="h-3 w-3" />
                                                                </Button>
                                                            ) : (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                                    onClick={() => setEditingDiscountIds(prev => prev.filter(id => id !== order.id))}
                                                                >
                                                                    <Check className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                            {isEditing ? (
                                                                <>
                                                                    <div className="w-24">
                                                                        <Input
                                                                            type="number"
                                                                            value={editingOrderValues[order.id]?.amount ?? Math.abs(order.price)}
                                                                            className="h-9 text-sm"
                                                                            onChange={(e) => handleEditOrderChange(order.id, 'amount', -Math.abs(parseInt(e.target.value) || 0))}
                                                                        />
                                                                    </div>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                                        onClick={async () => {
                                                                            await handleSaveOrder(order.id);
                                                                            setEditingDiscountIds(prev => prev.filter(id => id !== order.id));
                                                                        }}
                                                                    >
                                                                        <Save className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                                        onClick={() => handleDeleteOrder(order.id, order.name)}
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </>
                                                            ) : (
                                                                <div className="font-medium text-sm text-red-600">
                                                                    -¥{Math.abs(order.price * order.quantity).toLocaleString()}
                                                                </div>
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

                            {/* Checkout Button */}
                            {editable && session && (
                                <div className="pt-4 border-t mt-4 no-print">
                                    <Button
                                        className="w-full h-11 bg-blue-600 text-white hover:bg-blue-700"
                                        onClick={() => setIsCheckoutDialogOpen(true)}
                                    >
                                        会計終了
                                    </Button>
                                </div>
                            )}
                        </div >
                    )}
                </DialogContent >
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
                            setSelectedFeeType(null);
                        }}
                        onProfileSelect={handleCastSelectForFee}
                        mode="cast"
                    />
                )
            }

            {/* Discount Dialog */}
            {
                editable && (
                    <Dialog open={isDiscountDialogOpen} onOpenChange={setIsDiscountDialogOpen}>
                        <DialogContent className="max-w-sm">
                            <DialogHeader className="mb-3 sm:mb-4 flex flex-row items-center justify-between gap-2 relative">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsDiscountDialogOpen(false);
                                        setDiscountName("");
                                        setDiscountAmount(0);
                                    }}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-0"
                                    aria-label="戻る"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                                <DialogTitle className="flex-1 text-center text-xl font-bold">割引を追加</DialogTitle>
                                <div className="h-8 w-8" /> {/* Spacer for centering */}
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>割引名</Label>
                                    <Input
                                        value={discountName}
                                        onChange={(e) => setDiscountName(e.target.value)}
                                        placeholder="例: 会員割引"
                                        className="h-11 text-base"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>割引額</Label>
                                    <Input
                                        type="number"
                                        value={discountAmount || ''}
                                        onChange={(e) => setDiscountAmount(parseInt(e.target.value) || 0)}
                                        placeholder="0"
                                        className="h-11 text-base"
                                        min="0"
                                    />
                                </div>
                            </div>
                            <DialogFooter className="gap-2 sm:gap-0">
                                <Button
                                    variant="outline"
                                    className="flex-1 sm:flex-none h-[44px]"
                                    onClick={() => {
                                        setIsDiscountDialogOpen(false);
                                        setDiscountName("");
                                        setDiscountAmount(0);
                                    }}
                                >
                                    キャンセル
                                </Button>
                                <Button
                                    className="flex-1 sm:flex-none h-[44px]"
                                    onClick={handleAddDiscount}
                                    disabled={!discountName || discountAmount <= 0 || isAddingOrder}
                                >
                                    追加
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )
            }

            {/* Delete Confirmation Dialog */}
            {
                editable && (
                    <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>伝票を削除しますか？</DialogTitle>
                            </DialogHeader>
                            <div className="py-4 text-muted-foreground">
                                この操作は取り消せません。伝票と関連するセッション、注文、キャスト割り当て情報もすべて削除されます。
                            </div>
                            <DialogFooter className="gap-2">
                                <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                                    キャンセル
                                </Button>
                                <Button variant="destructive" onClick={handleDeleteSession}>
                                    削除
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )
            }

            {/* Checkout Confirmation Dialog */}
            <Dialog open={isCheckoutDialogOpen} onOpenChange={setIsCheckoutDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>会計終了</DialogTitle>
                        <DialogDescription>
                            会計を確定して退店処理を行いますか？
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setIsCheckoutDialogOpen(false)} disabled={isCheckingOut}>
                            キャンセル
                        </Button>
                        <Button
                            className="bg-blue-600 text-white hover:bg-blue-700"
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
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Placement Modal for Guest Selection */}
            <PlacementModal
                isOpen={isPlacementOpen}
                onClose={() => setIsPlacementOpen(false)}
                onProfileSelect={handleGuestSelect}
                mode="guest"
                sessionId={sessionId || undefined}
            />
        </>
    );
}
