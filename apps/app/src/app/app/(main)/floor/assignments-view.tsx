"use client";

import { useState, useEffect } from "react";
import { Table, TableSession } from "@/types/floor";
import { getTables } from "../floor-settings/actions";
import { getActiveSessions, assignCast, removeCastAssignment, getWaitingCasts } from "../floor/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, X, Users, Clock } from "lucide-react";

interface Cast {
    id: string;
    display_name: string;
    avatar_url?: string;
}

export function AssignmentsView() {
    const [tables, setTables] = useState<Table[]>([]);
    const [sessions, setSessions] = useState<TableSession[]>([]);
    const [waitingCasts, setWaitingCasts] = useState<Cast[]>([]);
    const [selectedSession, setSelectedSession] = useState<string | null>(null);
    const [selectedCast, setSelectedCast] = useState<string>("");
    const [assignmentType, setAssignmentType] = useState<"free" | "shime">("free");
    const { toast } = useToast();

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 30000);
        return () => clearInterval(interval);
    }, []);

    const loadData = async () => {
        const [tablesData, sessionsData, castsData] = await Promise.all([
            getTables(),
            getActiveSessions(),
            getWaitingCasts(),
        ]);
        setTables(tablesData);
        setSessions(sessionsData as any);
        setWaitingCasts(castsData);
    };

    const handleAssign = async () => {
        if (!selectedSession || !selectedCast) return;

        try {
            await assignCast(selectedSession, selectedCast, assignmentType);
            await loadData();
            setSelectedCast("");
            toast({ title: "キャストを配置しました" });
        } catch (error) {
            toast({ title: "配置に失敗しました" });
        }
    };

    const handleRemoveAssignment = async (assignmentId: string) => {
        try {
            await removeCastAssignment(assignmentId);
            await loadData();
            toast({ title: "配置を解除しました" });
        } catch (error) {
            toast({ title: "解除に失敗しました" });
        }
    };

    const getTableName = (tableId: string) => {
        return tables.find(t => t.id === tableId)?.name || "不明";
    };

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString("ja-JP", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Tokyo",
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">付け回し</h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    待機キャスト: {waitingCasts.length}名
                </div>
            </div>

            {/* Waiting Casts */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">待機中のキャスト</CardTitle>
                </CardHeader>
                <CardContent>
                    {waitingCasts.length === 0 ? (
                        <p className="text-muted-foreground text-sm">待機中のキャストはいません</p>
                    ) : (
                        <div className="flex flex-wrap gap-3">
                            {waitingCasts.map(cast => (
                                <div key={cast.id} className="flex items-center gap-2 p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={cast.avatar_url} />
                                        <AvatarFallback>{cast.display_name?.[0]}</AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm font-medium">{cast.display_name}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Active Sessions */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {sessions.map(session => {
                    const table = tables.find(t => t.id === session.table_id);
                    const assignments = (session as any).cast_assignments || [];

                    return (
                        <Card key={session.id} className={selectedSession === session.id ? "ring-2 ring-blue-500" : ""}>
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-lg">{table?.name || "不明"}</CardTitle>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                            <Clock className="h-3 w-3" />
                                            {formatTime(session.start_time)}〜
                                        </div>
                                    </div>
                                    <Badge variant="secondary">{session.guest_count}名</Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Assigned Casts */}
                                <div className="space-y-2">
                                    <p className="text-sm font-medium">配置中のキャスト</p>
                                    {assignments.length === 0 ? (
                                        <p className="text-xs text-muted-foreground">キャストが配置されていません</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {assignments.map((assignment: any) => {
                                                const profile = Array.isArray(assignment.profiles) ? assignment.profiles[0] : assignment.profiles;
                                                return (
                                                    <div key={assignment.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                                                        <div className="flex items-center gap-2">
                                                            <Avatar className="h-6 w-6">
                                                                <AvatarImage src={profile?.avatar_url} />
                                                                <AvatarFallback className="text-xs">
                                                                    {profile?.display_name?.[0]}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <span className="text-sm">{profile?.display_name}</span>
                                                            <Badge variant={assignment.status === "shime" ? "default" : "outline"} className="text-xs">
                                                                {assignment.status === "shime" ? "指名" : "フリー"}
                                                            </Badge>
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6"
                                                            onClick={() => handleRemoveAssignment(assignment.id)}
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                );
                                            })}

                                        </div>
                                    )}
                                </div>

                                {/* Add Cast */}
                                <div className="space-y-2 pt-2 border-t">
                                    <p className="text-sm font-medium">キャストを追加</p>
                                    <div className="flex gap-2">
                                        <Select value={selectedCast} onValueChange={setSelectedCast}>
                                            <SelectTrigger className="flex-1">
                                                <SelectValue placeholder="キャストを選択" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {waitingCasts.map(cast => (
                                                    <SelectItem key={cast.id} value={cast.id}>
                                                        {cast.display_name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Select value={assignmentType} onValueChange={(v: "free" | "shime") => setAssignmentType(v)}>
                                            <SelectTrigger className="w-24">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="free">フリー</SelectItem>
                                                <SelectItem value="shime">指名</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button
                                        className="w-full"
                                        size="sm"
                                        disabled={!selectedCast}
                                        onClick={() => {
                                            setSelectedSession(session.id);
                                            handleAssign();
                                        }}
                                    >
                                        <UserPlus className="h-4 w-4 mr-2" />
                                        配置
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {
                sessions.length === 0 && (
                    <Card>
                        <CardContent className="py-8 text-center text-muted-foreground">
                            現在アクティブなセッションはありません
                        </CardContent>
                    </Card>
                )
            }
        </div >
    );
}
