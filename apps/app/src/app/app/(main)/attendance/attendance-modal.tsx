"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createAttendance, updateAttendance, deleteAttendance } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { MoreHorizontal, ChevronLeft, Calendar, Clock, Trash2 } from "lucide-react";

interface Profile {
    id: string;
    display_name: string | null;
    real_name: string | null;
    role: string;
}

interface AttendanceRecord {
    id: string;
    user_id: string;
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
}: AttendanceModalProps) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

    // Determine default values
    // If editing, use record values.
    // If creating (initialData), use those.
    // Fallback to defaults.

    const [showActions, setShowActions] = useState(false);

    const editingProfile = editingRecord
        ? profiles.find((p) => p.id === editingRecord.user_id) || null
        : null;

    // When editing, use the editing profile's role; otherwise use defaultRole
    const [selectedRole, setSelectedRole] = useState(editingProfile?.role || defaultRole);

    // Update selectedRole when editingProfile changes
    useEffect(() => {
        if (editingProfile) {
            setSelectedRole(editingProfile.role);
        }
    }, [editingProfile]);

    // Filter profiles for the dropdown based on selectedRole
    const filteredProfiles = profiles.filter(p => {
        if (selectedRole === "cast") return p.role === "cast";
        if (selectedRole === "staff") return p.role === "staff";
        return p.role === selectedRole;
    });

    const defaultProfileId = editingRecord?.user_id || initialData?.profileId || "";
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
                return date.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", hour12: false });
            }
        } catch (e) {
            console.error("Error parsing time:", e);
        }
        return "";
    };

    const defaultStartTime = editingRecord ? formatTimeForInput(editingRecord.start_time) : (initialData?.startTime || "");
    const defaultEndTime = editingRecord ? formatTimeForInput(editingRecord.end_time) : (initialData?.endTime || "");
    const defaultPickupDestination = editingRecord?.pickup_destination || "";

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const formData = new FormData(e.currentTarget);
            let result;
            if (editingRecord) {
                result = await updateAttendance(formData);
            } else {
                result = await createAttendance(formData);
            }

            // Assuming actions return { success: true } on success
            // If they threw error, it would be caught below.
            // If they redirected, we wouldn't reach here (unless using next/navigation redirect which throws).
            // But we changed them to return object.

            router.refresh();
            onClose();
        } catch (error) {
            console.error("Error saving attendance:", error);
            // Handle error (e.g. show toast)
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!editingRecord) return;
        setIsSubmitting(true);
        try {
            await deleteAttendance(editingRecord.id);
            router.refresh();
            setIsDeleteConfirmOpen(false);
            onClose();
        } catch (error) {
            console.error("Error deleting attendance:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px] bg-white dark:bg-gray-800 w-[95%] rounded-lg max-h-[90vh] overflow-y-auto p-6 text-gray-900 dark:text-gray-100">
                <div className="relative">
                    <DialogHeader className="flex flex-row items-center justify-between gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-0"
                            aria-label="戻る"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <DialogTitle className="flex-1 text-center text-xl md:text-2xl font-bold text-gray-900 dark:text-white truncate">
                            {editingProfile
                                ? (editingProfile.display_name || editingProfile.real_name || "メンバー")
                                : "出勤記録"}
                        </DialogTitle>
                        {defaultProfileId ? (
                            <button
                                type="button"
                                onClick={() => setShowActions((prev) => !prev)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700"
                                aria-label="プロフィール・勤怠の操作を表示"
                            >
                                <MoreHorizontal className="h-4 w-4" />
                            </button>
                        ) : (
                            <div className="h-8 w-8" />
                        )}
                    </DialogHeader>

                    {showActions && defaultProfileId && (
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
                                    className="justify-start h-8 px-2 rounded-lg text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    onClick={() => {
                                        onOpenProfileEdit?.(defaultProfileId);
                                        setShowActions(false);
                                        onClose();
                                    }}
                                >
                                    プロフィール
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="justify-start h-8 px-2 rounded-lg text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    onClick={() => {
                                        onFocusAttendanceForProfile?.(defaultProfileId);
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
                                            className="justify-start h-8 px-2 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
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

                    {/* Role Toggle */}
                    {!editingRecord && (
                        <div className="flex justify-center mb-2">
                            <div className="inline-flex h-8 items-center rounded-full bg-gray-100 dark:bg-gray-700 p-1">
                                <button
                                    type="button"
                                    onClick={() => setSelectedRole("cast")}
                                    className={`px-4 h-full flex items-center rounded-full text-xs font-medium transition-colors ${selectedRole === "cast"
                                        ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                                        : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                                        }`}
                                >
                                    キャスト
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedRole("staff")}
                                    className={`px-4 h-full flex items-center rounded-full text-xs font-medium transition-colors ${selectedRole === "staff"
                                        ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                                        : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                                        }`}
                                >
                                    スタッフ
                                </button>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4 mt-1">
                        {editingRecord && <input type="hidden" name="id" value={editingRecord.id} />}

                        <div className="space-y-1">
                            <Label htmlFor="profileId">メンバー</Label>
                            <Select name="profileId" defaultValue={defaultProfileId} required>
                                <SelectTrigger id="profileId" className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md">
                                    <SelectValue placeholder="メンバーを選択" />
                                </SelectTrigger>
                                <SelectContent>
                                    {filteredProfiles.map((p) => (
                                        <SelectItem key={p.id} value={p.id}>
                                            {p.display_name || p.real_name || "メンバー"}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="date">日付</Label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400 pointer-events-none" />
                                <Input
                                    id="date"
                                    name="date"
                                    type="date"
                                    required
                                    defaultValue={defaultDate}
                                    className="w-full pl-10 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md"
                                />
                            </div>
                        </div>

                        {/* Status is hidden as per user request */}
                        {/* <div className="space-y-1">
                            <Label htmlFor="status">状態</Label>
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

                        <div className="space-y-1">
                            <Label htmlFor="pickup_destination">送迎先</Label>
                            <Input
                                id="pickup_destination"
                                name="pickup_destination"
                                type="text"
                                placeholder="送迎先を入力"
                                defaultValue={defaultPickupDestination}
                                className="w-full bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label htmlFor="startTime">開始時刻</Label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400 pointer-events-none" />
                                    <Input
                                        id="startTime"
                                        name="startTime"
                                        type="time"
                                        defaultValue={defaultStartTime}
                                        step={60}
                                        className="w-full pl-10 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="endTime">終了時刻</Label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400 pointer-events-none" />
                                    <Input
                                        id="endTime"
                                        name="endTime"
                                        type="time"
                                        defaultValue={defaultEndTime}
                                        step={60}
                                        className="w-full pl-10 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md"
                                    />
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="flex-col sm:flex-row gap-4 mt-8">
                            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto rounded-full h-10">
                                {isSubmitting ? "保存中..." : (editingRecord ? "保存" : "作成")}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                                className="w-full sm:w-auto border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full h-10"
                            >
                                キャンセル
                            </Button>
                        </DialogFooter>
                    </form>
                </div>
            </DialogContent>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
                <DialogContent className="sm:max-w-[425px] bg-white dark:bg-gray-800 w-[95%] rounded-lg p-6">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white">
                            勤怠記録の削除
                        </DialogTitle>
                        <DialogDescription className="text-gray-500 dark:text-gray-400 mt-2">
                            この勤怠記録を削除してもよろしいですか？<br />
                            この操作は取り消せません。
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex-col sm:flex-row gap-3 mt-6">
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
        </Dialog>
    );
}
