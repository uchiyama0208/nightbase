import type { Metadata } from "next";
import { StoreSettingsWrapper } from "./store-settings-wrapper";

export const metadata: Metadata = {
    title: "店舗情報",
};

export default function StoreSettingsPage() {
    return <StoreSettingsWrapper />;
}
