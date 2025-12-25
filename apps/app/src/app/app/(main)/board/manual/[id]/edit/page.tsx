import type { Metadata } from "next";
import { EditManualWrapper } from "./edit-manual-wrapper";

export const metadata: Metadata = {
    title: "マニュアルを編集",
};

export default function EditManualPage() {
    return <EditManualWrapper />;
}
