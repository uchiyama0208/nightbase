"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type TabKey = "shift" | "user" | "floor" | "store" | "community";

interface DashboardTabContextType {
    activeTab: TabKey;
    setActiveTab: (tab: TabKey) => void;
}

const DashboardTabContext = createContext<DashboardTabContextType | null>(null);

export function DashboardTabProvider({ children }: { children: ReactNode }) {
    const [activeTab, setActiveTab] = useState<TabKey>("shift");

    return (
        <DashboardTabContext.Provider value={{ activeTab, setActiveTab }}>
            {children}
        </DashboardTabContext.Provider>
    );
}

export function useDashboardTab() {
    const context = useContext(DashboardTabContext);
    return context;
}
