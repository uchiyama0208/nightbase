import type { Metadata } from "next";
import { DashboardClient } from "./dashboard-client";

export const metadata: Metadata = {
    title: "ダッシュボード",
};

export default function DashboardPage() {
    return <DashboardClient />;
}
