"use client";

import { useState, useEffect, useRef } from "react";
import { Table, Seat } from "@/types/floor";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, RotateCw, Trash2 } from "lucide-react";

interface TableLayoutEditorProps {
    table: Table | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (tableId: string, layoutData: any) => void;
}

export function TableLayoutEditor({ table, open, onOpenChange, onSave }: TableLayoutEditorProps) {
    const [seats, setSeats] = useState<Seat[]>([]);
    const [selectedSeatId, setSelectedSeatId] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const dragOffset = useRef({ x: 0, y: 0 });

    useEffect(() => {
        if (table?.layout_data?.seats) {
            setSeats(table.layout_data.seats);
        } else {
            setSeats([]);
        }
    }, [table]);

    const handleAddSeat = () => {
        const newSeat: Seat = {
            id: `seat-${Date.now()}`,
            x: 50, // Center relative to table
            y: -20, // Top edge
            rotation: 0,
            label: `${seats.length + 1}`
        };
        setSeats([...seats, newSeat]);
    };

    const handleRotateSeat = () => {
        if (!selectedSeatId) return;
        setSeats(seats.map(s =>
            s.id === selectedSeatId ? { ...s, rotation: (s.rotation + 45) % 360 } : s
        ));
    };

    const handleDeleteSeat = () => {
        if (!selectedSeatId) return;
        setSeats(seats.filter(s => s.id !== selectedSeatId));
        setSelectedSeatId(null);
    };

    const handleSave = () => {
        if (table) {
            onSave(table.id, { ...table.layout_data, seats });
            onOpenChange(false);
        }
    };

    const handleMouseDown = (e: React.MouseEvent, seat: Seat) => {
        e.stopPropagation();
        setSelectedSeatId(seat.id);
        setIsDragging(true);
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        dragOffset.current = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !selectedSeatId) return;

        // Calculate position relative to the table center/container
        // This is a simplified implementation. In a real app, we need to handle coordinate systems carefully.
        // Assuming the container is 300x300 for the editor view.
        const container = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - container.left - dragOffset.current.x;
        const y = e.clientY - container.top - dragOffset.current.y;

        // Snap to grid (5px)
        const snappedX = Math.round(x / 5) * 5;
        const snappedY = Math.round(y / 5) * 5;

        setSeats(seats.map(s =>
            s.id === selectedSeatId ? { ...s, x: snappedX, y: snappedY } : s
        ));
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    if (!table) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>座席配置エディター: {table.name}</DialogTitle>
                </DialogHeader>

                <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 rounded-lg p-8 relative overflow-hidden"
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    {/* Table Representation */}
                    <div
                        className="relative border-4 border-slate-800 dark:border-slate-200 bg-white dark:bg-slate-800"
                        style={{
                            width: 300, // Fixed size for editor visualization
                            height: 300 * (table.height / table.width),
                            borderRadius: table.shape === 'circle' ? '50%' : '8px'
                        }}
                    >
                        {/* Seats */}
                        {seats.map(seat => (
                            <div
                                key={seat.id}
                                className={`absolute w-10 h-10 flex items-center justify-center rounded-full border-2 cursor-move transition-colors ${selectedSeatId === seat.id
                                        ? "bg-primary text-primary-foreground border-primary"
                                        : "bg-white dark:bg-slate-700 border-slate-400"
                                    }`}
                                style={{
                                    left: seat.x, // These need to be mapped to the visualization scale
                                    top: seat.y,
                                    transform: `rotate(${seat.rotation}deg)`
                                }}
                                onMouseDown={(e) => handleMouseDown(e, seat)}
                            >
                                {seat.label}
                                {/* Direction Indicator */}
                                <div className="absolute -top-1 w-2 h-2 bg-current rounded-full" />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t">
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={handleAddSeat}>
                            <Plus className="mr-2 h-4 w-4" /> 座席追加
                        </Button>
                        <Button variant="outline" onClick={handleRotateSeat} disabled={!selectedSeatId}>
                            <RotateCw className="mr-2 h-4 w-4" /> 回転
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteSeat} disabled={!selectedSeatId}>
                            <Trash2 className="mr-2 h-4 w-4" /> 削除
                        </Button>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>キャンセル</Button>
                        <Button onClick={handleSave}>保存</Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
