"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";
import { assignCast } from "./actions";
import { useToast } from "@/components/ui/use-toast";

interface CastAssignmentModalProps {
    sessionId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAssign: () => void;
}

export function CastAssignmentModal({ sessionId, open, onOpenChange, onAssign }: CastAssignmentModalProps) {
    const [casts, setCasts] = useState<any[]>([]);
    const { toast } = useToast();

    useEffect(() => {
        if (open) {
            loadCasts();
        }
    }, [open]);

    const loadCasts = async () => {
        const supabase = createClient();
        // Fetch active casts (attendance logic needed here, fetching all for now)
        const { data } = await supabase
            .from("profiles")
            .select("*")
            .eq("role", "cast");

        if (data) setCasts(data);
    };

    const handleAssign = async (castId: string, status: string) => {
        if (!sessionId) return;
        try {
            await assignCast(sessionId, castId, status);
            onAssign();
            onOpenChange(false);
            toast({ title: "キャストを指名しました" });
        } catch (error) {
            toast({ title: "エラーが発生しました", variant: "destructive" });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>キャスト指名</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto">
                    {casts.map(cast => (
                        <div key={cast.id} className="p-2 border rounded-lg flex flex-col gap-2">
                            <div className="font-bold">{cast.display_name || cast.name}</div>
                            <div className="flex gap-1">
                                <Button size="sm" variant="outline" onClick={() => handleAssign(cast.id, "jounai")}>場内</Button>
                                <Button size="sm" variant="default" onClick={() => handleAssign(cast.id, "shime")}>本指名</Button>
                            </div>
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}
