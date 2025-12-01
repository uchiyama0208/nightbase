"use client";

import { useState, useRef, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { TableGrid } from "@/components/floor/table-grid";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table } from "@/types/floor";

interface SeatSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSeatSelect: (rowIndex: number, colIndex: number) => void;
    onSkip?: () => void;
    table: Table;
    assignments: any[];
    selectedProfile: {
        id: string;
        display_name: string;
        avatar_url?: string;
    };
    mode: "guest" | "cast";
}

function ScalableGridWrapper({
    grid,
    assignments,
    onCellClick
}: {
    grid: any[][],
    assignments: any[],
    onCellClick: (r: number, c: number) => void
}) {
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);
    const [height, setHeight] = useState<number | undefined>(undefined);

    useEffect(() => {
        const updateScale = () => {
            if (!containerRef.current || !contentRef.current) return;

            const containerWidth = containerRef.current.clientWidth;
            const contentWidth = contentRef.current.offsetWidth;
            const contentHeight = contentRef.current.offsetHeight;

            if (contentWidth === 0) return;

            const newScale = containerWidth / contentWidth;
            setScale(newScale);
            setHeight(contentHeight * newScale);
        };

        updateScale();

        const resizeObserver = new ResizeObserver(updateScale);
        if (containerRef.current) resizeObserver.observe(containerRef.current);
        if (contentRef.current) resizeObserver.observe(contentRef.current);

        return () => resizeObserver.disconnect();
    }, [grid]);

    return (
        <div
            ref={containerRef}
            className="w-full flex justify-center overflow-hidden"
            style={{
                height: height ? `${height}px` : 'auto',
                minHeight: '300px',
                maxHeight: '60vh'
            }}
        >
            <div
                ref={contentRef}
                style={{
                    transform: `scale(${scale})`,
                    transformOrigin: 'top center',
                    width: 'max-content'
                }}
                className="origin-top"
            >
                <TableGrid
                    grid={grid}
                    assignments={assignments}
                    onCellClick={onCellClick}
                />
            </div>
        </div>
    );
}

export function SeatSelectionModal({
    isOpen,
    onClose,
    onSeatSelect,
    onSkip,
    table,
    assignments,
    selectedProfile,
    mode,
}: SeatSelectionModalProps) {
    const handleCellClick = (rowIndex: number, colIndex: number) => {
        onSeatSelect(rowIndex, colIndex);
    };

    const handleSkip = () => {
        if (onSkip) {
            onSkip();
        }
    };

    const title = mode === "guest" ? "席を選択" : "席を選択";

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-3 sm:p-4 md:p-5">
                <DialogHeader className="mb-3 sm:mb-4 flex flex-row items-center justify-between gap-2 relative flex-shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-0"
                        aria-label="戻る"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <DialogTitle className="flex-1 text-center text-xl font-bold">
                        {title}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        席を選択してください
                    </DialogDescription>
                    <div className="h-8 w-8" />
                </DialogHeader>

                <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                    {/* Selected Profile Info */}
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 flex-shrink-0 mb-4">
                        <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                                <AvatarImage src={selectedProfile.avatar_url} />
                                <AvatarFallback>
                                    {selectedProfile.display_name?.[0] || "?"}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="text-sm font-medium">
                                    {selectedProfile.display_name}を配置
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    席をタップして配置してください
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Grid Container with Scroll */}
                    <div className="flex-1 min-h-0 overflow-y-auto mb-4">
                        <div className="w-full flex justify-center p-2">
                            <ScalableGridWrapper
                                grid={table.layout_data?.grid || []}
                                assignments={assignments}
                                onCellClick={handleCellClick}
                            />
                        </div>
                    </div>

                    {/* Skip Button - Always visible at bottom */}
                    {onSkip && (
                        <div className="flex-shrink-0 pt-2 border-t">
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={handleSkip}
                            >
                                スキップ
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
