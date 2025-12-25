import type { Metadata } from "next";
import { AICreateWrapper } from "./ai-create-wrapper";

export const metadata: Metadata = {
    title: "AI画像生成",
};

export default function AICreatePage() {
    return <AICreateWrapper />;
}
