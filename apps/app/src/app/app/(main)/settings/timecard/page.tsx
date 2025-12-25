import type { Metadata } from "next";
import { TimecardSettingsWrapper } from "./timecard-settings-wrapper";

export const metadata: Metadata = {
    title: "タイムカード設定",
};

export default function TimecardSettingsPage() {
    return <TimecardSettingsWrapper />;
}
