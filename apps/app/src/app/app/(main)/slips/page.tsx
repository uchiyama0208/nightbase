import type { Metadata } from "next";
import { SlipsClient } from "./slips-client";

export const metadata: Metadata = {
    title: "伝票",
};

export default function SlipsPage() {
    return <SlipsClient />;
}
