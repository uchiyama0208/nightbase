"use server";

import { createServerClient } from "@/lib/supabaseServerClient";
import { createServiceRoleClient } from "@/lib/supabaseServiceClient";
import { revalidatePath } from "next/cache";
import OpenAI from "openai";

// 今日の日付をJSTで取得
function getTodayJST(): string {
    return new Date().toLocaleDateString("ja-JP", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).replace(/\//g, "-");
}

export interface PickupRouteWithPassengers {
    id: string;
    store_id: string;
    date: string;
    driver_profile_id: string | null;
    driver_name: string | null;
    round_trips: number;
    capacity: number;
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
    pickup_destination: string | null;
    start_time: string | null;
}

export async function getPickupData(dateParam?: string): Promise<
    | { redirect: string }
    | {
          data: {
              routes: PickupRouteWithPassengers[];
              todayAttendees: TodayAttendee[];
              staffProfiles: { id: string; display_name: string; role: string }[];
              targetDate: string;
              storeId: string;
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

    // Staff only
    if (currentProfile.role !== "staff") {
        return { redirect: "/app/timecard" };
    }

    const targetDate = dateParam || getTodayJST();
    const serviceSupabase = createServiceRoleClient() as any;

    // Get all profiles in the store
    const { data: storeProfiles } = await supabase
        .from("profiles")
        .select("id, display_name, role")
        .eq("store_id", currentProfile.store_id);

    const profileMap: Record<string, { display_name: string; role: string }> = {};
    for (const p of storeProfiles || []) {
        profileMap[p.id] = {
            display_name: p.display_name || "不明",
            role: p.role || "cast",
        };
    }

    // Get today's time_cards (attendees with pickup_destination)
    const { data: timeCards } = await serviceSupabase
        .from("time_cards")
        .select("user_id, pickup_destination, clock_in, scheduled_start_time")
        .eq("work_date", targetDate)
        .in("user_id", Object.keys(profileMap));

    const todayAttendees: TodayAttendee[] = (timeCards || [])
        .filter((tc: any) => profileMap[tc.user_id]?.role === "cast")
        .map((tc: any) => ({
            profile_id: tc.user_id,
            display_name: profileMap[tc.user_id]?.display_name || "不明",
            pickup_destination: tc.pickup_destination,
            start_time: tc.scheduled_start_time || tc.clock_in,
        }));

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

        // Get pickup_destination from time_cards for each passenger
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
                role: p.role || "staff",
            })),
            targetDate,
            storeId: currentProfile.store_id,
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

    const storeId = formData.get("storeId") as string;
    const date = formData.get("date") as string;
    const driverProfileId = formData.get("driverProfileId") as string | null;
    const roundTrips = parseInt(formData.get("roundTrips") as string) || 0;
    const capacity = parseInt(formData.get("capacity") as string) || 3;
    const passengersJson = formData.get("passengers") as string;

    interface PassengerInput {
        cast_profile_id: string;
        trip_number: number;
        order_index: number;
    }

    const passengers: PassengerInput[] = passengersJson ? JSON.parse(passengersJson) : [];

    // Create route
    const { data: route, error: routeError } = await supabase
        .from("pickup_routes")
        .insert({
            store_id: storeId,
            date,
            driver_profile_id: driverProfileId || null,
            round_trips: roundTrips,
            capacity,
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

    const routeId = formData.get("routeId") as string;
    const driverProfileId = formData.get("driverProfileId") as string | null;
    const roundTrips = parseInt(formData.get("roundTrips") as string) || 0;
    const capacity = parseInt(formData.get("capacity") as string) || 3;
    const passengersJson = formData.get("passengers") as string;

    interface PassengerInput {
        cast_profile_id: string;
        trip_number: number;
        order_index: number;
    }

    const passengers: PassengerInput[] = passengersJson ? JSON.parse(passengersJson) : [];

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
    vehicleConfigs?: VehicleConfig[]
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

    const systemPrompt = `あなたは送迎ルート最適化アシスタントです。
キャストの送迎先情報を元に、最も効率的な送迎ルートを提案してください。

考慮すべき点:
1. 地理的に近い送迎先をグループ化
2. 各送迎車の人数上限を守る
3. 戻り回数がある場合は複数便に分ける
4. 効率的なルート順序（近い順、または方向別）
5. 指定された送迎車の設定（人数上限、戻り回数）を必ず守ること

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
  "explanation": "提案の理由を簡潔に説明"
}`;

    const userPrompt = userMessage
        ? `${userMessage}\n\n現在の出勤者と送迎先:\n${attendeesInfo}\n\n送迎車の設定:\n${routesInfo || "なし"}`
        : `以下の出勤者の送迎ルートを最適化してください。\n\n出勤者と送迎先:\n${attendeesInfo}\n\n送迎車の設定:\n${routesInfo || "なし"}`;

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
