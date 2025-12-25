import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAppDataWithPermissionCheck } from "@/app/app/data-access";
import { InvitationsWrapper } from "./invitations-wrapper";

export const metadata: Metadata = {
    title: "招待管理",
};

export default async function InvitationsPage() {
    const { hasAccess } = await getAppDataWithPermissionCheck("invitations");

    if (!hasAccess) {
        redirect("/app/me");
    }

    return <InvitationsWrapper />;
}
