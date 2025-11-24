import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabaseServerClient";
import { AttendanceTable } from "./AttendanceTable";

export const metadata: Metadata = {
	title: "勤怠",
};

async function getAttendanceData(roleParam?: string) {
	const supabase = await createServerClient();
	const { data: { user } } = await supabase.auth.getUser();

	if (!user) {
		redirect("/login");
	}

	const { data: appUser } = await supabase
		.from("users")
		.select("current_profile_id")
		.eq("id", user.id)
		.maybeSingle();

	if (!appUser?.current_profile_id) {
		redirect("/app/me");
	}

	const { data: currentProfile } = await supabase
		.from("profiles")
		.select("store_id")
		.eq("id", appUser.current_profile_id)
		.maybeSingle();

	if (!currentProfile?.store_id) {
		redirect("/app/me");
	}

	const storeId = currentProfile.store_id;
	// Use JST for today's date
	const now = new Date();
	const jstDate = new Date(now.getTime() + 9 * 60 * 60 * 1000);
	const today = jstDate.toISOString().split("T")[0];

	const { data: rawRecords } = await supabase
		.from("time_cards")
		.select("*, profiles!inner(id, display_name, role)")
		.eq("profiles.store_id", storeId)
		.eq("work_date", today)
		.order("clock_in", { ascending: false });

	const { data: allProfiles } = await supabase
		.from("profiles")
		.select("id, display_name, display_name_kana, real_name, role")
		.eq("store_id", storeId)
		.order("display_name");

	const roleFilter = roleParam?.toLowerCase() || "cast";

	// Transform time_cards data to AttendanceRecord format
	const allRecords = (rawRecords || []).map((record: any) => {
		let status = "scheduled";
		if (record.clock_in && !record.clock_out) {
			status = "working";
		} else if (record.clock_in && record.clock_out) {
			status = "finished";
		}

		return {
			id: record.id,
			user_id: record.user_id,
			date: record.work_date,
			status: status,
			start_time: record.scheduled_start_time || null,
			end_time: record.scheduled_end_time || null,
			clock_in: record.clock_in,
			clock_out: record.clock_out,
			clock_in_time: record.clock_in,
			clock_out_time: record.clock_out,
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
					<h1 className="text-xl md:text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
						勤怠
					</h1>
					<p className="mt-2 text-xs md:text-sm text-gray-600 dark:text-gray-400">
						シフトの確認と出勤状況を管理します。
					</p>
				</div>
			</div>

			<Suspense fallback={<AttendanceSkeleton />}>
				<AttendanceTable attendanceRecords={allRecords} profiles={allProfiles} roleFilter={roleFilter} />
			</Suspense>
		</div>
	);
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
