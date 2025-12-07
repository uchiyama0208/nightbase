import { createServiceRoleClient } from "@/lib/supabaseServiceClient";
import { tabletClockIn, tabletClockOut } from "./actions";
import { TabletTimecardClient } from "./TabletTimecardClient";

type PageProps = {
  params: Promise<{ storeId: string }>;
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
  return new Date().toLocaleDateString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).replace(/\//g, "-");
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

  // Get current time in JST
  const now = new Date();
  const jstNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
  const nowMinutes = jstNow.getHours() * 60 + jstNow.getMinutes();

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
  const storeId = params.storeId;

  const supabase = createServiceRoleClient() as any;

  // Fetch store settings
  const { data: storeRow } = await supabase
    .from("stores")
    .select("id, name, tablet_timecard_enabled, tablet_theme, tablet_allowed_roles, tablet_acceptance_start_time, tablet_acceptance_end_time")
    .eq("id", storeId)
    .maybeSingle();

  const store = storeRow as { 
    id: string; 
    name: string; 
    tablet_timecard_enabled: boolean | null; 
    tablet_theme: string | null; 
    tablet_allowed_roles: string[] | null; 
    tablet_acceptance_start_time: string | null; 
    tablet_acceptance_end_time: string | null;
  } | null;

  const isDarkMode = store?.tablet_theme === "dark";
  const bgClass = isDarkMode ? "bg-slate-900 text-white" : "bg-gray-50 text-gray-900";
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
  const allowedRoles = store.tablet_allowed_roles ?? ["staff", "cast"];

  // Fetch all profiles at once
  let profileQuery = supabase
    .from("profiles")
    .select("id, display_name, display_name_kana, role")
    .eq("store_id", storeId);

  if (allowedRoles.length > 0) {
    profileQuery = profileQuery.in("role", allowedRoles);
  }

  const { data: profileRows } = await profileQuery;
  const profiles: TabletProfile[] = (profileRows || []) as any;
  const profileIds = profiles.map((p) => p.id);

  // Fetch today's time cards
  let todayCards: TodayCard[] = [];
  if (profileIds.length > 0) {
    const { data: cardRows } = await supabase
      .from("time_cards")
      .select("id, user_id, work_date, clock_in, clock_out")
      .eq("work_date", today)
      .in("user_id", profileIds);

    todayCards = (cardRows || []) as any;
  }

  // Fetch pickup history
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

  return (
    <TabletTimecardClient
      storeId={storeId}
      store={{
        id: store.id,
        name: store.name,
        tablet_theme: store.tablet_theme,
        tablet_allowed_roles: store.tablet_allowed_roles,
      }}
      initialProfiles={profiles}
      initialTodayCards={todayCards}
      initialPickupHistory={pickupHistory}
      tabletClockIn={tabletClockIn}
      tabletClockOut={tabletClockOut}
    />
  );
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
