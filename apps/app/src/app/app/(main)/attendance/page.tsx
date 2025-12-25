import type { Metadata } from "next";
import { AttendancePageClient } from "./attendance-page-client";

export const metadata: Metadata = {
	title: "勤怠",
};

export default function AttendancePage() {
	return <AttendancePageClient />;
}
