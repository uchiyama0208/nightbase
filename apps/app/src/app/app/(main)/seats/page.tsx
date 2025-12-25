import type { Metadata } from "next";
import { SeatsClient } from "./seats-client";

export const metadata: Metadata = {
    title: "席エディター",
};

export default function SeatsPage() {
    return <SeatsClient canEdit />;
}
