import type { Metadata } from "next";
import { SalesClient } from "./sales-client";

export const metadata: Metadata = {
    title: "売上",
};

export default function SalesPage() {
    return <SalesClient />;
}
