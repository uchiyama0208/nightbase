"use client";

import { useState, useEffect, useMemo } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { VercelTabs } from "@/components/ui/vercel-tabs";
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

    const tabs = [
        { key: "staff", label: `スタッフ (${staffCount})` },
        { key: "partner", label: `パートナー (${partnerCount})` },
    ];

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
            <DialogContent className="p-0 overflow-hidden flex flex-col max-h-[90vh] rounded-2xl">
                <DialogHeader className="sticky top-0 z-10 bg-white dark:bg-gray-900 flex !flex-row items-center gap-2 h-14 min-h-[3.5rem] flex-shrink-0 border-b border-gray-200 dark:border-gray-700 px-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <DialogTitle className="flex-1 text-center text-lg font-semibold text-gray-900 dark:text-white truncate">
                        ドライバー選択
                    </DialogTitle>
                    <div className="w-8 h-8" />
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
                    <VercelTabs
                        tabs={tabs}
                        value={activeTab}
                        onChange={(val) => setActiveTab(val as TabType)}
                    />
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
                                : "hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
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
                                            : "hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
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
