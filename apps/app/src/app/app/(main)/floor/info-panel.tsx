import { useState } from "react";
import { Table, TableSession } from "@/types/floor";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { OrderModal } from "./order-modal";
import { BillModal } from "./bill-modal";

interface InfoPanelProps {
    selectedTable: Table | null;
    session: TableSession | null;
    onClose: () => void;
}

export function InfoPanel({ selectedTable, session, onClose }: InfoPanelProps) {
    const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
    const [isBillModalOpen, setIsBillModalOpen] = useState(false);

    if (!selectedTable) return null;

    return (
        <>
            <div className="w-80 bg-card border-l flex flex-col h-full absolute right-0 top-0 bottom-0 z-20 shadow-xl animate-in slide-in-from-right">
                <div className="p-4 border-b flex justify-between items-center bg-muted/50">
                    <h2 className="font-semibold">{selectedTable.name} 詳細</h2>
                    <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {session ? (
                        <>
                            <div className="space-y-2">
                                <h3 className="text-sm font-medium text-muted-foreground">セッション情報</h3>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="bg-background p-2 rounded border">
                                        <div className="text-xs text-muted-foreground">人数</div>
                                        <div className="font-medium">{session.guest_count}名</div>
                                    </div>
                                    <div className="bg-background p-2 rounded border">
                                        <div className="text-xs text-muted-foreground">開始時間</div>
                                        <div className="font-medium">
                                            {new Date(session.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' })}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-sm font-medium text-muted-foreground">指名キャスト</h3>
                                <div className="flex flex-wrap gap-2">
                                    {session.cast_assignments?.map((assignment: any) => (
                                        <div
                                            key={assignment.id}
                                            className="flex items-center gap-1 bg-white dark:bg-slate-800 px-2 py-1 rounded-md text-xs"
                                        >
                                            <Avatar className="h-5 w-5">
                                                <AvatarImage src={assignment.profiles?.avatar_url} />
                                                <AvatarFallback className="text-[10px]">
                                                    {assignment.profiles?.display_name?.[0]}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="text-slate-700 dark:text-slate-300">
                                                {assignment.profiles?.display_name}
                                            </span>
                                            <span className="text-slate-500 dark:text-slate-400 text-[10px]">
                                                {new Date(assignment.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' })}~
                                            </span>
                                        </div>
                                    ))}
                                    {(!session.cast_assignments || session.cast_assignments.length === 0) && (
                                        <div className="text-sm text-muted-foreground text-center py-2">
                                            指名なし
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Button className="w-full" variant="default" onClick={() => setIsOrderModalOpen(true)}>注文を追加</Button>
                                <Button className="w-full" variant="outline" onClick={() => setIsBillModalOpen(true)}>お会計</Button>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                            <p>空席</p>
                            <p className="text-sm">入店処理を行ってください</p>
                        </div>
                    )}
                </div>
            </div>

            <OrderModal
                session={session}
                open={isOrderModalOpen}
                onOpenChange={setIsOrderModalOpen}
                onOrderComplete={() => {
                    // Ideally refresh session data here
                }}
            />

            <BillModal
                session={session}
                open={isBillModalOpen}
                onOpenChange={setIsBillModalOpen}
            />
        </>
    );
}
