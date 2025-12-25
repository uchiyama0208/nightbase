import type { Metadata } from "next";
import { SnsClientWrapper } from "./sns-client-wrapper";

export const metadata: Metadata = {
    title: "SNS投稿管理",
};

export default function SnsPage() {
    return <SnsClientWrapper />;
}
