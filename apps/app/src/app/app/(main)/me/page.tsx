import type { Metadata } from "next";
import { MeWrapper } from "./me-wrapper";

export const metadata: Metadata = {
    title: "マイページ",
};

export default function MyPage() {
    return <MeWrapper />;
}
