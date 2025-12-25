"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabaseClient";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface WaitingCastSidebarProps {
    onDragStart: (e: React.DragEvent, cast: any) => void;
}

export function WaitingCastSidebar({ onDragStart }: WaitingCastSidebarProps) {
    const [casts, setCasts] = useState<any[]>([]);

    useEffect(() => {
        loadCasts();
    }, []);

    const loadCasts = async () => {
        const supabase = createBrowserClient() as any;
        // 在籍中・体入のキャストのみを取得
        const { data } = await supabase
            .from("profiles")
            .select("*")
            .eq("role", "cast")
            .in("status", ["在籍中", "体入"]);

        if (data) setCasts(data);
    };

    return (
        <div className="w-64 bg-card border-r flex flex-col h-full">
            <div className="p-4 border-b">
                <h2 className="font-semibold">待機キャスト</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {casts.map(cast => (
                    <div
                        key={cast.id}
                        draggable
                        onDragStart={(e) => onDragStart(e, cast)}
                        className="p-3 bg-background border rounded-lg cursor-move hover:bg-accent transition-colors flex items-center gap-3"
                    >
                        <Avatar className="w-10 h-10">
                            <AvatarImage src={cast.avatar_url} />
                            <AvatarFallback>{cast.display_name?.[0] || cast.name?.[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                            <div className="flex items-center gap-1">
                                <span className="font-medium text-sm">{cast.display_name || cast.name}</span>
                                {cast.status === "体入" && (
                                    <span className="text-[10px] px-1 py-0.5 rounded bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                                        体入
                                    </span>
                                )}
                            </div>
                            <Badge variant="outline" className="text-[10px] h-5">待機中</Badge>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
