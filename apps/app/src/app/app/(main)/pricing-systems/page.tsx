import type { Metadata } from "next";
import { PricingSystemsWrapper } from "./pricing-systems-wrapper";

export const metadata: Metadata = {
    title: "料金システム",
};

export default function PricingSystemsPage() {
    return <PricingSystemsWrapper />;
}
