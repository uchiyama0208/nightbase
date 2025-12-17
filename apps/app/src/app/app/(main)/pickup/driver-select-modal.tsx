"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, Check, ChevronLeft } from "lucide-react";

interface StaffProfile {
    id: string;
    display_name: string;
    display_name_kana: string | null;
    role: string;
}

interface DriverSelectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (driverId: string | null, driverName: string | null) => void;
    staffProfiles: StaffProfile[];
    selectedDriverId: string | null;
}

type TabType = "staff" | "partner";

export function DriverSelectModal({
    isOpen,
    onClose,
    onSelect,
    staffProfiles,
    selectedDriverId,
}: DriverSelectModalProps) {
    const [activeTab, setActiveTab] = useState<TabType>("staff");
    const [searchQuery, setSearchQuery] = useState("");

    // Vercel-style tabs
    const tabsRef = useRef<{ [key: string]: HTMLButtonElement | null }>({});
    const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

    useEffect(() => {
        const activeButton = tabsRef.current[activeTab];
        if (activeButton) {
            setIndicatorStyle({
                left: activeButton.offsetLeft,
                width: activeButton.offsetWidth,
            });
        }
    }, [activeTab]);

    // Reset search when modal opens
    useEffect(() => {
        if (isOpen) {
            setSearchQuery("");
            // 選択中のドライバーがいる場合、そのタブをアクティブにする
            if (selectedDriverId) {
                const selectedStaff = staffProfiles.find(s => s.id === selectedDriverId);
                if (selectedStaff) {
                    if (selectedStaff.role === "partner") {
                        setActiveTab("partner");
                    } else {
                        setActiveTab("staff");
                    }
                }
            }
        }
    }, [isOpen, selectedDriverId, staffProfiles]);

    // フィルタリングされたスタッフ
    const filteredStaff = useMemo(() => {
        const roleFilter = activeTab === "staff"
            ? (s: StaffProfile) => s.role === "staff" || s.role === "admin"
            : (s: StaffProfile) => s.role === "partner";

        const query = searchQuery.toLowerCase();
        return staffProfiles
            .filter(roleFilter)
            .filter(s =>
                searchQuery === "" ||
                s.display_name.toLowerCase().includes(query) ||
                (s.display_name_kana && s.display_name_kana.toLowerCase().includes(query))
            );
    }, [staffProfiles, activeTab, searchQuery]);

    const staffCount = useMemo(() =>
        staffProfiles.filter(s => s.role === "staff" || s.role === "admin").length,
        [staffProfiles]
    );

    const partnerCount = useMemo(() =>
        staffProfiles.filter(s => s.role === "partner").length,
        [staffProfiles]
    );

    const handleSelect = (staff: StaffProfile | null) => {
        if (staff) {
            onSelect(staff.id, staff.display_name);
        } else {
            onSelect(null, null);
        }
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md rounded-2xl border border-gray-200 bg-white p-0 shadow-xl dark:border-gray-800 dark:bg-gray-900 max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader className="relative flex flex-row items-center justify-center space-y-0 p-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="absolute left-4 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    </button>
                    <DialogTitle className="text-base font-semibold text-gray-900 dark:text-gray-50">
                        ドライバー選択
                    </DialogTitle>
                </DialogHeader>

                {/* Search */}
                <div className="px-4 pt-4 shrink-0">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="名前で検索..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-10 rounded-lg border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
                        />
                    </div>
                </div>

                {/* Vercel-style Tab Navigation */}
                <div className="px-4 pt-4 shrink-0">
                    <div className="relative">
                        <div className="flex w-full">
                            <button
                                ref={(el) => { tabsRef.current["staff"] = el; }}
                                type="button"
                                onClick={() => setActiveTab("staff")}
                                className={`flex-1 py-2 text-sm font-medium transition-colors relative ${
                                    activeTab === "staff"
                                        ? "text-gray-900 dark:text-white"
                                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                                }`}
                            >
                                スタッフ ({staffCount})
                            </button>
                            <button
                                ref={(el) => { tabsRef.current["partner"] = el; }}
                                type="button"
                                onClick={() => setActiveTab("partner")}
                                className={`flex-1 py-2 text-sm font-medium transition-colors relative ${
                                    activeTab === "partner"
                                        ? "text-gray-900 dark:text-white"
                                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                                }`}
                            >
                                パートナー ({partnerCount})
                            </button>
                        </div>
                        <div
                            className="absolute bottom-0 h-0.5 bg-gray-900 dark:bg-white transition-all duration-200"
                            style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
                        />
                        <div className="absolute bottom-0 left-0 right-0 h-px bg-gray-200 dark:bg-gray-700" />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4">
                    {/* 未定オプション */}
                    <button
                        type="button"
                        onClick={() => handleSelect(null)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors mb-1 ${
                            !selectedDriverId
                                ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                                : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-white"
                        }`}
                    >
                        <span className="text-sm font-medium">未定</span>
                        {!selectedDriverId && (
                            <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        )}
                    </button>

                    {filteredStaff.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                            {searchQuery ? "該当するスタッフがいません" : "スタッフがいません"}
                        </p>
                    ) : (
                        <div className="space-y-1">
                            {filteredStaff.map((staff) => (
                                <button
                                    key={staff.id}
                                    type="button"
                                    onClick={() => handleSelect(staff)}
                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
                                        selectedDriverId === staff.id
                                            ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                                            : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-white"
                                    }`}
                                >
                                    <span className="text-sm font-medium">{staff.display_name}</span>
                                    {selectedDriverId === staff.id && (
                                        <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
