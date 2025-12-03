import { useState, useEffect, useCallback } from "react";
import { Table, TableSession } from "@/types/floor";
import { getTables } from "../../seats/actions";
import { getActiveSessions, getCompletedSessions } from "../actions";

export function useFloorData() {
    const [tables, setTables] = useState<Table[]>([]);
    const [sessions, setSessions] = useState<TableSession[]>([]);
    const [selectedSession, setSelectedSession] = useState<TableSession | null>(null);
    const [selectedTable, setSelectedTable] = useState<Table | null>(null);
    const [showCompleted, setShowCompleted] = useState(false);

    const loadData = useCallback(async (targetSessionId?: string) => {
        const [tablesData, sessionsData] = await Promise.all([
            getTables(),
            showCompleted ? getCompletedSessions() : getActiveSessions(),
        ]);
        setTables(tablesData);
        setSessions(sessionsData as any);

        // If a target session ID is provided, select it immediately
        if (targetSessionId) {
            const session = (sessionsData as any[]).find((s) => s.id === targetSessionId);
            if (session) {
                const table = tablesData.find((t) => t.id === session.table_id);
                if (table) {
                    setSelectedSession(session as TableSession);
                    setSelectedTable(table);
                }
            }
            return;
        }

        // Ensure the currently selected session/table are refreshed with latest data
        setSelectedSession((prev) => {
            if (!prev) return null;
            const updated = (sessionsData as any[]).find((s) => s.id === prev.id);
            // If session no longer exists in active sessions, clear selection
            if (!updated) return null;
            return (updated as TableSession) || null;
        });

        setSelectedTable((prev) => {
            if (!prev) return null;
            const updated = tablesData.find((t) => t.id === prev.id);
            // If table no longer exists, clear selection
            if (!updated) return null;
            return updated || null;
        });
    }, [showCompleted]);

    useEffect(() => {
        loadData();
        const interval = setInterval(() => loadData(), 30000);
        return () => clearInterval(interval);
    }, [loadData, showCompleted]);

    return {
        tables,
        sessions,
        selectedSession,
        selectedTable,
        setSelectedSession,
        setSelectedTable,
        loadData,
        showCompleted,
        setShowCompleted,
    };
}
