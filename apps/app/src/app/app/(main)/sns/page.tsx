import { redirect } from "next/navigation";
import { getSnsPageData } from "./actions";
import { SnsClient } from "./SnsClient";
import { PageTitle } from "@/components/page-title";

export default async function SnsPage() {
    const result = await getSnsPageData();

    if ("redirect" in result) {
        redirect(result.redirect);
    }

    const { data } = result;

    return (
        <div className="space-y-4">
            <PageTitle
                title="SNS"
                backTab="community"
            />
            <SnsClient
                storeId={data.storeId}
                storeName={data.storeName}
                accounts={data.accounts}
                templates={data.templates}
                scheduledPosts={data.scheduledPosts}
                postHistory={data.postHistory}
                recurringSchedules={data.recurringSchedules}
            />
        </div>
    );
}
