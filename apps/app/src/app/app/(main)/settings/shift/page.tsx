import type { Metadata } from "next";
import { ShiftSettingsWrapper } from "./shift-settings-wrapper";

export const metadata: Metadata = {
    title: "シフト設定",
};

export default function ShiftSettingsPage() {
    return <ShiftSettingsWrapper />;
}
