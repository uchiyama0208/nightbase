import { redirect } from "next/navigation";
import { getSubscriptionPageData } from "./actions";
import { SubscriptionClient } from "./subscription-client";

export default async function SubscriptionPage() {
    const data = await getSubscriptionPageData();

    if (!data) {
        redirect("/app/settings");
    }

    return <SubscriptionClient data={data} />;
}
