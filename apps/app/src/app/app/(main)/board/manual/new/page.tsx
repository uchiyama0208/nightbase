import type { Metadata } from "next";
import { NewManualWrapper } from "./new-manual-wrapper";

export const metadata: Metadata = {
    title: "新規マニュアル",
};

export default function NewManualPage() {
    return <NewManualWrapper />;
}
