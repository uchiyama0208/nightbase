"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { assignCast } from "./actions";
import { getAllProfiles } from "../users/actions";
import { useToast } from "@/components/ui/use-toast";
import { TableSession, Table } from "@/types/floor";

interface PlacementModalProps {
    isOpen: boolean;
    onClose: () => void;
    session: TableSession;
    table: Table;
    onPlacementComplete: () => void;
}

export function PlacementModal({ isOpen, onClose, session, table, onPlacementComplete }: PlacementModalProps) {
    const [profileType, setProfileType] = useState<"guest" | "cast" | "staff">("guest");
    const [allProfiles, setAllProfiles] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const { toast } = useToast();

    useEffect(() => {
        if (isOpen) {
            loadProfiles();
        }
    }, [isOpen]);

    const loadProfiles = async () => {
        const data = await getAllProfiles();
        setAllProfiles(data);
    };

    const handleProfileClick = async (profileId: string) => {
        try {
            // For now, place at grid position (0, 0) - you can enhance this later
            await assignCast(session.id, profileId, "free", 0, 0);
            toast({ title: "配置しました" });
            onClose();
            await onPlacementComplete();
        } catch (error) {
            console.error(error);
            toast({ title: "配置に失敗しました" });
        }
    };

    const filteredProfiles = allProfiles
        .filter(p => p.role === profileType)
        .filter(p =>
            p.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.display_name_kana?.toLowerCase().includes(searchQuery.toLowerCase())
        );

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">配置する人を選択</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Toggle Buttons */}
                    <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-full w-fit mx-auto">
                        <button
                            onClick={() => setProfileType("guest")}
                            className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${profileType === "guest"
                                    ? "bg-blue-500 text-white shadow-md"
                                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                                }`}
                        >
                            ゲスト
                        </button>
                        <button
                            onClick={() => setProfileType("cast")}
                            className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${profileType === "cast"
                                    ? "bg-blue-500 text-white shadow-md"
                                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                                }`}
                        >
                            キャスト
                        </button>
                        <button
                            onClick={() => setProfileType("staff")}
                            className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${profileType === "staff"
                                    ? "bg-blue-500 text-white shadow-md"
                                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                                }`}
                        >
                            スタッフ
                        </button>
                    </div>

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
                                    該当するユーザーがいません
                                </div>
                            ) : (
                                filteredProfiles.map((profile) => (
                                    <button
                                        key={profile.id}
                                        onClick={() => handleProfileClick(profile.id)}
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
