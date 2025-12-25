import type { Metadata } from "next";
import { MenusClient } from "./menus-client";

export const metadata: Metadata = {
    title: "メニュー管理",
};

export default function MenusPage() {
    return <MenusClient />;
}
