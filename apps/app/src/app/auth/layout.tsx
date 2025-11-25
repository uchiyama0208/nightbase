import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "ログイン処理中 - Nightbase",
    description: "LINE認証を処理しています",
};

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
