import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { getAllProfiles } from "../users/actions";
import { ChevronLeft } from "lucide-react";

interface PlacementModalProps {
    isOpen: boolean;
    onClose: () => void;
    onProfileSelect: (profile: any) => void;
    mode?: "guest" | "cast";
}

export function PlacementModal({ isOpen, onClose, onProfileSelect, mode = "guest" }: PlacementModalProps) {
    const [allProfiles, setAllProfiles] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        if (isOpen) {
            loadProfiles();
        }
    }, [isOpen]);

    const loadProfiles = async () => {
        const data = await getAllProfiles();
        setAllProfiles(data);
    };

    const handleProfileClick = (profile: any) => {
        onProfileSelect(profile);
        onClose();
    };

    const filteredProfiles = allProfiles
        .filter(p => p.role === mode)
        .filter(p =>
            p.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.display_name_kana?.toLowerCase().includes(searchQuery.toLowerCase())
        );

    const title = mode === "guest" ? "ゲストを選択" : "キャストを選択";
    const emptyMessage = mode === "guest" ? "該当するゲストがいません" : "該当するキャストがいません";

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader className="mb-3 sm:mb-4 flex flex-row items-center justify-between gap-2 relative">
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-0"
                        aria-label="戻る"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <DialogTitle className="flex-1 text-center text-xl font-bold">{title}</DialogTitle>
                    <DialogDescription className="sr-only">
                        {mode === "guest" ? "ゲスト選択" : "キャスト選択"}
                    </DialogDescription>
                    <div className="h-8 w-8" /> {/* Spacer for centering */}
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Search Input */}
                    <div className="relative">
                        <input
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
                    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                        {/* Table Header */}
                        <div className="grid grid-cols-2 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                            <div className="px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 text-center">
                                表示名
                            </div>
                            <div className="px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 text-center border-l border-slate-200 dark:border-slate-700">
                                ひらがな
                            </div>
                        </div>

                        {/* Table Body */}
                        <div className="max-h-[400px] overflow-y-auto">
                            {filteredProfiles.length === 0 ? (
                                <div className="py-12 text-center text-slate-500 dark:text-slate-400">
                                    {emptyMessage}
                                </div>
                            ) : (
                                filteredProfiles.map((profile) => (
                                    <button
                                        key={profile.id}
                                        onClick={() => handleProfileClick(profile)}
                                        className="grid grid-cols-2 w-full border-b border-slate-200 dark:border-slate-700 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                    >
                                        <div className="px-4 py-4 text-center text-slate-900 dark:text-slate-100">
                                            {profile.display_name}
                                        </div>
                                        <div className="px-4 py-4 text-center text-slate-900 dark:text-slate-100 border-l border-slate-200 dark:border-slate-700">
                                            {profile.display_name_kana || "-"}
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
