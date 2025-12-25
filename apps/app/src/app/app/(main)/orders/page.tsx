import type { Metadata } from "next";
import { OrdersClient } from "./orders-client";

export const metadata: Metadata = {
    title: "注文一覧",
};

export default function OrdersPage() {
    return <OrdersClient />;
}
