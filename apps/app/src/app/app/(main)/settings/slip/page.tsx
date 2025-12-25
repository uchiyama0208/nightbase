import type { Metadata } from "next";
import { SlipSettingsWrapper } from "./slip-settings-wrapper";

export const metadata: Metadata = {
    title: "伝票設定",
};

export default function SlipSettingsPage() {
    return <SlipSettingsWrapper />;
}
