"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
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
import { ChevronLeft, Plus, MoreHorizontal, Trash2 } from "lucide-react";
import { getActiveSessions, updateSessionTimes, createOrder, updateSession, closeSession, getMenus, getCasts, getGuests, updateOrder, deleteOrder } from "@/app/app/(main)/floor/actions";
import { getTables } from "@/app/app/(main)/seats/actions";
import { getPricingSystems } from "@/app/app/(main)/pricing-systems/actions";
import { Table as FloorTable } from "@/types/floor";

interface SlipDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    sessionId: string | null;
    onUpdate?: () => void;
    editable?: boolean; // 編集可能かどうか（デフォルト: true）
}

interface OrderItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
    castName?: string;
    created_at: string;
    menu_id?: string;
    hide_from_slip?: boolean;
}

export function SlipDetailModal({ isOpen, onClose, sessionId, onUpdate, editable = true }: SlipDetailModalProps) {
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
    const [editTableId, setEditTableId] = useState("");
    const [editGuestCount, setEditGuestCount] = useState(0);
    const [editDate, setEditDate] = useState("");
    const [editStartTime, setEditStartTime] = useState("");
    const [editPricingSystemId, setEditPricingSystemId] = useState<string>("none");
    const [editMainGuestId, setEditMainGuestId] = useState<string>("none");
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");

    // Dialog states
    const [isMenuSelectOpen, setIsMenuSelectOpen] = useState(false);
    const [isCastSelectOpen, setIsCastSelectOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isAddingOrder, setIsAddingOrder] = useState(false);
    const [selectedFeeType, setSelectedFeeType] = useState<'nomination' | 'companion' | null>(null);
    const [selectedCastId, setSelectedCastId] = useState<string>("");

    const { toast } = useToast();

    useEffect(() => {
        if (isOpen && sessionId) {
            loadAllData();
        }
    }, [isOpen, sessionId]);

    const loadAllData = async () => {
        if (!sessionId) return;

        setLoading(true);
        try {
            const [sessionsData, tablesData, pricingSystemsData, menusData, castsData, guestsData] = await Promise.all([
                getActiveSessions(),
                getTables(),
                getPricingSystems(),
                getMenus(),
                getCasts(),
                getGuests(),
            ]);

            setTables(tablesData);
            setPricingSystems(pricingSystemsData);
            setMenus(menusData);
            setCasts(castsData);
            setGuests(guestsData);

            const currentSession = sessionsData.find((s: any) => s.id === sessionId);
            if (currentSession) {
                setSession(currentSession);

                // Transform orders
                const orderItems: OrderItem[] = (currentSession.orders || []).map((order: any) => ({
                    id: order.id,
                    name: order.item_name || order.menus?.name || "不明",
                    price: order.amount || order.menus?.price || 0,
                    quantity: order.quantity || 1,
                    castName: order.profiles?.display_name,
                    created_at: order.created_at,
                    menu_id: order.menu_id,
                    hide_from_slip: order.menus?.hide_from_slip || false,
                }));

                setOrders(orderItems);

                // Initialize edit states
                setEditTableId(currentSession.table_id);
                setEditGuestCount(currentSession.guest_count);
                setEditDate(currentSession.start_time ? new Date(currentSession.start_time).toISOString().slice(0, 10) : "");
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
            setLoading(false);
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

    // Auto-update Exit Time when fee schedule changes
    useEffect(() => {
        if (!feeSchedule) return;

        const extensionOrders = orders
            .filter(o => o.name === '延長料金')
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        const setFeeOrder = orders.find(o => o.name === 'セット料金');

        let lastEndTime = "";

        if (extensionOrders.length > 0) {
            const lastExtension = extensionOrders[extensionOrders.length - 1];
            lastEndTime = feeSchedule[lastExtension.id]?.end || "";
        } else if (setFeeOrder) {
            lastEndTime = feeSchedule[setFeeOrder.id]?.end || "";
        }

        if (lastEndTime) {
            setEndTime(lastEndTime);
        }
    }, [orders, session?.start_time]); // Depend on orders and start time changes

    const handleSaveHeader = async () => {
        if (!sessionId) return;
        try {
            let newStartTime = undefined;
            if (editDate && editStartTime) {
                newStartTime = new Date(`${editDate}T${editStartTime}`).toISOString();
            }

            await updateSession(sessionId, {
                tableId: editTableId,
                guestCount: editGuestCount,
                startTime: newStartTime,
                pricingSystemId: editPricingSystemId === "none" ? null : editPricingSystemId,
                mainGuestId: editMainGuestId === "none" ? null : editMainGuestId,
            });
            toast({ title: "詳細を更新しました" });
            setIsEditingHeader(false);
            await loadAllData();
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

            let newStartIso = undefined;
            let newEndIso = null;

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



    const handleAddSetFee = async () => {
        if (!sessionId) return;
        const pricingSystem = getSelectedPricingSystem();
        if (!pricingSystem) {
            toast({ title: "料金システムが設定されていません" });
            return;
        }

        setIsAddingOrder(true);
        try {
            await createOrder(
                sessionId,
                [{ menuId: "set-fee", quantity: session.guest_count || 1, amount: pricingSystem.set_fee }],
                null,
                null
            );
            toast({ title: "セット料金を追加しました" });
            await loadAllData();
            onUpdate?.();
        } catch (error) {
            console.error(error);
            toast({ title: "追加に失敗しました" });
        } finally {
            setIsAddingOrder(false);
        }
    };

    const handleAddExtensionFee = async () => {
        if (!sessionId) return;
        const pricingSystem = getSelectedPricingSystem();
        if (!pricingSystem) {
            toast({ title: "料金システムが設定されていません" });
            return;
        }

        setIsAddingOrder(true);
        try {
            // Get Set Fee quantity to use for Extension Fee
            const setFeeOrder = orders.find(o => o.name === 'セット料金');
            const quantity = setFeeOrder?.quantity || 1;

            await createOrder(
                sessionId,
                [{ menuId: "extension-fee", quantity, amount: pricingSystem.extension_fee }],
                null,
                null
            );
            toast({ title: "延長料金を追加しました" });
            await loadAllData();
            onUpdate?.();
        } catch (error) {
            console.error(error);
            toast({ title: "追加に失敗しました" });
        } finally {
            setIsAddingOrder(false);
        }
    };

    const handleAddNominationFee = () => {
        setSelectedFeeType('nomination');
        setSelectedCastId("");
        setIsCastSelectOpen(true);
    };

    const handleAddCompanionFee = () => {
        setSelectedFeeType('companion');
        setSelectedCastId("");
        setIsCastSelectOpen(true);
    };

    const confirmAddFeeWithCast = async () => {
        if (!sessionId || !selectedFeeType) return;
        const pricingSystem = getSelectedPricingSystem();
        if (!pricingSystem) {
            toast({ title: "料金システムが設定されていません" });
            return;
        }

        setIsAddingOrder(true);
        try {
            const menuId = selectedFeeType === 'nomination' ? 'nomination-fee' : 'companion-fee';
            const amount = selectedFeeType === 'nomination' ? pricingSystem.nomination_fee : pricingSystem.companion_fee;
            const feeName = selectedFeeType === 'nomination' ? '指名料' : '場内料金';

            await createOrder(
                sessionId,
                [{ menuId, quantity: 1, amount }],
                null,
                selectedCastId || null
            );
            toast({ title: `${feeName}を追加しました` });
            await loadAllData();
            setIsCastSelectOpen(false);
            onUpdate?.();
        } catch (error) {
            console.error(error);
            toast({ title: "追加に失敗しました" });
        } finally {
            setIsAddingOrder(false);
        }
    };

    const handleAddMenuItem = async (menu: any) => {
        if (!sessionId) return;

        setIsAddingOrder(true);
        try {
            await createOrder(
                sessionId,
                [{ menuId: menu.id, quantity: 1, amount: menu.price }],
                null,
                null
            );
            toast({ title: `${menu.name}を追加しました` });
            setIsMenuSelectOpen(false);
            await loadAllData();
            onUpdate?.();
        } catch (error) {
            console.error(error);
            toast({ title: "追加に失敗しました" });
        } finally {
            setIsAddingOrder(false);
        }
    };

    const handleUpdateSetFeeQuantity = async (orderId: string, quantity: number, isExtension: boolean = false) => {
        if (!sessionId) return;
        const pricingSystem = getSelectedPricingSystem();
        if (!pricingSystem) return;

        try {
            const unitPrice = isExtension ? pricingSystem.extension_fee : pricingSystem.set_fee;
            await updateOrder(orderId, {
                quantity,
                amount: unitPrice // amount is unit price, not total
            });
            toast({ title: "料金を更新しました" });
            await loadAllData();
            onUpdate?.();
        } catch (error) {
            console.error(error);
            toast({ title: "更新に失敗しました" });
        }
    };

    const handleDeleteSession = async () => {
        if (!sessionId) return;

        try {
            await closeSession(sessionId);
            await loadAllData();
            setIsDeleteDialogOpen(false);
            onClose();
            toast({ title: "伝票を削除しました" });
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
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-4">
                    <DialogHeader className="flex flex-row items-center justify-between border-b pb-4 space-y-0">
                        <Button variant="ghost" size="icon" className="-ml-2" onClick={onClose}>
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <DialogTitle className="flex items-center gap-2">
                            {editable ? `${tableName} - 伝票詳細` : "伝票詳細"}
                        </DialogTitle>
                        {editable ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="-mr-2">
                                        <MoreHorizontal className="h-5 w-5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                        className="text-destructive focus:text-destructive"
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
                    </DialogHeader>

                    {loading ? (
                        <div className="py-8 text-center text-muted-foreground">
                            読み込み中...
                        </div>
                    ) : (
                        <div className="space-y-3 pb-4 font-mono text-sm">
                            {/* Header Info */}
                            <div className="border rounded-lg p-3 bg-muted/30">
                                {editable && isEditingHeader ? (
                                    <div className="grid grid-cols-1 gap-3">
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <Label className="text-xs text-muted-foreground">日付</Label>
                                                <Input
                                                    type="date"
                                                    value={editDate}
                                                    onChange={(e) => setEditDate(e.target.value)}
                                                    className="h-8 text-xs"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-xs text-muted-foreground">人数</Label>
                                                <Input
                                                    type="number"
                                                    value={editGuestCount}
                                                    onChange={(e) => setEditGuestCount(parseInt(e.target.value))}
                                                    className="h-8 text-xs"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <Label className="text-xs text-muted-foreground">テーブル</Label>
                                            <Select value={editTableId} onValueChange={setEditTableId}>
                                                <SelectTrigger className="h-8 text-xs">
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
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <Label className="text-xs text-muted-foreground">料金システム</Label>
                                                <Select value={editPricingSystemId} onValueChange={setEditPricingSystemId}>
                                                    <SelectTrigger className="h-8 text-xs">
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
                                            <div>
                                                <Label className="text-xs text-muted-foreground">ゲスト</Label>
                                                <Select value={editMainGuestId} onValueChange={setEditMainGuestId}>
                                                    <SelectTrigger className="h-8 text-xs">
                                                        <SelectValue placeholder="選択" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="none">なし</SelectItem>
                                                        {guests.map((guest) => (
                                                            <SelectItem key={guest.id} value={guest.id}>
                                                                {guest.display_name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 justify-end mt-2">
                                            <Button size="sm" variant="ghost" onClick={() => setIsEditingHeader(false)}>キャンセル</Button>
                                            <Button size="sm" onClick={handleSaveHeader}>保存</Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        {editable && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="absolute -top-2 -right-2 h-6 w-6 text-muted-foreground"
                                                onClick={() => setIsEditingHeader(true)}
                                            >
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        )}
                                        <div className={`grid gap-2 text-center text-xs ${editable ? 'grid-cols-5' : 'grid-cols-3'}`}>
                                            <div>
                                                <div className="text-muted-foreground">日付</div>
                                                <div className="font-medium">{new Date(session.start_time).toLocaleDateString('ja-JP')}</div>
                                            </div>
                                            {editable && (
                                                <>
                                                    <div>
                                                        <div className="text-muted-foreground">テーブル</div>
                                                        <div className="font-medium">{tableName}</div>
                                                    </div>
                                                </>
                                            )}
                                            <div>
                                                <div className="text-muted-foreground">人数</div>
                                                <div className="font-medium">{session.guest_count}名</div>
                                            </div>
                                            {editable && (
                                                <>
                                                    <div>
                                                        <div className="text-muted-foreground">料金</div>
                                                        <div className="font-medium">{(() => {
                                                            const ps = pricingSystems.find((p: any) => p.id === session?.pricing_system_id);
                                                            return ps?.name || '-';
                                                        })()}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-muted-foreground">ゲスト</div>
                                                        <div className="font-medium">{(() => {
                                                            const guest = guests.find((g: any) => g.id === session?.main_guest_id);
                                                            return guest?.display_name || '-';
                                                        })()}</div>
                                                    </div>
                                                </>
                                            )}
                                            {!editable && (
                                                <div>
                                                    <div className="text-muted-foreground">時間</div>
                                                    <div className="font-medium">
                                                        {new Date(session.start_time).toLocaleTimeString('ja-JP', {
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}〜
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Guests Section */}
                            {guestAssignments.length > 0 && (
                                <div className="border rounded-lg overflow-hidden">
                                    <div className="px-3 py-2 bg-muted/50 border-b">
                                        <span className="font-medium text-xs">ゲスト一覧</span>
                                    </div>
                                    <div className="divide-y">
                                        {guestAssignments.map((assignment: any) => (
                                            <div key={assignment.id} className="flex items-center gap-2 px-3 py-2">
                                                <Avatar className="h-6 w-6">
                                                    <AvatarImage src={assignment.profiles?.avatar_url} />
                                                    <AvatarFallback className="text-[10px]">
                                                        {assignment.profiles?.display_name?.[0] || "?"}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="text-xs">{assignment.profiles?.display_name || "不明"}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Time Section - Only show if editable */}
                            {editable && (
                                <div className="border rounded-lg p-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <div className="text-xs text-muted-foreground mb-1">入店時間</div>
                                            <Input
                                                type="time"
                                                value={startTime}
                                                onChange={(e) => setStartTime(e.target.value)}
                                                className="h-8 text-xs"
                                            />
                                        </div>
                                        <div>
                                            <div className="text-xs text-muted-foreground mb-1">退店時間</div>
                                            <Input
                                                type="time"
                                                value={endTime}
                                                onChange={(e) => setEndTime(e.target.value)}
                                                className="h-8 text-xs"
                                            />
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={handleUpdateTimes}
                                        className="w-full mt-2 h-7 text-xs"
                                    >
                                        時間を更新
                                    </Button>
                                </div>
                            )}

                            {/* Set Fee Section - Only show if editable */}
                            {editable && (
                                <div className="border rounded-lg overflow-hidden">
                                    <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b">
                                        <span className="font-medium text-xs">セット料金</span>
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
                                    <div className="divide-y">
                                        {orders
                                            .filter(o => o.name === 'セット料金')
                                            .map(order => (
                                                <div key={order.id} className="p-3 space-y-3">
                                                    <div className="flex justify-between text-xs items-center">
                                                        <span className="font-medium">{order.name}</span>
                                                        <span>¥{(order.price * order.quantity).toLocaleString()}</span>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        <div>
                                                            <Label className="text-[10px] text-muted-foreground">人数</Label>
                                                            <Input
                                                                type="number"
                                                                defaultValue={order.quantity}
                                                                className="h-7 text-xs"
                                                                onBlur={(e) => handleUpdateSetFeeQuantity(order.id, parseInt(e.target.value))}
                                                            />
                                                        </div>
                                                        <div>
                                                            <Label className="text-[10px] text-muted-foreground">開始</Label>
                                                            <Input
                                                                type="time"
                                                                value={startTime}
                                                                onChange={(e) => setStartTime(e.target.value)}
                                                                onBlur={handleUpdateTimes}
                                                                className="h-7 text-xs"
                                                            />
                                                        </div>
                                                        <div>
                                                            <Label className="text-[10px] text-muted-foreground">終了</Label>
                                                            <Input
                                                                type="time"
                                                                value={feeSchedule[order.id]?.end || ""}
                                                                readOnly
                                                                className="h-7 text-xs bg-muted"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            )}

                            {/* Extension Fee Section - Only show if editable */}
                            {editable && (
                                <div className="border rounded-lg overflow-hidden">
                                    <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b">
                                        <span className="font-medium text-xs">延長料金</span>
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
                                    <div className="divide-y">
                                        {orders
                                            .filter(o => o.name === '延長料金')
                                            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                                            .map((order, index) => (
                                                <div key={order.id} className="p-3 space-y-3">
                                                    <div className="flex justify-between text-xs items-center">
                                                        <span className="font-medium">{order.name} {index + 1}</span>
                                                        <span>¥{(order.price * order.quantity).toLocaleString()}</span>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        <div>
                                                            <Label className="text-[10px] text-muted-foreground">人数</Label>
                                                            <Input
                                                                type="number"
                                                                defaultValue={order.quantity}
                                                                className="h-7 text-xs"
                                                                onBlur={(e) => handleUpdateSetFeeQuantity(order.id, parseInt(e.target.value), true)}
                                                            />
                                                        </div>
                                                        <div>
                                                            <Label className="text-[10px] text-muted-foreground">開始</Label>
                                                            <Input
                                                                type="time"
                                                                value={feeSchedule[order.id]?.start || ""}
                                                                readOnly
                                                                className="h-7 text-xs bg-muted"
                                                            />
                                                        </div>
                                                        <div>
                                                            <Label className="text-[10px] text-muted-foreground">終了</Label>
                                                            <Input
                                                                type="time"
                                                                value={feeSchedule[order.id]?.end || ""}
                                                                readOnly
                                                                className="h-7 text-xs bg-muted"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            )}

                            {/* Drinks/Menu Section */}
                            <div className="border rounded-lg overflow-hidden">
                                <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b">
                                    <span className="font-medium text-xs">ドリンク・メニュー</span>
                                    {editable && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={() => setIsMenuSelectOpen(true)}
                                            disabled={isAddingOrder}
                                        >
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                                <div className="divide-y">
                                    {orders
                                        .filter(o => !['セット料金', '指名料', '場内料金', '延長料金'].includes(o.name))
                                        .filter(o => !o.hide_from_slip)
                                        .map(order => (
                                            <div key={order.id} className="flex justify-between px-3 py-2 text-xs">
                                                <span>{order.name} × {order.quantity}</span>
                                                <span>¥{(order.price * order.quantity).toLocaleString()}</span>
                                            </div>
                                        ))}
                                    {orders.filter(o => !['セット料金', '指名料', '場内料金', '延長料金'].includes(o.name)).filter(o => !o.hide_from_slip).length === 0 && (
                                        <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                                            注文がありません
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Nomination Section - Only show if editable */}
                            {editable && (
                                <div className="border rounded-lg overflow-hidden">
                                    <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b">
                                        <span className="font-medium text-xs">指名料</span>
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
                                    <div className="divide-y">
                                        {orders
                                            .filter(o => o.name === '指名料')
                                            .map(order => (
                                                <div key={order.id} className="flex justify-between px-3 py-2 text-xs">
                                                    <div className="flex flex-col">
                                                        <span>{order.name}</span>
                                                        {order.castName && <span className="text-muted-foreground text-[10px]">{order.castName}</span>}
                                                    </div>
                                                    <span>¥{(order.price * order.quantity).toLocaleString()}</span>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            )}

                            {/* Companion Fee Section - Only show if editable */}
                            {editable && (
                                <div className="border rounded-lg overflow-hidden">
                                    <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b">
                                        <span className="font-medium text-xs">場内指名</span>
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
                                    <div className="divide-y">
                                        {orders
                                            .filter(o => o.name === '場内料金')
                                            .map(order => (
                                                <div key={order.id} className="flex justify-between px-3 py-2 text-xs">
                                                    <div className="flex flex-col">
                                                        <span>{order.name}</span>
                                                        {order.castName && <span className="text-muted-foreground text-[10px]">{order.castName}</span>}
                                                    </div>
                                                    <span>¥{(order.price * order.quantity).toLocaleString()}</span>
                                                </div>
                                            ))}
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
                                    <span>¥{calculateTotal().toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Menu Select Dialog */}
            {editable && (
                <Dialog open={isMenuSelectOpen} onOpenChange={setIsMenuSelectOpen}>
                    <DialogContent className="max-w-md max-h-[80vh]">
                        <DialogHeader>
                            <DialogTitle>メニューを選択</DialogTitle>
                        </DialogHeader>
                        <ScrollArea className="h-[60vh]">
                            <div className="space-y-2 pr-4">
                                {menus.map(menu => (
                                    <Button
                                        key={menu.id}
                                        variant="outline"
                                        className="w-full justify-between h-auto py-3"
                                        onClick={() => handleAddMenuItem(menu)}
                                        disabled={isAddingOrder}
                                    >
                                        <span className="text-left">{menu.name}</span>
                                        <span className="text-muted-foreground">¥{menu.price?.toLocaleString()}</span>
                                    </Button>
                                ))}
                                {menus.length === 0 && (
                                    <div className="text-center py-8 text-muted-foreground">
                                        メニューがありません
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </DialogContent>
                </Dialog>
            )}

            {/* Cast Select Dialog */}
            {editable && (
                <Dialog open={isCastSelectOpen} onOpenChange={setIsCastSelectOpen}>
                    <DialogContent className="max-w-sm">
                        <DialogHeader>
                            <DialogTitle>キャストを選択</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>キャスト</Label>
                                <Select value={selectedCastId} onValueChange={setSelectedCastId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="キャストを選択" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {casts.map((cast) => (
                                            <SelectItem key={cast.id} value={cast.id}>
                                                {cast.display_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsCastSelectOpen(false)}>キャンセル</Button>
                            <Button onClick={confirmAddFeeWithCast} disabled={!selectedCastId}>追加</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}

            {/* Delete Confirmation Dialog */}
            {editable && (
                <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>伝票を削除しますか？</DialogTitle>
                        </DialogHeader>
                        <div className="py-4 text-muted-foreground">
                            この操作は取り消せません。本当に削除してもよろしいですか？
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                                キャンセル
                            </Button>
                            <Button variant="destructive" onClick={handleDeleteSession}>
                                削除
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
}
