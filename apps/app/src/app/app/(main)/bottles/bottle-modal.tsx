"use client";

import { useMemo, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createBottleKeep, updateBottleKeep, deleteBottleKeep } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { ChevronLeft, Plus, MoreHorizontal, Edit2, Trash2, UserCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { MenuEditModal } from "../menus/menu-edit-modal";
import { UserEditModal } from "../users/user-edit-modal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { useEffect } from "react";
import {
    getBottleKeepComments,
    addBottleKeepComment,
    updateBottleKeepComment,
    deleteBottleKeepComment,
    getCurrentUserProfileId,
} from "./actions";
import { toggleCommentLike } from "../users/actions";
import { CommentList } from "@/components/comment-list";


interface PagePermissions {
    bottles: boolean;
    resumes: boolean;
    salarySystems: boolean;
    attendance: boolean;
    personalInfo: boolean;
}

interface BottleModalProps {
    isOpen: boolean;
    onClose: (shouldRefresh?: boolean) => void;
    bottle?: any | null;
    menus: any[];
    profiles: any[];
    initialProfileIds?: string[];
    pagePermissions?: PagePermissions;
}

export function BottleModal({
    isOpen,
    onClose,
    bottle,
    menus,
    profiles,
    initialProfileIds = [],
    pagePermissions,
}: BottleModalProps) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [guestSearch, setGuestSearch] = useState("");
    const [bottleSearch, setBottleSearch] = useState("");
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);

    const defaultProfileIds = bottle?.bottle_keep_holders?.map((h: any) => h.profile_id) || initialProfileIds;
    const [selectedProfiles, setSelectedProfiles] = useState<string[]>(defaultProfileIds);
    const [remainingAmount, setRemainingAmount] = useState<string>(String(bottle?.remaining_amount || 100));
    const [expirationDate, setExpirationDate] = useState<string>(bottle?.expiration_date || "");
    const [selectedMenuId, setSelectedMenuId] = useState<string>(bottle?.menu_id || "");
    const [showActions, setShowActions] = useState(false);
    const [showDeleteBottleConfirm, setShowDeleteBottleConfirm] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);
    const autoSaveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

    // Auto-save for edit mode
    const autoSave = useCallback(async () => {
        if (!bottle || !formRef.current) return;

        try {
            const formData = new FormData(formRef.current);
            formData.set("profile_ids", JSON.stringify(selectedProfiles));
            formData.set("remaining_amount", remainingAmount);
            formData.set("expiration_date", expirationDate);
            formData.set("menu_id", selectedMenuId);
            await updateBottleKeep(bottle.id, formData);
            // router.refresh() を削除 - 状態がリセットされるのを防ぐ
        } catch (error) {
            console.error("Auto-save failed:", error);
        }
    }, [bottle, selectedProfiles, remainingAmount, expirationDate, selectedMenuId]);

    const triggerAutoSave = useCallback(() => {
        if (!bottle) return;
        if (autoSaveTimeoutRef.current) {
            clearTimeout(autoSaveTimeoutRef.current);
        }
        autoSaveTimeoutRef.current = setTimeout(autoSave, 500);
    }, [bottle, autoSave]);

    // Comment state
    const [comments, setComments] = useState<any[]>([]);
    const [currentUserProfileId, setCurrentUserProfileId] = useState<string | null>(null);

    // Debug: log state on each render
    const instanceIdRef = useRef(Math.random().toString(36).substring(7));
    console.log("[BottleModal]", instanceIdRef.current, "Render - isOpen:", isOpen, "bottle?.id:", bottle?.id);

    // Load comments and current user profile ID when modal opens
    const prevIsOpenRef = useRef(false);
    const prevBottleIdRef = useRef<string | null>(null);
    useEffect(() => {
        console.log("[BottleModal] useEffect - isOpen:", isOpen, "prevIsOpen:", prevIsOpenRef.current, "bottle?.id:", bottle?.id, "prevBottleId:", prevBottleIdRef.current);
        // モーダルが開いたとき、または別のボトルに切り替わったときにコメントを読み込む
        const shouldLoad = isOpen && bottle?.id && (
            !prevIsOpenRef.current || // モーダルが開いた
            prevBottleIdRef.current !== bottle.id // 別のボトルに切り替わった
        );
        if (shouldLoad) {
            console.log("[BottleModal] Loading comments...");
            loadComments();
            loadCurrentUserProfileId();
        }
        prevIsOpenRef.current = isOpen;
        prevBottleIdRef.current = bottle?.id || null;
    }, [isOpen, bottle?.id]);

    const loadComments = async () => {
        if (!bottle?.id) return;
        const data = await getBottleKeepComments(bottle.id);
        console.log("[BottleModal] comments loaded:", data);
        console.log("[BottleModal] comment authors:", data.map((c: any) => ({ id: c.id, author_id: c.author?.id, author_profile_id: c.author_profile_id })));
        setComments(data);
    };

    const loadCurrentUserProfileId = async () => {
        const profileId = await getCurrentUserProfileId();
        console.log("[BottleModal] currentUserProfileId:", profileId);
        setCurrentUserProfileId(profileId);
    };

    const handleAddComment = async (content: string) => {
        if (!bottle?.id) return { success: false, error: "No bottle ID" };
        try {
            await addBottleKeepComment(bottle.id, content);
            await loadComments();
            return { success: true };
        } catch (error) {
            console.error("Error adding comment:", error);
            return { success: false, error: "Failed to add comment" };
        }
    };

    const handleEditComment = async (commentId: string, content: string) => {
        try {
            await updateBottleKeepComment(commentId, content);
            await loadComments();
            return { success: true };
        } catch (error) {
            console.error("Error updating comment:", error);
            return { success: false, error: "Failed to update comment" };
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        try {
            await deleteBottleKeepComment(commentId);
            await loadComments();
            return { success: true };
        } catch (error) {
            console.error("Error deleting comment:", error);
            return { success: false, error: "Failed to delete comment" };
        }
    };

    const handleToggleLike = async (commentId: string) => {
        try {
            await toggleCommentLike(commentId);
            // We don't necessarily need to reload comments for like toggle as it's optimistic,
            // but it's good to sync eventually. For now, let's rely on optimistic UI.
            // Or we can reload silently.
            loadComments();
            return { success: true };
        } catch (error) {
            console.error("Error toggling like:", error);
            return { success: false, error: "Failed to toggle like" };
        }
    };

    const handleDeleteBottle = async () => {
        if (!bottle) return;
        setIsSubmitting(true);
        try {
            await deleteBottleKeep(bottle.id);
            setShowDeleteBottleConfirm(false);
            onClose(true);
        } catch (error) {
            console.error("Error deleting bottle keep:", error);
            alert("ボトルの削除に失敗しました");
        } finally {
            setIsSubmitting(false);
        }
    };

    const guestSuggestions = useMemo(
        () =>
            Array.from(
                new Set(profiles.map((profile) => profile.display_name || profile.real_name || "").filter(Boolean)),
            ) as string[],
        [profiles],
    );

    const bottleSuggestions = useMemo(
        () => Array.from(new Set(menus.map((menu) => menu.name).filter(Boolean))) as string[],
        [menus],
    );

    const handleProfileToggle = (profileId: string) => {
        setSelectedProfiles(prev => {
            const newProfiles = prev.includes(profileId)
                ? prev.filter(id => id !== profileId)
                : [...prev, profileId];
            // 編集モードの場合は自動保存をトリガー
            if (bottle && newProfiles.length > 0) {
                setTimeout(() => triggerAutoSave(), 0);
            }
            return newProfiles;
        });
    };

    // 50音順にソート（ゲストのみ）
    const sortedProfiles = [...profiles]
        .filter(profile => profile.role === "guest")
        .sort((a, b) => {
            const aName = a.display_name_kana || a.display_name || a.real_name_kana || a.real_name || "";
            const bName = b.display_name_kana || b.display_name || b.real_name_kana || b.real_name || "";
            return aName.localeCompare(bName, 'ja');
        });

    // 検索フィルター
    const filteredProfiles = sortedProfiles.filter(profile => {
        const searchTerm = guestSearch.toLowerCase();
        const displayName = (profile.display_name || "").toLowerCase();
        const displayNameKana = (profile.display_name_kana || "").toLowerCase();
        const realName = (profile.real_name || "").toLowerCase();
        const realNameKana = (profile.real_name_kana || "").toLowerCase();
        return displayName.includes(searchTerm) ||
            displayNameKana.includes(searchTerm) ||
            realName.includes(searchTerm) ||
            realNameKana.includes(searchTerm);
    });

    // メニューを50音順にソート
    const sortedMenus = [...menus].sort((a, b) => {
        return a.name.localeCompare(b.name, 'ja');
    });

    // メニュー検索フィルター
    const filteredMenus = sortedMenus.filter(menu => {
        const searchTerm = bottleSearch.toLowerCase();
        const menuName = menu.name.toLowerCase();
        return menuName.includes(searchTerm);
    });

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const formData = new FormData(e.currentTarget);
            formData.set("profile_ids", JSON.stringify(selectedProfiles));

            if (bottle) {
                await updateBottleKeep(bottle.id, formData);
            } else {
                await createBottleKeep(formData);
            }

            router.refresh();
            onClose(true); // 新規作成時は再読み込み
        } catch (error) {
            console.error("Error saving bottle keep:", error);
            alert("保存に失敗しました");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => onClose(false);

    return (
        <>
            <Dialog open={isOpen} onOpenChange={handleClose}>
                <DialogContent className="sm:max-w-[500px] bg-white dark:bg-gray-800 w-[95%] rounded-lg max-h-[90vh] overflow-y-auto p-6 text-gray-900 dark:text-gray-100">
                    <DialogHeader className="flex flex-row items-center justify-between gap-2 relative">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 focus-visible:outline-none"
                            aria-label="戻る"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <DialogTitle className="flex-1 text-center text-xl font-bold text-gray-900 dark:text-white">
                            {bottle ? "ボトル編集" : "ボトル新規登録"}
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            {bottle ? "ボトル情報を編集します" : "新しいボトルを登録します"}
                        </DialogDescription>
                        {bottle ? (
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

                        {bottle && showActions && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowActions(false)} />
                                <div className="absolute right-0 top-10 z-50 w-40 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg p-2 flex flex-col gap-1 text-sm">
                                    <button
                                        type="button"
                                        className="w-full text-left px-3 py-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                                        onClick={() => {
                                            setShowActions(false);
                                            setShowDeleteBottleConfirm(true);
                                        }}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        <span>削除</span>
                                    </button>
                                </div>
                            </>
                        )}
                    </DialogHeader>

                    <form ref={formRef} onSubmit={handleSubmit} className="space-y-5 mt-4">
                        {/* Guest Selection */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    ゲスト <span className="text-red-500">*</span>
                                </Label>
                                <button
                                    type="button"
                                    onClick={() => setIsUserModalOpen(true)}
                                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                >
                                    <Plus className="h-3 w-3" />
                                    ゲストを追加
                                </button>
                            </div>

                            {/* Guest Selection Dropdown */}
                            <Select
                                value=""
                                onValueChange={(value) => {
                                    if (value) {
                                        handleProfileToggle(value);
                                    }
                                }}
                            >
                                <SelectTrigger className="bg-white dark:bg-gray-900">
                                    <SelectValue placeholder="ゲストを選択" />
                                </SelectTrigger>
                                <SelectContent>
                                    <div className="px-2 py-1.5 sticky top-0 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-700">
                                        <Input
                                            type="text"
                                            placeholder="ゲストを検索..."
                                            value={guestSearch}
                                            onChange={(e) => setGuestSearch(e.target.value)}
                                            className="h-8 text-sm"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </div>
                                    {filteredProfiles.length === 0 ? (
                                        <div className="p-2 text-sm text-gray-500 text-center">
                                            {guestSearch ? "該当するゲストがいません" : "プロフィールがありません"}
                                        </div>
                                    ) : (
                                        filteredProfiles.map((profile) => (
                                            <SelectItem
                                                key={profile.id}
                                                value={profile.id}
                                                className={selectedProfiles.includes(profile.id) ? "bg-blue-50 dark:bg-blue-900/20" : ""}
                                            >
                                                <div className="flex items-center justify-between w-full">
                                                    <span>{profile.display_name || profile.real_name || "名前未設定"}</span>
                                                    {selectedProfiles.includes(profile.id) && (
                                                        <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    )}
                                                </div>
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>

                            {/* Selected Guests Display */}
                            {selectedProfiles.length > 0 && (
                                <div className="flex flex-wrap gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                    {selectedProfiles.map(profileId => {
                                        const profile = profiles.find(p => p.id === profileId);
                                        if (!profile) return null;
                                        return (
                                            <div
                                                key={profileId}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-full text-sm font-medium"
                                            >
                                                <span>{profile.display_name || profile.real_name || "名前未設定"}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleProfileToggle(profileId)}
                                                    className="hover:bg-blue-700 rounded-full p-0.5 transition-colors"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {selectedProfiles.length === 0 && (
                                <p className="text-xs text-gray-500">少なくとも1人のゲストを選択してください</p>
                            )}
                        </div>

                        {/* Bottle Selection */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="menu_id" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    ボトル <span className="text-red-500">*</span>
                                </Label>
                                <button
                                    type="button"
                                    onClick={() => setIsMenuModalOpen(true)}
                                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                >
                                    <Plus className="h-3 w-3" />
                                    メニューを追加
                                </button>
                            </div>
                            <Select
                                name="menu_id"
                                value={selectedMenuId}
                                onValueChange={(value) => {
                                    setSelectedMenuId(value);
                                    triggerAutoSave();
                                }}
                                required
                            >
                                <SelectTrigger id="menu_id" className="bg-white dark:bg-gray-900">
                                    <SelectValue placeholder="ボトルを選択" />
                                </SelectTrigger>
                                <SelectContent>
                                    <div className="px-2 py-1.5 sticky top-0 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-700">
                                        <Input
                                            type="text"
                                            placeholder="ボトルを検索..."
                                            value={bottleSearch}
                                            onChange={(e) => setBottleSearch(e.target.value)}
                                            className="h-8 text-sm"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </div>
                                    {filteredMenus.length === 0 ? (
                                        <div className="p-2 text-sm text-gray-500 text-center">該当するボトルがありません</div>
                                    ) : (
                                        filteredMenus.map((menu) => (
                                            <SelectItem key={menu.id} value={menu.id}>
                                                {menu.name}
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Remaining Amount */}
                        <div className="space-y-2">
                            <Label htmlFor="remaining_amount" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                残量
                            </Label>
                            <Select
                                name="remaining_amount"
                                value={remainingAmount}
                                onValueChange={(value) => {
                                    setRemainingAmount(value);
                                    triggerAutoSave();
                                }}
                                required
                            >
                                <SelectTrigger id="remaining_amount" className="bg-white dark:bg-gray-900">
                                    <SelectValue placeholder="残量を選択" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="100">未開封</SelectItem>
                                    <SelectItem value="75">多め</SelectItem>
                                    <SelectItem value="50">半分</SelectItem>
                                    <SelectItem value="25">少なめ</SelectItem>
                                    <SelectItem value="0">無し</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Opened Date */}
                        {!bottle && (
                            <div className="space-y-2">
                                <Label htmlFor="opened_at" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    開栓日
                                </Label>
                                <Input
                                    id="opened_at"
                                    name="opened_at"
                                    type="date"
                                    defaultValue={new Date().toISOString().split("T")[0]}
                                    required
                                    className="bg-white dark:bg-gray-900"
                                />
                            </div>
                        )}

                        {/* Expiration Date */}
                        <div className="space-y-2">
                            <Label htmlFor="expiration_date" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                有効期限 (任意)
                            </Label>
                            <Input
                                id="expiration_date"
                                name="expiration_date"
                                type="date"
                                value={expirationDate}
                                onChange={(e) => {
                                    setExpirationDate(e.target.value);
                                    triggerAutoSave();
                                }}
                                className="bg-white dark:bg-gray-900"
                            />
                        </div>

                        {/* Footer - only show for new bottles */}
                        {!bottle && (
                            <DialogFooter className="flex gap-3 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleClose}
                                    disabled={isSubmitting}
                                    className="flex-1 min-h-[44px] h-11"
                                >
                                    キャンセル
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isSubmitting || selectedProfiles.length === 0}
                                    className="flex-1 min-h-[44px] h-11"
                                >
                                    {isSubmitting ? "保存中..." : "登録"}
                                </Button>
                            </DialogFooter>
                        )}
                    </form>

                    {/* Comments Section (only for existing bottles) */}
                    {bottle && (
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

                </DialogContent>
            </Dialog>

            {/* Delete Bottle Confirmation Modal */}
            <Dialog open={showDeleteBottleConfirm} onOpenChange={setShowDeleteBottleConfirm}>
                <DialogContent className="sm:max-w-[400px] bg-white dark:bg-gray-800 w-[95%] rounded-lg p-6">
                    <DialogHeader>
                        <DialogTitle className="text-center text-lg font-bold text-gray-900 dark:text-white">
                            ボトルを削除
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            ボトルキープを削除する確認ダイアログ
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 text-center text-gray-600 dark:text-gray-300">
                        <p>本当にこのボトルキープを削除しますか？</p>
                        <p className="text-sm mt-2 text-gray-500">この操作は取り消せません。</p>
                    </div>
                    <DialogFooter className="flex-col sm:flex-row gap-3">
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={handleDeleteBottle}
                            disabled={isSubmitting}
                            className="w-full rounded-full bg-red-600 hover:bg-red-700 text-white h-10"
                        >
                            {isSubmitting ? "削除中..." : "削除"}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowDeleteBottleConfirm(false)}
                            disabled={isSubmitting}
                            className="w-full rounded-full border-gray-300 dark:border-gray-600 h-10"
                        >
                            キャンセル
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* User Edit Modal */}
            <UserEditModal
                open={isUserModalOpen}
                onOpenChange={(open) => {
                    setIsUserModalOpen(open);
                    if (!open) {
                        router.refresh();
                    }
                }}
                profile={null}
                defaultRole="guest"
                isNested={true}
                hidePersonalInfo={!pagePermissions?.personalInfo}
                pagePermissions={pagePermissions}
            />

            {/* Menu Edit Modal */}
            <MenuEditModal
                open={isMenuModalOpen}
                onOpenChange={(open) => {
                    setIsMenuModalOpen(open);
                    if (!open) {
                        router.refresh();
                    }
                }}
                menu={null}
                categories={menus.map(m => m.category).filter((v, i, a) => a.indexOf(v) === i)}
            />
        </>
    );
}
