"use client";

import { useState, useEffect, useRef } from "react";
import { getAllProfiles } from "../users/actions";
import { ChevronLeft, Users, UserPlus, UserRoundPlus, Search, AlertTriangle } from "lucide-react";
import { addGuestByName } from "./actions/guest";
import { getCastGuestHistory, getCastGuestDetailedHistory, getWorkingCastIds, getGuestCastCompatibility, type CastGuestDetailedHistory } from "./actions/cast-fee";
import { UserEditModal } from "../users/user-edit-modal";
import { toast } from "@/components/ui/use-toast";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface PagePermissions {
    bottles: boolean;
    resumes: boolean;
    salarySystems: boolean;
    attendance: boolean;
    personalInfo: boolean;
}

interface PlacementModalProps {
    isOpen: boolean;
    onClose: () => void;
    onProfileSelect: (profile: any) => void;
    mode?: "guest" | "cast";
    sessionId?: string;
    targetGuestId?: string;
    profiles?: any[];
    pagePermissions?: PagePermissions;
}

type Step = "menu" | "list";
type CastFilter = "working" | "all";

export function PlacementModal({ isOpen, onClose, onProfileSelect, mode = "guest", sessionId, targetGuestId, profiles: initialProfiles, pagePermissions }: PlacementModalProps) {
    const [allProfiles, setAllProfiles] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isCreatingTempGuest, setIsCreatingTempGuest] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editProfile, setEditProfile] = useState<any>(null);
    const [step, setStep] = useState<Step>("menu");
    const [castHistory, setCastHistory] = useState<Record<string, number>>({});
    const [castDetailedHistory, setCastDetailedHistory] = useState<Record<string, CastGuestDetailedHistory>>({});
    const [castFilter, setCastFilter] = useState<CastFilter>("working");
    const [workingCastIds, setWorkingCastIds] = useState<string[]>([]);
    const [compatibility, setCompatibility] = useState<Record<string, "good" | "bad">>({});
    const [isCompatibilityWarningOpen, setIsCompatibilityWarningOpen] = useState(false);
    const [pendingProfile, setPendingProfile] = useState<any>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Reset step when modal opens
    useEffect(() => {
        if (isOpen) {
            setStep(mode === "cast" ? "list" : "menu");
            setSearchQuery("");
        }
    }, [isOpen, mode]);

    // Load cast history for target guest
    useEffect(() => {
        if (isOpen && mode === "cast" && targetGuestId) {
            getCastGuestHistory(targetGuestId).then(setCastHistory);
            getCastGuestDetailedHistory(targetGuestId).then(setCastDetailedHistory);
        } else {
            setCastHistory({});
            setCastDetailedHistory({});
        }
    }, [isOpen, mode, targetGuestId]);

    // Load compatibility data for target guest
    useEffect(() => {
        if (isOpen && mode === "cast" && targetGuestId) {
            getGuestCastCompatibility(targetGuestId).then(setCompatibility);
        } else {
            setCompatibility({});
        }
    }, [isOpen, mode, targetGuestId]);

    // Load working cast IDs
    useEffect(() => {
        if (isOpen && mode === "cast") {
            getWorkingCastIds().then(setWorkingCastIds);
        }
    }, [isOpen, mode]);

    // Load profiles
    useEffect(() => {
        if (initialProfiles !== undefined) {
            setAllProfiles(initialProfiles);
        }
    }, [initialProfiles]);

    useEffect(() => {
        if (isOpen && initialProfiles === undefined) {
            loadProfiles();
        }
    }, [isOpen, initialProfiles]);

    // Focus search input when step changes to list
    useEffect(() => {
        if (step === "list") {
            setTimeout(() => searchInputRef.current?.focus(), 100);
        }
    }, [step]);

    const loadProfiles = async () => {
        const data = await getAllProfiles();
        setAllProfiles(data);
    };

    const handleProfileClick = (profile: any) => {
        // キャストモードで相性✕の場合は警告を表示
        if (mode === "cast" && compatibility[profile.id] === "bad") {
            setPendingProfile(profile);
            setIsCompatibilityWarningOpen(true);
            return;
        }
        onProfileSelect(profile);
        onClose();
    };

    const handleConfirmBadCompatibility = () => {
        if (pendingProfile) {
            onProfileSelect(pendingProfile);
            onClose();
        }
        setIsCompatibilityWarningOpen(false);
        setPendingProfile(null);
    };

    const handleCancelBadCompatibility = () => {
        setIsCompatibilityWarningOpen(false);
        setPendingProfile(null);
    };

    const handleCreateTempGuest = async () => {
        if (!sessionId || mode !== "guest") return;

        setIsCreatingTempGuest(true);
        try {
            // addGuestByName は既にセッションにゲストを追加するので
            // onProfileSelect は呼ばない（二重追加を防ぐ）
            await addGuestByName(sessionId);
            onClose();
        } catch (error) {
            console.error("Failed to create temp guest:", error);
            toast({ title: "仮ゲストの作成に失敗しました", variant: "destructive" });
        } finally {
            setIsCreatingTempGuest(false);
        }
    };

    const handleClose = () => {
        setStep("menu");
        setSearchQuery("");
        onClose();
    };

    // カタカナをひらがなに変換
    const toHiragana = (str: string) => str.replace(/[\u30A1-\u30F6]/g, (match) =>
        String.fromCharCode(match.charCodeAt(0) - 0x60)
    );
    // ひらがなをカタカナに変換
    const toKatakana = (str: string) => str.replace(/[\u3041-\u3096]/g, (match) =>
        String.fromCharCode(match.charCodeAt(0) + 0x60)
    );

    const filteredProfiles = allProfiles
        .filter(p => p.role === mode)
        .filter(p => {
            // キャストモードで「出勤中」フィルターの場合、出勤中のキャストのみ表示
            if (mode === "cast" && castFilter === "working") {
                return workingCastIds.includes(p.id);
            }
            return true;
        })
        .filter(p => {
            const query = searchQuery.toLowerCase();
            const queryHiragana = toHiragana(query);
            const queryKatakana = toKatakana(query);

            const name = (p.display_name || "").toLowerCase();
            const kana = (p.display_name_kana || "").toLowerCase();
            const kanaHiragana = toHiragana(kana);
            const kanaKatakana = toKatakana(kana);

            return name.includes(query) ||
                   kana.includes(query) ||
                   kanaHiragana.includes(queryHiragana) ||
                   kanaKatakana.includes(queryKatakana);
        })
        .sort((a, b) => {
            const kanaA = a.display_name_kana || a.display_name || "";
            const kanaB = b.display_name_kana || b.display_name || "";
            return kanaA.localeCompare(kanaB, "ja");
        });

    const title = mode === "guest" ? "ゲストを追加" : "キャストを選択";

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
                <DialogContent className="sm:max-w-md p-0 overflow-hidden flex flex-col max-h-[90vh] rounded-2xl">
                    <DialogHeader className="sticky top-0 z-10 bg-white dark:bg-gray-900 flex !flex-row items-center gap-2 h-14 min-h-[3.5rem] flex-shrink-0 border-b border-gray-200 dark:border-gray-700 px-4">
                        <button
                            type="button"
                            onClick={() => {
                                if (step === "list" && mode === "guest") {
                                    setStep("menu");
                                } else {
                                    handleClose();
                                }
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 transition-colors"
                            aria-label="戻る"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <DialogTitle className="flex-1 text-center text-lg font-semibold text-gray-900 dark:text-white truncate">
                            {step === "list" ? (mode === "guest" ? "ゲストを選択" : "キャストを選択") : title}
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            {title}
                        </DialogDescription>
                        <div className="w-8 h-8" />
                    </DialogHeader>

                    {/* Menu Step */}
                    {step === "menu" && mode === "guest" && (
                        <div className="p-4 space-y-3">
                            <button
                                type="button"
                                onClick={() => setStep("list")}
                                className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                                    <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="text-left">
                                    <div className="font-medium text-gray-900 dark:text-white">既存のゲストを選択</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">登録済みのゲストから選ぶ</div>
                                </div>
                            </button>

                            {sessionId && (
                                <button
                                    type="button"
                                    onClick={handleCreateTempGuest}
                                    disabled={isCreatingTempGuest}
                                    className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                                >
                                    <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                                        <UserPlus className="h-6 w-6 text-green-600 dark:text-green-400" />
                                    </div>
                                    <div className="text-left">
                                        <div className="font-medium text-gray-900 dark:text-white">
                                            {isCreatingTempGuest ? "作成中..." : "仮ゲストを追加"}
                                        </div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">名前なしでゲストを追加</div>
                                    </div>
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={() => {
                                    handleClose();
                                    setIsCreateModalOpen(true);
                                }}
                                className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                                    <UserRoundPlus className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                                </div>
                                <div className="text-left">
                                    <div className="font-medium text-gray-900 dark:text-white">新規ゲストを作成</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">新しいゲスト情報を登録</div>
                                </div>
                            </button>
                        </div>
                    )}

                    {/* List Step */}
                    {(step === "list" || mode === "cast") && (
                        <div className="flex-1 flex flex-col min-h-0 p-4 pt-2">
                            {/* Search Input */}
                            <div className="relative shrink-0 mb-3">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    placeholder="名前で検索..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full px-4 py-2.5 pl-10 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {/* Cast Filter Tabs */}
                            {mode === "cast" && (
                                <div className="flex gap-2 shrink-0 mb-3">
                                    <button
                                        type="button"
                                        onClick={() => setCastFilter("working")}
                                        className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                                            castFilter === "working"
                                                ? "bg-blue-600 text-white"
                                                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                                        }`}
                                    >
                                        出勤中
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCastFilter("all")}
                                        className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                                            castFilter === "all"
                                                ? "bg-blue-600 text-white"
                                                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                                        }`}
                                    >
                                        すべて
                                    </button>
                                </div>
                            )}

                            {/* Profile List */}
                            <div className="flex-1 overflow-y-auto -mx-4 px-4">
                                {filteredProfiles.length === 0 ? (
                                    <div className="py-12 text-center text-gray-500 dark:text-gray-400">
                                        {mode === "guest" ? "該当するゲストがいません" : "該当するキャストがいません"}
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {filteredProfiles.map((profile) => {
                                            const historyCount = castHistory[profile.id] || 0;
                                            const castCompatibility = compatibility[profile.id];
                                            return (
                                                <div
                                                    key={profile.id}
                                                    className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditProfile(profile);
                                                        }}
                                                        className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 font-medium hover:ring-2 hover:ring-blue-500 transition-all shrink-0"
                                                    >
                                                        {profile.display_name?.charAt(0) || "?"}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleProfileClick(profile)}
                                                        className="flex-1 min-w-0 text-left"
                                                    >
                                                        <div className="font-medium text-gray-900 dark:text-white truncate">
                                                            {profile.display_name}
                                                        </div>
                                                        {profile.display_name_kana && (
                                                            <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                                                {profile.display_name_kana}
                                                            </div>
                                                        )}
                                                    </button>
                                                    {mode === "cast" && (
                                                        <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                                                            {/* 相性バッジ */}
                                                            {castCompatibility === "good" && (
                                                                <span className="px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs font-medium">
                                                                    相性◯
                                                                </span>
                                                            )}
                                                            {castCompatibility === "bad" && (
                                                                <span className="px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-medium">
                                                                    相性✕
                                                                </span>
                                                            )}
                                                            {/* 詳細履歴バッジ */}
                                                            {(() => {
                                                                const details = castDetailedHistory[profile.id];
                                                                if (!details) return null;
                                                                return (
                                                                    <>
                                                                        {details.nomination > 0 && (
                                                                            <span className="px-2 py-1 rounded-full bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 text-xs font-medium">
                                                                                指名{details.nomination}
                                                                            </span>
                                                                        )}
                                                                        {details.douhan > 0 && (
                                                                            <span className="px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs font-medium">
                                                                                同伴{details.douhan}
                                                                            </span>
                                                                        )}
                                                                        {details.companion > 0 && (
                                                                            <span className="px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-medium">
                                                                                場内{details.companion}
                                                                            </span>
                                                                        )}
                                                                    </>
                                                                );
                                                            })()}
                                                            {/* 接客履歴バッジ（詳細がない場合のフォールバック） */}
                                                            {historyCount > 0 && !castDetailedHistory[profile.id] && (
                                                                <span className="px-2 py-1 rounded-full bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 text-xs font-medium">
                                                                    接客{historyCount}回
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* User Create Modal */}
            <UserEditModal
                profile={null}
                open={isCreateModalOpen}
                onOpenChange={(open) => {
                    setIsCreateModalOpen(open);
                    if (!open) {
                        loadProfiles();
                    }
                }}
                defaultRole="guest"
                hidePersonalInfo={!pagePermissions?.personalInfo}
                pagePermissions={pagePermissions}
                canEdit
            />

            {/* User Edit Modal */}
            <UserEditModal
                profile={editProfile}
                open={!!editProfile}
                onOpenChange={(open) => {
                    if (!open) {
                        setEditProfile(null);
                        loadProfiles();
                    }
                }}
                hidePersonalInfo={!pagePermissions?.personalInfo}
                pagePermissions={pagePermissions}
                canEdit
            />

            {/* Compatibility Warning Dialog */}
            <Dialog open={isCompatibilityWarningOpen} onOpenChange={setIsCompatibilityWarningOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader className="text-center sm:text-center">
                        <div className="mx-auto w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
                            <AlertTriangle className="h-7 w-7 text-red-600 dark:text-red-400" />
                        </div>
                        <DialogTitle className="text-center">相性に注意</DialogTitle>
                        <DialogDescription className="text-center mt-2">
                            {pendingProfile?.display_name}さんはこのゲストと相性✕に設定されています。本当に選択しますか？
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex flex-row gap-3 mt-6 sm:justify-center">
                        <Button
                            variant="outline"
                            onClick={handleCancelBadCompatibility}
                            className="flex-1 h-11"
                        >
                            キャンセル
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleConfirmBadCompatibility}
                            className="flex-1 h-11"
                        >
                            選択する
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
