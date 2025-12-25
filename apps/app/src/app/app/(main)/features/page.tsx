import type { Metadata } from "next";
import { FeaturesWrapper } from "./features-wrapper";

export const metadata: Metadata = {
    title: "表示ページ設定",
};

export default function FeaturesPage() {
    return <FeaturesWrapper />;
}
