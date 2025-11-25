"use client";

import React, { useState, useEffect } from "react";
import { ChevronLeft, MoreHorizontal, Send, UserCircle, Heart, Edit2, Trash2, Upload, Download } from "lucide-react";
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
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    updateUser,
    createUser,
    deleteUser,
    getProfileDetails,
    updateProfileRelationships,
    addProfileComment,
    updateProfileComment,
    deleteProfileComment,
    toggleCommentLike,
    getAllProfiles,
    getCurrentUserProfileId,
    uploadProfileAvatar,
    deleteProfileAvatar,
    getUserBottleKeeps,
} from "./actions";
import { getMenus } from "../menus/actions";
import { BottleModal } from "../bottles/bottle-modal";
import { useRouter, useSearchParams } from "next/navigation";
import { UserAttendanceListModal } from "./user-attendance-list-modal";
import { AttendanceModal } from "../attendance/attendance-modal";
import { RelationshipSelectorModal } from "./relationship-selector-modal";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";

interface Profile {
    id: string;
    display_name: string | null;
    display_name_kana: string | null;
    real_name: string | null;
    real_name_kana: string | null;
    role: string;
    store_id: string;
    guest_addressee?: string | null;
    guest_receipt_type?: string | null;
    stores?: { name: string } | null;
    avatar_url?: string | null;
}

interface UserEditModalProps {
    profile: Profile | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    isNested?: boolean;
    defaultRole?: string;
}

export function UserEditModal({ profile, open, onOpenChange, isNested = false, defaultRole: propDefaultRole }: UserEditModalProps) {
    const searchParams = useSearchParams();
    const defaultRole = propDefaultRole || searchParams.get("role") || "cast";

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [role, setRole] = useState<string>(profile?.role ?? defaultRole);

    const [showActions, setShowActions] = useState(false);
    const [showAttendanceList, setShowAttendanceList] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [editingAttendanceRecord, setEditingAttendanceRecord] = useState<any>(null);
    const router = useRouter();

    // Relationships & Comments state
    const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
    const [relationships, setRelationships] = useState<any[]>([]);
    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState("");
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const [currentUserProfileId, setCurrentUserProfileId] = useState<string | null>(null);

    // Comment editing state
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editingCommentText, setEditingCommentText] = useState("");
    const [commentMenuOpen, setCommentMenuOpen] = useState<string | null>(null);
    const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null);

    // Relationship selector state
    const [relationshipSelectorOpen, setRelationshipSelectorOpen] = useState<string | null>(null);
    const [nestedProfileId, setNestedProfileId] = useState<string | null>(null);

    // Bottle Keeps state
    const [bottleKeeps, setBottleKeeps] = useState<any[]>([]);
    const [menus, setMenus] = useState<any[]>([]);
    const [isBottleModalOpen, setIsBottleModalOpen] = useState(false);

    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleAvatarClick = () => {
        if (!profile) return;
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !profile) return;

        const formData = new FormData();
        formData.append("file", file);

        try {
            await uploadProfileAvatar(profile.id, formData);
            router.refresh();
        } catch (error) {
            console.error("Avatar upload failed:", error);
            alert("アップロードに失敗しました");
        }
    };

    const handleDeleteAvatar = async () => {
        if (!profile) return;
        if (!confirm("アイコンを削除しますか？")) return;
        try {
            await deleteProfileAvatar(profile.id);
            router.refresh();
        } catch (error) {
            console.error("Avatar delete failed:", error);
            alert("削除に失敗しました");
        }
    };

    useEffect(() => {
        setRole(profile?.role ?? defaultRole);
    }, [profile, defaultRole]);

    // Auto-save handler with debouncing
    const autoSaveTimeoutRef = React.useRef<NodeJS.Timeout>(undefined);
    const handleFieldChange = React.useCallback(() => {
        if (!profile) return; // Only auto-save for existing profiles

        if (autoSaveTimeoutRef.current) {
            clearTimeout(autoSaveTimeoutRef.current);
        }

        autoSaveTimeoutRef.current = setTimeout(async () => {
            const form = document.querySelector('form[data-profile-form]') as HTMLFormElement;
            if (!form) return;

            const formData = new FormData(form);
            try {
                await updateUser(formData);
                // Note: router.refresh() is NOT called here to prevent re-rendering loop
            } catch (error) {
                console.error('Auto-save failed:', error);
            }
        }, 1000);
    }, [profile]);

    useEffect(() => {
        if (open) {
            const fetchData = async () => {
                setIsLoadingDetails(true);
                try {
                    const profiles = await getAllProfiles();
                    setAllProfiles(profiles as any[]);

                    // Get current user's profile ID
                    const currentId = await getCurrentUserProfileId();
                    setCurrentUserProfileId(currentId);

                    if (profile) {
                        const details = await getProfileDetails(profile.id);
                        if (details) {
                            setRelationships(details.relationships);
                            setComments(details.comments);
                        }
                    }
                } catch (error) {
                    console.error("Failed to fetch details:", error);
                } finally {
                    setIsLoadingDetails(false);
                }
            };
            fetchData();
        } else {
            // Reset state on close
            setRelationships([]);
            setComments([]);
            setBottleKeeps([]);
            setMenus([]);
            setNewComment("");
            setEditingCommentId(null);
            setCommentMenuOpen(null);
        }
    }, [open, profile]);

    useEffect(() => {
        if (open && profile && profile.role === "guest") {
            const fetchBottleKeeps = async () => {
                const keeps = await getUserBottleKeeps(profile.id);
                setBottleKeeps(keeps);
            };
            fetchBottleKeeps();
        }
    }, [open, profile]);

    useEffect(() => {
        if (open) {
            const fetchMenus = async () => {
                const menusData = await getMenus();
                setMenus(menusData);
            };
            fetchMenus();
        }
    }, [open]);

    const refreshBottleKeeps = async () => {
        if (!profile) return;
        const keeps = await getUserBottleKeeps(profile.id);
        setBottleKeeps(keeps);
    };

    const refreshComments = async () => {
        if (!profile) return;
        const details = await getProfileDetails(profile.id);
        if (details) {
            setComments(details.comments);
        }
    };

    const handleSubmit = async (formData: FormData) => {
        setIsSubmitting(true);
        try {
            if (profile) {
                await updateUser(formData);
            } else {
                await createUser(formData);
            }
            onOpenChange(false);
            router.refresh();
        } catch (error) {
            console.error("Failed to save user:", error);
            alert("ユーザーの保存に失敗しました");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!profile) return;
        setIsSubmitting(true);
        try {
            await deleteUser(profile.id);
            setShowDeleteConfirm(false);
            onOpenChange(false);
            router.refresh();
        } catch (error) {
            console.error("Failed to delete user:", error);
            alert("ユーザーの削除に失敗しました");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRelationshipChange = async (type: string, selectedIds: string[]) => {
        if (!profile) return;
        try {
            await updateProfileRelationships(profile.id, type, selectedIds);
            // Refresh local state
            const details = await getProfileDetails(profile.id);
            if (details) {
                setRelationships(details.relationships);
            }
        } catch (error) {
            console.error(`Failed to update ${type}:`, error);
        }
    };

    const handleAddComment = async () => {
        if (!profile || !newComment.trim()) return;
        try {
            await addProfileComment(profile.id, newComment);
            setNewComment("");
            await refreshComments();
        } catch (error) {
            console.error("Failed to add comment:", error);
        }
    };

    const handleEditComment = async (commentId: string) => {
        if (!editingCommentText.trim()) return;
        try {
            await updateProfileComment(commentId, editingCommentText);
            setEditingCommentId(null);
            setEditingCommentText("");
            await refreshComments();
        } catch (error) {
            console.error("Failed to update comment:", error);
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        try {
            await deleteProfileComment(commentId);
            setDeleteCommentId(null);
            await refreshComments();
        } catch (error) {
            console.error("Failed to delete comment:", error);
        }
    };

    const handleToggleLike = async (commentId: string) => {
        try {
            await toggleCommentLike(commentId);
            await refreshComments();
        } catch (error) {
            console.error("Failed to toggle like:", error);
        }
    };

    // Helper to get selected IDs for a relationship type
    const getSelectedIds = (type: string) => {
        if (!profile) return [];
        return relationships
            .filter((r) => r.relationship_type === type)
            .map((r) => (r.source_profile_id === profile.id ? r.target_profile_id : r.source_profile_id));
    };

    // Helper to get selected profile objects
    const getSelectedProfiles = (type: string) => {
        const selectedIds = getSelectedIds(type);
        return allProfiles.filter((p) => selectedIds.includes(p.id));
    };


    // Helper to filter profiles for selection
    const getOptions = (filterRole?: string | string[]) => {
        let filtered = allProfiles.filter((p) => p.id !== profile?.id);
        if (filterRole) {
            const roles = Array.isArray(filterRole) ? filterRole : [filterRole];
            filtered = filtered.filter((p) => roles.includes(p.role));
        }
        return filtered.map((p) => ({
            label: p.display_name || p.real_name || "Unknown",
            value: p.id,
        }));
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent
                    className="sm:max-w-[600px] bg-white dark:bg-gray-800 w-[95%] rounded-lg max-h-[90vh] overflow-y-auto p-6"
                    onPointerDownOutside={(e) => {
                        e.preventDefault();
                        onOpenChange(false);
                    }}
                    onEscapeKeyDown={(e) => {
                        e.preventDefault();
                        onOpenChange(false);
                    }}
                    onInteractOutside={(e) => {
                        e.preventDefault();
                    }}
                >
                    <DialogHeader className="flex flex-row items-center justify-between gap-2 relative">
                        <button
                            type="button"
                            onClick={() => onOpenChange(false)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-0"
                            aria-label="戻る"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <DialogTitle className="flex-1 text-center text-xl md:text-2xl font-bold text-gray-900 dark:text-white truncate">
                            {profile ? (profile.display_name || "ユーザー編集") : "新規作成"}
                        </DialogTitle>
                        {profile ? (
                            <button
                                type="button"
                                onClick={() => setShowActions(!showActions)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700"
                                aria-label="オプション"
                            >
                                <MoreHorizontal className="h-4 w-4" />
                            </button>
                        ) : (
                            <div className="w-8 h-8" />
                        )}

                        {showActions && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowActions(false)} />
                                <div className="absolute right-0 top-10 z-50 w-40 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg p-2 flex flex-col gap-1 text-sm animate-in fade-in zoom-in-95 duration-100">
                                    <button
                                        type="button"
                                        className="w-full text-left px-3 py-2 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                        onClick={() => {
                                            setShowActions(false);
                                            setShowAttendanceList(true);
                                        }}
                                    >
                                        勤怠一覧
                                    </button>
                                    {profile?.id !== currentUserProfileId && (
                                        <button
                                            type="button"
                                            className="w-full text-left px-3 py-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                            onClick={() => {
                                                setShowActions(false);
                                                setShowDeleteConfirm(true);
                                            }}
                                        >
                                            削除
                                        </button>
                                    )}
                                </div>
                            </>
                        )}
                    </DialogHeader>

                    <div className="space-y-6">
                        <form
                            action={handleSubmit}
                            className="space-y-4"
                            key={profile?.id || 'new'}
                            data-profile-form
                            onChange={handleFieldChange}
                        >
                            {profile && <input type="hidden" name="profileId" value={profile.id} />}
                            <input type="hidden" name="role" value={role} />

                            {profile && (
                                <div className="flex flex-col items-center gap-4 mb-6">
                                    <div className="relative group">
                                        <Avatar className="h-24 w-24 cursor-pointer" onClick={handleAvatarClick}>
                                            <AvatarImage src={profile.avatar_url || ""} className="object-cover" />
                                            <AvatarFallback className="bg-gray-100 dark:bg-gray-800 text-2xl">
                                                {profile.display_name?.[0] || <UserCircle className="h-12 w-12" />}
                                            </AvatarFallback>
                                            <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                <Upload className="h-6 w-6 text-white" />
                                            </div>
                                        </Avatar>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                        />
                                    </div>

                                </div>
                            )}

                            {!profile && (
                                <div className="flex justify-center mb-2">
                                    <div className="inline-flex h-9 items-center rounded-full bg-gray-100 dark:bg-gray-800 p-1 text-xs">
                                        <button
                                            type="button"
                                            onClick={() => setRole("cast")}
                                            className={`px-4 h-full flex items-center rounded-full font-medium transition-colors ${role === "cast"
                                                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                                                : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                                                }`}
                                        >
                                            キャスト
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setRole("staff")}
                                            className={`px-4 h-full flex items-center rounded-full font-medium transition-colors ${role === "staff"
                                                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                                                : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                                                }`}
                                        >
                                            スタッフ
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setRole("guest")}
                                            className={`px-4 h-full flex items-center rounded-full font-medium transition-colors ${role === "guest"
                                                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                                                : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                                                }`}
                                        >
                                            ゲスト
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="displayName">表示名</Label>
                                <Input
                                    id="displayName"
                                    name="displayName"
                                    defaultValue={profile?.display_name || ""}
                                    placeholder="表示名"
                                    className="rounded-md"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="displayNameKana">表示名（かな）</Label>
                                <Input
                                    id="displayNameKana"
                                    name="displayNameKana"
                                    defaultValue={profile?.display_name_kana || ""}
                                    placeholder="ひょうじめい"
                                    className="rounded-md"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="realName">本名</Label>
                                    <Input
                                        id="realName"
                                        name="realName"
                                        defaultValue={profile?.real_name || ""}
                                        placeholder="本名"
                                        className="rounded-md"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="realNameKana">本名（かな）</Label>
                                    <Input
                                        id="realNameKana"
                                        name="realNameKana"
                                        defaultValue={profile?.real_name_kana || ""}
                                        placeholder="ほんみょう"
                                        className="rounded-md"
                                    />
                                </div>
                            </div>

                            {role === "guest" && (
                                <div className="space-y-2">
                                    <Label htmlFor="guestAddressee">宛名</Label>
                                    <Input
                                        id="guestAddressee"
                                        name="guestAddressee"
                                        type="text"
                                        defaultValue={profile?.guest_addressee ?? ""}
                                        placeholder="例: 山田様"
                                        className="rounded-md"
                                    />
                                </div>
                            )}

                            {role === "guest" && (
                                <div className="space-y-2">
                                    <Label htmlFor="guestReceiptType">領収書</Label>
                                    <Select
                                        name="guestReceiptType"
                                        defaultValue={profile?.guest_receipt_type || "none"}
                                    >
                                        <SelectTrigger className="rounded-md">
                                            <SelectValue placeholder="領収書の種類を選択" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">なし</SelectItem>
                                            <SelectItem value="amount_only">金額のみ</SelectItem>
                                            <SelectItem value="with_date">日付入り</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* Bottle Keeps (Guest only) */}
                            {profile && role === "guest" && (
                                <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-medium text-gray-900 dark:text-white">キープボトル</h3>
                                        <button
                                            type="button"
                                            onClick={() => setIsBottleModalOpen(true)}
                                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                        >
                                            + 追加
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        {bottleKeeps.length === 0 ? (
                                            <span className="text-sm text-gray-400 dark:text-gray-500">ボトルはありません</span>
                                        ) : (
                                            bottleKeeps.map((bottle) => (
                                                <div key={bottle.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                                                    <div>
                                                        <div className="font-medium text-sm text-gray-900 dark:text-white">
                                                            {bottle.menu_name}
                                                        </div>
                                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                                            残量: {bottle.remaining_amount}%
                                                            {bottle.expiration_date && ` / 期限: ${format(new Date(bottle.expiration_date), "yyyy/MM/dd")}`}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                            {!profile && (
                                <DialogFooter className="mt-6">
                                    <div className="flex flex-col w-full gap-3">
                                        <Button type="submit" disabled={isSubmitting} className="w-full rounded-full h-10">
                                            {isSubmitting ? "作成中..." : "作成する"}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => onOpenChange(false)}
                                            className="w-full rounded-full border-gray-300 dark:border-gray-600 h-10"
                                        >
                                            キャンセル
                                        </Button>
                                    </div>
                                </DialogFooter>
                            )}
                        </form>

                        {profile && (
                            <>
                                <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-6">
                                    {/* Compatibility */}
                                    <div className="space-y-4">
                                        <h3 className="font-medium text-gray-900 dark:text-white">相性</h3>
                                        <div className="space-y-3">
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-xs text-gray-500">相性 ◯</Label>
                                                    <button
                                                        type="button"
                                                        onClick={() => setRelationshipSelectorOpen("compatibility_good")}
                                                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                                    >
                                                        + 追加
                                                    </button>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {getSelectedProfiles("compatibility_good").length === 0 ? (
                                                        <span className="text-sm text-gray-400 dark:text-gray-500">未設定</span>
                                                    ) : (
                                                        getSelectedProfiles("compatibility_good").map((p) => (
                                                            <button
                                                                key={p.id}
                                                                type="button"
                                                                onClick={() => setNestedProfileId(p.id)}
                                                                className="px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                                                            >
                                                                {p.display_name || p.real_name || "名前なし"}
                                                            </button>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-xs text-gray-500">相性 ✕</Label>
                                                    <button
                                                        type="button"
                                                        onClick={() => setRelationshipSelectorOpen("compatibility_bad")}
                                                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                                    >
                                                        + 追加
                                                    </button>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {getSelectedProfiles("compatibility_bad").length === 0 ? (
                                                        <span className="text-sm text-gray-400 dark:text-gray-500">未設定</span>
                                                    ) : (
                                                        getSelectedProfiles("compatibility_bad").map((p) => (
                                                            <button
                                                                key={p.id}
                                                                type="button"
                                                                onClick={() => setNestedProfileId(p.id)}
                                                                className="px-3 py-1.5 rounded-full bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                                                            >
                                                                {p.display_name || p.real_name || "名前なし"}
                                                            </button>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Nomination (Cast/Guest only) */}
                                    {(role === "cast" || role === "guest") && (
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <Label>指名</Label>
                                                <button
                                                    type="button"
                                                    onClick={() => setRelationshipSelectorOpen("nomination")}
                                                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                                >
                                                    + 追加
                                                </button>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {getSelectedProfiles("nomination").length === 0 ? (
                                                    <span className="text-sm text-gray-400 dark:text-gray-500">未設定</span>
                                                ) : (
                                                    getSelectedProfiles("nomination").map((p) => (
                                                        <button
                                                            key={p.id}
                                                            type="button"
                                                            onClick={() => setNestedProfileId(p.id)}
                                                            className="px-3 py-1.5 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 text-sm hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                                                        >
                                                            {p.display_name || p.real_name || "名前なし"}
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* In Charge (Cast/Staff only) */}
                                    {(role === "cast" || role === "staff") && (
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <Label>担当</Label>
                                                <button
                                                    type="button"
                                                    onClick={() => setRelationshipSelectorOpen("in_charge")}
                                                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                                >
                                                    + 追加
                                                </button>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {getSelectedProfiles("in_charge").length === 0 ? (
                                                    <span className="text-sm text-gray-400 dark:text-gray-500">未設定</span>
                                                ) : (
                                                    getSelectedProfiles("in_charge").map((p) => (
                                                        <button
                                                            key={p.id}
                                                            type="button"
                                                            onClick={() => setNestedProfileId(p.id)}
                                                            className="px-3 py-1.5 rounded-full bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-sm hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                                                        >
                                                            {p.display_name || p.real_name || "名前なし"}
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Comments */}
                                <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-4">
                                    <h3 className="font-medium text-gray-900 dark:text-white">コメント</h3>

                                    <div className="space-y-4 max-h-60 overflow-y-auto">
                                        {comments.map((comment) => (
                                            <div key={comment.id} className="flex gap-3 items-start bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg relative">
                                                <Avatar className="h-6 w-6">
                                                    <AvatarImage src={comment.author?.avatar_url || ""} />
                                                    <AvatarFallback className="bg-gray-200 dark:bg-gray-700">
                                                        <UserCircle className="h-6 w-6 text-gray-700 dark:text-gray-300" />
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-2 mb-1">
                                                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                            {comment.author?.display_name || "不明なユーザー"}
                                                        </span>
                                                        <div className="flex items-center gap-2 flex-shrink-0">
                                                            <span className="text-xs text-gray-500">
                                                                {format(new Date(comment.updated_at), "yyyy/MM/dd")}
                                                            </span>
                                                            {comment.author?.id === currentUserProfileId && (
                                                                <div className="relative">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setCommentMenuOpen(commentMenuOpen === comment.id ? null : comment.id)}
                                                                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                                                                    >
                                                                        <MoreHorizontal className="h-3 w-3 text-gray-700 dark:text-gray-300" />
                                                                    </button>
                                                                    {commentMenuOpen === comment.id && (
                                                                        <>
                                                                            <div
                                                                                className="fixed inset-0 z-40"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setCommentMenuOpen(null);
                                                                                }}
                                                                            />
                                                                            <div className="absolute right-0 top-6 z-50 w-24 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg p-1 flex flex-col gap-1 text-xs">
                                                                                <button
                                                                                    type="button"
                                                                                    className="w-full text-left px-2 py-1.5 rounded flex items-center gap-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                                                    onClick={() => {
                                                                                        setEditingCommentId(comment.id);
                                                                                        setEditingCommentText(comment.content);
                                                                                        setCommentMenuOpen(null);
                                                                                    }}
                                                                                >
                                                                                    <Edit2 className="h-3 w-3" />
                                                                                    編集
                                                                                </button>
                                                                                <button
                                                                                    type="button"
                                                                                    className="w-full text-left px-2 py-1.5 rounded flex items-center gap-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                                                    onClick={() => {
                                                                                        setDeleteCommentId(comment.id);
                                                                                        setCommentMenuOpen(null);
                                                                                    }}
                                                                                >
                                                                                    <Trash2 className="h-3 w-3" />
                                                                                    削除
                                                                                </button>
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {editingCommentId === comment.id ? (
                                                        <div className="space-y-2">
                                                            <Textarea
                                                                value={editingCommentText}
                                                                onChange={(e) => setEditingCommentText(e.target.value)}
                                                                className="min-h-[60px]"
                                                            />
                                                            <div className="flex gap-2">
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    onClick={() => handleEditComment(comment.id)}
                                                                >
                                                                    保存
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => {
                                                                        setEditingCommentId(null);
                                                                        setEditingCommentText("");
                                                                    }}
                                                                >
                                                                    キャンセル
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-2">
                                                            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                                                                {comment.content}
                                                            </p>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleToggleLike(comment.id)}
                                                                className={`flex items-center gap-1 text-xs transition-colors ${comment.user_has_liked
                                                                    ? "text-pink-500 dark:text-pink-400"
                                                                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                                                    }`}
                                                            >
                                                                <Heart className={`h-3 w-3 ${comment.user_has_liked ? "fill-current" : ""}`} />
                                                                <span>{comment.like_count > 0 ? comment.like_count : "いいね"}</span>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        {comments.length === 0 && (
                                            <p className="text-sm text-gray-500 text-center py-2">コメントはありません</p>
                                        )}
                                    </div>

                                    <div className="flex gap-2">
                                        <Input
                                            value={newComment}
                                            onChange={(e) => setNewComment(e.target.value)}
                                            placeholder="コメントを入力..."
                                            className="flex-1 h-10"
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleAddComment();
                                                }
                                            }}
                                        />
                                        <Button
                                            type="button"
                                            size="icon"
                                            onClick={handleAddComment}
                                            disabled={!newComment.trim()}
                                            className="h-10 w-10"
                                        >
                                            <Send className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </>
                        )}


                    </div>
                </DialogContent>
            </Dialog>

            {/* Bottle Modal - only show if not nested */}
            {!isNested && profile && profile.role === "guest" && (
                <BottleModal
                    isOpen={isBottleModalOpen}
                    onClose={() => {
                        setIsBottleModalOpen(false);
                        refreshBottleKeeps();
                    }}
                    menus={menus}
                    profiles={allProfiles}
                    initialProfileIds={profile ? [profile.id] : []}
                />
            )}

            {/* Delete Comment Confirmation Modal */}
            <Dialog open={!!deleteCommentId} onOpenChange={(open) => !open && setDeleteCommentId(null)}>
                <DialogContent className="sm:max-w-[400px] bg-white dark:bg-gray-800 w-[90%] rounded-lg p-6">
                    <DialogHeader>
                        <DialogTitle className="text-center text-lg font-bold text-gray-900 dark:text-white">
                            コメントを削除
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4 text-center text-gray-600 dark:text-gray-300">
                        <p>本当にこのコメントを削除しますか？</p>
                        <p className="text-sm mt-2 text-gray-500">この操作は取り消せません。</p>
                    </div>
                    <DialogFooter className="flex-col sm:flex-row gap-3">
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={() => deleteCommentId && handleDeleteComment(deleteCommentId)}
                            className="w-full rounded-full bg-red-600 hover:bg-red-700 text-white h-10"
                        >
                            削除
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setDeleteCommentId(null)}
                            className="w-full rounded-full border-gray-300 dark:border-gray-600 h-10"
                        >
                            キャンセル
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete User Confirmation Modal */}
            <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <DialogContent className="sm:max-w-[400px] bg-white dark:bg-gray-800 w-[95%] rounded-lg p-6">
                    <DialogHeader>
                        <DialogTitle className="text-center text-lg font-bold text-gray-900 dark:text-white">
                            ユーザーを削除
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4 text-center text-gray-600 dark:text-gray-300">
                        <p>本当に「{profile?.display_name}」を削除しますか？</p>
                        <p className="text-sm mt-2 text-gray-500">この操作は取り消せません。</p>
                    </div>
                    <DialogFooter className="flex-col sm:flex-row gap-3">
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={isSubmitting}
                            className="w-full rounded-full bg-red-600 hover:bg-red-700 text-white h-10"
                        >
                            {isSubmitting ? "削除中..." : "削除"}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowDeleteConfirm(false)}
                            disabled={isSubmitting}
                            className="w-full rounded-full border-gray-300 dark:border-gray-600 h-10"
                        >
                            キャンセル
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Attendance List Modal */}
            {profile && (
                <UserAttendanceListModal
                    isOpen={showAttendanceList}
                    onClose={() => setShowAttendanceList(false)}
                    profileId={profile.id}
                    profileName={profile.display_name || "メンバー"}
                    onEditRecord={(record) => setEditingAttendanceRecord(record)}
                />
            )}

            {/* Attendance Edit Modal (opened from list) */}
            {editingAttendanceRecord && profile && (
                <AttendanceModal
                    isOpen={!!editingAttendanceRecord}
                    onClose={() => setEditingAttendanceRecord(null)}
                    profiles={[profile]}
                    currentProfileId={profile.id}
                    editingRecord={editingAttendanceRecord}
                />
            )}

            {/* Relationship Selector Modals */}
            {profile && relationshipSelectorOpen && (
                <RelationshipSelectorModal
                    isOpen={!!relationshipSelectorOpen}
                    onClose={() => setRelationshipSelectorOpen(null)}
                    title={
                        relationshipSelectorOpen === "compatibility_good"
                            ? "相性 ◯"
                            : relationshipSelectorOpen === "compatibility_bad"
                                ? "相性 ✕"
                                : relationshipSelectorOpen === "nomination"
                                    ? "指名"
                                    : "担当"
                    }
                    profiles={allProfiles}
                    selectedIds={getSelectedIds(relationshipSelectorOpen)}
                    onSelectionChange={(ids) => {
                        if (relationshipSelectorOpen) {
                            handleRelationshipChange(relationshipSelectorOpen, ids);
                        }
                    }}
                    currentProfileId={profile.id}
                />
            )}

            {/* Nested Profile Modal */}
            {nestedProfileId && (
                <UserEditModal
                    open={!!nestedProfileId}
                    onOpenChange={(open) => !open && setNestedProfileId(null)}
                    profile={allProfiles.find((p) => p.id === nestedProfileId) || null}
                    isNested={true}
                />
            )}
        </>
    );
}
