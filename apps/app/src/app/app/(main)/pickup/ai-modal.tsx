"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, Send, Loader2, Plus, ChevronLeft, X } from "lucide-react";
import {
    getAIPickupSuggestion,
    applyAISuggestion,
    type PickupRouteWithPassengers,
    type TodayAttendee,
} from "./actions";

interface AIModalProps {
    isOpen: boolean;
    onClose: () => void;
    onOpenCreateRoute: () => void;
    onOpenAddAttendance: () => void;
    routes: PickupRouteWithPassengers[];
    attendees: TodayAttendee[];
    staffProfiles: { id: string; display_name: string; display_name_kana: string | null; role: string }[];
    storeId: string;
    date: string;
    storeAddress?: string;
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

type AIMode = "select" | "suggestion";

export function AIModal({
    isOpen,
    onClose,
    onOpenCreateRoute,
    onOpenAddAttendance,
    routes,
    attendees,
    staffProfiles,
    storeId,
    date,
    storeAddress,
}: AIModalProps) {
    const router = useRouter();
    const [mode, setMode] = useState<AIMode>("select");
    const [isLoading, setIsLoading] = useState(false);
    const [isApplying, setIsApplying] = useState(false);
    const [suggestion, setSuggestion] = useState<AISuggestion | null>(null);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [userInput, setUserInput] = useState("");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // 選択されたユーザーと送迎車
    const [selectedAttendeeIds, setSelectedAttendeeIds] = useState<Set<string>>(new Set());
    const [selectedRouteIds, setSelectedRouteIds] = useState<Set<string>>(new Set());
    const [routeRoundTripsEnabled, setRouteRoundTripsEnabled] = useState<Set<string>>(new Set());
    const [roleFilter, setRoleFilter] = useState<"all" | "cast" | "staff">("all");

    // すべての送迎先が設定されている出勤者（フィルター前）
    const allAttendeesWithDestination = attendees
        .filter((a) => a.pickup_destination)
        .sort((a, b) => {
            const kanaA = a.display_name_kana || a.display_name || "";
            const kanaB = b.display_name_kana || b.display_name || "";
            return kanaA.localeCompare(kanaB, "ja");
        });

    // キャストとスタッフの数を計算
    const castCount = allAttendeesWithDestination.filter((a) => a.role === "cast").length;
    const staffCount = allAttendeesWithDestination.filter((a) => a.role !== "cast").length;

    // フィルター適用後の出勤者
    const attendeesWithDestination = allAttendeesWithDestination.filter((a) => {
        if (roleFilter === "all") return true;
        if (roleFilter === "cast") return a.role === "cast";
        return a.role !== "cast"; // staff, admin, partner など
    });

    // 送迎車を50音順にソート（ドライバー名）
    const sortedRoutes = [...routes].sort((a, b) => {
        const nameA = a.driver_name || "";
        const nameB = b.driver_name || "";
        return nameA.localeCompare(nameB, "ja");
    });

    const toggleAttendee = (profileId: string) => {
        const newSet = new Set(selectedAttendeeIds);
        if (newSet.has(profileId)) {
            newSet.delete(profileId);
        } else {
            newSet.add(profileId);
        }
        setSelectedAttendeeIds(newSet);
    };

    const toggleRoute = (routeId: string) => {
        const newSet = new Set(selectedRouteIds);
        if (newSet.has(routeId)) {
            newSet.delete(routeId);
            // ルートを外したら戻りも外す
            const newRoundTrips = new Set(routeRoundTripsEnabled);
            newRoundTrips.delete(routeId);
            setRouteRoundTripsEnabled(newRoundTrips);
        } else {
            newSet.add(routeId);
            // ルートを選択したら戻りもデフォルトでオン（戻り回数が1以上の場合）
            const route = routes.find((r) => r.id === routeId);
            if (route && route.round_trips > 0) {
                const newRoundTrips = new Set(routeRoundTripsEnabled);
                newRoundTrips.add(routeId);
                setRouteRoundTripsEnabled(newRoundTrips);
            }
        }
        setSelectedRouteIds(newSet);
    };

    const toggleRouteRoundTrips = (routeId: string) => {
        const newSet = new Set(routeRoundTripsEnabled);
        if (newSet.has(routeId)) {
            newSet.delete(routeId);
        } else {
            newSet.add(routeId);
        }
        setRouteRoundTripsEnabled(newSet);
    };

    const selectAllAttendees = () => {
        // フィルターに関係なく全員を選択
        setSelectedAttendeeIds(new Set(allAttendeesWithDestination.map((a) => a.profile_id)));
    };

    const deselectAllAttendees = () => {
        setSelectedAttendeeIds(new Set());
    };

    const selectAllRoutes = () => {
        setSelectedRouteIds(new Set(routes.map((r) => r.id)));
        // 戻り回数が1以上のルートは戻りもオン
        setRouteRoundTripsEnabled(new Set(routes.filter((r) => r.round_trips > 0).map((r) => r.id)));
    };

    const deselectAllRoutes = () => {
        setSelectedRouteIds(new Set());
        setRouteRoundTripsEnabled(new Set());
    };

    const handleGetSuggestion = async (userMessage?: string) => {
        // 選択されたユーザーを取得（フィルターに関係なく全体から）
        const targetAttendees = allAttendeesWithDestination.filter((a) =>
            selectedAttendeeIds.has(a.profile_id)
        );

        if (targetAttendees.length === 0) {
            setErrorMessage("対象ユーザーを1名以上選択してください");
            return;
        }

        if (selectedRouteIds.size === 0) {
            setErrorMessage("送迎車を1台以上選択してください");
            return;
        }

        setIsLoading(true);
        setErrorMessage(null);

        try {
            // 選択された送迎車情報を取得（戻り設定を反映）
            const selectedRoutes = routes
                .filter((r) => selectedRouteIds.has(r.id))
                .map((r) => ({
                    ...r,
                    // 戻りが無効の場合は round_trips を 0 に
                    round_trips: routeRoundTripsEnabled.has(r.id) ? r.round_trips : 0,
                }));

            const result = await getAIPickupSuggestion(
                storeId,
                date,
                targetAttendees,
                selectedRoutes,
                userMessage,
                undefined,
                storeAddress
            );
            setSuggestion(result);
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
            await applyAISuggestion(
                storeId,
                date,
                suggestion,
                staffProfiles,
                attendees,
                false
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
        setMode("select");
        setSelectedAttendeeIds(new Set());
        setSelectedRouteIds(new Set());
        setRouteRoundTripsEnabled(new Set());
        setRoleFilter("all");
        onClose();
    };

    const handleBack = () => {
        if (mode === "suggestion") {
            setSuggestion(null);
            setChatHistory([]);
            setMode("select");
        }
        setErrorMessage(null);
    };

    const handleOpenCreateRoute = () => {
        handleClose();
        onOpenCreateRoute();
    };

    const handleOpenAddAttendance = () => {
        onOpenAddAttendance();
    };

    // モーダルを開いた時に全選択する
    useEffect(() => {
        if (isOpen && mode === "select") {
            if (routes.length > 0) {
                selectAllRoutes();
            }
            if (allAttendeesWithDestination.length > 0) {
                selectAllAttendees();
            }
        }
    }, [isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900 max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader className="relative flex flex-row items-center justify-center space-y-0 pb-4">
                    <button
                        type="button"
                        onClick={mode === "select" ? handleClose : handleBack}
                        className="absolute left-0 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    </button>
                    <DialogTitle className="text-base font-semibold text-gray-900 dark:text-gray-50">
                        AI送迎ルート提案
                    </DialogTitle>
                    <button
                        type="button"
                        onClick={handleClose}
                        className="absolute right-0 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    </button>
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

                    {/* 送迎車・ユーザー選択 */}
                    {mode === "select" && !isLoading && (
                        <div className="space-y-4">
                            {/* 送迎車選択 */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm font-medium text-gray-900 dark:text-white">
                                        使用する送迎車 ({selectedRouteIds.size}/{routes.length})
                                    </Label>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={selectAllRoutes}
                                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                        >
                                            全選択
                                        </button>
                                        <button
                                            type="button"
                                            onClick={deselectAllRoutes}
                                            className="text-xs text-gray-500 dark:text-gray-400 hover:underline"
                                        >
                                            全解除
                                        </button>
                                    </div>
                                </div>
                                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-2">
                                    <div className="space-y-1">
                                        {sortedRoutes.length === 0 ? (
                                            <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">
                                                送迎車がありません
                                            </p>
                                        ) : (
                                            sortedRoutes.map((route) => (
                                                <div
                                                    key={route.id}
                                                    className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                                                >
                                                    <label className="flex items-center gap-2 flex-1 cursor-pointer">
                                                        <Checkbox
                                                            checked={selectedRouteIds.has(route.id)}
                                                            onCheckedChange={() => toggleRoute(route.id)}
                                                        />
                                                        <span className="text-sm text-gray-900 dark:text-white">
                                                            {route.driver_name || "ドライバー未定"}
                                                        </span>
                                                        <span className="text-xs text-gray-400 dark:text-gray-500">
                                                            (上限{route.capacity}名)
                                                        </span>
                                                    </label>
                                                    {route.round_trips > 0 && (
                                                        <label className="flex items-center gap-1 cursor-pointer shrink-0">
                                                            <Checkbox
                                                                checked={routeRoundTripsEnabled.has(route.id)}
                                                                onCheckedChange={() => toggleRouteRoundTrips(route.id)}
                                                                disabled={!selectedRouteIds.has(route.id)}
                                                            />
                                                            <span className={`text-xs ${selectedRouteIds.has(route.id) ? "text-gray-600 dark:text-gray-300" : "text-gray-400 dark:text-gray-500"}`}>
                                                                戻り
                                                            </span>
                                                        </label>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                                {/* 送迎車を追加ボタン */}
                                <button
                                    type="button"
                                    onClick={handleOpenCreateRoute}
                                    className="w-full flex items-center justify-center gap-2 p-2 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600 dark:hover:border-blue-600 dark:hover:text-blue-400 transition-colors text-xs"
                                >
                                    <Plus className="h-3 w-3" />
                                    送迎車を追加
                                </button>
                            </div>

                            {/* 対象ユーザー選択 */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm font-medium text-gray-900 dark:text-white">
                                        対象ユーザー ({selectedAttendeeIds.size}/{allAttendeesWithDestination.length})
                                    </Label>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={selectAllAttendees}
                                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                        >
                                            全選択
                                        </button>
                                        <button
                                            type="button"
                                            onClick={deselectAllAttendees}
                                            className="text-xs text-gray-500 dark:text-gray-400 hover:underline"
                                        >
                                            全解除
                                        </button>
                                    </div>
                                </div>
                                {/* フィルタートグル */}
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => setRoleFilter("all")}
                                        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                                            roleFilter === "all"
                                                ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                                                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                                        }`}
                                    >
                                        全員 ({allAttendeesWithDestination.length})
                                    </button>
                                    {castCount > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setRoleFilter("cast")}
                                            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                                                roleFilter === "cast"
                                                    ? "bg-pink-500 text-white"
                                                    : "bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400 hover:bg-pink-100 dark:hover:bg-pink-900/40"
                                            }`}
                                        >
                                            キャスト ({castCount})
                                        </button>
                                    )}
                                    {staffCount > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setRoleFilter("staff")}
                                            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                                                roleFilter === "staff"
                                                    ? "bg-blue-500 text-white"
                                                    : "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40"
                                            }`}
                                        >
                                            スタッフ ({staffCount})
                                        </button>
                                    )}
                                </div>
                                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-2">
                                    <div className="space-y-1">
                                        {attendeesWithDestination.length === 0 ? (
                                            <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">
                                                該当するユーザーがいません
                                            </p>
                                        ) : (
                                            attendeesWithDestination.map((attendee) => (
                                                <label
                                                    key={attendee.profile_id}
                                                    className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                                                >
                                                    <Checkbox
                                                        checked={selectedAttendeeIds.has(attendee.profile_id)}
                                                        onCheckedChange={() => toggleAttendee(attendee.profile_id)}
                                                    />
                                                    <span className="text-sm text-gray-900 dark:text-white">
                                                        {attendee.display_name}
                                                    </span>
                                                    <span className="text-xs text-gray-400 dark:text-gray-500 truncate flex-1">
                                                        {attendee.pickup_destination}
                                                    </span>
                                                </label>
                                            ))
                                        )}
                                    </div>
                                </div>
                                {/* 出勤を追加ボタン */}
                                <button
                                    type="button"
                                    onClick={handleOpenAddAttendance}
                                    className="w-full flex items-center justify-center gap-2 p-2 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600 dark:hover:border-blue-600 dark:hover:text-blue-400 transition-colors text-xs"
                                >
                                    <Plus className="h-3 w-3" />
                                    出勤を追加
                                </button>
                            </div>

                            {/* 提案取得ボタン */}
                            <div className="space-y-2">
                                <Button
                                    onClick={() => handleGetSuggestion()}
                                    disabled={selectedRouteIds.size === 0 || selectedAttendeeIds.size === 0}
                                    className="w-full rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 border-none"
                                >
                                    <Sparkles className="h-4 w-4 mr-2" />
                                    AIに提案してもらう
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={handleClose}
                                    className="w-full rounded-lg"
                                >
                                    キャンセル
                                </Button>
                            </div>
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
                                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                                    提案内容
                                </h4>

                                <div className="space-y-3">
                                        {suggestion.routes.map((route, rIdx) => {
                                            // 総乗客数を計算
                                            const totalPassengers = route.trips.reduce(
                                                (sum, trip) => sum + trip.passengers.length,
                                                0
                                            );
                                            return (
                                                <div
                                                    key={rIdx}
                                                    className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
                                                >
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs">
                                                            {totalPassengers}
                                                        </span>
                                                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                            {route.driver_name || "ドライバー未定"}
                                                        </span>
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                                            (上限{route.capacity}名)
                                                        </span>
                                                    </div>

                                                    {route.trips.map((trip) => {
                                                        const tripLabel = trip.trip_number === 1 ? "出発便" : "戻り便";
                                                        const tripColor = trip.trip_number === 1 ? "#3B82F6" : "#F97316";
                                                        const tripColorLight = trip.trip_number === 1
                                                            ? "rgba(59, 130, 246, 0.15)"
                                                            : "rgba(249, 115, 22, 0.15)";

                                                        return (
                                                            <div key={trip.trip_number} className="ml-2 mt-2">
                                                                <span
                                                                    className="text-xs font-semibold px-1.5 py-0.5 rounded"
                                                                    style={{ backgroundColor: tripColorLight, color: tripColor }}
                                                                >
                                                                    {tripLabel}
                                                                </span>
                                                                <div className="flex flex-wrap gap-1 mt-1.5">
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
                                                        );
                                                    })}
                                                </div>
                                            );
                                        })}
                                    </div>
                            </div>

                        </div>
                    )}
                </div>

                {mode === "suggestion" && suggestion && !isLoading && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
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
                                placeholder="変更点を入力..."
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
                        {/* Buttons */}
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={handleClose}
                                className="flex-1 rounded-lg"
                            >
                                キャンセル
                            </Button>
                            <Button
                                onClick={handleApplySuggestion}
                                disabled={isApplying}
                                className="flex-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                            >
                                {isApplying ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        適用中...
                                    </>
                                ) : (
                                    "提案を適用"
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
