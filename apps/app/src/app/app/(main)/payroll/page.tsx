import type { Metadata } from "next";
import { PayrollClient } from "./payroll-client";

export const metadata: Metadata = {
    title: "給与",
};

export default function PayrollPage() {
    return <PayrollClient />;
}
