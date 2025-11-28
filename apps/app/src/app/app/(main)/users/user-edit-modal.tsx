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
    DialogDescription,
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
import { CommentList } from "@/components/comment-list";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

interface Profile {
    id: string;
    display_name: string | null;
    display_name_kana: string | null;
    real_name: string | null;
    real_name_kana: string | null;
    last_name?: string | null;
    first_name?: string | null;
    last_name_kana?: string | null;
    first_name_kana?: string | null;
    zip_code?: string | null;
    prefecture?: string | null;
    city?: string | null;
    street?: string | null;
    building?: string | null;
    phone_number?: string | null;
    emergency_phone_number?: string | null;
    nearest_station?: string | null;
    height?: number | null;
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
    hidePersonalInfo?: boolean;
    onDelete?: (profileId: string) => void;
    onUpdate?: (profile: Partial<Profile> & { id: string }) => void;
}

export function UserEditModal({ profile, open, onOpenChange, isNested = false, defaultRole: propDefaultRole, hidePersonalInfo = false, onDelete, onUpdate }: UserEditModalProps) {
    const searchParams = useSearchParams();
    const defaultRole = propDefaultRole || searchParams.get("role") || "cast";

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [role, setRole] = useState<string>(profile?.role ?? defaultRole);
    const roleToggleRef = React.useRef<HTMLDivElement>(null);
    const [sliderStyle, setSliderStyle] = useState({ left: 0, width: 0 });

    const [showActions, setShowActions] = useState(false);
    const [showAttendanceList, setShowAttendanceList] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [editingAttendanceRecord, setEditingAttendanceRecord] = useState<any>(null);
    const router = useRouter();

    // Relationships & Comments state
    const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
    const [relationships, setRelationships] = useState<any[]>([]);
    const [comments, setComments] = useState<any[]>([]);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const [currentUserProfileId, setCurrentUserProfileId] = useState<string | null>(null);

    // Relationship selector state
    const [relationshipSelectorOpen, setRelationshipSelectorOpen] = useState<string | null>(null);
    const [nestedProfileId, setNestedProfileId] = useState<string | null>(null);

    // Bottle Keeps state
    const [bottleKeeps, setBottleKeeps] = useState<any[]>([]);
    const [menus, setMenus] = useState<any[]>([]);
    const [isBottleModalOpen, setIsBottleModalOpen] = useState(false);

    // Past Employments state
    const [pastEmployments, setPastEmployments] = useState<any[]>([]);

    // Address state for auto-fill
    const [addressState, setAddressState] = useState({
        zipCode: "",
        prefecture: "",
        city: "",
        street: "",
        building: ""
    });

    useEffect(() => {
        if (profile) {
            setAddressState({
                zipCode: profile.zip_code || "",
                prefecture: profile.prefecture || "",
                city: profile.city || "",
                street: profile.street || "",
                building: profile.building || ""
            });
        } else {
            setAddressState({
                zipCode: "",
                prefecture: "",
                city: "",
                street: "",
                building: ""
            });
        }
    }, [profile]);

    const handleZipCodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setAddressState(prev => ({ ...prev, zipCode: value }));

        if (value.length === 7) {
            try {
                const response = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${value}`);
                const data = await response.json();
                if (data.results?.[0]) {
                    const { address1, address2, address3 } = data.results[0];
                    setAddressState(prev => ({
                        ...prev,
                        zipCode: value,
                        prefecture: address1,
                        city: address2,
                        street: address3
                    }));
                }
            } catch (error) {
                console.error("Failed to fetch address:", error);
            }
        }
    };

    const handleAddressChange = (field: keyof typeof addressState) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setAddressState(prev => ({ ...prev, [field]: e.target.value }));
    };

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

    // Update slider position when role changes
    const isNewProfile = !profile;
    useEffect(() => {
        const updateSlider = () => {
            if (!roleToggleRef.current) return;
            const buttons = roleToggleRef.current.querySelectorAll('button');
            const roleIndex = role === "cast" ? 0 : role === "staff" ? 1 : 2;
            const button = buttons[roleIndex] as HTMLButtonElement;
            if (button) {
                setSliderStyle({
                    left: button.offsetLeft,
                    width: button.offsetWidth,
                });
            }
        };

        // Initial delay to wait for DOM render
        if (open && isNewProfile) {
            const timer = setTimeout(updateSlider, 50);
            return () => clearTimeout(timer);
        }
        updateSlider();
    }, [role, open, isNewProfile]);

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
                    // Fetch common data in parallel
                    const [profiles, currentId, menusData] = await Promise.all([
                        getAllProfiles(),
                        getCurrentUserProfileId(),
                        getMenus()
                    ]);

                    setAllProfiles(profiles as any[]);
                    setCurrentUserProfileId(currentId);
                    setMenus(menusData);

                    // Fetch profile specific data if profile exists
                    if (profile) {
                        const promises: Promise<any>[] = [getProfileDetails(profile.id)];

                        if (profile.role === "guest") {
                            promises.push(getUserBottleKeeps(profile.id));
                        }

                        if (profile.role === "cast") {
                            const { getPastEmployments } = await import("./actions");
                            promises.push(getPastEmployments(profile.id));
                        }

                        const results = await Promise.all(promises);
                        const details = results[0];

                        if (details) {
                            setRelationships(details.relationships);
                            setComments(details.comments);
                        }

                        if (profile.role === "guest" && results[1]) {
                            setBottleKeeps(results[1]);
                        }

                        if (profile.role === "cast" && results[1]) {
                            setPastEmployments(results[1]);
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
            setPastEmployments([]);
        }
    }, [open, profile]);

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
        // Extract form data for optimistic update
        const updatedData = {
            id: profile?.id || "",
            display_name: formData.get("displayName") as string,
            display_name_kana: formData.get("displayNameKana") as string || null,
            real_name: formData.get("realName") as string || null,
            real_name_kana: formData.get("realNameKana") as string || null,
            role: formData.get("role") as string,
        };

        // Optimistic UI: close modal and update parent immediately (sync, no await)
        onOpenChange(false);
        if (profile && onUpdate) {
            onUpdate(updatedData);
        }

        // Fire and forget - don't block UI
        (async () => {
            try {
                if (profile) {
                    await updateUser(formData);
                } else {
                    await createUser(formData);
                }
            } catch (error) {
                console.error("Failed to save user:", error);
                router.refresh();
            }
        })();
    };

    const handleDelete = async () => {
        if (!profile) return;

        // Optimistic UI: immediately close modals and notify parent
        setShowDeleteConfirm(false);
        onOpenChange(false);

        // Notify parent to remove from list immediately
        if (onDelete) {
            onDelete(profile.id);
        }

        // Delete in background
        try {
            await deleteUser(profile.id);
            router.refresh();
        } catch (error) {
            console.error("Failed to delete user:", error);
            // Optionally: could show a toast notification here
            // For now, the refresh will restore the item if delete failed
            router.refresh();
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

    const handleAddComment = async (content: string) => {
        if (!profile) return { success: false, error: "No profile" };
        try {
            await addProfileComment(profile.id, content);
            await refreshComments();
            return { success: true };
        } catch (error) {
            console.error("Failed to add comment:", error);
            return { success: false, error: "Failed to add comment" };
        }
    };

    const handleEditComment = async (commentId: string, content: string) => {
        try {
            await updateProfileComment(commentId, content);
            await refreshComments();
            return { success: true };
        } catch (error) {
            console.error("Failed to update comment:", error);
            return { success: false, error: "Failed to update comment" };
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        try {
            await deleteProfileComment(commentId);
            await refreshComments();
            return { success: true };
        } catch (error) {
            console.error("Failed to delete comment:", error);
            return { success: false, error: "Failed to delete comment" };
        }
    };

    const handleToggleLike = async (commentId: string) => {
        try {
            await toggleCommentLike(commentId);
            // Optimistic UI handles the immediate update, but we can refresh to sync
            refreshComments();
            return { success: true };
        } catch (error) {
            console.error("Failed to toggle like:", error);
            return { success: false, error: "Failed to toggle like" };
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
                        <DialogDescription className="sr-only">
                            {profile ? "ユーザー情報を編集します" : "新しいユーザーを作成します"}
                        </DialogDescription>
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
                            id="profile-form"
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
                                    <div
                                        ref={roleToggleRef}
                                        className="relative inline-flex h-9 items-center rounded-full bg-gray-100 dark:bg-gray-800 p-1 text-xs"
                                    >
                                        {/* Sliding indicator */}
                                        <div
                                            className="absolute top-1 h-7 rounded-full bg-white dark:bg-gray-700 shadow-sm transition-all duration-300 ease-out"
                                            style={{
                                                left: sliderStyle.left || 4,
                                                width: sliderStyle.width || 'auto',
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setRole("cast")}
                                            className={`relative z-10 px-4 h-full flex items-center justify-center rounded-full font-medium whitespace-nowrap transition-colors duration-300 ${role === "cast"
                                                ? "text-gray-900 dark:text-white"
                                                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                                                }`}
                                        >
                                            キャスト
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setRole("staff")}
                                            className={`relative z-10 px-4 h-full flex items-center justify-center rounded-full font-medium whitespace-nowrap transition-colors duration-300 ${role === "staff"
                                                ? "text-gray-900 dark:text-white"
                                                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                                                }`}
                                        >
                                            スタッフ
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setRole("guest")}
                                            className={`relative z-10 px-4 h-full flex items-center justify-center rounded-full font-medium whitespace-nowrap transition-colors duration-300 ${role === "guest"
                                                ? "text-gray-900 dark:text-white"
                                                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
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

                            {!hidePersonalInfo && role === "cast" && (
                                <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                                    <h3 className="font-medium text-gray-900 dark:text-white">キャスト情報</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="height">身長 (cm)</Label>
                                            <Input
                                                id="height"
                                                name="height"
                                                type="number"
                                                defaultValue={profile?.height || ""}
                                                placeholder="160"
                                                className="rounded-md"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="status">状態</Label>
                                            <Select
                                                name="status"
                                                defaultValue={(profile as any)?.status || "通常"}
                                            >
                                                <SelectTrigger id="status" className="rounded-md">
                                                    <SelectValue placeholder="状態を選択" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="通常">通常</SelectItem>
                                                    <SelectItem value="未面接">未面接</SelectItem>
                                                    <SelectItem value="保留">保留</SelectItem>
                                                    <SelectItem value="不合格">不合格</SelectItem>
                                                    <SelectItem value="体入">体入</SelectItem>
                                                    <SelectItem value="休職中">休職中</SelectItem>
                                                    <SelectItem value="退店済み">退店済み</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {role === "guest" && (
                                <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                                    <h3 className="font-medium text-gray-900 dark:text-white">ゲスト情報</h3>
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
                                    <div className="space-y-2">
                                        <Label htmlFor="guestReceiptType">領収書</Label>
                                        <Select
                                            name="guestReceiptType"
                                            defaultValue={profile?.guest_receipt_type || "unspecified"}
                                        >
                                            <SelectTrigger id="guestReceiptType" className="rounded-md">
                                                <SelectValue placeholder="領収書の種類を選択" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="unspecified">未設定</SelectItem>
                                                <SelectItem value="none">なし</SelectItem>
                                                <SelectItem value="amount_only">金額のみ</SelectItem>
                                                <SelectItem value="with_date">日付入り</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
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

                            {/* Compatibility & Relationships */}
                            {profile && (
                                <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-6">
                                    {/* Compatibility */}
                                    <div className="space-y-4">
                                        <h3 className="font-medium text-gray-900 dark:text-white">相性</h3>
                                        <div className="space-y-3">
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs text-gray-500 font-medium">相性 ◯</span>
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
                                                    <span className="text-xs text-gray-500 font-medium">相性 ✕</span>
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
                                                <span className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">指名</span>
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
                                                <span className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">担当</span>
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
                            )}

                            {/* Resume Section Accordion (Cast only) */}
                            {!hidePersonalInfo && role === "cast" && (
                                <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                                    <Accordion type="single" collapsible className="w-full">
                                        <AccordionItem value="resume" className="border-none">
                                            <AccordionTrigger className="py-2 hover:no-underline">
                                                <span className="font-medium text-gray-900 dark:text-white">履歴書</span>
                                            </AccordionTrigger>
                                            <AccordionContent>
                                                <div className="space-y-4 pt-2">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="desiredCastName">希望キャスト名</Label>
                                                        <Input
                                                            id="desiredCastName"
                                                            name="desiredCastName"
                                                            defaultValue={(profile as any)?.desired_cast_name || ""}
                                                            placeholder="例: さくら"
                                                            className="rounded-md"
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <Label htmlFor="desiredHourlyWage">希望時給 (円)</Label>
                                                            <Input
                                                                id="desiredHourlyWage"
                                                                name="desiredHourlyWage"
                                                                type="number"
                                                                defaultValue={(profile as any)?.desired_hourly_wage || ""}
                                                                placeholder="3000"
                                                                className="rounded-md"
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label htmlFor="desiredShiftDays">希望シフト</Label>
                                                            <Input
                                                                id="desiredShiftDays"
                                                                name="desiredShiftDays"
                                                                defaultValue={(profile as any)?.desired_shift_days || ""}
                                                                placeholder="週3回"
                                                                className="rounded-md"
                                                            />
                                                        </div>
                                                    </div>

                                                    {profile && (
                                                        <div className="space-y-2 pt-2">
                                                            <Label>過去在籍店</Label>
                                                            <div className="space-y-2">
                                                                {pastEmployments.length === 0 ? (
                                                                    <span className="text-sm text-gray-400 dark:text-gray-500">登録なし</span>
                                                                ) : (
                                                                    pastEmployments.map((employment) => (
                                                                        <div key={employment.id} className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                                                                            <div className="font-medium text-sm text-gray-900 dark:text-white">
                                                                                {employment.store_name}
                                                                            </div>
                                                                            {employment.period && (
                                                                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                                                    期間: {employment.period}
                                                                                </div>
                                                                            )}
                                                                            <div className="flex gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                                                {employment.hourly_wage && <span>時給: ¥{employment.hourly_wage.toLocaleString()}</span>}
                                                                                {employment.sales_amount && <span>売上: ¥{employment.sales_amount.toLocaleString()}</span>}
                                                                                {employment.customer_count && <span>客数: {employment.customer_count}人</span>}
                                                                            </div>
                                                                        </div>
                                                                    ))
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    </Accordion>
                                </div>
                            )}

                            {/* Personal Info Accordion */}
                            {!hidePersonalInfo && (
                                <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                                    <Accordion type="single" collapsible className="w-full">
                                        <AccordionItem value="personal-info" className="border-none">
                                            <AccordionTrigger className="py-2 hover:no-underline">
                                                <span className="font-medium text-gray-900 dark:text-white">個人情報</span>
                                            </AccordionTrigger>
                                            <AccordionContent>
                                                <div className="space-y-4 pt-2">
                                                    {/* 本名 */}
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <Label htmlFor="lastName">姓</Label>
                                                            <Input
                                                                id="lastName"
                                                                name="lastName"
                                                                defaultValue={profile?.last_name || ""}
                                                                placeholder="姓"
                                                                className="rounded-md"
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label htmlFor="firstName">名</Label>
                                                            <Input
                                                                id="firstName"
                                                                name="firstName"
                                                                defaultValue={profile?.first_name || ""}
                                                                placeholder="名"
                                                                className="rounded-md"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <Label htmlFor="lastNameKana">姓（かな）</Label>
                                                            <Input
                                                                id="lastNameKana"
                                                                name="lastNameKana"
                                                                defaultValue={profile?.last_name_kana || ""}
                                                                placeholder="せい"
                                                                className="rounded-md"
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label htmlFor="firstNameKana">名（かな）</Label>
                                                            <Input
                                                                id="firstNameKana"
                                                                name="firstNameKana"
                                                                defaultValue={profile?.first_name_kana || ""}
                                                                placeholder="めい"
                                                                className="rounded-md"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* 電話番号 */}
                                                    <div className="space-y-2">
                                                        <Label htmlFor="phoneNumber">電話番号</Label>
                                                        <Input
                                                            id="phoneNumber"
                                                            name="phoneNumber"
                                                            defaultValue={profile?.phone_number || ""}
                                                            placeholder="090-1234-5678"
                                                            className="rounded-md"
                                                        />
                                                    </div>

                                                    {/* 住所 */}
                                                    <div className="space-y-4 pt-4">
                                                        <span className="text-sm text-gray-500 font-medium">住所</span>

                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="space-y-2">
                                                                <Label htmlFor="zipCode" className="text-xs text-gray-500">郵便番号</Label>
                                                                <Input
                                                                    id="zipCode"
                                                                    name="zipCode"
                                                                    value={addressState.zipCode}
                                                                    onChange={handleZipCodeChange}
                                                                    placeholder="1234567"
                                                                    className="rounded-md"
                                                                    maxLength={7}
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label htmlFor="prefecture" className="text-xs text-gray-500">都道府県</Label>
                                                                <Input
                                                                    id="prefecture"
                                                                    name="prefecture"
                                                                    value={addressState.prefecture}
                                                                    onChange={handleAddressChange("prefecture")}
                                                                    placeholder="東京都"
                                                                    className="rounded-md"
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="space-y-2">
                                                            <Label htmlFor="city" className="text-xs text-gray-500">市区町村</Label>
                                                            <Input
                                                                id="city"
                                                                name="city"
                                                                value={addressState.city}
                                                                onChange={handleAddressChange("city")}
                                                                placeholder="渋谷区"
                                                                className="rounded-md"
                                                            />
                                                        </div>

                                                        <div className="space-y-2">
                                                            <Label htmlFor="street" className="text-xs text-gray-500">番地</Label>
                                                            <Input
                                                                id="street"
                                                                name="street"
                                                                value={addressState.street}
                                                                onChange={handleAddressChange("street")}
                                                                placeholder="道玄坂1-1-1"
                                                                className="rounded-md"
                                                            />
                                                        </div>

                                                        <div className="space-y-2">
                                                            <Label htmlFor="building" className="text-xs text-gray-500">建物名</Label>
                                                            <Input
                                                                id="building"
                                                                name="building"
                                                                value={addressState.building}
                                                                onChange={handleAddressChange("building")}
                                                                placeholder="渋谷ビル 101"
                                                                className="rounded-md"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* 緊急連絡先・最寄り駅 (cast/staff only) */}
                                                    {(role === "cast" || role === "staff") && (
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                                                            <div className="space-y-2">
                                                                <Label htmlFor="emergencyPhoneNumber">緊急連絡先</Label>
                                                                <Input
                                                                    id="emergencyPhoneNumber"
                                                                    name="emergencyPhoneNumber"
                                                                    defaultValue={profile?.emergency_phone_number || ""}
                                                                    placeholder="090-1234-5678"
                                                                    className="rounded-md"
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label htmlFor="nearestStation">最寄り駅</Label>
                                                                <Input
                                                                    id="nearestStation"
                                                                    name="nearestStation"
                                                                    defaultValue={profile?.nearest_station || ""}
                                                                    placeholder="渋谷駅"
                                                                    className="rounded-md"
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    </Accordion>
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
                            <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-4">
                                <h3 className="font-medium text-gray-900 dark:text-white">コメント</h3>
                                <CommentList
                                    comments={comments}
                                    currentUserId={currentUserProfileId}
                                    onAddComment={handleAddComment}
                                    onEditComment={handleEditComment}
                                    onDeleteComment={handleDeleteComment}
                                    onToggleLike={handleToggleLike}
                                />
                            </div>
                        )}


                    </div>
                </DialogContent>
            </Dialog >

            {/* Bottle Modal - only show if not nested */}
            {
                !isNested && profile && profile.role === "guest" && (
                    <BottleModal
                        isOpen={isBottleModalOpen}
                        onClose={(shouldRefresh) => {
                            setIsBottleModalOpen(false);
                            if (shouldRefresh) {
                                refreshBottleKeeps();
                            }
                        }}
                        menus={menus}
                        profiles={[profile]}
                        initialProfileIds={[profile.id]}
                    />
                )
            }

            {/* Delete Comment Confirmation Modal */}
            {/* This modal is now handled internally by CommentList */}

            {/* Delete User Confirmation Modal */}
            <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <DialogContent className="sm:max-w-[400px] bg-white dark:bg-gray-800 w-[95%] rounded-lg p-6 z-[60]">
                    <DialogHeader>
                        <DialogTitle className="text-center text-lg font-bold text-gray-900 dark:text-white">
                            ユーザーを削除
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            ユーザーを削除する確認ダイアログ
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 text-center text-gray-600 dark:text-gray-300">
                        <p>本当にこのユーザーを削除しますか？</p>
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
            {
                profile && (
                    <UserAttendanceListModal
                        isOpen={showAttendanceList}
                        onClose={() => setShowAttendanceList(false)}
                        profileId={profile.id}
                        profileName={profile.display_name || "メンバー"}
                        onEditRecord={(record) => setEditingAttendanceRecord(record)}
                    />
                )
            }

            {/* Attendance Edit Modal (opened from list) */}
            {
                editingAttendanceRecord && profile && (
                    <AttendanceModal
                        isOpen={!!editingAttendanceRecord}
                        onClose={() => setEditingAttendanceRecord(null)}
                        profiles={[profile]}
                        currentProfileId={profile.id}
                        editingRecord={editingAttendanceRecord}
                    />
                )
            }

            {/* Relationship Selector Modals */}
            {
                profile && relationshipSelectorOpen && (
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
                        profiles={(() => {
                            if (relationshipSelectorOpen === "nomination") {
                                if (role === "guest") return allProfiles.filter(p => p.role === "cast");
                                if (role === "cast") return allProfiles.filter(p => p.role === "guest");
                            }
                            if (relationshipSelectorOpen === "in_charge") {
                                if (role === "staff") return allProfiles.filter(p => p.role === "cast");
                                if (role === "cast") return allProfiles.filter(p => p.role === "staff");
                            }
                            return allProfiles;
                        })()}
                        selectedIds={getSelectedIds(relationshipSelectorOpen)}
                        onSelectionChange={(ids) => {
                            if (relationshipSelectorOpen) {
                                handleRelationshipChange(relationshipSelectorOpen, ids);
                            }
                        }}
                        currentProfileId={profile.id}
                    />
                )
            }

            {/* Nested Profile Modal */}
            {
                nestedProfileId && (
                    <UserEditModal
                        open={!!nestedProfileId}
                        onOpenChange={(open) => !open && setNestedProfileId(null)}
                        profile={allProfiles.find((p) => p.id === nestedProfileId) || null}
                        isNested={true}
                    />
                )
            }
        </>
    );
}
