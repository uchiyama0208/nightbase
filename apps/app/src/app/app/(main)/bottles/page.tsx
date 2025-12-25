import type { Metadata } from "next";
import { BottleListClient } from "./bottle-list-client";

export const metadata: Metadata = {
    title: "ボトルキープ管理",
};

export default function BottlesPage() {
    return <BottleListClient />;
}
