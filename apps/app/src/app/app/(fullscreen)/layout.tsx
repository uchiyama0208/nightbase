import { redirect } from "next/navigation";
import { getAppData } from "../data-access";

export default async function FullscreenLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, profile } = await getAppData();

    if (!user) {
        redirect("/login");
    }

    if (profile && (!profile.role || profile.role === "guest")) {
        redirect("/onboarding/pending-approval");
    }

    return (
        <div className="fixed inset-0 bg-gray-50 dark:bg-gray-900">
            {children}
        </div>
    );
}
