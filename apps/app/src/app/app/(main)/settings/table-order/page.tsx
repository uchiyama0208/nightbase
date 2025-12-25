import type { Metadata } from "next";
import { TableOrderSettingsWrapper } from "./table-order-settings-wrapper";

export const metadata: Metadata = {
    title: "テーブル注文設定",
};

export default function TableOrderSettingsPage() {
    return <TableOrderSettingsWrapper />;
}
