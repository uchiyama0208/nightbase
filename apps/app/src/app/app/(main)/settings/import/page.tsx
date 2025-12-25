import type { Metadata } from "next";
import { ImportSettingsWrapper } from "./import-settings-wrapper";

export const metadata: Metadata = {
    title: "データインポート",
};

export default function ImportSettingsPage() {
    return <ImportSettingsWrapper />;
}
