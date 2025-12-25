import type { Metadata } from "next";
import { ReservationListClient } from "./reservation-list-client";

export const metadata: Metadata = {
    title: "予約管理",
};

export default function ReservationsPage() {
    return <ReservationListClient />;
}
