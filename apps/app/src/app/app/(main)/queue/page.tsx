import type { Metadata } from "next";
import { QueueClient } from "./queue-client";

export const metadata: Metadata = {
    title: "順番待ち管理",
};

export default function QueuePage() {
    return <QueueClient />;
}
