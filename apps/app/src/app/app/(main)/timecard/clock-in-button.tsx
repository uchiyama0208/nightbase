"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { clockIn, startBreak, endBreak } from "./actions";
import { MapPin, CheckCircle2, XCircle, RefreshCw, Loader2 } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { PickupForm } from "@/components/timecard/pickup-form";
import { ClockOutModal } from "./clock-out-modal";

interface ClockButtonsProps {
    latestTimeCard: {
        id: string;
        clock_in: string | null;
        clock_out: string | null;
        break_start: string | null;
        break_end: string | null;
    } | null;
    storeSettings?: {
        location_check_enabled: boolean;
        latitude: number | null;
        longitude: number | null;
        location_radius: number;
    };
    showBreakButtons?: boolean;
    pickupHistory: string[];
    autoOpenModal?: boolean;
    autoClockOut?: boolean;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

export function ClockButtons({ latestTimeCard, storeSettings, showBreakButtons = true, pickupHistory, autoOpenModal = false, autoClockOut = false }: ClockButtonsProps) {
    const router = useRouter();
    const [currentTime, setCurrentTime] = useState<Date | null>(null);
    const [isPending, setIsPending] = useState(false);

    // Location state
    const [locationStatus, setLocationStatus] = useState<'checking' | 'matched' | 'mismatched' | 'error' | 'disabled'>('disabled');
    const [currentDistance, setCurrentDistance] = useState<number | null>(null);

    const checkLocation = useCallback(() => {
        if (!storeSettings?.location_check_enabled) {
            setLocationStatus('disabled');
            return;
        }

        if (!storeSettings.latitude || !storeSettings.longitude) {
            setLocationStatus('error');
            return;
        }

        if (!navigator.geolocation) {
            setLocationStatus('error');
            return;
        }

        setLocationStatus('checking');
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const distance = calculateDistance(
                    position.coords.latitude,
                    position.coords.longitude,
                    storeSettings.latitude!,
                    storeSettings.longitude!
                );
                setCurrentDistance(distance);
                if (distance <= storeSettings.location_radius) {
                    setLocationStatus('matched');
                } else {
                    setLocationStatus('mismatched');
                }
            },
            (error) => {
                console.error("Error getting location:", error);
                setLocationStatus('error');
            }
        );
    }, [storeSettings]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isClockOutModalOpen, setIsClockOutModalOpen] = useState(false);

    useEffect(() => {
        setCurrentTime(new Date());
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        // Initial location check
        if (storeSettings?.location_check_enabled) {
            checkLocation();
        }

        return () => clearInterval(timer);
    }, [storeSettings?.location_check_enabled, checkLocation]);

    // Auto-open modal if requested and not clocked in
    useEffect(() => {
        if (autoOpenModal && !latestTimeCard?.clock_in) {
            // Small delay to ensure location check completes
            const timer = setTimeout(() => {
                setIsModalOpen(true);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [autoOpenModal, latestTimeCard]);

    //  Auto open clock-out modal if requested and clocked in
    const hasAutoOpenedClockOut = React.useRef(false);
    useEffect(() => {
        if (autoClockOut && latestTimeCard?.clock_in && !latestTimeCard?.clock_out && !hasAutoOpenedClockOut.current) {
            // Only open if user is actually clocked in and hasn't been auto-opened yet
            hasAutoOpenedClockOut.current = true;
            const timer = setTimeout(() => {
                setIsClockOutModalOpen(true);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [autoClockOut, latestTimeCard]);

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString("ja-JP", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            timeZone: "Asia/Tokyo",
        });
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString("ja-JP", {
            year: "numeric",
            month: "long",
            day: "numeric",
            weekday: "long",
            timeZone: "Asia/Tokyo",
        });
    };

    const [isPickupValid, setIsPickupValid] = useState(false);
    const [pickupRequired, setPickupRequired] = useState<boolean | null>(null);
    const [pickupDestination, setPickupDestination] = useState("");

    const handleClockIn = async () => {
        setIsModalOpen(true);
    };

    const handleConfirmClockIn = async () => {
        setIsPending(true);
        try {
            await clockIn(pickupRequired === true, pickupDestination);
            setIsModalOpen(false);
            router.refresh();
        } catch (error) {
            console.error("Clock in failed:", error);
            alert("出勤打刻に失敗しました。もう一度お試しください。");
        } finally {
            setIsPending(false);
        }
    };

    const handleClockOut = () => {
        setIsClockOutModalOpen(true);
    };

    const handleAction = async (action: () => Promise<void>) => { // Modified handleAction for break actions
        setIsPending(true);
        try {
            await action();
        } catch (error) {
            console.error("Action error:", error);
            alert("操作に失敗しました");
        } finally {
            setIsPending(false);
        }
    };

    // 状態判定
    const isClockedIn = latestTimeCard?.clock_in && !latestTimeCard?.clock_out;
    const isOnBreak = isClockedIn && latestTimeCard?.break_start && !latestTimeCard?.break_end;

    // Location UI helpers
    const renderLocationStatus = () => {
        if (!storeSettings?.location_check_enabled) return null;

        switch (locationStatus) {
            case 'checking':
                return (
                    <div className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>位置情報を確認中...</span>
                    </div>
                );
            case 'matched':
                return (
                    <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400 text-sm font-medium">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>位置情報は一致しています</span>
                    </div>
                );
            case 'mismatched':
                return (
                    <div className="flex items-center justify-center gap-2 text-red-600 dark:text-red-400 text-sm font-medium">
                        <XCircle className="h-4 w-4" />
                        <span>位置情報が一致していません ({Math.round(currentDistance || 0)}m)</span>
                    </div>
                );
            case 'error':
                return (
                    <div className="flex items-center justify-center gap-2 text-red-600 dark:text-red-400 text-sm font-medium">
                        <XCircle className="h-4 w-4" />
                        <span>位置情報の取得に失敗しました</span>
                    </div>
                );
            default:
                return null;
        }
    };

    const isClockInDisabled = isPending || (
        storeSettings?.location_check_enabled && locationStatus !== 'matched'
    );

    return (
        <div className="space-y-4 md:space-y-6">
            <div className="text-center space-y-2">
                <div className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white font-mono">
                    {currentTime ? formatTime(currentTime) : "--:--"}
                </div>
                <div className="text-sm md:text-base lg:text-lg text-gray-600 dark:text-gray-400">
                    {currentTime ? formatDate(currentTime) : "----/--/--"}
                </div>
            </div>

            {/* Location Status Display */}
            {!isClockedIn && renderLocationStatus()}

            <div className="flex flex-col items-center gap-3 md:gap-4">
                {!isClockedIn ? (
                    <div className="flex items-center gap-2 w-full max-w-xs">
                        <Button
                            size="lg"
                            onClick={handleClockIn}
                            disabled={isClockInDisabled}
                            className={`text-base md:text-lg px-8 md:px-12 py-4 md:py-6 text-white w-full transition-colors ${isClockInDisabled
                                ? "bg-gray-300 dark:bg-gray-700 cursor-not-allowed"
                                : "bg-[#0088FF] hover:bg-[#0077EE]"
                                }`}
                        >
                            {isPending ? "登録中..." : "出勤する"}
                        </Button>
                        {storeSettings?.location_check_enabled && locationStatus !== 'matched' && locationStatus !== 'checking' && (
                            <Button
                                size="icon"
                                variant="outline"
                                onClick={checkLocation}
                                className="h-14 w-14 shrink-0 border-gray-200 dark:border-gray-700"
                                title="位置情報を再取得"
                            >
                                <RefreshCw className="h-5 w-5 text-gray-500" />
                            </Button>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="text-center text-sm font-medium text-blue-600 dark:text-blue-400 mb-2">
                            勤務中
                        </div>
                        <div className="flex flex-col md:flex-row gap-3 md:gap-4 w-full max-w-md">
                            {!isOnBreak ? (
                                <>
                                    {showBreakButtons && (
                                        <Button
                                            size="lg"
                                            onClick={() => handleAction(() => startBreak(latestTimeCard!.id))}
                                            disabled={isPending}
                                            className="text-base md:text-lg px-6 md:px-8 py-4 md:py-6 bg-yellow-500 hover:bg-yellow-600 text-white flex-1"
                                        >
                                            {isPending ? "登録中..." : "休憩開始"}
                                        </Button>
                                    )}
                                    <Button
                                        size="lg"
                                        onClick={handleClockOut}
                                        disabled={isPending}
                                        className={`text-base md:text-lg px-6 md:px-8 py-4 md:py-6 bg-red-500 hover:bg-red-600 text-white ${showBreakButtons ? 'flex-1' : 'w-full'}`}
                                    >
                                        {isPending ? "登録中..." : "退勤する"}
                                    </Button>
                                </>
                            ) : (
                                <Button
                                    size="lg"
                                    onClick={() => handleAction(() => endBreak(latestTimeCard!.id))}
                                    disabled={isPending}
                                    className="text-base md:text-lg px-6 md:px-8 py-4 md:py-6 bg-green-500 hover:bg-green-600 text-white w-full"
                                >
                                    {isPending ? "登録中..." : "休憩終了"}
                                </Button>
                            )}
                        </div>
                    </>
                )}
            </div>



            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[500px] max-w-[calc(100%-2rem)] bg-white dark:bg-white">
                    <DialogHeader>
                        <DialogTitle className="text-gray-900">出勤確認</DialogTitle>
                        <DialogDescription className="text-gray-600">
                            出勤前に送迎の有無と目的地を確認してください。
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <PickupForm
                            pickupHistory={pickupHistory}
                            onValidationChange={setIsPickupValid}
                            isDarkMode={false}
                            onPickupChange={setPickupRequired}
                            onDestinationChange={setPickupDestination}
                        />
                    </div>
                    <div className="flex flex-col gap-3 pt-2">
                        <Button
                            onClick={handleConfirmClockIn}
                            disabled={pickupRequired === null || !isPickupValid || isPending}
                            className="w-full bg-[#0088FF] hover:bg-[#0077EE] text-white disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                            {isPending ? "登録中..." : "出勤する"}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setIsModalOpen(false)}
                            className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
                        >
                            キャンセル
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <ClockOutModal
                isOpen={isClockOutModalOpen}
                onClose={() => setIsClockOutModalOpen(false)}
                timeCardId={latestTimeCard?.id || ""}
            />
        </div>
    );
}
