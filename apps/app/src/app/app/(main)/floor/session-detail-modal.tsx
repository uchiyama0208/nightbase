"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TableSession, Table } from "@/types/floor";
import { TableGrid } from "@/components/floor/table-grid";
import { UserPlus } from "lucide-react";
import { PlacementModal } from "./placement-modal";

interface SessionDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    session: TableSession;
    table: Table;
    onUpdate: () => void;
}

export function SessionDetailModal({ isOpen, onClose, session, table, onUpdate }: SessionDetailModalProps) {
    const [isPlacementOpen, setIsPlacementOpen] = useState(false);

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            {table.name}
                            <span className="text-sm font-normal text-muted-foreground">
                                {session.guest_count}名
                            </span>
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex flex-col items-center gap-6 py-4">
                        <div className="w-full flex justify-center bg-slate-50 dark:bg-slate-900/50 p-2 rounded-xl overflow-hidden">
                            <div className="max-w-full overflow-x-auto">
                                <TableGrid
                                    grid={table.layout_data?.grid || []}
                                    assignments={(session as any).cast_assignments}
                                />
                            </div>
                        </div>

                        <div className="flex gap-4 w-full">
                            <Button
                                className="flex-1 h-12 text-lg"
                                onClick={() => setIsPlacementOpen(true)}
                            >
                                <UserPlus className="mr-2 h-5 w-5" />
                                配置する
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {isPlacementOpen && (
                <PlacementModal
                    isOpen={isPlacementOpen}
                    onClose={() => setIsPlacementOpen(false)}
                    session={session}
                    table={table}
                    onPlacementComplete={async () => {
                        setIsPlacementOpen(false);
                        await onUpdate();
                        onClose(); // Close the detail modal too
                    }}
                />
            )}
        </>
    );
}
