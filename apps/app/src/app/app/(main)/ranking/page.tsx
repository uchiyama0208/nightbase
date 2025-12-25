import type { Metadata } from "next";
import { RankingClient } from "./ranking-client";

export const metadata: Metadata = {
    title: "ランキング",
};

export default function RankingPage() {
    return <RankingClient />;
}
