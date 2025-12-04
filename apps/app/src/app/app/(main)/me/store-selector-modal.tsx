"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Building2, Plus, Check, ChevronDown } from "lucide-react";
import { switchProfile } from "./actions";

interface Store {
    id: string;
    name: string;
    icon_url?: string | null;
}

interface Profile {
    id: string;
    display_name: string;
    role: string;
    stores: Store | null;
}

interface StoreSelectorModalProps {
    profiles: Profile[];
    currentProfileId: string | null;
    currentStoreName: string | null;
    currentStoreIcon: string | null;
}

export function StoreSelectorModal({
    profiles,
    currentProfileId,
    currentStoreName,
    currentStoreIcon,
}: StoreSelectorModalProps) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [isSwitching, setIsSwitching] = useState<string | null>(null);

    const handleSwitchProfile = async (profileId: string) => {
        setIsSwitching(profileId);
        const formData = new FormData();
        await switchProfile(profileId);
        setIsSwitching(null);
        setIsOpen(false);
        router.refresh();
    };

    const handleCreateStore = () => {
        setIsOpen(false);
        router.push("/app/me?mode=create");
    };

    const handleJoinStore = () => {
        setIsOpen(false);
        router.push("/app/me?mode=join");
    };

    return (
        <>
            {/* Store Selector Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
                {currentStoreIcon ? (
                    <Image
                        src={currentStoreIcon}
                        alt={currentStoreName || ""}
                        width={20}
                        height={20}
                        className="rounded-md object-cover"
                    />
                ) : (
                    <Building2 className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                )}
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {currentStoreName || "店舗未選択"}
                </span>
                <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            </button>

            {/* Modal */}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-[400px] bg-white dark:bg-gray-900 p-0 overflow-hidden">
                    <DialogHeader className="px-4 pt-4 pb-2">
                        <DialogTitle className="text-gray-900 dark:text-white">
                            店舗を切り替え
                        </DialogTitle>
                    </DialogHeader>

                    {/* Store List */}
                    <div className="max-h-[300px] overflow-y-auto">
                        {profiles.map((profile) => {
                            const store = profile.stores;
                            const isCurrent = profile.id === currentProfileId;

                            return (
                                <button
                                    key={profile.id}
                                    onClick={() => !isCurrent && handleSwitchProfile(profile.id)}
                                    disabled={isCurrent || isSwitching !== null}
                                    className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
                                        isCurrent
                                            ? "bg-blue-50 dark:bg-blue-900/20"
                                            : "hover:bg-gray-50 dark:hover:bg-gray-800"
                                    }`}
                                >
                                    {store?.icon_url ? (
                                        <Image
                                            src={store.icon_url}
                                            alt={store.name}
                                            width={40}
                                            height={40}
                                            className="rounded-xl object-cover"
                                        />
                                    ) : (
                                        <div className={`p-2 rounded-xl ${
                                            isCurrent
                                                ? "bg-blue-100 dark:bg-blue-900/50"
                                                : "bg-gray-100 dark:bg-gray-700"
                                        }`}>
                                            <Building2 className={`h-5 w-5 ${
                                                isCurrent
                                                    ? "text-blue-600 dark:text-blue-400"
                                                    : "text-gray-600 dark:text-gray-400"
                                            }`} />
                                        </div>
                                    )}
                                    <div className="flex-1 text-left min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-gray-900 dark:text-white truncate">
                                                {store?.name || "不明な店舗"}
                                            </span>
                                            {isCurrent && (
                                                <Check className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                                {profile.display_name}
                                            </span>
                                            <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex-shrink-0">
                                                {profile.role === "admin"
                                                    ? "管理者"
                                                    : profile.role === "staff"
                                                    ? "スタッフ"
                                                    : "キャスト"}
                                            </span>
                                        </div>
                                    </div>
                                    {isSwitching === profile.id && (
                                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Actions */}
                    <div className="border-t border-gray-200 dark:border-gray-700 p-3 space-y-2">
                        <Button
                            onClick={handleCreateStore}
                            variant="outline"
                            className="w-full justify-start gap-3"
                        >
                            <div className="p-1.5 rounded-lg bg-green-100 dark:bg-green-900/30">
                                <Plus className="h-4 w-4 text-green-600 dark:text-green-400" />
                            </div>
                            <span className="text-gray-900 dark:text-white">新規店舗を作成</span>
                        </Button>
                        <Button
                            onClick={handleJoinStore}
                            variant="outline"
                            className="w-full justify-start gap-3"
                        >
                            <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                                <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <span className="text-gray-900 dark:text-white">店舗に参加</span>
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
