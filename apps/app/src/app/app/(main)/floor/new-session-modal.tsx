"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table } from "@/types/floor";
import { createSession } from "./actions";
import { useToast } from "@/components/ui/use-toast";

interface NewSessionModalProps {
    isOpen: boolean;
    onClose: () => void;
    tables: Table[];
    onSessionCreated: () => void;
}

export function NewSessionModal({ isOpen, onClose, tables, onSessionCreated }: NewSessionModalProps) {
    const [selectedTableId, setSelectedTableId] = useState<string>("");
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const handleCreate = async () => {
        if (!selectedTableId) return;

        setIsLoading(true);
        try {
            await createSession(selectedTableId);
            toast({ title: "セッションを開始しました" });
            onSessionCreated();
            onClose();
            // Reset form
            setSelectedTableId("");
        } catch (error) {
            console.error(error);
            toast({ title: "開始に失敗しました", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>新規セッション開始</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>テーブル選択</Label>
                        <Select value={selectedTableId} onValueChange={setSelectedTableId}>
                            <SelectTrigger>
                                <SelectValue placeholder="テーブルを選択" />
                            </SelectTrigger>
                            <SelectContent>
                                {tables.map((table) => (
                                    <SelectItem key={table.id} value={table.id}>
                                        {table.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button
                        className="w-full"
                        onClick={handleCreate}
                        disabled={!selectedTableId || isLoading}
                    >
                        開始
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
