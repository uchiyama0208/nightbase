"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PickupForm } from "@/components/timecard/pickup-form";

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

type StoreSettings = {
  id: string;
  name: string;
  tablet_theme: string | null;
  tablet_allowed_roles: string[] | null;
};

type TabletTimecardClientProps = {
  storeId: string;
  store: StoreSettings;
  initialProfiles: TabletProfile[];
  initialTodayCards: TodayCard[];
  initialPickupHistory: Record<string, string[]>;
  tabletClockIn: (formData: FormData) => Promise<void>;
  tabletClockOut: (formData: FormData) => Promise<void>;
};

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

function getTodayDate() {
  const now = new Date();
  const jstDate = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jstDate.toISOString().split("T")[0];
}

export function TabletTimecardClient({
  storeId,
  store,
  initialProfiles,
  initialTodayCards,
  initialPickupHistory,
  tabletClockIn,
  tabletClockOut,
}: TabletTimecardClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  
  // State
  const [profiles] = useState<TabletProfile[]>(initialProfiles);
  const [todayCards, setTodayCards] = useState<TodayCard[]>(initialTodayCards);
  const [pickupHistory] = useState<Record<string, string[]>>(initialPickupHistory);
  
  // UI State
  const [mode, setMode] = useState<"clockIn" | "clockOut" | null>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedKanaGroup, setSelectedKanaGroup] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<TabletProfile | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPickupValid, setIsPickupValid] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Theme
  const isDarkMode = store.tablet_theme === "dark";
  const bgClass = isDarkMode ? "bg-slate-900 text-white" : "bg-gray-50 text-gray-900";
  const borderClass = isDarkMode ? "border-slate-700" : "border-gray-200";
  const cardBgClass = isDarkMode ? "bg-slate-800" : "bg-white";
  const textMutedClass = isDarkMode ? "text-gray-400" : "text-gray-600";

  const allowedRoles = store.tablet_allowed_roles ?? ["staff", "cast"];
  const hasMultipleRoles = allowedRoles.includes("staff") && allowedRoles.includes("cast");

  // Profile map for quick lookup
  const profileMap = new Map<string, TabletProfile>();
  profiles.forEach((p) => profileMap.set(p.id, p));

  // Filter profiles by selected role
  const filteredProfiles = selectedRole
    ? profiles.filter(p => p.role === selectedRole)
    : profiles;

  // Calculate step
  let step: 1 | 2 | 3 | 4 | 5 = 1;
  if (!mode) {
    step = 1;
  } else if (hasMultipleRoles && !selectedRole) {
    step = 2;
  } else if (mode && !selectedKanaGroup && !selectedProfile) {
    step = 3;
  } else if (mode && selectedKanaGroup && !selectedProfile) {
    step = 4;
  } else if (mode && selectedProfile) {
    step = 5;
  }

  const getProfilesForGroup = (groupLabel: string) => {
    return filteredProfiles.filter(p => getKanaGroupLabel(p.display_name_kana) === groupLabel);
  };

  const resetToStart = useCallback(() => {
    setMode(null);
    setSelectedRole(null);
    setSelectedKanaGroup(null);
    setSelectedProfile(null);
    setSuccessMessage(null);
  }, []);

  const handleClockIn = async (formData: FormData) => {
    if (!selectedProfile || isSubmitting) return;
    
    setIsSubmitting(true);
    
    // Optimistic update - add card immediately
    const optimisticCard: TodayCard = {
      id: `temp-${Date.now()}`,
      user_id: selectedProfile.id,
      work_date: getTodayDate(),
      clock_in: new Date().toISOString(),
      clock_out: null,
    };
    
    setTodayCards(prev => [optimisticCard, ...prev]);
    setSuccessMessage(`${selectedProfile.display_name}さんの出勤を記録しました`);
    
    // Reset UI immediately
    setTimeout(() => {
      resetToStart();
      setIsSubmitting(false);
    }, 1500);
    
    // Execute server action in background
    startTransition(async () => {
      try {
        await tabletClockIn(formData);
      } catch (error) {
        console.error("Clock in error:", error);
        // Revert optimistic update on error
        setTodayCards(prev => prev.filter(c => c.id !== optimisticCard.id));
      }
    });
  };

  const handleClockOut = async (formData: FormData) => {
    if (!selectedProfile || isSubmitting) return;
    
    setIsSubmitting(true);
    
    // Optimistic update - update card immediately
    setTodayCards(prev => prev.map(card => {
      if (card.user_id === selectedProfile.id && !card.clock_out) {
        return { ...card, clock_out: new Date().toISOString() };
      }
      return card;
    }));
    
    setSuccessMessage(`${selectedProfile.display_name}さんの退勤を記録しました`);
    
    // Reset UI immediately
    setTimeout(() => {
      resetToStart();
      setIsSubmitting(false);
    }, 1500);
    
    // Execute server action in background
    startTransition(async () => {
      try {
        await tabletClockOut(formData);
      } catch (error) {
        console.error("Clock out error:", error);
      }
    });
  };

  // Success message auto-hide
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  return (
    <div className={`min-h-screen ${bgClass} flex flex-col lg:flex-row`}>
      {/* Success Toast */}
      {successMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-4 bg-green-500 text-white rounded-xl shadow-lg text-xl font-bold animate-pulse">
          {successMessage}
        </div>
      )}

      {/* Left Panel - Today's Status */}
      <div className={`w-full lg:w-1/2 border-b lg:border-b-0 lg:border-r ${borderClass} p-6 lg:p-10 flex flex-col`}>
        <div className={`flex-1 overflow-auto rounded-xl ${cardBgClass} border ${borderClass} p-4 lg:p-6`}>
          <h2 className={`text-lg font-semibold mb-4 text-center ${isDarkMode ? "text-white" : "text-gray-900"}`}>
            本日の出勤状況
          </h2>
          {todayCards.length === 0 ? (
            <p className={`text-sm ${textMutedClass}`}>まだ本日の打刻はありません。</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`border-b ${borderClass} ${isDarkMode ? "bg-slate-900/40" : "bg-gray-50"}`}>
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

      {/* Right Panel - Actions */}
      <div className="w-full lg:w-1/2 p-6 lg:p-10 flex flex-col gap-6">
        {/* Step 1: Select Mode */}
        {step === 1 && (
          <div className="flex-1 flex flex-col gap-6">
            <button
              onClick={() => setMode("clockIn")}
              className="flex-1 flex items-center justify-center rounded-2xl bg-blue-500 hover:bg-blue-600 text-white text-5xl font-bold shadow-lg transition-colors"
            >
              出勤する
            </button>
            <button
              onClick={() => setMode("clockOut")}
              className="flex-1 flex items-center justify-center rounded-2xl bg-rose-500 hover:bg-rose-600 text-white text-5xl font-bold shadow-lg transition-colors"
            >
              退勤する
            </button>
          </div>
        )}

        {/* Step 2: Select Role */}
        {step === 2 && mode && hasMultipleRoles && (
          <div className="flex-1 flex flex-col gap-6">
            <button
              onClick={resetToStart}
              className={`self-start flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${isDarkMode ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-gray-200 hover:bg-gray-300 text-gray-900"}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              戻る
            </button>
            <div className="flex-1 flex flex-col gap-6">
              <button
                onClick={() => setSelectedRole("staff")}
                className="flex-1 flex items-center justify-center rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-5xl font-bold shadow-lg transition-colors"
              >
                スタッフで打刻
              </button>
              <button
                onClick={() => setSelectedRole("cast")}
                className="flex-1 flex items-center justify-center rounded-2xl bg-purple-500 hover:bg-purple-600 text-white text-5xl font-bold shadow-lg transition-colors"
              >
                キャストで打刻
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Select Kana Group */}
        {step === 3 && mode && (
          <div className="flex-1 flex flex-col gap-3">
            <button
              onClick={() => {
                if (hasMultipleRoles) {
                  setSelectedRole(null);
                } else {
                  resetToStart();
                }
              }}
              className={`self-start flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${isDarkMode ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-gray-200 hover:bg-gray-300 text-gray-900"}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              戻る
            </button>
            <div className="flex-1 grid grid-cols-5 gap-2">
              {kanaGroups.map((group) => {
                const count = filteredProfiles.filter(p => getKanaGroupLabel(p.display_name_kana) === group.label).length;
                return (
                  <button
                    key={group.label}
                    onClick={() => setSelectedKanaGroup(group.label)}
                    disabled={count === 0}
                    className={`px-4 py-6 rounded-xl ${cardBgClass} border-2 ${borderClass} ${
                      count === 0 
                        ? "opacity-40 cursor-not-allowed" 
                        : `hover:border-blue-400 ${isDarkMode ? "hover:bg-slate-700" : "hover:bg-blue-50"}`
                    } flex flex-col items-center justify-center transition-all`}
                  >
                    <div className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                      {group.label}
                    </div>
                    <div className={`text-sm ${textMutedClass}`}>{count}名</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 4: Select Name */}
        {step === 4 && mode && selectedKanaGroup && (
          <div className="flex-1 flex flex-col gap-4">
            <button
              onClick={() => setSelectedKanaGroup(null)}
              className={`self-start flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${isDarkMode ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-gray-200 hover:bg-gray-300 text-gray-900"}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              行選択に戻る
            </button>
            <h2 className={`text-lg font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
              {selectedKanaGroup} 行の名前を選択
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {getProfilesForGroup(selectedKanaGroup).map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedProfile(p)}
                  className={`px-4 py-6 rounded-xl ${cardBgClass} border-2 ${borderClass} hover:border-blue-400 ${isDarkMode ? "hover:bg-slate-700" : "hover:bg-blue-50"} text-center text-lg font-medium transition-all ${isDarkMode ? "text-white" : "text-gray-900"}`}
                >
                  {p.display_name || "(名前未設定)"}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 5: Confirm and Submit */}
        {step === 5 && mode && selectedProfile && (
          <div className={`flex-1 flex flex-col rounded-xl ${cardBgClass} border ${borderClass} p-6`}>
            <div className="flex flex-col gap-3 mb-4">
              <button
                onClick={() => setSelectedProfile(null)}
                className={`self-start flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${isDarkMode ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-gray-200 hover:bg-gray-300 text-gray-900"}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                名前を変更
              </button>
              <h2 className={`text-lg font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                {mode === "clockIn" ? "出勤情報の確認" : "退勤の確認"}：{selectedProfile.display_name}
              </h2>
            </div>

            {mode === "clockIn" ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  handleClockIn(formData);
                }}
                className="flex-1 flex flex-col"
              >
                <input type="hidden" name="store_id" value={storeId} />
                <input type="hidden" name="profile_id" value={selectedProfile.id} />

                <div className="flex-1 overflow-auto space-y-4">
                  <PickupForm
                    profileId={selectedProfile.id}
                    pickupHistory={pickupHistory[selectedProfile.id] || []}
                    onValidationChange={setIsPickupValid}
                    isDarkMode={isDarkMode}
                  />
                </div>

                <button
                  type="submit"
                  disabled={!isPickupValid || isSubmitting}
                  className={`mt-4 w-full py-8 rounded-2xl text-white text-2xl font-bold shadow-lg transition-colors ${
                    isPickupValid && !isSubmitting
                      ? "bg-blue-500 hover:bg-blue-600 cursor-pointer"
                      : "bg-gray-400 cursor-not-allowed"
                  }`}
                >
                  {isSubmitting ? "処理中..." : "出勤する"}
                </button>
              </form>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  handleClockOut(formData);
                }}
                className="flex-1 flex flex-col"
              >
                <input type="hidden" name="store_id" value={storeId} />
                <input type="hidden" name="profile_id" value={selectedProfile.id} />

                <div className="flex-1"></div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`mt-4 w-full py-8 rounded-2xl text-white text-2xl font-bold shadow-lg transition-colors ${
                    !isSubmitting
                      ? "bg-rose-500 hover:bg-rose-600"
                      : "bg-gray-400 cursor-not-allowed"
                  }`}
                >
                  {isSubmitting ? "処理中..." : "退勤する"}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
