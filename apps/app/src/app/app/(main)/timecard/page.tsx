import type { Metadata } from "next";
import { TimecardPageClient } from "./timecard-page-client";

export const metadata: Metadata = {
    title: "タイムカード",
};

export default function TimecardPage() {
    return <TimecardPageClient />;
}
