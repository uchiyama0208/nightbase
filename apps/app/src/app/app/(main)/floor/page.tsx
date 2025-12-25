import type { Metadata } from "next";
import { FloorClient } from "./floor-client";

export const metadata: Metadata = {
    title: "フロア管理",
};

// ページ遷移を即座に行うため、データ取得はクライアント側で行う
export default function FloorPage() {
    return <FloorClient />;
}
