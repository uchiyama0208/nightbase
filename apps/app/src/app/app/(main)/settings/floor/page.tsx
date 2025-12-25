import type { Metadata } from "next";
import { FloorSettingsWrapper } from "./floor-settings-wrapper";

export const metadata: Metadata = {
    title: "フロア設定",
};

export default function FloorSettingsPage() {
    return <FloorSettingsWrapper />;
}
