import Link from "next/link";

import { createServiceRoleClient } from "@/lib/supabaseServiceClient";
import { tabletClockIn, tabletClockOut } from "./actions";
import { ClockInForm } from "./ClockInForm";

type PageProps = {
  params: Promise<{ storeId: string }>;
  searchParams: Promise<{ mode?: string; profileId?: string; kanaGroup?: string; role?: string }>;
};

type TabletProfile = {
  id: string;
  display_name: string | null;
  display_name_kana: string | null;
  role: string;
};

type TodayCard = {
  id: string;
  user_id: string;
  work_date: string;
  clock_in: string | null;
  clock_out: string | null;
};

function getTodayDate() {
  const now = new Date();
  const jstDate = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jstDate.toISOString().split("T")[0];
}

const kanaGroups = [
  { label: "あ", chars: "あいうえお" },
  { label: "か", chars: "かきくけこ" },
  { label: "さ", chars: "さしすせそ" },
  { label: "た", chars: "たちつてと" },
  { label: "な", chars: "なにぬねの" },
  { label: "は", chars: "はひふへほ" },
  { label: "ま", chars: "まみむめも" },
  { label: "や", chars: "やゆよ" },
  { label: "ら", chars: "らりるれろ" },
  { label: "わ", chars: "わをん" },
];

function getKanaGroupLabel(kana: string | null): string {
  const ch = (kana || "").trim().charAt(0);
  if (!ch) return "その他";
  for (const group of kanaGroups) {
    if (group.chars.includes(ch)) return group.label;
  }
  return "その他";
}

function formatTime(value: string | null): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
}

function parseTimeToMinutes(value: string | null | undefined): number | null {
  if (!value) return null;
  const parts = value.split(":");
  const hour = Number(parts[0] ?? "0");
  const minute = Number(parts[1] ?? "0");
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  return hour * 60 + minute;
}

function isNowWithinAcceptanceWindow(start: string | null | undefined, end: string | null | undefined): boolean {
  const startMinutes = parseTimeToMinutes(start);
  const endMinutes = parseTimeToMinutes(end);

  if (startMinutes === null && endMinutes === null) {
    return true;
  }

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  if (startMinutes === null && endMinutes !== null) {
    return nowMinutes <= endMinutes;
  }

  if (startMinutes !== null && endMinutes === null) {
    return nowMinutes >= startMinutes;
  }

  if (startMinutes !== null && endMinutes !== null) {
    if (startMinutes <= endMinutes) {
      return nowMinutes >= startMinutes && nowMinutes <= endMinutes;
    }
    return nowMinutes >= startMinutes || nowMinutes <= endMinutes;
  }

  return true;
}

export default async function TabletTimecardPage(props: PageProps) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const storeId = params.storeId;
  const modeRaw = searchParams.mode === "clockOut" ? "clockOut" : searchParams.mode === "clockIn" ? "clockIn" : null;
  const selectedProfileId = searchParams.profileId || null;
  const selectedKanaGroup = searchParams.kanaGroup || null;

  const supabase = createServiceRoleClient();

  const { data: storeRow } = await supabase
    .from("stores")
    .select("id, name, tablet_timecard_enabled, tablet_theme, tablet_allowed_roles, tablet_acceptance_start_time, tablet_acceptance_end_time")
    .eq("id", storeId)
    .maybeSingle();

  const store = storeRow as { id: string; name: string; tablet_timecard_enabled: boolean | null; tablet_theme: string | null; tablet_allowed_roles: string[] | null; tablet_acceptance_start_time: string | null; tablet_acceptance_end_time: string | null } | null;

  const isDarkMode = store?.tablet_theme === "dark";
  const bgClass = isDarkMode ? "bg-slate-900 text-white" : "bg-gray-50 text-gray-900";
  const borderClass = isDarkMode ? "border-slate-700" : "border-gray-200";
  const cardBgClass = isDarkMode ? "bg-slate-800" : "bg-white";
  const textMutedClass = isDarkMode ? "text-gray-400" : "text-gray-600";

  if (!store || store.tablet_timecard_enabled === false) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${bgClass}`}>
        <div className="text-center space-y-2">
          <p className="text-lg font-semibold">タブレット用タイムカードは利用できません</p>
          <p className={`text-sm ${textMutedClass}`}>店舗の設定画面でタブレット用タイムカードを有効化してください。</p>
        </div>
      </div>
    );
  }

  const isWithinAcceptance = isNowWithinAcceptanceWindow(
    store.tablet_acceptance_start_time,
    store.tablet_acceptance_end_time,
  );

  if (!isWithinAcceptance) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${bgClass}`}>
        <div className="text-center space-y-2">
          <p className="text-lg font-semibold">現在はタブレット打刻の受付時間外です</p>
          <p className={`text-sm ${textMutedClass}`}>受付時間の設定を確認してください。</p>
        </div>
      </div>
    );
  }

  const today = getTodayDate();
  const allowedRoles = (store?.tablet_allowed_roles as string[] | null) ?? ["staff", "cast"];

  let profileQuery = supabase
    .from("profiles")
    .select("id, display_name, display_name_kana, role")
    .eq("store_id", storeId);

  // Filter by allowed roles
  if (allowedRoles.length > 0) {
    profileQuery = profileQuery.in("role", allowedRoles);
  }

  const { data: profileRows } = await profileQuery;

  const profiles: TabletProfile[] = (profileRows || []) as any;
  const profileMap = new Map<string, TabletProfile>();
  profiles.forEach((p) => profileMap.set(p.id, p));

  const profileIds = profiles.map((p) => p.id);

  let todayCards: TodayCard[] = [];
  if (profileIds.length > 0) {
    const { data: cardRows } = await supabase
      .from("time_cards")
      .select("id, user_id, work_date, clock_in, clock_out")
      .eq("work_date", today)
      .in("user_id", profileIds);

    todayCards = (cardRows || []) as any;
  }

  const pickupHistory: Record<string, string[]> = {};
  if (profileIds.length > 0) {
    const { data: pickupRows } = await supabase
      .from("time_cards")
      .select("user_id, pickup_destination")
      .not("pickup_destination", "is", null)
      .in("user_id", profileIds);

    const rows = (pickupRows || []) as any[];
    for (const row of rows) {
      const userId = row.user_id as string;
      const dest = (row.pickup_destination as string | null)?.trim();
      if (!dest) continue;
      if (!pickupHistory[userId]) {
        pickupHistory[userId] = [];
      }
      if (!pickupHistory[userId].includes(dest)) {
        pickupHistory[userId].push(dest);
      }
    }
  }

  const basePath = `/tablet/timecard/${storeId}`;

  const mode = modeRaw;
  const selectedProfile = selectedProfileId ? profileMap.get(selectedProfileId) || null : null;
  const rawRole = searchParams.role;
  const hasMultipleRoles = allowedRoles.includes("staff") && allowedRoles.includes("cast");
  const selectedRole = typeof rawRole === "string" && allowedRoles.includes(rawRole) ? rawRole : null;

  let step: 1 | 2 | 3 | 4 | 5 = 1;
  if (!mode) {
    step = 1; // Select mode
  } else if (hasMultipleRoles && !selectedRole) {
    step = 2; // Select role
  } else if (mode && !selectedKanaGroup && !selectedProfile) {
    step = 3; // Select kana group
  } else if (mode && selectedKanaGroup && !selectedProfile) {
    step = 4; // Select name from group
  } else if (mode && selectedProfile) {
    step = 5; // Confirm and submit
  }

  const groupedProfiles = () => {
    const groups: { label: string; profiles: TabletProfile[] }[] = [];
    const map = new Map<string, TabletProfile[]>();

    for (const p of profiles) {
      const label = getKanaGroupLabel(p.display_name_kana);
      if (!map.has(label)) {
        map.set(label, []);
      }
      map.get(label)!.push(p);
    }

    for (const k of kanaGroups.map((g) => g.label)) {
      const list = map.get(k);
      if (list && list.length > 0) {
        groups.push({ label: k, profiles: list });
      }
    }

    const other = map.get("その他");
    if (other && other.length > 0) {
      groups.push({ label: "その他", profiles: other });
    }

    return groups;
  };

  const getProfilesForGroup = (groupLabel: string) => {
    return profiles.filter(p => getKanaGroupLabel(p.display_name_kana) === groupLabel);
  };

  return (
    <div className={`min-h-screen ${bgClass} flex flex-col lg:flex-row`}>
      <div className={`w-full lg:w-1/2 border-b lg:border-b-0 lg:border-r ${borderClass} p-6 lg:p-10 flex flex-col`}>

        <div className={`flex-1 overflow-auto rounded-xl ${cardBgClass} border ${borderClass} p-4 lg:p-6`}>
          <h2
            className={`text-lg font-semibold mb-4 text-center ${isDarkMode ? "text-white" : "text-gray-900"
              }`}
          >
            本日の出勤状況
          </h2>
          {todayCards.length === 0 ? (
            <p className={`text-sm ${textMutedClass}`}>まだ本日の打刻はありません。</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr
                    className={`border-b ${borderClass} ${isDarkMode ? "bg-slate-900/40" : "bg-gray-50"
                      }`}
                  >
                    <th className={`text-center py-2 px-3 font-semibold ${textMutedClass} w-1/3`}>名前</th>
                    <th className={`text-center py-2 px-3 font-semibold ${textMutedClass} w-1/3`}>出勤</th>
                    <th className={`text-center py-2 px-3 font-semibold ${textMutedClass} w-1/3`}>退勤</th>
                  </tr>
                </thead>
                <tbody>
                  {todayCards
                    .sort((a, b) => (b.clock_in || "").localeCompare(a.clock_in || ""))
                    .map((card) => {
                      const p = profileMap.get(card.user_id);
                      return (
                        <tr key={card.id} className={`border-b ${isDarkMode ? "border-slate-700 hover:bg-slate-700" : "border-gray-100 hover:bg-gray-50"}`}>
                          <td className="py-2 px-3 font-medium text-center">{p?.display_name || "(不明)"}</td>
                          <td className="py-2 px-3 text-center">{formatTime(card.clock_in)}</td>
                          <td className="py-2 px-3 text-center">{formatTime(card.clock_out)}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="w-full lg:w-1/2 p-6 lg:p-10 flex flex-col gap-6">
        {step === 1 && (
          <div className="flex-1 flex flex-col gap-6">
            <Link
              href={`${basePath}?mode=clockIn`}
              className="flex-1 flex items-center justify-center rounded-2xl bg-blue-500 hover:bg-blue-600 text-white text-5xl font-bold shadow-lg transition-colors"
            >
              出勤する
            </Link>
            <Link
              href={`${basePath}?mode=clockOut`}
              className="flex-1 flex items-center justify-center rounded-2xl bg-rose-500 hover:bg-rose-600 text-white text-5xl font-bold shadow-lg transition-colors"
            >
              退勤する
            </Link>
          </div>
        )}

        {step === 2 && mode && hasMultipleRoles && (
          <div className="flex-1 flex flex-col gap-6">
            <Link
              href={basePath}
              className={`self-start flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${isDarkMode
                ? "bg-slate-700 hover:bg-slate-600 text-white"
                : "bg-gray-200 hover:bg-gray-300 text-gray-900"
                }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              戻る
            </Link>
            <div className="flex-1 flex flex-col gap-6">
              <Link
                href={`${basePath}?mode=${mode}&role=staff`}
                className="flex-1 flex items-center justify-center rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-5xl font-bold shadow-lg transition-colors"
              >
                スタッフで打刻
              </Link>
              <Link
                href={`${basePath}?mode=${mode}&role=cast`}
                className="flex-1 flex items-center justify-center rounded-2xl bg-purple-500 hover:bg-purple-600 text-white text-5xl font-bold shadow-lg transition-colors"
              >
                キャストで打刻
              </Link>
            </div>
          </div>
        )}

        {step === 3 && mode && (
          <div className="flex-1 flex flex-col gap-3">
            <Link
              href={basePath}
              className={`self-start flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${isDarkMode
                ? "bg-slate-700 hover:bg-slate-600 text-white"
                : "bg-gray-200 hover:bg-gray-300 text-gray-900"
                }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              戻る
            </Link>
            <div className="flex-1 flex flex-col gap-2">
              {kanaGroups.map((group) => {
                const count = profiles.filter(p => getKanaGroupLabel(p.display_name_kana) === group.label).length;
                return (
                  <Link
                    key={group.label}
                    href={`${basePath}?mode=${mode}&kanaGroup=${group.label}`}
                    className={`flex-1 px-6 rounded-xl ${cardBgClass} border-2 ${borderClass} hover:border-blue-400 ${isDarkMode ? "hover:bg-slate-700" : "hover:bg-blue-50"
                      } flex items-center justify-between transition-all`}
                  >
                    <div className={`text-xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                      {group.label} 行
                    </div>
                    <div className={`text-sm ${textMutedClass}`}>{count}名</div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {step === 4 && mode && selectedKanaGroup && (
          <div className="flex-1 flex flex-col gap-4">
            <Link
              href={`${basePath}?mode=${mode}`}
              className={`self-start flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${isDarkMode
                ? "bg-slate-700 hover:bg-slate-600 text-white"
                : "bg-gray-200 hover:bg-gray-300 text-gray-900"
                }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              行選択に戻る
            </Link>
            <h2 className={`text-lg font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>{selectedKanaGroup} 行の名前を選択</h2>
            <div className="grid grid-cols-2 gap-3">
              {getProfilesForGroup(selectedKanaGroup).map((p) => (
                <Link
                  key={p.id}
                  href={`${basePath}?mode=${mode}${selectedRole ? `&role=${selectedRole}` : ""}&kanaGroup=${selectedKanaGroup}&profileId=${p.id}`}
                  className={`px-4 py-6 rounded-xl ${cardBgClass} border-2 ${borderClass} hover:border-blue-400 ${isDarkMode ? "hover:bg-slate-700" : "hover:bg-blue-50"
                    } text-center text-lg font-medium transition-all ${isDarkMode ? "text-white" : "text-gray-900"}`}
                >
                  {p.display_name || "(名前未設定)"}
                </Link>
              ))}
            </div>
          </div>
        )}

        {step === 5 && mode && selectedProfile && (
          <div className={`flex-1 flex flex-col rounded-xl ${cardBgClass} border ${borderClass} p-6`}>
            <div className="flex flex-col gap-3 mb-4">
              <Link
                href={`${basePath}?mode=${mode}`}
                className={`self-start flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${isDarkMode
                  ? "bg-slate-700 hover:bg-slate-600 text-white"
                  : "bg-gray-200 hover:bg-gray-300 text-gray-900"
                  }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                名前を変更
              </Link>
              <h2
                className={`text-lg font-semibold ${isDarkMode ? "text-white" : "text-gray-900"
                  }`}
              >
                {mode === "clockIn" ? "出勤情報の確認" : "退勤の確認"}：{selectedProfile.display_name}
              </h2>
            </div>

            {mode === "clockIn" ? (
              <ClockInForm
                storeId={storeId}
                profileId={selectedProfile.id}
                profileName={selectedProfile.display_name || ""}
                pickupHistory={pickupHistory[selectedProfile.id] || []}
                tabletClockIn={tabletClockIn}
                isDarkMode={isDarkMode}
              />
            ) : (
              <form action={tabletClockOut} className="flex-1 flex flex-col">
                <input type="hidden" name="store_id" value={storeId} />
                <input type="hidden" name="profile_id" value={selectedProfile.id} />

                <div className="flex-1"></div>

                <button
                  type="submit"
                  className="mt-4 w-full py-8 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white text-2xl font-bold shadow-lg"
                >
                  退勤する
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
