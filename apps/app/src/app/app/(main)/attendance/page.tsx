import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabaseServerClient";
import { AttendanceTable } from "./AttendanceTable";
import { getAppDataWithPermissionCheck, getAccessDeniedRedirectUrl, hasPagePermission } from "../../data-access";

export const metadata: Metadata = {
	title: "勤怠",
};

async function getAttendanceData(roleParam?: string) {
	const { user, profile, hasAccess, canEdit, permissions } = await getAppDataWithPermissionCheck("attendance", "view");

	if (!user) {
		redirect("/login");
	}

	if (!profile || !profile.store_id) {
		redirect("/app/me");
	}

	if (!hasAccess) {
		redirect(getAccessDeniedRedirectUrl("attendance"));
	}

	const storeId = profile.store_id;

	const supabase = await createServerClient() as any;

	const [rawRecordsResult, allProfilesResult, settingsResult] = await Promise.all([
		supabase
			.from("work_records")
			.select("*, profiles!inner(id, display_name, role)")
			.eq("profiles.store_id", storeId)
			.neq("status", "cancelled")
			.order("work_date", { ascending: false })
			.order("clock_in", { ascending: false }),
		supabase
			.from("profiles")
			.select("id, display_name, display_name_kana, real_name, role, status")
			.eq("store_id", storeId)
			.in("status", ["在籍中", "体入"])
			.order("display_name"),
		supabase
			.from("store_settings")
			.select("day_switch_time")
			.eq("store_id", storeId)
			.single()
	]);

	const rawRecords = rawRecordsResult.data;
	const allProfiles = allProfilesResult.data;
	const daySwitchTime = settingsResult.data?.day_switch_time || "05:00";

	const roleFilter = roleParam?.toLowerCase() || "cast";

	// 現在のJST日時を取得
	const now = new Date();
	const jstNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
	const currentHour = jstNow.getHours();
	const currentMinute = jstNow.getMinutes();

	// 日付切り替え時間をパース
	const [switchHour, switchMinute] = daySwitchTime.split(":").map(Number);

	// 今日の営業日を計算
	let todayBusinessDate = new Date(jstNow);
	if (currentHour < switchHour || (currentHour === switchHour && currentMinute < switchMinute)) {
		todayBusinessDate.setDate(todayBusinessDate.getDate() - 1);
	}
	const todayBusinessDateStr = todayBusinessDate.toLocaleDateString("ja-JP", {
		timeZone: "Asia/Tokyo",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).replace(/\//g, "-");

	// Transform work_records data to AttendanceRecord format
	const allRecords = (rawRecords || []).map((record: any) => {
		let status = "scheduled";
		if (record.clock_in && !record.clock_out) {
			// 出勤中だが、営業日が過去の場合は「退勤忘れ」
			if (record.work_date < todayBusinessDateStr) {
				status = "forgot_clockout";
			} else {
				status = "working";
			}
		} else if (record.clock_in && record.clock_out) {
			status = "finished";
		}

		// Use scheduled times if available, otherwise use clock times
		const startTime = record.scheduled_start_time || record.clock_in;
		const endTime = record.scheduled_end_time || record.clock_out;

		return {
			id: record.id,
			profile_id: record.profile_id,
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

	// 各ページの権限をチェック
	const pagePermissions = {
		bottles: hasPagePermission("bottles", "view", profile, permissions ?? null),
		resumes: hasPagePermission("resumes", "view", profile, permissions ?? null),
		salarySystems: hasPagePermission("salary-systems", "view", profile, permissions ?? null),
		attendance: hasPagePermission("attendance", "view", profile, permissions ?? null),
		personalInfo: hasPagePermission("users-personal-info", "view", profile, permissions ?? null),
	};

	return {
		allRecords,
		allProfiles: allProfiles || [],
		roleFilter,
		canEdit,
		pagePermissions,
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
	const { allRecords, allProfiles, roleFilter, canEdit, pagePermissions } = data;

	return (
		<AttendanceTable attendanceRecords={allRecords} profiles={allProfiles} roleFilter={roleFilter} canEdit={canEdit} pagePermissions={pagePermissions} />
	);
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
