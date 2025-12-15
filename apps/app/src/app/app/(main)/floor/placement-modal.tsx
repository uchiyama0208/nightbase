import { useState, useEffect, useRef } from "react";
import { getAllProfiles } from "../users/actions";
import { ChevronLeft } from "lucide-react";
import { createTempGuestV2 } from "./actions/guest";
import { UserEditModal } from "../users/user-edit-modal";

interface PlacementModalProps {
    isOpen: boolean;
    onClose: () => void;
    onProfileSelect: (profile: any) => void;
    mode?: "guest" | "cast";
    sessionId?: string; // For creating temp guests
    profiles?: any[]; // Optional pre-loaded profiles to avoid server fetch
}

export function PlacementModal({ isOpen, onClose, onProfileSelect, mode = "guest", sessionId, profiles: initialProfiles }: PlacementModalProps) {
    const [allProfiles, setAllProfiles] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isCreatingTempGuest, setIsCreatingTempGuest] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // initialProfiles が更新されたら反映（長さも監視）
    useEffect(() => {
        if (initialProfiles !== undefined) {
            setAllProfiles(initialProfiles);
        }
    }, [initialProfiles, initialProfiles?.length]);

    useEffect(() => {
        if (isOpen) {
            // プロファイルが渡されていない場合はサーバーから取得
            if (initialProfiles === undefined) {
                loadProfiles();
            }
            // 検索入力にフォーカス
            setTimeout(() => searchInputRef.current?.focus(), 0);
        }
    }, [isOpen, initialProfiles]);

    const loadProfiles = async () => {
        const data = await getAllProfiles();
        setAllProfiles(data);
    };

    const handleProfileClick = (profile: any) => {
        onProfileSelect(profile);
        onClose();
    };

    const handleCreateTempGuest = async () => {
        if (!sessionId || mode !== "guest") return;
        
        setIsCreatingTempGuest(true);
        try {
            const tempGuest = await createTempGuestV2(sessionId);
            onProfileSelect(tempGuest);
            onClose();
        } catch (error) {
            console.error("Failed to create temp guest:", error);
            alert("仮ゲストの作成に失敗しました");
        } finally {
            setIsCreatingTempGuest(false);
        }
    };

    const filteredProfiles = allProfiles
        .filter(p => p.role === mode)
        .filter(p =>
            p.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.display_name_kana?.toLowerCase().includes(searchQuery.toLowerCase())
        );

    const title = mode === "guest" ? "ゲストを選択" : "キャストを選択";
    const emptyMessage = mode === "guest" ? "該当するゲストがいません" : "該当するキャストがいません";

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-[70] bg-black/50"
                onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                }}
            />

            {/* Modal Content */}
            <div className="fixed inset-0 z-[71] flex items-center justify-center pointer-events-none p-4">
                <div
                    className="pointer-events-auto w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-700 dark:bg-gray-900"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="mb-2 flex flex-row items-center justify-between gap-2 relative flex-shrink-0">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onClose();
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-0"
                            aria-label="戻る"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <h2 className="flex-1 text-center text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
                        <div className="h-8 w-8" /> {/* Spacer for centering */}
                    </div>

                    <div className="space-y-3 py-2 flex-1 overflow-hidden flex flex-col">
                        {/* Action Buttons (only for guest mode) */}
                        {mode === "guest" && (
                            <div className="mb-2 flex gap-2 flex-shrink-0">
                                {sessionId && (
                                    <button
                                        type="button"
                                        onClick={handleCreateTempGuest}
                                        disabled={isCreatingTempGuest}
                                        className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isCreatingTempGuest ? "作成中..." : "仮ゲスト"}
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(true)}
                                    className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                >
                                    ゲスト作成
                                </button>
                            </div>
                        )}

                        {/* Search Input */}
                        <div className="relative flex-shrink-0">
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder="名前で検索..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full px-4 py-2 pl-10 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <svg
                                className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                />
                            </svg>
                        </div>

                        {/* Table */}
                        <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900 flex-1 flex flex-col min-h-0">
                            {/* Table Header */}
                            <div className="grid grid-cols-2 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                                <div className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 text-center">
                                    表示名
                                </div>
                                <div className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 text-center border-l border-slate-200 dark:border-slate-700">
                                    ひらがな
                                </div>
                            </div>

                            {/* Table Body */}
                            <div className="flex-1 overflow-y-auto">
                                {filteredProfiles.length === 0 ? (
                                    <div className="py-12 text-center text-slate-500 dark:text-slate-400">
                                        {emptyMessage}
                                    </div>
                                ) : (
                                    filteredProfiles.map((profile) => (
                                        <button
                                            key={profile.id}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleProfileClick(profile);
                                            }}
                                            className="grid grid-cols-2 w-full border-b border-slate-200 dark:border-slate-700 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                        >
                                            <div className="px-4 py-2 text-center text-slate-900 dark:text-slate-100">
                                                {profile.display_name}
                                            </div>
                                            <div className="px-4 py-2 text-center text-slate-900 dark:text-slate-100 border-l border-slate-200 dark:border-slate-700">
                                                {profile.display_name_kana || "-"}
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Back Button */}
                        <div className="pt-2 flex-shrink-0">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onClose();
                                }}
                                className="w-full px-4 py-2 border border-blue-500 rounded-lg text-blue-600 font-medium bg-white hover:bg-blue-50 dark:bg-transparent dark:hover:bg-blue-900/20 transition-colors"
                            >
                                戻る
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* User Create Modal */}
            <UserEditModal
                profile={null}
                open={isCreateModalOpen}
                onOpenChange={(open) => {
                    setIsCreateModalOpen(open);
                    if (!open) {
                        // Refresh profiles list after modal closes
                        loadProfiles();
                    }
                }}
                defaultRole="guest"
                hidePersonalInfo={true}
            />
        </>
    );
}
