import { redirect } from "next/navigation";
import { importUsersFromCsv } from "../../users/actions";
import { importAttendanceFromCsv } from "../../attendance/actions";
import { importMenusFromCsv, getMenuCategories } from "../../menus/actions";
import { MenuImportSection } from "./menu-import-section";
import { getAppDataWithPermissionCheck, getAccessDeniedRedirectUrl } from "@/app/app/data-access";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function ImportSettingsPage() {
  const { user, profile, hasAccess } = await getAppDataWithPermissionCheck("settings", "edit");

  if (!user) {
    redirect("/login");
  }

  if (!profile || !profile.store_id) {
    redirect("/app/me");
  }

  if (!hasAccess) {
    redirect(getAccessDeniedRedirectUrl("settings"));
  }

  // Fetch menu categories for the dropdown
  const menuCategories = await getMenuCategories();

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center space-x-4 mb-2">
        <Link
          href="/app/settings"
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </Link>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-1">データインポート（CSV）</h1>
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
            ユーザー情報やタイムカード履歴をCSVから一括で取り込むことができます。
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Users CSV Import */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 md:p-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm md:text-base font-semibold text-gray-900 dark:text-white">ユーザーCSVインポート</h2>
              <p className="mt-1 text-[11px] md:text-xs text-gray-500 dark:text-gray-400">
                display_name, real_name, real_name_kana のヘッダーを持つCSVをアップロードします。下で選択したロールが一括で適用され、同じ表示名が既に存在する行はスキップされます。
              </p>
            </div>
          </div>
          <form
            action={importUsersFromCsv}
            className="flex flex-col gap-2"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <input
                type="file"
                name="file"
                accept=".csv,text/csv"
                required
                className="block w-full text-xs md:text-sm text-gray-700 dark:text-gray-300 file:mr-3 file:rounded-md file:border file:border-gray-200 dark:file:border-gray-600 file:bg-gray-50 dark:file:bg-gray-700 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-gray-700 dark:file:text-gray-200 hover:file:bg-gray-100 dark:hover:file:bg-gray-600"
              />
              <select
                name="userRole"
                defaultValue="cast"
                className="w-full sm:w-auto rounded-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-xs md:text-sm text-gray-700 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="cast">キャストをインポート</option>
                <option value="staff">スタッフをインポート</option>
                <option value="guest">ゲストをインポート</option>
              </select>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="inline-flex justify-center items-center rounded-full bg-blue-600 px-4 py-2 text-xs md:text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
              >
                ユーザーをインポート
              </button>
            </div>
          </form>
        </div>

        {/* Attendance CSV Import */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 md:p-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm md:text-base font-semibold text-gray-900 dark:text-white">勤怠CSVインポート</h2>
              <p className="mt-1 text-[11px] md:text-xs text-gray-500 dark:text-gray-400">
                display_name, date, status, start_time, end_time のヘッダーを持つCSVをアップロードします。店舗内の表示名と、下で選択したロールでユーザーを判定します。
              </p>
            </div>
          </div>
          <form
            action={importAttendanceFromCsv}
            className="flex flex-col gap-2"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <input
                type="file"
                name="file"
                accept=".csv,text/csv"
                required
                className="block w-full text-xs md:text-sm text-gray-700 dark:text-gray-300 file:mr-3 file:rounded-md file:border file:border-gray-200 dark:file:border-gray-600 file:bg-gray-50 dark:file:bg-gray-700 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-gray-700 dark:file:text-gray-200 hover:file:bg-gray-100 dark:hover:file:bg-gray-600"
              />
              <select
                name="attendanceRole"
                defaultValue="cast"
                className="w-full sm:w-auto rounded-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-xs md:text-sm text-gray-700 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="cast">キャストの勤怠をインポート</option>
                <option value="staff">スタッフの勤怠をインポート</option>
              </select>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="inline-flex justify-center items-center rounded-full bg-blue-600 px-4 py-2 text-xs md:text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
              >
                勤怠をインポート
              </button>
            </div>
          </form>
        </div>

        {/* Menu CSV Import */}
        <MenuImportSection categories={menuCategories} importAction={importMenusFromCsv} />
      </div>
    </div>
  );
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
