import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabaseServerClient";
import { AttendanceTable } from "./AttendanceTable";
import { getAppData } from "../../data-access";

export const metadata: Metadata = {
	title: "勤怠",
};

async function getAttendanceData(roleParam?: string) {
	const { user, profile } = await getAppData();

	if (!user) {
		redirect("/login");
	}

	if (!profile || !profile.store_id) {
		redirect("/app/me");
	}

	const storeId = profile.store_id;

	const supabase = await createServerClient();

	const [rawRecordsResult, allProfilesResult] = await Promise.all([
		supabase
			.from("time_cards")
			.select("*, profiles!inner(id, display_name, role)")
			.eq("profiles.store_id", storeId)
			.order("work_date", { ascending: false })
			.order("clock_in", { ascending: false }),
		supabase
			.from("profiles")
			.select("id, display_name, display_name_kana, real_name, role")
			.eq("store_id", storeId)
			.order("display_name")
	]);

	const rawRecords = rawRecordsResult.data;
	const allProfiles = allProfilesResult.data;

	const roleFilter = roleParam?.toLowerCase() || "cast";

	// Transform time_cards data to AttendanceRecord format
	const allRecords = (rawRecords || []).map((record: any) => {
		let status = "scheduled";
		if (record.clock_in && !record.clock_out) {
			status = "working";
		} else if (record.clock_in && record.clock_out) {
			status = "finished";
		}

		// Use scheduled times if available, otherwise use clock times
		const startTime = record.scheduled_start_time || record.clock_in;
		const endTime = record.scheduled_end_time || record.clock_out;

		return {
			id: record.id,
			user_id: record.user_id,
			date: record.work_date,
			status: status,
			start_time: startTime,
			end_time: endTime,
			clock_in: record.clock_in,
			clock_out: record.clock_out,
			clock_in_time: record.clock_in,
			clock_out_time: record.clock_out,
			pickup_destination: record.pickup_destination,
			isVirtual: false,
		};
	});

	return {
		allRecords,
		allProfiles: allProfiles || [],
		roleFilter,
	};
}

function AttendanceSkeleton() {
	return (
		<div className="space-y-4 animate-pulse">
			<div className="h-8 w-1/3 bg-gray-200 dark:bg-gray-700 rounded"></div>
			<div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
		</div>
	);
}

export default async function AttendancePage({
	searchParams,
}: {
	searchParams: Promise<{ role?: string }>;
}) {
	const params = await searchParams;
	const roleParam = params.role;
	const data = await getAttendanceData(roleParam);
	const { allRecords, allProfiles, roleFilter } = data;

	return (
		<div className="space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <div>
                                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                                                勤怠
                                        </h1>
                                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                                シフトの確認と出勤状況を管理します。
                                        </p>
                                </div>
                        </div>

			<AttendanceTable attendanceRecords={allRecords} profiles={allProfiles} roleFilter={roleFilter} />
		</div>
	);
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
