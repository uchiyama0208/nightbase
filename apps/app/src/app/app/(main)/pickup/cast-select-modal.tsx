"use client";

import { useState, useEffect, useMemo } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, ChevronLeft, MapPin } from "lucide-react";
import type { TodayAttendee } from "./actions";

interface CastSelectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (attendee: TodayAttendee) => void;
    attendees: TodayAttendee[];
    excludeIds?: Set<string>;
}

export function CastSelectModal({
    isOpen,
    onClose,
    onSelect,
    attendees,
    excludeIds = new Set(),
}: CastSelectModalProps) {
    const [searchQuery, setSearchQuery] = useState("");

    // Reset search when modal opens
    useEffect(() => {
        if (isOpen) {
            setSearchQuery("");
        }
    }, [isOpen]);

    // フィルタリングされたキャスト
    const filteredAttendees = useMemo(() => {
        const query = searchQuery.toLowerCase();
        return attendees
            .filter((a) => a.pickup_destination && !excludeIds.has(a.profile_id))
            .filter(
                (a) =>
                    searchQuery === "" ||
                    a.display_name.toLowerCase().includes(query) ||
                    (a.pickup_destination && a.pickup_destination.toLowerCase().includes(query))
            );
    }, [attendees, searchQuery, excludeIds]);

    const handleSelect = (attendee: TodayAttendee) => {
        onSelect(attendee);
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
                        キャスト選択
                    </DialogTitle>
                </DialogHeader>

                {/* Search */}
                <div className="px-4 pt-4 shrink-0">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="名前・送迎先で検索..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-10 rounded-lg border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4">
                    {filteredAttendees.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                            {searchQuery ? "該当するキャストがいません" : "追加可能なキャストがいません"}
                        </p>
                    ) : (
                        <div className="space-y-1">
                            {filteredAttendees.map((attendee) => (
                                <button
                                    key={attendee.profile_id}
                                    type="button"
                                    onClick={() => handleSelect(attendee)}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                                >
                                    <div className="flex-1 text-left">
                                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                                            {attendee.display_name}
                                        </span>
                                    </div>
                                    {attendee.pickup_destination && (
                                        <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                                            <MapPin className="h-3.5 w-3.5" />
                                            <span className="text-xs truncate max-w-[120px]">
                                                {attendee.pickup_destination}
                                            </span>
                                        </div>
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
