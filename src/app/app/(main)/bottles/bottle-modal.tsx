"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBottleKeep, updateBottleKeep } from "./actions";
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
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { ChevronLeft, Plus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { UserEditModal } from "../users/user-edit-modal";
import { MenuEditModal } from "../menus/menu-edit-modal";

interface BottleModalProps {
    isOpen: boolean;
    onClose: () => void;
    bottle?: any | null;
    menus: any[];
    profiles: any[];
    initialProfileIds?: string[];
}

export function BottleModal({
    isOpen,
    onClose,
    bottle,
    menus,
    profiles,
    initialProfileIds = [],
}: BottleModalProps) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [guestSearch, setGuestSearch] = useState("");
    const [bottleSearch, setBottleSearch] = useState("");
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);

    const defaultProfileIds = bottle?.bottle_keep_holders?.map((h: any) => h.profile_id) || initialProfileIds;
    const [selectedProfiles, setSelectedProfiles] = useState<string[]>(defaultProfileIds);

    const handleProfileToggle = (profileId: string) => {
        setSelectedProfiles(prev =>
            prev.includes(profileId)
                ? prev.filter(id => id !== profileId)
                : [...prev, profileId]
        );
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
            onClose();
        } catch (error) {
            console.error("Error saving bottle keep:", error);
            alert("保存に失敗しました");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] bg-white dark:bg-gray-800 w-[95%] rounded-lg max-h-[90vh] overflow-y-auto p-6 text-gray-900 dark:text-gray-100">
                <DialogHeader className="flex flex-row items-center justify-between gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 focus-visible:outline-none"
                        aria-label="戻る"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <DialogTitle className="flex-1 text-center text-xl font-bold text-gray-900 dark:text-white">
                        {bottle ? "ボトル編集" : "ボトル新規登録"}
                    </DialogTitle>
                    <div className="w-8"></div>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-5 mt-4">
                    {/* Guest Selection */}
                    <div className="space-y-2">
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
                        <Input
                            type="text"
                            placeholder="ゲストを検索..."
                            value={guestSearch}
                            onChange={(e) => setGuestSearch(e.target.value)}
                            className="bg-white dark:bg-gray-900 mb-2"
                        />
                        <div className="border rounded-lg p-3 max-h-48 overflow-y-auto bg-gray-50 dark:bg-gray-900">
                            {filteredProfiles.length === 0 ? (
                                <p className="text-sm text-gray-500">
                                    {guestSearch ? "該当するゲストがいません" : "プロフィールがありません"}
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {filteredProfiles.map((profile) => (
                                        <div key={profile.id} className="flex items-center gap-2">
                                            <Checkbox
                                                id={`profile-${profile.id}`}
                                                checked={selectedProfiles.includes(profile.id)}
                                                onCheckedChange={() => handleProfileToggle(profile.id)}
                                            />
                                            <label
                                                htmlFor={`profile-${profile.id}`}
                                                className="text-sm cursor-pointer text-gray-700 dark:text-gray-300"
                                            >
                                                {profile.display_name || profile.real_name || "名前未設定"}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        {selectedProfiles.length === 0 && (
                            <p className="text-xs text-gray-500">少なくとも1人のゲストを選択してください</p>
                        )}
                    </div>

                    {/* Bottle Selection */}
                    {!bottle && (
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
                            <Input
                                type="text"
                                placeholder="ボトルを検索..."
                                value={bottleSearch}
                                onChange={(e) => setBottleSearch(e.target.value)}
                                className="bg-white dark:bg-gray-900 mb-2"
                            />
                            <Select name="menu_id" required>
                                <SelectTrigger className="bg-white dark:bg-gray-900">
                                    <SelectValue placeholder="ボトルを選択" />
                                </SelectTrigger>
                                <SelectContent>
                                    {filteredMenus.length === 0 ? (
                                        <div className="p-2 text-sm text-gray-500">該当するボトルがありません</div>
                                    ) : (
                                        filteredMenus.map((menu) => (
                                            <SelectItem key={menu.id} value={menu.id}>
                                                {menu.name} - ¥{menu.price.toLocaleString()}
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Remaining Amount */}
                    <div className="space-y-2">
                        <Label htmlFor="remaining_amount" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            残量
                        </Label>
                        <Select name="remaining_amount" defaultValue={String(bottle?.remaining_amount || 100)} required>
                            <SelectTrigger className="bg-white dark:bg-gray-900">
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

                    {/* Status (only for editing) */}
                    {bottle && (
                        <div className="space-y-2">
                            <Label htmlFor="status" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                ステータス
                            </Label>
                            <Select name="status" defaultValue={bottle?.status || "active"}>
                                <SelectTrigger className="bg-white dark:bg-gray-900">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">利用中</SelectItem>
                                    <SelectItem value="empty">空</SelectItem>
                                    <SelectItem value="returned">返却済</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

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
                            defaultValue={bottle?.expiration_date || ""}
                            className="bg-white dark:bg-gray-900"
                        />
                    </div>

                    {/* Memo */}
                    <div className="space-y-2">
                        <Label htmlFor="memo" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            メモ (任意)
                        </Label>
                        <Textarea
                            id="memo"
                            name="memo"
                            defaultValue={bottle?.memo || ""}
                            rows={3}
                            className="bg-white dark:bg-gray-900 resize-none"
                            placeholder="備考があれば入力してください"
                        />
                    </div>

                    {/* Footer */}
                    <DialogFooter className="flex gap-3 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
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
                            {isSubmitting ? "保存中..." : bottle ? "更新" : "登録"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>

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
        </Dialog>
    );
}
