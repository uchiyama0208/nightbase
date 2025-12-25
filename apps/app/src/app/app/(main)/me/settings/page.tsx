import type { Metadata } from "next";
import { MeSettingsWrapper } from "./me-settings-wrapper";

export const metadata: Metadata = {
    title: "設定",
};

export default function SettingsPage() {
    return <MeSettingsWrapper />;
}
