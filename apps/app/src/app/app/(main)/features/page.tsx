import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabaseServerClient";
import { FeaturesClient } from "./features-client";
import { updateSingleFeature } from "./actions";
import { PageTitle } from "@/components/page-title";

async function getFeaturesData() {
  const supabase = await createServerClient() as any;
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
      show_dashboard: store.show_dashboard ?? true,
      show_attendance: store.show_attendance ?? false,
      show_timecard: store.show_timecard ?? false,
      show_users: store.show_users ?? false,
      show_roles: store.show_roles ?? false,
      show_menus: store.show_menus ?? false,
    }
    : {
      show_dashboard: true,
      show_attendance: false,
      show_timecard: false,
      show_users: false,
      show_roles: false,
      show_menus: false,
    };

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
    <div className="space-y-4">
      <PageTitle
        title="機能追加"
        backTab="community"
      />
      <Suspense fallback={<FeaturesSkeleton />}>
        <FeaturesClient initialFlags={data.initialFlags} updateFeature={updateSingleFeature} />
      </Suspense>
    </div>
  );
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
