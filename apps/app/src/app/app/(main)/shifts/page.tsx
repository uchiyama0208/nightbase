import type { Metadata } from "next";
import { ShiftsPageClient } from "./shifts-page-client";

export const metadata: Metadata = {
    title: "シフト管理",
};

export default function ShiftsPage() {
    return <ShiftsPageClient />;
}
