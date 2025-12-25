import { getAdminCoupons, getAdminPlans } from "../actions";
import { CouponsClient } from "./coupons-client";

export default async function AdminCouponsPage() {
    const [coupons, plans] = await Promise.all([getAdminCoupons(), getAdminPlans()]);

    return <CouponsClient coupons={coupons} plans={plans} />;
}
