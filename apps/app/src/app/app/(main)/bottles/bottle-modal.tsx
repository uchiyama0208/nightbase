"use client";

import { useMemo, useState, useRef, useCallback, useLayoutEffect, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import { ChevronLeft, Plus, Trash2, Wine } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { MenuEditModal } from "../menus/menu-edit-modal";
import { UserEditModal } from "../users/user-edit-modal";
import { BottleSelectModal } from "./bottle-select-modal";
import { GuestSelectModal } from "./guest-select-modal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { useToast } from "@/components/ui/use-toast";
import { useGlobalLoading } from "@/components/global-loading";
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
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { showLoading, hideLoading } = useGlobalLoading();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
    const [isBottleSelectModalOpen, setIsBottleSelectModalOpen] = useState(false);
    const [isGuestSelectModalOpen, setIsGuestSelectModalOpen] = useState(false);
    const [viewingProfile, setViewingProfile] = useState<any | null>(null);
    const [viewingMenu, setViewingMenu] = useState<any | null>(null);

    const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);
    const [remainingAmount, setRemainingAmount] = useState<string>("100");
    const [expirationDate, setExpirationDate] = useState<string>("");
    const [selectedMenuId, setSelectedMenuId] = useState<string>("");
    const [showDeleteBottleConfirm, setShowDeleteBottleConfirm] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);
    const autoSaveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

    // Sync state when modal opens or bottle changes
    const bottleId = bottle?.id ?? null;
    const lastSyncedKeyRef = useRef<string | null>(null);

    useLayoutEffect(() => {
        const syncKey = isOpen ? `${bottleId || "new"}` : null;

        if (syncKey && lastSyncedKeyRef.current !== syncKey) {
            lastSyncedKeyRef.current = syncKey;
            const profileIds = bottle?.bottle_keep_holders?.map((h: any) => h.profile_id) || initialProfileIds;
            setSelectedProfiles(profileIds);
            setRemainingAmount(String(bottle?.remaining_amount ?? 100));
            setExpirationDate(bottle?.expiration_date || "");
            setSelectedMenuId(bottle?.menu_id || "");
        }

        if (!isOpen) {
            lastSyncedKeyRef.current = null;
        }
    }, [isOpen, bottleId, bottle, initialProfileIds]);

    // Auto-save for edit mode
    const autoSave = useCallback(async () => {
        if (!bottle || !formRef.current) return;

        showLoading("保存中...");
        try {
            const formData = new FormData(formRef.current);
            formData.set("profile_ids", JSON.stringify(selectedProfiles));
            formData.set("remaining_amount", remainingAmount);
            formData.set("expiration_date", expirationDate);
            formData.set("menu_id", selectedMenuId);
            await updateBottleKeep(bottle.id, formData);
        } catch (error) {
            console.error("Auto-save failed:", error);
            toast({
                title: "エラー",
                description: "保存に失敗しました",
                variant: "destructive",
            });
        } finally {
            hideLoading();
        }
    }, [bottle, selectedProfiles, remainingAmount, expirationDate, selectedMenuId, showLoading, hideLoading, toast]);

    const triggerAutoSave = useCallback(() => {
        if (!bottle) return;
        if (autoSaveTimeoutRef.current) {
            clearTimeout(autoSaveTimeoutRef.current);
        }
        autoSaveTimeoutRef.current = setTimeout(autoSave, 800);
    }, [bottle, autoSave]);

    // Comment state
    const [comments, setComments] = useState<any[]>([]);
    const [currentUserProfileId, setCurrentUserProfileId] = useState<string | null>(null);

    // Load comments when modal opens
    useEffect(() => {
        if (isOpen && bottle?.id) {
            getBottleKeepComments(bottle.id).then(setComments);
            getCurrentUserProfileId().then(setCurrentUserProfileId);
        }
        if (!isOpen) {
            setComments([]);
        }
    }, [isOpen, bottle?.id]);

    // Simple handler functions without useCallback
    const handleAddComment = async (content: string): Promise<{ success: boolean; error?: string }> => {
        if (!bottle?.id) return { success: false, error: "No bottle ID" };
        try {
            await addBottleKeepComment(bottle.id, content);
            const newComments = await getBottleKeepComments(bottle.id);
            setComments(newComments);
            return { success: true };
        } catch (error) {
            console.error("Error adding comment:", error);
            return { success: false, error: "Failed to add comment" };
        }
    };

    const handleEditComment = async (commentId: string, content: string): Promise<{ success: boolean; error?: string }> => {
        if (!bottle?.id) return { success: false, error: "No bottle ID" };
        try {
            await updateBottleKeepComment(commentId, content);
            const newComments = await getBottleKeepComments(bottle.id);
            setComments(newComments);
            return { success: true };
        } catch (error) {
            console.error("Error updating comment:", error);
            return { success: false, error: "Failed to update comment" };
        }
    };

    const handleDeleteComment = async (commentId: string): Promise<{ success: boolean; error?: string }> => {
        if (!bottle?.id) return { success: false, error: "No bottle ID" };
        try {
            await deleteBottleKeepComment(commentId);
            const newComments = await getBottleKeepComments(bottle.id);
            setComments(newComments);
            return { success: true };
        } catch (error) {
            console.error("Error deleting comment:", error);
            return { success: false, error: "Failed to delete comment" };
        }
    };

    const handleToggleLike = async (commentId: string): Promise<{ success: boolean; error?: string }> => {
        if (!bottle?.id) return { success: false, error: "No bottle ID" };
        try {
            await toggleCommentLike(commentId);
            const newComments = await getBottleKeepComments(bottle.id);
            setComments(newComments);
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
            await queryClient.invalidateQueries({ queryKey: ["bottles"] });
            setShowDeleteBottleConfirm(false);
            onClose(true);
        } catch (error) {
            console.error("Error deleting bottle keep:", error);
            toast({
                title: "エラー",
                description: "ボトルの削除に失敗しました",
                variant: "destructive",
            });
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

    // メニューを50音順にソート
    const sortedMenus = [...menus].sort((a, b) => {
        return a.name.localeCompare(b.name, 'ja');
    });

    // 選択されたメニューを取得
    const selectedMenu = menus.find(m => m.id === selectedMenuId);

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

            await queryClient.invalidateQueries({ queryKey: ["bottles"] });
            onClose(true); // 新規作成時は再読み込み
        } catch (error) {
            console.error("Error saving bottle keep:", error);
            toast({
                title: "エラー",
                description: "保存に失敗しました",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => onClose(false);

    return (
        <>
            <Dialog open={isOpen} onOpenChange={handleClose}>
                <DialogContent className="p-0 overflow-hidden flex flex-col max-h-[90vh] rounded-2xl sm:max-w-lg bg-white dark:bg-gray-900 w-[95%] text-gray-900 dark:text-gray-100">
                    <DialogHeader className="sticky top-0 z-10 bg-white dark:bg-gray-900 flex !flex-row items-center gap-2 h-14 min-h-[3.5rem] flex-shrink-0 border-b border-gray-200 dark:border-gray-700 px-4">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 transition-colors"
                            aria-label="戻る"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <DialogTitle className="flex-1 text-center text-lg font-semibold text-gray-900 dark:text-white truncate">
                            {bottle ? "ボトル編集" : "ボトルキープ登録"}
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            {bottle ? "ボトル情報を編集します" : "新しいボトルを登録します"}
                        </DialogDescription>
                        {bottle ? (
                            <button
                                type="button"
                                onClick={() => setShowDeleteBottleConfirm(true)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                aria-label="削除"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        ) : (
                            <div className="w-8 h-8" />
                        )}
                    </DialogHeader>

                    <form ref={formRef} onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
                        {/* Guest Selection */}
                        <div className="space-y-3">
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                ゲスト
                            </Label>

                            {/* Guest Selection Button */}
                            <button
                                type="button"
                                onClick={() => setIsGuestSelectModalOpen(true)}
                                className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                            >
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                    {selectedProfiles.length > 0
                                        ? `${selectedProfiles.length}人選択中`
                                        : "タップしてゲストを選択"
                                    }
                                </span>
                                <Plus className="h-4 w-4 text-gray-400" />
                            </button>

                            {/* Selected Guests Display */}
                            {selectedProfiles.length > 0 && (
                                <div className="flex flex-wrap gap-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                                    {selectedProfiles.map(profileId => {
                                        const profile = profiles.find(p => p.id === profileId);
                                        if (!profile) return null;
                                        return (
                                            <div
                                                key={profileId}
                                                className="inline-flex items-center gap-1.5 pl-1 pr-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-full text-sm font-medium"
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => setViewingProfile(profile)}
                                                    className="flex items-center gap-1.5 hover:opacity-70 transition-opacity"
                                                >
                                                    <Avatar className="h-6 w-6 border border-gray-300 dark:border-gray-600">
                                                        <AvatarImage src={profile.avatar_url} alt={profile.display_name || profile.real_name || ""} />
                                                        <AvatarFallback className="bg-gray-400 dark:bg-gray-600 text-white text-xs">
                                                            {(profile.display_name || profile.real_name || "?").charAt(0)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <span>{profile.display_name || profile.real_name || "名前未設定"}</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleProfileToggle(profileId)}
                                                    className="hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full p-0.5 transition-colors"
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

                        </div>

                        {/* Bottle Selection */}
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                ボトル
                            </Label>
                            <input type="hidden" name="menu_id" value={selectedMenuId} />
                            <div className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                                {selectedMenu ? (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => setViewingMenu(selectedMenu)}
                                            className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0 hover:opacity-70 transition-opacity"
                                        >
                                            {selectedMenu.image_url ? (
                                                <img
                                                    src={selectedMenu.image_url}
                                                    alt={selectedMenu.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <Wine className="h-5 w-5 text-gray-400" />
                                            )}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsBottleSelectModalOpen(true)}
                                            className="flex-1 min-w-0 text-left hover:opacity-70 transition-opacity"
                                        >
                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                {selectedMenu.name}
                                            </p>
                                            {selectedMenu.price && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    ¥{selectedMenu.price.toLocaleString()}
                                                </p>
                                            )}
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setIsBottleSelectModalOpen(true)}
                                        className="flex items-center gap-3 w-full hover:opacity-70 transition-opacity"
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                                            <Wine className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <span className="text-sm text-gray-500 dark:text-gray-400">
                                            タップしてボトルを選択
                                        </span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Remaining Amount */}
                        <div className="space-y-2">
                            <Label htmlFor="remaining_amount" className="text-sm font-medium text-gray-700 dark:text-gray-200">
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
                                <Label htmlFor="opened_at" className="text-sm font-medium text-gray-700 dark:text-gray-200">
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
                            <Label htmlFor="expiration_date" className="text-sm font-medium text-gray-700 dark:text-gray-200">
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
                            <DialogFooter className="flex gap-2 pt-4">
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
                        <div className="border-t border-gray-200 dark:border-gray-700 mx-6 pt-6 pb-6 space-y-4">
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
                <DialogContent className="sm:max-w-md bg-white dark:bg-gray-800 w-[95%] rounded-2xl p-6">
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
                    <DialogFooter className="flex-col sm:flex-row gap-2">
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

            {/* User Edit Modal - New Guest */}
            <UserEditModal
                open={isUserModalOpen}
                onOpenChange={(open) => {
                    setIsUserModalOpen(open);
                    if (!open) {
                        queryClient.invalidateQueries({ queryKey: ["bottles"] });
                    }
                }}
                profile={null}
                defaultRole="guest"
                isNested={true}
                hidePersonalInfo={!pagePermissions?.personalInfo}
                pagePermissions={pagePermissions}
            />

            {/* User Edit Modal - View/Edit Profile */}
            <UserEditModal
                open={!!viewingProfile}
                onOpenChange={(open) => {
                    if (!open) {
                        setViewingProfile(null);
                        queryClient.invalidateQueries({ queryKey: ["bottles"] });
                    }
                }}
                profile={viewingProfile}
                isNested={true}
                hidePersonalInfo={!pagePermissions?.personalInfo}
                pagePermissions={pagePermissions}
            />

            {/* Menu Edit Modal - New Menu */}
            <MenuEditModal
                open={isMenuModalOpen}
                onOpenChange={(open) => {
                    setIsMenuModalOpen(open);
                    if (!open) {
                        queryClient.invalidateQueries({ queryKey: ["menus"] });
                        queryClient.invalidateQueries({ queryKey: ["bottles"] });
                    }
                }}
                menu={null}
                categories={menus.map(m => m.category).filter((v, i, a) => v && a.findIndex(c => c?.id === v.id) === i)}
            />

            {/* Menu Edit Modal - View/Edit Menu */}
            <MenuEditModal
                open={!!viewingMenu}
                onOpenChange={(open) => {
                    if (!open) {
                        setViewingMenu(null);
                        queryClient.invalidateQueries({ queryKey: ["menus"] });
                        queryClient.invalidateQueries({ queryKey: ["bottles"] });
                    }
                }}
                menu={viewingMenu}
                categories={menus.map(m => m.category).filter((v, i, a) => v && a.findIndex(c => c?.id === v.id) === i)}
            />

            {/* Bottle Select Modal */}
            <BottleSelectModal
                isOpen={isBottleSelectModalOpen}
                onClose={() => setIsBottleSelectModalOpen(false)}
                onSelect={(menuId) => {
                    setSelectedMenuId(menuId);
                    triggerAutoSave();
                }}
                onAddNew={() => setIsMenuModalOpen(true)}
                onViewMenu={(menu) => setViewingMenu(menu)}
                menus={sortedMenus}
                selectedMenuId={selectedMenuId}
            />

            {/* Guest Select Modal */}
            <GuestSelectModal
                isOpen={isGuestSelectModalOpen}
                onClose={() => setIsGuestSelectModalOpen(false)}
                onToggle={handleProfileToggle}
                onAddNew={() => setIsUserModalOpen(true)}
                onViewProfile={(profile) => setViewingProfile(profile)}
                profiles={profiles}
                selectedIds={selectedProfiles}
            />
        </>
    );
}
