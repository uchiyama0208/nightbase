import type { Metadata } from "next";
import { UsersPageClient } from "./users-page-client";

export const metadata: Metadata = {
    title: "プロフィール情報",
};

export default function UsersPage() {
    return <UsersPageClient />;
}
