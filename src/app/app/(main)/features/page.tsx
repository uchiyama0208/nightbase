import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabaseServerClient";
import { FeaturesClient } from "./features-client";
import { updateSingleFeature } from "./actions";

async function getFeaturesData() {
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
    .select("store_id, role")
    .eq("id", appUser.current_profile_id)
    .maybeSingle();

  if (!currentProfile?.store_id) {
    redirect("/app/me");
  }

  if (currentProfile.role !== "staff") {
    redirect("/app/dashboard");
  }

  const { data: store } = await supabase
    .from("stores")
    .select("*")
    .eq("id", currentProfile.store_id)
    .single();

  const initialFlags = store
    ? {
      break_enabled: store.break_enabled ?? false,
      show_cast_pickup: store.show_cast_pickup ?? false,
      auto_clock_out_enabled: store.auto_clock_out_enabled ?? false,
      time_rounding_enabled: store.time_rounding_enabled ?? false,
      tablet_timecard_enabled: store.tablet_timecard_enabled ?? false,
      show_dashboard: store.show_dashboard ?? true,
    }
    : {};

  return { initialFlags };
}

function FeaturesSkeleton() {
  return (
    <div className="space-y-4 md:space-y-6 animate-pulse">
      <div className="h-8 w-1/3 bg-gray-200 dark:bg-gray-700 rounded"></div>
      <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
    </div>
  );
}

export default async function FeatureSettingsPage() {
  const data = await getFeaturesData();

  return (
    <Suspense fallback={<FeaturesSkeleton />}>
      <FeaturesClient initialFlags={data.initialFlags} updateFeature={updateSingleFeature} />
    </Suspense>
  );
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
