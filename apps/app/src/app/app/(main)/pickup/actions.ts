"use server";

import { createServerClient } from "@/lib/supabaseServerClient";
import { createServiceRoleClient } from "@/lib/supabaseServiceClient";
import { revalidatePath } from "next/cache";
import OpenAI from "openai";
import { getBusinessDate } from "../queue/utils";

export interface PickupRouteWithPassengers {
    id: string;
    store_id: string;
    date: string;
    driver_profile_id: string | null;
    driver_name: string | null;
    round_trips: number;
    capacity: number;
    departure_time: string | null;
    return_departure_time: string | null;
    avoid_highways: boolean;
    avoid_tolls: boolean;
    passengers: {
        id: string;
        cast_profile_id: string;
        cast_name: string;
        trip_number: number;
        order_index: number;
        pickup_destination: string | null;
    }[];
}

export interface TodayAttendee {
    profile_id: string;
    display_name: string;
    display_name_kana: string | null;
    pickup_destination: string | null;
    start_time: string | null;
    role: string;
}

export interface StoreLocation {
    name: string;
    latitude: number | null;
    longitude: number | null;
    address: string | null;
}

export async function getPickupData(dateParam?: string): Promise<
    | { redirect: string }
    | {
          data: {
              routes: PickupRouteWithPassengers[];
              todayAttendees: TodayAttendee[];
              staffProfiles: { id: string; display_name: string; display_name_kana: string | null; role: string }[];
              allProfiles: { id: string; display_name: string | null; real_name: string | null; role: string }[];
              currentProfileId: string;
              targetDate: string;
              storeId: string;
              storeLocation: StoreLocation;
              daySwitchTime: string;
          };
      }
> {
    const supabase = await createServerClient() as any;
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { redirect: "/login" };
    }

    // Resolve current profile
    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    if (!appUser?.current_profile_id) {
        return { redirect: "/app/me" };
    }

    const { data: currentProfile } = await supabase
        .from("profiles")
        .select("id, store_id, role")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    if (!currentProfile || !currentProfile.store_id) {
        return { redirect: "/app/me" };
    }

    // Staff and admin only
    if (currentProfile.role !== "staff" && currentProfile.role !== "admin") {
        return { redirect: "/app/timecard" };
    }

    // 店舗情報と設定を取得
    const [{ data: storeInfo }, { data: storeSettings }] = await Promise.all([
        supabase
            .from("stores")
            .select("name, latitude, longitude, prefecture, city, address_line1, address_line2")
            .eq("id", currentProfile.store_id)
            .single(),
        supabase
            .from("store_settings")
            .select("day_switch_time")
            .eq("store_id", currentProfile.store_id)
            .single(),
    ]);

    const daySwitchTime = storeSettings?.day_switch_time || "05:00";

    // 店舗位置情報
    const storeLocation = {
        name: storeInfo?.name || "店舗",
        latitude: storeInfo?.latitude || null,
        longitude: storeInfo?.longitude || null,
        address: [
            storeInfo?.prefecture,
            storeInfo?.city,
            storeInfo?.address_line1,
            storeInfo?.address_line2,
        ].filter(Boolean).join("") || null,
    };
    const targetDate = dateParam || getBusinessDate(daySwitchTime);
    const serviceSupabase = createServiceRoleClient() as any;

    // Get all profiles in the store (在籍中・体入のみ)
    const { data: storeProfiles } = await supabase
        .from("profiles")
        .select("id, display_name, display_name_kana, real_name, role, status")
        .eq("store_id", currentProfile.store_id)
        .in("status", ["在籍中", "体入"]);

    const profileMap: Record<string, { display_name: string; display_name_kana: string | null; role: string }> = {};
    for (const p of storeProfiles || []) {
        profileMap[p.id] = {
            display_name: p.display_name || "不明",
            display_name_kana: p.display_name_kana || null,
            role: p.role || "cast",
        };
    }

    // 営業日に該当するwork_dateを計算
    // 営業日 = targetDate の場合、work_date は targetDate または targetDate+1（深夜帯）
    // 例: day_switch_time=05:00, 営業日=12/13 → work_date=12/13(05:00以降) or 12/14(05:00未満)
    const targetDateObj = new Date(targetDate + "T00:00:00+09:00");
    const nextDateObj = new Date(targetDateObj);
    nextDateObj.setDate(nextDateObj.getDate() + 1);
    const nextDate = nextDateObj.toLocaleDateString("ja-JP", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).replace(/\//g, "-");

    // Get work_records for both dates (business day spans two calendar dates)
    const { data: workRecords } = await serviceSupabase
        .from("work_records")
        .select("profile_id, pickup_destination, clock_in, scheduled_start_time, work_date, status")
        .in("work_date", [targetDate, nextDate])
        .in("profile_id", Object.keys(profileMap));

    // day_switch_time をパース
    const switchParts = daySwitchTime.split(":");
    const switchHour = parseInt(switchParts[0], 10) || 5;
    const switchMinute = parseInt(switchParts[1], 10) || 0;

    // 営業日に該当するレコードのみフィルタ
    const filteredWorkRecords = (workRecords || []).filter((wr: any) => {
        if (!wr.clock_in) return false;
        if (["cancelled", "completed"].includes(wr.status)) return false;
        const clockInDate = new Date(wr.clock_in);
        const clockInJST = new Date(clockInDate.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
        const clockInHour = clockInJST.getHours();
        const clockInMinute = clockInJST.getMinutes();
        const clockInDateStr = clockInJST.toLocaleDateString("ja-JP", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        }).replace(/\//g, "-");

        // 切り替え時間以降 → その日が営業日
        // 切り替え時間未満 → 前日が営業日
        if (clockInHour > switchHour || (clockInHour === switchHour && clockInMinute >= switchMinute)) {
            // 切り替え時間以降: clock_inの日付 = 営業日
            return clockInDateStr === targetDate;
        } else {
            // 切り替え時間未満: clock_inの日付の前日 = 営業日
            const prevDate = new Date(clockInJST);
            prevDate.setDate(prevDate.getDate() - 1);
            const prevDateStr = prevDate.toLocaleDateString("ja-JP", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
            }).replace(/\//g, "-");
            return prevDateStr === targetDate;
        }
    });

    // pickup_destinationが設定されている出勤者を全て取得（role問わず）
    // 同じユーザーが複数のwork_recordsを持つ場合は最新のものを使用
    const attendeeMap = new Map<string, TodayAttendee>();
    for (const wr of filteredWorkRecords) {
        if (!wr.pickup_destination) continue;
        const existing = attendeeMap.get(wr.profile_id);
        // 既存のレコードがない、または新しいclock_inの場合は上書き
        if (!existing || (wr.clock_in && (!existing.start_time || wr.clock_in > existing.start_time))) {
            attendeeMap.set(wr.profile_id, {
                profile_id: wr.profile_id,
                display_name: profileMap[wr.profile_id]?.display_name || "不明",
                display_name_kana: profileMap[wr.profile_id]?.display_name_kana || null,
                pickup_destination: wr.pickup_destination,
                start_time: wr.scheduled_start_time || wr.clock_in,
                role: profileMap[wr.profile_id]?.role || "cast",
            });
        }
    }
    const todayAttendees: TodayAttendee[] = Array.from(attendeeMap.values());

    // Get staff and partners for driver selection
    const staffProfiles = (storeProfiles || []).filter(
        (p) => p.role === "staff" || p.role === "admin" || p.role === "partner"
    );

    // Get pickup routes for the date
    const { data: routes } = await supabase
        .from("pickup_routes")
        .select("*")
        .eq("store_id", currentProfile.store_id)
        .eq("date", targetDate);

    const routesWithPassengers: PickupRouteWithPassengers[] = [];

    for (const route of routes || []) {
        const { data: passengers } = await supabase
            .from("pickup_passengers")
            .select("*")
            .eq("route_id", route.id)
            .order("trip_number", { ascending: true })
            .order("order_index", { ascending: true });

        // Get pickup_destination from work_records for each passenger
        const passengersWithDestination = (passengers || []).map((p: any) => {
            const attendee = todayAttendees.find((a) => a.profile_id === p.cast_profile_id);
            return {
                id: p.id,
                cast_profile_id: p.cast_profile_id,
                cast_name: profileMap[p.cast_profile_id]?.display_name || "不明",
                trip_number: p.trip_number,
                order_index: p.order_index,
                pickup_destination: attendee?.pickup_destination || null,
            };
        });

        routesWithPassengers.push({
            id: route.id,
            store_id: route.store_id,
            date: route.date,
            driver_profile_id: route.driver_profile_id,
            driver_name: route.driver_profile_id
                ? profileMap[route.driver_profile_id]?.display_name || "不明"
                : null,
            round_trips: route.round_trips,
            capacity: route.capacity,
            departure_time: route.departure_time,
            return_departure_time: route.return_departure_time,
            avoid_highways: route.avoid_highways ?? false,
            avoid_tolls: route.avoid_tolls ?? false,
            passengers: passengersWithDestination,
        });
    }

    return {
        data: {
            routes: routesWithPassengers,
            todayAttendees,
            staffProfiles: staffProfiles.map((p) => ({
                id: p.id,
                display_name: p.display_name || "不明",
                display_name_kana: p.display_name_kana || null,
                role: p.role || "staff",
            })),
            allProfiles: (storeProfiles || []).map((p) => ({
                id: p.id,
                display_name: p.display_name || null,
                real_name: p.real_name || null,
                role: p.role || "cast",
            })),
            currentProfileId: currentProfile.id,
            targetDate,
            storeId: currentProfile.store_id,
            storeLocation,
            daySwitchTime,
        },
    };
}

export async function createPickupRoute(formData: FormData) {
    const supabase = await createServerClient() as any;
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("User not authenticated");
    }

    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    if (!appUser?.current_profile_id) {
        throw new Error("No active profile found for current user");
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("store_id, role")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    const storeId = formData.get("storeId") as string;
    const date = formData.get("date") as string;
    const driverProfileId = formData.get("driverProfileId") as string | null;
    const roundTrips = parseInt(formData.get("roundTrips") as string) || 0;
    const capacity = parseInt(formData.get("capacity") as string) || 3;
    const departureTime = formData.get("departureTime") as string | null;
    const avoidHighways = formData.get("avoidHighways") === "true";
    const avoidTolls = formData.get("avoidTolls") === "true";
    const passengersJson = formData.get("passengers") as string;

    interface PassengerInput {
        cast_profile_id: string;
        trip_number: number;
        order_index: number;
    }

    const passengers: PassengerInput[] = passengersJson ? JSON.parse(passengersJson) : [];

    // 権限・店舗チェック
    if (!profile || !profile.store_id || (profile.role !== "staff" && profile.role !== "admin")) {
        throw new Error("Unauthorized to create pickup route");
    }
    if (profile.store_id !== storeId) {
        throw new Error("Invalid store for pickup route");
    }

    // Create route
    const { data: route, error: routeError } = await supabase
        .from("pickup_routes")
        .insert({
            store_id: storeId,
            date,
            driver_profile_id: driverProfileId || null,
            round_trips: roundTrips,
            capacity,
            departure_time: departureTime || null,
            avoid_highways: avoidHighways,
            avoid_tolls: avoidTolls,
        })
        .select()
        .single();

    if (routeError) {
        console.error("Error creating pickup route:", routeError);
        throw new Error("送迎ルートの作成に失敗しました");
    }

    // Create passengers
    if (passengers.length > 0) {
        // 同じ店舗の他のルートから、追加するキャストを削除
        const castIds = passengers.map((p) => p.cast_profile_id);
        const { data: otherRoutes } = await supabase
            .from("pickup_routes")
            .select("id")
            .eq("store_id", storeId)
            .eq("date", date)
            .neq("id", route.id);

        if (otherRoutes && otherRoutes.length > 0) {
            const otherRouteIds = otherRoutes.map((r) => r.id);
            await supabase
                .from("pickup_passengers")
                .delete()
                .in("route_id", otherRouteIds)
                .in("cast_profile_id", castIds);
        }

        const passengerInserts = passengers.map((p) => ({
            route_id: route.id,
            cast_profile_id: p.cast_profile_id,
            trip_number: p.trip_number,
            order_index: p.order_index,
        }));

        const { error: passengersError } = await supabase
            .from("pickup_passengers")
            .insert(passengerInserts);

        if (passengersError) {
            console.error("Error creating passengers:", passengersError);
            throw new Error("乗車キャストの登録に失敗しました");
        }
    }

    revalidatePath("/app/pickup");
    return { success: true, routeId: route.id };
}

export async function updatePickupRoute(formData: FormData) {
    const supabase = await createServerClient() as any;
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("User not authenticated");
    }

    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    if (!appUser?.current_profile_id) {
        throw new Error("No active profile found for current user");
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("store_id, role")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    const routeId = formData.get("routeId") as string;
    const driverProfileId = formData.get("driverProfileId") as string | null;
    const roundTrips = parseInt(formData.get("roundTrips") as string) || 0;
    const capacity = parseInt(formData.get("capacity") as string) || 3;
    const departureTime = formData.get("departureTime") as string | null;
    const returnDepartureTime = formData.get("returnDepartureTime") as string | null;
    const avoidHighways = formData.get("avoidHighways") === "true";
    const avoidTolls = formData.get("avoidTolls") === "true";
    const passengersJson = formData.get("passengers") as string;

    interface PassengerInput {
        cast_profile_id: string;
        trip_number: number;
        order_index: number;
    }

    const passengers: PassengerInput[] = passengersJson ? JSON.parse(passengersJson) : [];

    // 既存ルートを取得し、店舗と権限をチェック
    const { data: existingRoute } = await supabase
        .from("pickup_routes")
        .select("store_id, date")
        .eq("id", routeId)
        .maybeSingle();

    if (
        !profile ||
        !existingRoute ||
        !profile.store_id ||
        profile.store_id !== existingRoute.store_id ||
        (profile.role !== "staff" && profile.role !== "admin")
    ) {
        throw new Error("Unauthorized to update pickup route");
    }

    // Get route info for store_id and date
    const { data: currentRoute } = await supabase
        .from("pickup_routes")
        .select("store_id, date")
        .eq("id", routeId)
        .single();

    if (!currentRoute) {
        throw new Error("ルートが見つかりません");
    }

    // Update route
    const { error: routeError } = await supabase
        .from("pickup_routes")
        .update({
            driver_profile_id: driverProfileId || null,
            round_trips: roundTrips,
            capacity,
            departure_time: departureTime || null,
            return_departure_time: returnDepartureTime || null,
            avoid_highways: avoidHighways,
            avoid_tolls: avoidTolls,
            updated_at: new Date().toISOString(),
        })
        .eq("id", routeId);

    if (routeError) {
        console.error("Error updating pickup route:", routeError);
        throw new Error("送迎ルートの更新に失敗しました");
    }

    // Delete existing passengers and re-insert
    await supabase
        .from("pickup_passengers")
        .delete()
        .eq("route_id", routeId);

    if (passengers.length > 0) {
        // 同じ店舗の他のルートから、追加するキャストを削除
        const castIds = passengers.map((p) => p.cast_profile_id);
        const { data: otherRoutes } = await supabase
            .from("pickup_routes")
            .select("id")
            .eq("store_id", currentRoute.store_id)
            .eq("date", currentRoute.date)
            .neq("id", routeId);

        if (otherRoutes && otherRoutes.length > 0) {
            const otherRouteIds = otherRoutes.map((r) => r.id);
            await supabase
                .from("pickup_passengers")
                .delete()
                .in("route_id", otherRouteIds)
                .in("cast_profile_id", castIds);
        }

        const passengerInserts = passengers.map((p) => ({
            route_id: routeId,
            cast_profile_id: p.cast_profile_id,
            trip_number: p.trip_number,
            order_index: p.order_index,
        }));

        const { error: passengersError } = await supabase
            .from("pickup_passengers")
            .insert(passengerInserts);

        if (passengersError) {
            console.error("Error updating passengers:", passengersError);
            throw new Error("乗車キャストの更新に失敗しました");
        }
    }

    revalidatePath("/app/pickup");
    return { success: true };
}

export async function deletePickupRoute(routeId: string) {
    const supabase = await createServerClient() as any;
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("User not authenticated");
    }

    const { error } = await supabase
        .from("pickup_routes")
        .delete()
        .eq("id", routeId);

    if (error) {
        console.error("Error deleting pickup route:", error);
        throw new Error("送迎ルートの削除に失敗しました");
    }

    revalidatePath("/app/pickup");
    return { success: true };
}

// 「1から作る」モード用の送迎車設定
interface VehicleConfig {
    id: string;
    driverProfileId: string;
    driverName: string;
    capacity: number;
    roundTrips: number;
}

export async function getAIPickupSuggestion(
    storeId: string,
    date: string,
    attendees: TodayAttendee[],
    existingRoutes: PickupRouteWithPassengers[],
    userMessage?: string,
    vehicleConfigs?: VehicleConfig[],
    storeAddress?: string
) {
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    const attendeesInfo = attendees
        .filter((a) => a.pickup_destination)
        .map((a) => `- ${a.display_name}: ${a.pickup_destination}`)
        .join("\n");

    // 「1から作る」モードの場合は vehicleConfigs を使用
    let routesInfo: string;
    if (vehicleConfigs && vehicleConfigs.length > 0) {
        routesInfo = vehicleConfigs.map((v, idx) => {
            return `送迎車${idx + 1}(${v.driverName || "未定"}): 人数上限${v.capacity}名, 戻り回数${v.roundTrips}`;
        }).join("\n");
    } else {
        routesInfo = existingRoutes.map((r) => {
            const passengersList = r.passengers
                .map((p) => `${p.cast_name}(${p.pickup_destination || "未設定"})`)
                .join(", ");
            return `送迎車${r.driver_name || "未定"}: 人数上限${r.capacity}名, 戻り回数${r.round_trips}, 乗車者: ${passengersList || "なし"}`;
        }).join("\n");
    }

    const storeInfo = storeAddress ? `店舗所在地（出発地点）: ${storeAddress}` : "";

    const systemPrompt = `あなたは送迎ルート最適化アシスタントです。
キャストの送迎先情報を元に、最も効率的な送迎ルートを提案してください。

重要: 送迎は必ず店舗から出発します。店舗を起点として、各送迎先への最適なルートを計算してください。

考慮すべき点:
1. 店舗を出発地点として、地理的に効率的な順序で送迎先を回る
2. 地理的に近い送迎先をグループ化
3. 各送迎車の人数上限を守る
4. 戻り回数がある場合は複数便に分ける（店舗に戻ってから次の便を出す）
5. 効率的なルート順序（店舗から近い順、または同じ方向をまとめる）
6. 指定された送迎車の設定（人数上限、戻り回数）を必ず守ること

回答は以下のJSON形式で返してください:
{
  "routes": [
    {
      "driver_name": "ドライバー名または空",
      "capacity": 3,
      "round_trips": 0,
      "trips": [
        {
          "trip_number": 1,
          "passengers": [
            { "name": "キャスト名", "destination": "送迎先" }
          ]
        }
      ]
    }
  ],
  "explanation": "提案の理由を簡潔に説明（店舗からの効率的なルートについて言及）"
}`;

    const userPrompt = userMessage
        ? `${userMessage}\n\n${storeInfo}\n\n現在の出勤者と送迎先:\n${attendeesInfo}\n\n送迎車の設定:\n${routesInfo || "なし"}`
        : `以下の出勤者の送迎ルートを最適化してください。\n\n${storeInfo}\n\n出勤者と送迎先:\n${attendeesInfo}\n\n送迎車の設定:\n${routesInfo || "なし"}`;

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
            response_format: { type: "json_object" },
            temperature: 0.7,
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error("AI応答が空でした");
        }

        return JSON.parse(content);
    } catch (error) {
        console.error("AI suggestion error:", error);
        throw new Error("AI提案の取得に失敗しました");
    }
}

export async function addPassengerToRoute(
    routeId: string,
    castProfileId: string
) {
    const supabase = await createServerClient() as any;
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("User not authenticated");
    }

    // Get max order_index for trip_number 1
    const { data: existingPassengers } = await supabase
        .from("pickup_passengers")
        .select("order_index")
        .eq("route_id", routeId)
        .eq("trip_number", 1)
        .order("order_index", { ascending: false })
        .limit(1);

    const nextOrderIndex = existingPassengers && existingPassengers.length > 0
        ? existingPassengers[0].order_index + 1
        : 0;

    const { error } = await supabase
        .from("pickup_passengers")
        .insert({
            route_id: routeId,
            cast_profile_id: castProfileId,
            trip_number: 1,
            order_index: nextOrderIndex,
        });

    if (error) {
        console.error("Error adding passenger:", error);
        throw new Error("キャストの追加に失敗しました");
    }

    revalidatePath("/app/pickup");
    return { success: true };
}

export async function removePassengerFromRoute(
    routeId: string,
    castProfileId: string
) {
    const supabase = await createServerClient() as any;
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("User not authenticated");
    }

    const { error } = await supabase
        .from("pickup_passengers")
        .delete()
        .eq("route_id", routeId)
        .eq("cast_profile_id", castProfileId);

    if (error) {
        console.error("Error removing passenger:", error);
        throw new Error("キャストの削除に失敗しました");
    }

    revalidatePath("/app/pickup");
    return { success: true };
}

export async function applyAISuggestion(
    storeId: string,
    date: string,
    suggestion: any,
    staffProfiles: { id: string; display_name: string }[],
    attendees: TodayAttendee[],
    deleteExisting: boolean = true
) {
    const supabase = await createServerClient() as any;
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("User not authenticated");
    }

    if (deleteExisting) {
        // 「1から作る」モード: 既存ルートを全て削除
        await supabase
            .from("pickup_routes")
            .delete()
            .eq("store_id", storeId)
            .eq("date", date);

        // Create new routes from suggestion
        for (const routeSuggestion of suggestion.routes || []) {
            // Find driver profile id by name
            let driverProfileId: string | null = null;
            if (routeSuggestion.driver_name) {
                const staff = staffProfiles.find(
                    (s) => s.display_name === routeSuggestion.driver_name
                );
                if (staff) {
                    driverProfileId = staff.id;
                }
            }

            const { data: route, error: routeError } = await supabase
                .from("pickup_routes")
                .insert({
                    store_id: storeId,
                    date,
                    driver_profile_id: driverProfileId,
                    round_trips: routeSuggestion.round_trips || 0,
                    capacity: routeSuggestion.capacity || 3,
                })
                .select()
                .single();

            if (routeError) {
                console.error("Error creating route from suggestion:", routeError);
                continue;
            }

            // Create passengers for each trip
            const passengerInserts: any[] = [];
            for (const trip of routeSuggestion.trips || []) {
                let orderIndex = 0;
                for (const passenger of trip.passengers || []) {
                    // Find profile id by name
                    const attendee = attendees.find(
                        (a) => a.display_name === passenger.name
                    );
                    if (attendee) {
                        passengerInserts.push({
                            route_id: route.id,
                            cast_profile_id: attendee.profile_id,
                            trip_number: trip.trip_number,
                            order_index: orderIndex++,
                        });
                    }
                }
            }

            if (passengerInserts.length > 0) {
                await supabase.from("pickup_passengers").insert(passengerInserts);
            }
        }
    } else {
        // 既存ルートモード: 既存ルートの乗客だけを更新
        const { data: existingRoutes } = await supabase
            .from("pickup_routes")
            .select("id, driver_profile_id")
            .eq("store_id", storeId)
            .eq("date", date)
            .order("created_at", { ascending: true });

        if (!existingRoutes || existingRoutes.length === 0) {
            throw new Error("既存の送迎ルートがありません");
        }

        // 提案のルートと既存ルートをマッチング（順番で）
        for (let i = 0; i < (suggestion.routes || []).length; i++) {
            const routeSuggestion = suggestion.routes[i];
            const existingRoute = existingRoutes[i];

            if (!existingRoute) {
                // 既存ルートが足りない場合はスキップ
                console.warn("Not enough existing routes for suggestion");
                continue;
            }

            // 既存の乗客を削除
            await supabase
                .from("pickup_passengers")
                .delete()
                .eq("route_id", existingRoute.id);

            // 新しい乗客を追加
            const passengerInserts: any[] = [];
            for (const trip of routeSuggestion.trips || []) {
                let orderIndex = 0;
                for (const passenger of trip.passengers || []) {
                    const attendee = attendees.find(
                        (a) => a.display_name === passenger.name
                    );
                    if (attendee) {
                        passengerInserts.push({
                            route_id: existingRoute.id,
                            cast_profile_id: attendee.profile_id,
                            trip_number: trip.trip_number,
                            order_index: orderIndex++,
                        });
                    }
                }
            }

            if (passengerInserts.length > 0) {
                await supabase.from("pickup_passengers").insert(passengerInserts);
            }
        }
    }

    revalidatePath("/app/pickup");
    return { success: true };
}

/**
 * ルート内の乗客の順番を更新
 */
export async function updatePassengerOrder(
    routeId: string,
    passengers: { cast_profile_id: string; order_index: number }[]
) {
    const supabase = await createServerClient() as any;
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("User not authenticated");
    }

    // 各乗客のorder_indexを更新
    for (const passenger of passengers) {
        const { error } = await supabase
            .from("pickup_passengers")
            .update({ order_index: passenger.order_index })
            .eq("route_id", routeId)
            .eq("cast_profile_id", passenger.cast_profile_id);

        if (error) {
            console.error("Error updating passenger order:", error);
            throw new Error("順番の更新に失敗しました");
        }
    }

    revalidatePath("/app/pickup");
    return { success: true };
}

/**
 * ルートの所要時間を計算（Google Maps Directions API使用）
 */
export interface RouteCalculationResult {
    totalDurationMinutes: number;
    totalDistanceKm: number;
    returnDurationMinutes: number; // 最終目的地から店舗に戻る時間
    returnDistanceKm: number;
    departureTimestamp: number; // 出発時刻のUnixタイムスタンプ（ミリ秒）
    arrivalTimestamp: number; // 店舗帰還時刻のUnixタイムスタンプ（ミリ秒）
    legs: {
        from: string;
        to: string;
        durationMinutes: number;
        distanceKm: number;
    }[];
    estimatedArrivalTimes: {
        destination: string;
        arrivalTime: string | null;
    }[];
}

export async function calculateRouteDuration(
    storeAddress: string,
    destinations: string[],
    departureTime: string | null,
    avoidHighways: boolean,
    avoidTolls: boolean,
    departureTimestamp?: number // オプション: 出発時刻のタイムスタンプ（ミリ秒）。戻り便用
): Promise<RouteCalculationResult | null> {
    if (!destinations.length || !storeAddress) {
        return null;
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
        console.error("Google Maps API key not configured");
        return null;
    }

    try {
        // Build waypoints for multi-destination route
        const origin = encodeURIComponent(storeAddress);
        const destination = encodeURIComponent(destinations[destinations.length - 1]);

        // All destinations except the last one become waypoints
        const waypoints = destinations.slice(0, -1).map(d => encodeURIComponent(d)).join("|");

        // Build avoid parameter
        const avoidParams: string[] = [];
        if (avoidHighways) avoidParams.push("highways");
        if (avoidTolls) avoidParams.push("tolls");
        const avoidStr = avoidParams.length > 0 ? `&avoid=${avoidParams.join("|")}` : "";

        // Build departure_time parameter
        let departureTimeUnix: number;
        if (departureTimestamp) {
            // 戻り便用: 前の便の帰還時刻を使用
            departureTimeUnix = Math.floor(departureTimestamp / 1000);
        } else if (departureTime) {
            // Parse departure time (HH:mm format) and set to today's date in JST
            const [hours, minutes] = departureTime.split(":").map(Number);
            const now = new Date();
            const jstNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
            jstNow.setHours(hours, minutes, 0, 0);

            // If the time is in the past, use tomorrow
            if (jstNow.getTime() < now.getTime()) {
                jstNow.setDate(jstNow.getDate() + 1);
            }
            departureTimeUnix = Math.floor(jstNow.getTime() / 1000);
        } else {
            // Use current time if not specified
            departureTimeUnix = Math.floor(Date.now() / 1000);
        }

        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}${waypoints ? `&waypoints=${waypoints}` : ""}&departure_time=${departureTimeUnix}${avoidStr}&key=${apiKey}&language=ja`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.status !== "OK" || !data.routes?.[0]) {
            console.error("Directions API error:", data.status);
            return null;
        }

        const route = data.routes[0];
        const legs = route.legs || [];

        let totalDurationMinutes = 0;
        let totalDistanceKm = 0;
        const legResults: RouteCalculationResult["legs"] = [];
        const estimatedArrivalTimes: RouteCalculationResult["estimatedArrivalTimes"] = [];

        // Calculate departure timestamp for arrival time calculation
        const startTimestamp = departureTimeUnix * 1000;
        let currentTimestamp = startTimestamp;

        for (let i = 0; i < legs.length; i++) {
            const leg = legs[i];
            const durationMinutes = Math.round((leg.duration_in_traffic?.value || leg.duration?.value || 0) / 60);
            const distanceKm = Math.round((leg.distance?.value || 0) / 100) / 10;

            totalDurationMinutes += durationMinutes;
            totalDistanceKm += distanceKm;

            legResults.push({
                from: i === 0 ? "店舗" : destinations[i - 1],
                to: destinations[i],
                durationMinutes,
                distanceKm,
            });

            // Calculate arrival time for this destination
            currentTimestamp += durationMinutes * 60 * 1000;
            const arrivalDate = new Date(currentTimestamp);
            const arrivalTime = arrivalDate.toLocaleTimeString("ja-JP", {
                timeZone: "Asia/Tokyo",
                hour: "2-digit",
                minute: "2-digit",
            });

            estimatedArrivalTimes.push({
                destination: destinations[i],
                arrivalTime: (departureTime || departureTimestamp) ? arrivalTime : null,
            });
        }

        // 最終目的地の到着時刻（全員降車後）
        const lastDestinationArrivalTimestamp = currentTimestamp;

        // 帰還ルートを計算（最終目的地 → 店舗）
        let returnDurationMinutes = 0;
        let returnDistanceKm = 0;

        const returnUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(destinations[destinations.length - 1])}&destination=${origin}&departure_time=${Math.floor(lastDestinationArrivalTimestamp / 1000)}${avoidStr}&key=${apiKey}&language=ja`;

        const returnResponse = await fetch(returnUrl);
        const returnData = await returnResponse.json();

        if (returnData.status === "OK" && returnData.routes?.[0]?.legs?.[0]) {
            const returnLeg = returnData.routes[0].legs[0];
            returnDurationMinutes = Math.round((returnLeg.duration_in_traffic?.value || returnLeg.duration?.value || 0) / 60);
            returnDistanceKm = Math.round((returnLeg.distance?.value || 0) / 100) / 10;
        }

        // 店舗帰還時刻
        const arrivalTimestamp = lastDestinationArrivalTimestamp + returnDurationMinutes * 60 * 1000;

        return {
            totalDurationMinutes,
            totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
            returnDurationMinutes,
            returnDistanceKm,
            departureTimestamp: startTimestamp,
            arrivalTimestamp,
            legs: legResults,
            estimatedArrivalTimes,
        };
    } catch (error) {
        console.error("Error calculating route duration:", error);
        return null;
    }
}

/**
 * 送迎先を削除（work_recordsのpickup_destinationをnullに設定）
 */
export async function clearPickupDestination(profileId: string, date: string) {
    const supabase = await createServerClient() as any;
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("User not authenticated");
    }

    // 対象の日付のwork_recordsを更新
    const { error } = await supabase
        .from("work_records")
        .update({
            pickup_destination: null,
            pickup_required: false,
        })
        .eq("profile_id", profileId)
        .eq("work_date", date);

    if (error) {
        console.error("Error clearing pickup destination:", error);
        throw new Error("送迎先の削除に失敗しました");
    }

    // 関連するpickup_passengersも削除
    const { data: routes } = await supabase
        .from("pickup_routes")
        .select("id")
        .eq("date", date);

    if (routes && routes.length > 0) {
        const routeIds = routes.map((r: any) => r.id);
        await supabase
            .from("pickup_passengers")
            .delete()
            .in("route_id", routeIds)
            .eq("cast_profile_id", profileId);
    }

    revalidatePath("/app/pickup");
    return { success: true };
}
