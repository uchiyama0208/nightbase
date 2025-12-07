"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Sparkles, Send, Loader2, Check, Edit3, Plus, Trash2, ArrowLeft, Car, Users, RefreshCw } from "lucide-react";
import {
    getAIPickupSuggestion,
    applyAISuggestion,
    type PickupRouteWithPassengers,
    type TodayAttendee,
} from "./actions";

interface AIModalProps {
    isOpen: boolean;
    onClose: () => void;
    routes: PickupRouteWithPassengers[];
    attendees: TodayAttendee[];
    staffProfiles: { id: string; display_name: string; role: string }[];
    storeId: string;
    date: string;
}

interface ChatMessage {
    role: "user" | "assistant";
    content: string;
}

interface AISuggestion {
    routes: {
        driver_name: string;
        driver_profile_id?: string;
        capacity: number;
        round_trips: number;
        trips: {
            trip_number: number;
            passengers: { name: string; destination: string }[];
        }[];
    }[];
    explanation: string;
}

// 送迎車設定
interface VehicleConfig {
    id: string;
    driverProfileId: string;
    driverName: string;
    capacity: number;
    roundTrips: number;
}

type AIMode = "select" | "create" | "reassign" | "assign_all" | "suggestion";
type OriginalMode = "create" | "reassign" | "assign_all";

export function AIModal({
    isOpen,
    onClose,
    routes,
    attendees,
    staffProfiles,
    storeId,
    date,
}: AIModalProps) {
    const router = useRouter();
    const [mode, setMode] = useState<AIMode>("select");
    const [originalMode, setOriginalMode] = useState<OriginalMode | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isApplying, setIsApplying] = useState(false);
    const [suggestion, setSuggestion] = useState<AISuggestion | null>(null);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [userInput, setUserInput] = useState("");
    const [editMode, setEditMode] = useState(false);
    const [editedSuggestion, setEditedSuggestion] = useState<string>("");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // 「1から作る」モード用の送迎車設定
    const [vehicles, setVehicles] = useState<VehicleConfig[]>([]);

    const attendeesWithDestination = attendees.filter((a) => a.pickup_destination);

    // 既存ルートに割り当て済みのキャスト
    const assignedAttendees = attendeesWithDestination.filter((a) =>
        routes.some((r) => r.passengers.some((p) => p.cast_profile_id === a.profile_id))
    );

    const handleAddVehicle = () => {
        const newVehicle: VehicleConfig = {
            id: `vehicle-${Date.now()}`,
            driverProfileId: "",
            driverName: "",
            capacity: 3,
            roundTrips: 0,
        };
        setVehicles([...vehicles, newVehicle]);
    };

    const handleUpdateVehicle = (id: string, updates: Partial<VehicleConfig>) => {
        setVehicles(vehicles.map((v) => (v.id === id ? { ...v, ...updates } : v)));
    };

    const handleRemoveVehicle = (id: string) => {
        setVehicles(vehicles.filter((v) => v.id !== id));
    };

    const handleGetSuggestion = async (userMessage?: string) => {
        const targetAttendees =
            mode === "reassign" ? assignedAttendees : attendeesWithDestination;

        if (targetAttendees.length === 0) {
            setErrorMessage(
                mode === "reassign"
                    ? "既存ルートに割り当てられているキャストがいません"
                    : "送迎先が設定されている出勤者がいません"
            );
            return;
        }

        // 「1から作る」モードでは車両設定が必要
        if (mode === "create" && vehicles.length === 0) {
            setErrorMessage("送迎車を1台以上追加してください");
            return;
        }

        // 既存ルートモードでは既存ルートが必要
        if ((mode === "reassign" || mode === "assign_all") && routes.length === 0) {
            setErrorMessage("既存の送迎ルートがありません");
            return;
        }

        setIsLoading(true);
        setErrorMessage(null);

        // 元のモードを保存
        if (mode !== "suggestion") {
            setOriginalMode(mode as OriginalMode);
        }

        const currentMode = mode === "suggestion" ? originalMode : mode;

        try {
            const result = await getAIPickupSuggestion(
                storeId,
                date,
                currentMode === "reassign" ? assignedAttendees : attendees,
                currentMode === "create" ? [] : routes,
                userMessage,
                currentMode === "create" ? vehicles : undefined
            );
            setSuggestion(result);
            setEditedSuggestion(JSON.stringify(result, null, 2));
            setMode("suggestion");

            if (userMessage) {
                setChatHistory((prev) => [
                    ...prev,
                    { role: "user", content: userMessage },
                    { role: "assistant", content: result.explanation },
                ]);
            } else {
                setChatHistory([
                    { role: "assistant", content: result.explanation },
                ]);
            }
        } catch (error) {
            console.error("Error getting AI suggestion:", error);
            setErrorMessage("AI提案の取得に失敗しました");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendMessage = () => {
        if (!userInput.trim()) return;
        handleGetSuggestion(userInput);
        setUserInput("");
    };

    const handleApplySuggestion = async () => {
        if (!suggestion) return;

        setIsApplying(true);
        setErrorMessage(null);
        try {
            let suggestionToApply = suggestion;

            if (editMode && editedSuggestion) {
                try {
                    suggestionToApply = JSON.parse(editedSuggestion);
                } catch (e) {
                    setErrorMessage("JSON形式が正しくありません");
                    setIsApplying(false);
                    return;
                }
            }

            // 「1から作る」モードの場合は既存ルートを削除
            const deleteExisting = originalMode === "create";

            await applyAISuggestion(
                storeId,
                date,
                suggestionToApply,
                staffProfiles,
                attendees,
                deleteExisting
            );
            router.refresh();
            handleClose();
        } catch (error) {
            console.error("Error applying suggestion:", error);
            setErrorMessage("提案の適用に失敗しました");
        } finally {
            setIsApplying(false);
        }
    };

    const handleClose = () => {
        setErrorMessage(null);
        setSuggestion(null);
        setChatHistory([]);
        setUserInput("");
        setEditMode(false);
        setEditedSuggestion("");
        setMode("select");
        setOriginalMode(null);
        setVehicles([]);
        onClose();
    };

    const handleBack = () => {
        if (mode === "suggestion") {
            // suggestion画面からは元のモードに戻れないので選択画面に
            setSuggestion(null);
            setChatHistory([]);
            setMode("select");
            setOriginalMode(null);
        } else if (mode === "create") {
            setVehicles([]);
            setMode("select");
        } else {
            setMode("select");
        }
        setErrorMessage(null);
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900 max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader className="relative flex flex-row items-center justify-center space-y-0 pb-2">
                    {mode !== "select" && (
                        <button
                            type="button"
                            onClick={handleBack}
                            className="absolute left-0 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        </button>
                    )}
                    <DialogTitle className="text-base font-semibold text-gray-900 dark:text-gray-50 flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-purple-500" />
                        AI送迎ルート提案
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto space-y-4 min-h-0">
                    {/* Error message */}
                    {errorMessage && (
                        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
                            <p className="text-sm text-red-600 dark:text-red-400">
                                {errorMessage}
                            </p>
                        </div>
                    )}

                    {/* Mode selection */}
                    {mode === "select" && (
                        <div className="space-y-4 py-4">
                            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                                送迎先が設定されている出勤者: {attendeesWithDestination.length}名
                                {routes.length > 0 && ` / 既存ルート: ${routes.length}件`}
                            </p>

                            <div className="space-y-3">
                                {/* 1から作る */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMode("create");
                                        handleAddVehicle(); // 最初の1台を追加
                                    }}
                                    className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-purple-300 dark:hover:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors text-left"
                                >
                                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30">
                                        <Car className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                                            1から作る
                                        </h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            送迎車を設定してAIが最適なルートを提案
                                        </p>
                                    </div>
                                </button>

                                {/* 既存ルートで再割り当て */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMode("reassign");
                                        handleGetSuggestion();
                                    }}
                                    disabled={routes.length === 0 || assignedAttendees.length === 0}
                                    className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:bg-white dark:disabled:hover:border-gray-700 dark:disabled:hover:bg-gray-800"
                                >
                                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30">
                                        <RefreshCw className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                                            既存ルートで再割り当て
                                        </h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            割り当て済みの{assignedAttendees.length}名を既存ルートで最適化
                                        </p>
                                    </div>
                                </button>

                                {/* 全員を割り振る */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMode("assign_all");
                                        handleGetSuggestion();
                                    }}
                                    disabled={routes.length === 0 || attendeesWithDestination.length === 0}
                                    className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-green-300 dark:hover:border-green-700 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:bg-white dark:disabled:hover:border-gray-700 dark:disabled:hover:bg-gray-800"
                                >
                                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30">
                                        <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                                            全員を割り振る
                                        </h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            未決定含む{attendeesWithDestination.length}名を既存ルートに割り振り
                                        </p>
                                    </div>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* 「1から作る」モード: 送迎車設定 */}
                    {mode === "create" && !isLoading && (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                送迎車の情報を設定してください
                            </p>

                            <div className="space-y-3">
                                {vehicles.map((vehicle, idx) => (
                                    <div
                                        key={vehicle.id}
                                        className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4"
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                                <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 text-xs">
                                                    {idx + 1}
                                                </span>
                                                送迎車 {idx + 1}
                                            </h4>
                                            {vehicles.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveVehicle(vehicle.id)}
                                                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                                                >
                                                    <Trash2 className="h-4 w-4 text-gray-400" />
                                                </button>
                                            )}
                                        </div>

                                        <div className="space-y-3">
                                            {/* ドライバー */}
                                            <div className="space-y-1">
                                                <Label className="text-xs text-gray-600 dark:text-gray-400">
                                                    ドライバー
                                                </Label>
                                                <Select
                                                    value={vehicle.driverProfileId || "__none__"}
                                                    onValueChange={(v) => {
                                                        const staff = staffProfiles.find((s) => s.id === v);
                                                        handleUpdateVehicle(vehicle.id, {
                                                            driverProfileId: v === "__none__" ? "" : v,
                                                            driverName: staff?.display_name || "",
                                                        });
                                                    }}
                                                >
                                                    <SelectTrigger className="h-9 text-sm rounded-lg border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-900">
                                                        <SelectValue placeholder="未定" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="__none__">未定</SelectItem>
                                                        {staffProfiles.filter(s => s.role === "staff" || s.role === "admin").length > 0 && (
                                                            <SelectGroup>
                                                                <SelectLabel className="text-xs text-gray-500">スタッフ</SelectLabel>
                                                                {staffProfiles
                                                                    .filter(s => s.role === "staff" || s.role === "admin")
                                                                    .map((staff) => (
                                                                        <SelectItem key={staff.id} value={staff.id}>
                                                                            {staff.display_name}
                                                                        </SelectItem>
                                                                    ))}
                                                            </SelectGroup>
                                                        )}
                                                        {staffProfiles.filter(s => s.role === "partner").length > 0 && (
                                                            <SelectGroup>
                                                                <SelectLabel className="text-xs text-gray-500">パートナー</SelectLabel>
                                                                {staffProfiles
                                                                    .filter(s => s.role === "partner")
                                                                    .map((partner) => (
                                                                        <SelectItem key={partner.id} value={partner.id}>
                                                                            {partner.display_name}
                                                                        </SelectItem>
                                                                    ))}
                                                            </SelectGroup>
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {/* 人数上限 */}
                                            <div className="space-y-1">
                                                <Label className="text-xs text-gray-600 dark:text-gray-400">
                                                    人数上限
                                                </Label>
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    max={10}
                                                    value={vehicle.capacity}
                                                    onChange={(e) =>
                                                        handleUpdateVehicle(vehicle.id, {
                                                            capacity: parseInt(e.target.value) || 3,
                                                        })
                                                    }
                                                    className="h-9 text-sm rounded-lg border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-900"
                                                />
                                            </div>

                                            {/* 戻り回数 */}
                                            <div className="space-y-1">
                                                <Label className="text-xs text-gray-600 dark:text-gray-400">
                                                    戻り回数
                                                </Label>
                                                <Select
                                                    value={vehicle.roundTrips.toString()}
                                                    onValueChange={(v) =>
                                                        handleUpdateVehicle(vehicle.id, {
                                                            roundTrips: parseInt(v),
                                                        })
                                                    }
                                                >
                                                    <SelectTrigger className="h-9 text-sm rounded-lg border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-900">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {[0, 1, 2, 3].map((n) => (
                                                            <SelectItem key={n} value={n.toString()}>
                                                                {n}回
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* 送迎車追加ボタン */}
                            <button
                                type="button"
                                onClick={handleAddVehicle}
                                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-purple-400 hover:text-purple-600 dark:hover:border-purple-600 dark:hover:text-purple-400 transition-colors"
                            >
                                <Plus className="h-4 w-4" />
                                送迎車を追加
                            </button>

                            {/* 提案取得ボタン */}
                            <Button
                                onClick={() => handleGetSuggestion()}
                                disabled={vehicles.length === 0}
                                className="w-full rounded-lg bg-purple-600 text-white hover:bg-purple-700"
                            >
                                <Sparkles className="h-4 w-4 mr-2" />
                                AIに提案してもらう
                            </Button>
                        </div>
                    )}

                    {/* Loading state */}
                    {isLoading && (
                        <div className="text-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-purple-500 mx-auto mb-4" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                AIが最適なルートを計算中...
                            </p>
                        </div>
                    )}

                    {/* Suggestion result */}
                    {mode === "suggestion" && suggestion && !isLoading && (
                        <div className="space-y-4">
                            {/* Chat history */}
                            <div className="space-y-3 max-h-[200px] overflow-y-auto">
                                {chatHistory.map((msg, idx) => (
                                    <div
                                        key={idx}
                                        className={`flex ${
                                            msg.role === "user" ? "justify-end" : "justify-start"
                                        }`}
                                    >
                                        <div
                                            className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                                                msg.role === "user"
                                                    ? "bg-blue-600 text-white"
                                                    : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
                                            }`}
                                        >
                                            {msg.content}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Suggestion preview */}
                            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                                        提案内容
                                    </h4>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setEditMode(!editMode)}
                                        className="text-xs"
                                    >
                                        <Edit3 className="h-3 w-3 mr-1" />
                                        {editMode ? "プレビュー" : "編集"}
                                    </Button>
                                </div>

                                {editMode ? (
                                    <textarea
                                        value={editedSuggestion}
                                        onChange={(e) => setEditedSuggestion(e.target.value)}
                                        className="w-full h-[200px] p-2 text-xs font-mono bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg resize-none"
                                    />
                                ) : (
                                    <div className="space-y-3">
                                        {suggestion.routes.map((route, rIdx) => (
                                            <div
                                                key={rIdx}
                                                className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
                                            >
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-xs font-medium">
                                                        {rIdx + 1}
                                                    </span>
                                                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                        {route.driver_name || "ドライバー未定"}
                                                    </span>
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                                        (上限{route.capacity}名 / 戻り{route.round_trips}回)
                                                    </span>
                                                </div>

                                                {route.trips.map((trip) => (
                                                    <div key={trip.trip_number} className="ml-8">
                                                        {route.round_trips > 0 && (
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                                                {trip.trip_number}便目:
                                                            </p>
                                                        )}
                                                        <div className="flex flex-wrap gap-1">
                                                            {trip.passengers.map((p, pIdx) => (
                                                                <span
                                                                    key={pIdx}
                                                                    className="inline-flex items-center bg-gray-100 dark:bg-gray-800 rounded-full px-2 py-0.5 text-xs"
                                                                >
                                                                    <span className="text-gray-500 mr-1">
                                                                        {pIdx + 1}.
                                                                    </span>
                                                                    <span className="text-gray-900 dark:text-white">
                                                                        {p.name}
                                                                    </span>
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Chat input */}
                            <div className="flex gap-2">
                                <Input
                                    value={userInput}
                                    onChange={(e) => setUserInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    }}
                                    placeholder="変更点を入力... (例: 山田さんを2便目にして)"
                                    className="flex-1 h-10 rounded-lg border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
                                />
                                <Button
                                    onClick={handleSendMessage}
                                    disabled={!userInput.trim() || isLoading}
                                    size="icon"
                                    className="h-10 w-10 rounded-lg bg-purple-600 text-white hover:bg-purple-700"
                                >
                                    <Send className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {mode === "suggestion" && suggestion && !isLoading && (
                    <DialogFooter className="gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <Button
                            variant="outline"
                            onClick={handleClose}
                            className="rounded-lg"
                        >
                            キャンセル
                        </Button>
                        <Button
                            onClick={handleApplySuggestion}
                            disabled={isApplying}
                            className="rounded-lg bg-green-600 text-white hover:bg-green-700"
                        >
                            {isApplying ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    適用中...
                                </>
                            ) : (
                                <>
                                    <Check className="h-4 w-4 mr-2" />
                                    この提案を適用
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
}
