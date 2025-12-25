import { getAdminPlans } from "../actions";
import { PlansClient } from "./plans-client";

export default async function AdminPlansPage() {
    const plans = await getAdminPlans();

    return <PlansClient plans={plans} />;
}
