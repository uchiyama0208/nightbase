import type { Metadata } from "next";
import { RolesPageWrapper } from "./roles-page-wrapper";

export const metadata: Metadata = {
    title: "権限",
};

export default function RolesPage() {
    return <RolesPageWrapper />;
}
