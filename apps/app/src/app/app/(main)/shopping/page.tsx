import type { Metadata } from "next";
import { ShoppingClient } from "./shopping-client";

export const metadata: Metadata = {
    title: "買い出しリスト",
};

export default function ShoppingPage() {
    return <ShoppingClient />;
}
