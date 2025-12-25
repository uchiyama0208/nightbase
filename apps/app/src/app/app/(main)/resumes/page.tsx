import type { Metadata } from "next";
import { ResumesWrapper } from "./resumes-wrapper";

export const metadata: Metadata = {
    title: "履歴書",
};

export default function ResumesPage() {
    return <ResumesWrapper />;
}
