"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
    createAttendance,
    updateAttendance,
    deleteAttendance,
    getTimecardQuestionsForAttendance,
    getTimecardQuestionAnswers,
    saveTimecardQuestionAnswers,
    getBreaksForWorkRecord,
    saveBreaksForWorkRecord,
    type TimecardQuestion,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useGlobalLoading } from "@/components/global-loading";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { MoreHorizontal, ChevronLeft, Calendar, Clock, UserCircle, Loader2, Plus, X, Coffee } from "lucide-react";
import { CommentSection } from "@/components/comment-section";
import { MemberSelectModal } from "./member-select-modal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TimecardQuestionsForm } from "@/components/timecard/timecard-questions-form";

interface Profile {
    id: string;
    display_name: string | null;
    display_name_kana?: string | null;
    real_name: string | null;
    role: string;
    avatar_url?: string | null;
}

interface AttendanceRecord {
    id: string;
    profile_id: string;
    date: string;
    status: string;
    start_time: string | null;
    end_time: string | null;
    pickup_destination?: string | null;
}

interface AttendanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    profiles: Profile[];
    currentProfileId: string;
    defaultRole?: string;
    initialData?: {
        profileId?: string;
        date?: string;
        status?: string;
        startTime?: string;
        endTime?: string;
    } | null;
    editingRecord?: AttendanceRecord | null;
    onOpenProfileEdit?: (profileId: string) => void;
    onFocusAttendanceForProfile?: (profileId: string) => void;
    onSaved?: () => void;
    onOptimisticDelete?: (recordId: string) => void;
    onRevertDelete?: (record: AttendanceRecord) => void;
    onCreateNewProfile?: () => void;
    pickupEnabledCast?: boolean;
    pickupEnabledStaff?: boolean;
    showBreakColumns?: boolean;
}

export function AttendanceModal({
    isOpen,
    onClose,
    profiles,
    currentProfileId,
    defaultRole = "staff",
    initialData,
    editingRecord,
    onOpenProfileEdit,
    onFocusAttendanceForProfile,
    onSaved,
    onOptimisticDelete,
    onRevertDelete,
    onCreateNewProfile,
    pickupEnabledCast = false,
    pickupEnabledStaff = false,
    showBreakColumns = false,
}: AttendanceModalProps) {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { showLoading, hideLoading } = useGlobalLoading();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [isMemberSelectOpen, setIsMemberSelectOpen] = useState(false);

    // Determine default values
    // If editing, use record values.
    // If creating (initialData), use those.
    // Fallback to defaults.

    const [showActions, setShowActions] = useState(false);
    const [selectedProfileId, setSelectedProfileId] = useState<string>("");

    // Custom questions state
    const [allQuestions, setAllQuestions] = useState<TimecardQuestion[]>([]);
    const [clockInAnswers, setClockInAnswers] = useState<Record<string, string>>({});
    const [clockOutAnswers, setClockOutAnswers] = useState<Record<string, string>>({});
    const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
    const [isQuestionsValid, setIsQuestionsValid] = useState(true);

    // Controlled state for auto-save
    const [date, setDate] = useState<string>("");
    const [startTime, setStartTime] = useState<string>("");
    const [endTime, setEndTime] = useState<string>("");
    const [pickupDestination, setPickupDestination] = useState<string>("");
    const [breaks, setBreaks] = useState<{ breakStart: string; breakEnd: string }[]>([]);
    const [isLoadingBreaks, setIsLoadingBreaks] = useState(false);

    // Auto-save debounce timer
    const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

    const editingProfile = editingRecord
        ? profiles.find((p) => p.id === editingRecord.profile_id) || null
        : null;

    // When editing, use the editing profile's role; otherwise use defaultRole
    const [selectedRole, setSelectedRole] = useState(editingProfile?.role || defaultRole);

    // Get selected profile object
    const selectedProfile = profiles.find(p => p.id === selectedProfileId) || null;

    // Update selectedRole and selectedProfileId when modal opens or editingProfile changes
    useEffect(() => {
        if (!isOpen) return;

        if (editingProfile) {
            setSelectedRole(editingProfile.role);
            setSelectedProfileId(editingProfile.id);
        } else if (initialData?.profileId) {
            setSelectedProfileId(initialData.profileId);
        } else {
            setSelectedProfileId("");
        }
    }, [isOpen, editingProfile, initialData?.profileId]);

    // Handle member selection from modal
    const handleMemberSelect = (profile: Profile) => {
        setSelectedProfileId(profile.id);
        setSelectedRole(profile.role);
        setIsMemberSelectOpen(false);
        if (editingRecord) {
            triggerAutoSave();
        }
    };

    // Load breaks when modal opens for editing
    useEffect(() => {
        if (!isOpen) {
            setBreaks([]);
            return;
        }

        if (!editingRecord || editingRecord.id.startsWith("shift_") || !showBreakColumns) {
            setBreaks([]);
            return;
        }

        const loadBreaks = async () => {
            setIsLoadingBreaks(true);
            try {
                const existingBreaks = await getBreaksForWorkRecord(editingRecord.id);
                setBreaks(existingBreaks.map(b => ({
                    breakStart: formatTimeForInput(b.break_start),
                    breakEnd: b.break_end ? formatTimeForInput(b.break_end) : "",
                })));
            } catch (error) {
                console.error("Error loading breaks:", error);
            } finally {
                setIsLoadingBreaks(false);
            }
        };

        loadBreaks();
    }, [isOpen, editingRecord?.id, showBreakColumns]);

    // Load questions when modal opens
    useEffect(() => {
        if (!isOpen) {
            setAllQuestions([]);
            setClockInAnswers({});
            setClockOutAnswers({});
            setIsQuestionsValid(true);
            return;
        }

        const loadQuestions = async () => {
            setIsLoadingQuestions(true);
            try {
                // Use editingProfile's role when editing, otherwise use selectedProfile or defaultRole
                const role = editingProfile?.role || selectedProfile?.role || defaultRole;
                const questions = await getTimecardQuestionsForAttendance(role, "both");
                setAllQuestions(questions);

                // Load existing answers if editing
                if (editingRecord && !editingRecord.id.startsWith("shift_")) {
                    const existingAnswers = await getTimecardQuestionAnswers(editingRecord.id);
                    const clockInMap: Record<string, string> = {};
                    const clockOutMap: Record<string, string> = {};

                    for (const answer of existingAnswers) {
                        if (answer.timing === "clock_in") {
                            clockInMap[answer.question_id] = answer.value;
                        } else if (answer.timing === "clock_out") {
                            clockOutMap[answer.question_id] = answer.value;
                        }
                    }

                    setClockInAnswers(clockInMap);
                    setClockOutAnswers(clockOutMap);
                }
            } catch (error) {
                console.error("Error loading questions:", error);
            } finally {
                setIsLoadingQuestions(false);
            }
        };

        loadQuestions();
    }, [isOpen, editingRecord?.id, editingProfile?.role, selectedProfile?.role, defaultRole]);

    // Filter questions by timing
    const clockInQuestions = useMemo(() => {
        return allQuestions.filter(q => q.timing === "clock_in" || q.timing === "both");
    }, [allQuestions]);

    const clockOutQuestions = useMemo(() => {
        return allQuestions.filter(q => q.timing === "clock_out" || q.timing === "both");
    }, [allQuestions]);

    // Validate questions
    useEffect(() => {
        const validateClockIn = clockInQuestions.every(q => {
            if (!q.is_required) return true;
            const answer = clockInAnswers[q.id];
            return answer && answer.trim() !== "";
        });

        const validateClockOut = clockOutQuestions.every(q => {
            if (!q.is_required) return true;
            const answer = clockOutAnswers[q.id];
            return answer && answer.trim() !== "";
        });

        setIsQuestionsValid(validateClockIn && validateClockOut);
    }, [clockInQuestions, clockOutQuestions, clockInAnswers, clockOutAnswers]);

    const defaultDate = editingRecord?.date || initialData?.date || new Date().toISOString().split("T")[0];
    // Status is hidden, default to empty or inferred by backend

    const formatTimeForInput = (time: string | null) => {
        if (!time) return "";
        // "HH:MM:SS" -> "HH:MM"
        if (/^\d{2}:\d{2}(?::\d{2})?$/.test(time)) {
            return time.slice(0, 5);
        }
        // ISO timestamp -> "HH:MM"
        try {
            const date = new Date(time);
            if (!isNaN(date.getTime())) {
                return date.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Tokyo" });
            }
        } catch (e) {
            console.error("Error parsing time:", e);
        }
        return "";
    };

    const defaultStartTime = editingRecord ? formatTimeForInput(editingRecord.start_time) : (initialData?.startTime || "");
    const defaultEndTime = editingRecord ? formatTimeForInput(editingRecord.end_time) : (initialData?.endTime || "");
    const defaultPickupDestination = editingRecord?.pickup_destination || "";

    // Initialize controlled state when modal opens or editingRecord changes
    useEffect(() => {
        if (!isOpen) return;

        setDate(defaultDate);
        setStartTime(defaultStartTime);
        setEndTime(defaultEndTime);
        setPickupDestination(defaultPickupDestination);
    }, [isOpen, editingRecord?.id, defaultDate, defaultStartTime, defaultEndTime, defaultPickupDestination]);

    // Cleanup auto-save timer on unmount
    useEffect(() => {
        return () => {
            if (autoSaveTimerRef.current) {
                clearTimeout(autoSaveTimerRef.current);
            }
        };
    }, []);

    // Auto-save function (only for editing existing records)
    const autoSave = useCallback(async () => {
        if (!editingRecord || !selectedProfileId) return;
        // Skip auto-save for shift schedule records
        if (editingRecord.id.startsWith("shift_")) return;

        showLoading("保存中...");
        try {
            const formData = new FormData();
            formData.append("id", editingRecord.id);
            formData.append("profileId", selectedProfileId);
            formData.append("date", date);
            formData.append("startTime", startTime);
            formData.append("endTime", endTime);
            formData.append("pickup_destination", pickupDestination);

            await updateAttendance(formData);

            // Save question answers
            if (Object.keys(clockInAnswers).length > 0) {
                await saveTimecardQuestionAnswers(editingRecord.id, clockInAnswers, "clock_in");
            }
            if (Object.keys(clockOutAnswers).length > 0) {
                await saveTimecardQuestionAnswers(editingRecord.id, clockOutAnswers, "clock_out");
            }

            // Save breaks
            if (showBreakColumns) {
                await saveBreaksForWorkRecord(editingRecord.id, date, breaks);
            }

            await Promise.all([
                queryClient.refetchQueries({ queryKey: ["attendance"] }),
                queryClient.refetchQueries({ queryKey: ["dashboard", "pageData"] }),
            ]);
            onSaved?.();
        } catch (error) {
            console.error("Error auto-saving attendance:", error);
            toast({
                title: "保存に失敗しました",
                description: "もう一度お試しください。",
                variant: "destructive",
            });
        } finally {
            hideLoading();
        }
    }, [editingRecord, selectedProfileId, date, startTime, endTime, pickupDestination, clockInAnswers, clockOutAnswers, breaks, showBreakColumns, queryClient, onSaved, showLoading, hideLoading, toast]);

    // Trigger auto-save with debounce (only for editing mode)
    const triggerAutoSave = useCallback(() => {
        if (!editingRecord) return;

        if (autoSaveTimerRef.current) {
            clearTimeout(autoSaveTimerRef.current);
        }
        autoSaveTimerRef.current = setTimeout(() => {
            autoSave();
        }, 800);
    }, [editingRecord, autoSave]);

    // Handle field changes with auto-save trigger
    const handleDateChange = (value: string) => {
        setDate(value);
        triggerAutoSave();
    };

    const handleStartTimeChange = (value: string) => {
        setStartTime(value);
        triggerAutoSave();
    };

    const handleEndTimeChange = (value: string) => {
        setEndTime(value);
        triggerAutoSave();
    };

    const handlePickupDestinationChange = (value: string) => {
        setPickupDestination(value);
        triggerAutoSave();
    };

    // Break handlers
    const handleAddBreak = () => {
        setBreaks(prev => [...prev, { breakStart: "", breakEnd: "" }]);
    };

    const handleRemoveBreak = (index: number) => {
        setBreaks(prev => prev.filter((_, i) => i !== index));
        triggerAutoSave();
    };

    const handleBreakChange = (index: number, field: "breakStart" | "breakEnd", value: string) => {
        setBreaks(prev => prev.map((b, i) => i === index ? { ...b, [field]: value } : b));
        triggerAutoSave();
    };

    const handleProfileChange = (value: string) => {
        setSelectedProfileId(value);
        if (editingRecord) {
            triggerAutoSave();
        }
    };

    // handleSubmit is only used for creating new records
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (editingRecord) return; // Auto-save handles editing

        setIsSubmitting(true);
        showLoading("作成中...");
        try {
            const formData = new FormData();
            formData.append("profileId", selectedProfileId);
            formData.append("date", date);
            formData.append("startTime", startTime);
            formData.append("endTime", endTime);
            formData.append("pickup_destination", pickupDestination);

            const result = await createAttendance(formData);

            // Save question answers if work record was created
            if (result.workRecordId) {
                if (Object.keys(clockInAnswers).length > 0) {
                    await saveTimecardQuestionAnswers(result.workRecordId, clockInAnswers, "clock_in");
                }
                if (Object.keys(clockOutAnswers).length > 0) {
                    await saveTimecardQuestionAnswers(result.workRecordId, clockOutAnswers, "clock_out");
                }

                // Save breaks
                if (showBreakColumns && breaks.length > 0) {
                    await saveBreaksForWorkRecord(result.workRecordId, date, breaks);
                }
            }

            // 先にデータを再取得してから、モーダルを閉じる
            await Promise.all([
                queryClient.refetchQueries({ queryKey: ["attendance"] }),
                queryClient.refetchQueries({ queryKey: ["dashboard", "pageData"] }),
            ]);
            onSaved?.();
            onClose();
        } catch (error) {
            console.error("Error creating attendance:", error);
            toast({
                title: "作成に失敗しました",
                description: "もう一度お試しください。",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
            hideLoading();
        }
    };

    const handleDelete = async () => {
        if (!editingRecord) return;

        // 楽観的UI: まずUIから削除
        onOptimisticDelete?.(editingRecord.id);
        setIsDeleteConfirmOpen(false);
        onClose();

        try {
            await deleteAttendance(editingRecord.id);
            // 成功したらキャッシュも更新（出勤記録とダッシュボード）
            await Promise.all([
                queryClient.refetchQueries({ queryKey: ["attendance"] }),
                queryClient.refetchQueries({ queryKey: ["dashboard", "pageData"] }),
            ]);
        } catch (error) {
            console.error("Error deleting attendance:", error);
            // 失敗したら元に戻す
            onRevertDelete?.(editingRecord);
            toast({
                title: "削除に失敗しました",
                description: "もう一度お試しください。",
                variant: "destructive",
            });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden flex flex-col max-h-[90vh] rounded-2xl">
                <div className="relative flex flex-col flex-1 overflow-hidden">
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
                            {editingProfile
                                ? (editingProfile.display_name || editingProfile.real_name || "メンバー")
                                : "出勤記録"}
                        </DialogTitle>
                        {selectedProfileId ? (
                            <button
                                type="button"
                                onClick={() => setShowActions((prev) => !prev)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 transition-colors"
                                aria-label="プロフィール・勤怠の操作を表示"
                            >
                                <MoreHorizontal className="h-5 w-5" />
                            </button>
                        ) : (
                            <div className="h-8 w-8" />
                        )}
                    </DialogHeader>

                    {showActions && selectedProfileId && (
                        <>
                            <button
                                type="button"
                                className="absolute inset-0 z-10 cursor-default"
                                onClick={() => setShowActions(false)}
                                aria-label="メニューを閉じる"
                            />
                            <div className="absolute right-0 top-10 z-20 w-40 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg p-2 flex flex-col gap-1 text-xs">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="justify-start h-8 px-2 rounded-lg text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                    onClick={() => {
                                        onOpenProfileEdit?.(selectedProfileId);
                                        setShowActions(false);
                                        onClose();
                                    }}
                                >
                                    プロフィール
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="justify-start h-8 px-2 rounded-lg text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                    onClick={() => {
                                        onFocusAttendanceForProfile?.(selectedProfileId);
                                        setShowActions(false);
                                        onClose();
                                    }}
                                >
                                    勤怠
                                </Button>
                                {editingRecord && (
                                    <>
                                        <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            className="justify-start h-8 px-2 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                            onClick={() => {
                                                setShowActions(false);
                                                setIsDeleteConfirmOpen(true);
                                            }}
                                        >
                                            削除
                                        </Button>
                                    </>
                                )}
                            </div>
                        </>
                    )}

                    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 px-6 py-4">
                        {editingRecord && <input type="hidden" name="id" value={editingRecord.id} />}

                        {/* Member Selection */}
                        <div className="space-y-1">
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">メンバー</Label>
                            <button
                                type="button"
                                onClick={() => setIsMemberSelectOpen(true)}
                                className="w-full flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                            >
                                {selectedProfile ? (
                                    <>
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage src={selectedProfile.avatar_url || undefined} />
                                            <AvatarFallback className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                                {(selectedProfile.display_name || selectedProfile.real_name || "?")[0]}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-gray-900 dark:text-white truncate">
                                                {selectedProfile.display_name || selectedProfile.real_name || "メンバー"}
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                {selectedProfile.role === "cast" ? "キャスト" : "スタッフ"}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                            <UserCircle className="h-6 w-6 text-gray-400" />
                                        </div>
                                        <div className="flex-1 text-gray-500 dark:text-gray-400">
                                            メンバーを選択...
                                        </div>
                                    </>
                                )}
                            </button>
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="date" className="text-sm font-medium text-gray-700 dark:text-gray-200">日付</Label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400 pointer-events-none" />
                                <Input
                                    id="date"
                                    name="date"
                                    type="date"
                                    required
                                    value={date}
                                    onChange={(e) => handleDateChange(e.target.value)}
                                    className="w-full pl-10 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md"
                                />
                            </div>
                        </div>

                        {/* Status is hidden as per user request */}
                        {/* <div className="space-y-1">
                            <Label htmlFor="status" className="text-sm font-medium text-gray-700 dark:text-gray-200">状態</Label>
                            <Select name="status" defaultValue={defaultStatus} required>
                                <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md">
                                    <SelectValue placeholder="状態を選択" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="scheduled">予定</SelectItem>
                                    <SelectItem value="working">出勤中</SelectItem>
                                    <SelectItem value="finished">完了</SelectItem>
                                    <SelectItem value="absent">欠勤</SelectItem>
                                </SelectContent>
                            </Select>
                        </div> */}

                        {/* Pickup destination - only show if enabled for the selected profile's role */}
                        {(selectedProfile?.role === "cast" ? pickupEnabledCast : pickupEnabledStaff) && (
                            <div className="space-y-1">
                                <Label htmlFor="pickup_destination" className="text-sm font-medium text-gray-700 dark:text-gray-200">送迎先</Label>
                                <Input
                                    id="pickup_destination"
                                    name="pickup_destination"
                                    type="text"
                                    placeholder="送迎先を入力"
                                    value={pickupDestination}
                                    onChange={(e) => handlePickupDestinationChange(e.target.value)}
                                    className="w-full bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md"
                                />
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label htmlFor="startTime" className="text-sm font-medium text-gray-700 dark:text-gray-200">開始時刻</Label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400 pointer-events-none" />
                                    <Input
                                        id="startTime"
                                        name="startTime"
                                        type="time"
                                        value={startTime}
                                        onChange={(e) => handleStartTimeChange(e.target.value)}
                                        step={60}
                                        className="w-full pl-10 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="endTime" className="text-sm font-medium text-gray-700 dark:text-gray-200">終了時刻</Label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400 pointer-events-none" />
                                    <Input
                                        id="endTime"
                                        name="endTime"
                                        type="time"
                                        value={endTime}
                                        onChange={(e) => handleEndTimeChange(e.target.value)}
                                        step={60}
                                        className="w-full pl-10 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Breaks Section */}
                        {showBreakColumns && (
                            <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center gap-2">
                                        <Coffee className="h-4 w-4" />
                                        休憩
                                    </Label>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleAddBreak}
                                        className="h-8 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                                    >
                                        <Plus className="h-4 w-4 mr-1" />
                                        追加
                                    </Button>
                                </div>

                                {isLoadingBreaks ? (
                                    <div className="py-2 text-center text-gray-500">
                                        <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                                    </div>
                                ) : breaks.length === 0 ? (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
                                        休憩なし
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {breaks.map((breakItem, index) => (
                                            <div key={index} className="flex items-center gap-2">
                                                <span className="text-xs text-gray-500 dark:text-gray-400 w-8 flex-shrink-0">
                                                    {index + 1}
                                                </span>
                                                <div className="flex-1 grid grid-cols-2 gap-2">
                                                    <Input
                                                        type="time"
                                                        value={breakItem.breakStart}
                                                        onChange={(e) => handleBreakChange(index, "breakStart", e.target.value)}
                                                        step={60}
                                                        placeholder="開始"
                                                        className="h-9 text-sm bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                                                    />
                                                    <Input
                                                        type="time"
                                                        value={breakItem.breakEnd}
                                                        onChange={(e) => handleBreakChange(index, "breakEnd", e.target.value)}
                                                        step={60}
                                                        placeholder="終了"
                                                        className="h-9 text-sm bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                                                    />
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleRemoveBreak(index)}
                                                    className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Custom Questions */}
                        {isLoadingQuestions ? (
                            <div className="py-4 text-center text-gray-500">
                                <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                                <span className="text-sm">質問を読み込み中...</span>
                            </div>
                        ) : (
                            <>
                                {/* Clock-in Questions */}
                                {clockInQuestions.length > 0 && (
                                    <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">出勤時の質問</Label>
                                        <TimecardQuestionsForm
                                            questions={clockInQuestions}
                                            answers={clockInAnswers}
                                            onAnswersChange={(answers) => {
                                                setClockInAnswers(answers);
                                                if (editingRecord) {
                                                    triggerAutoSave();
                                                }
                                            }}
                                            isDarkMode={false}
                                        />
                                    </div>
                                )}

                                {/* Clock-out Questions */}
                                {clockOutQuestions.length > 0 && (
                                    <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">退勤時の質問</Label>
                                        <TimecardQuestionsForm
                                            questions={clockOutQuestions}
                                            answers={clockOutAnswers}
                                            onAnswersChange={(answers) => {
                                                setClockOutAnswers(answers);
                                                if (editingRecord) {
                                                    triggerAutoSave();
                                                }
                                            }}
                                            isDarkMode={false}
                                        />
                                    </div>
                                )}
                            </>
                        )}

                        {/* Only show buttons for new record creation */}
                        {!editingRecord && (
                            <div className="flex flex-col gap-2 pt-4">
                                <Button
                                    type="submit"
                                    disabled={isSubmitting || !selectedProfileId || !isQuestionsValid}
                                    className="w-full rounded-full h-10"
                                >
                                    {isSubmitting ? "作成中..." : "作成"}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={onClose}
                                    className="w-full border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-full h-10"
                                >
                                    キャンセル
                                </Button>
                            </div>
                        )}

                        {/* Comments Section (only for existing records) */}
                        {editingRecord && (
                            <div className="pt-4">
                                <CommentSection
                                    targetType="work_record"
                                    targetId={editingRecord.id}
                                    isOpen={isOpen}
                                />
                            </div>
                        )}
                    </form>
                </div>
            </DialogContent>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
                <DialogContent className="sm:max-w-md bg-white dark:bg-gray-800 w-[95%] rounded-2xl p-6">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white">
                            勤怠記録の削除
                        </DialogTitle>
                        <DialogDescription className="text-gray-500 dark:text-gray-400 mt-2">
                            この勤怠記録を削除してもよろしいですか？<br />
                            この操作は取り消せません。
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={isSubmitting}
                            className="w-full sm:w-auto rounded-full"
                        >
                            {isSubmitting ? "削除中..." : "削除する"}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsDeleteConfirmOpen(false)}
                            className="w-full sm:w-auto rounded-full"
                        >
                            キャンセル
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Member Select Modal */}
            <MemberSelectModal
                isOpen={isMemberSelectOpen}
                onClose={() => setIsMemberSelectOpen(false)}
                profiles={profiles}
                defaultRole={defaultRole}
                onSelect={handleMemberSelect}
                onOpenProfileEdit={onOpenProfileEdit}
                onCreateNewProfile={onCreateNewProfile}
            />
        </Dialog>
    );
}
