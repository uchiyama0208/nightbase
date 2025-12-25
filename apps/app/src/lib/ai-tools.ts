import { z } from "zod";
import { SupabaseClient } from "@supabase/supabase-js";
import { getJSTDateString } from "./utils";

// Helper to get or create a pickup destination
async function getOrCreatePickupDestination(
    supabase: SupabaseClient,
    storeId: string,
    destinationName: string
): Promise<string | null> {
    if (!destinationName || !destinationName.trim()) {
        return null;
    }

    const name = destinationName.trim();

    // Check if destination already exists
    const { data: existing } = await (supabase as any)
        .from("pickup_destinations")
        .select("id")
        .eq("store_id", storeId)
        .eq("name", name)
        .maybeSingle();

    if (existing) {
        return existing.id;
    }

    // Create new destination
    const { data: newDest, error } = await (supabase as any)
        .from("pickup_destinations")
        .insert({
            store_id: storeId,
            name: name,
        })
        .select("id")
        .single();

    if (error) {
        console.error("Error creating pickup destination:", error);
        return null;
    }

    return newDest.id;
}

// AI SDK v5互換のツール作成関数
function tool<TParams extends z.ZodType>(config: {
    description: string;
    parameters: TParams;
    execute: (params: z.infer<TParams>) => Promise<{ success: boolean; message: string; data?: unknown }>;
}) {
    return {
        description: config.description,
        parameters: config.parameters,
        execute: config.execute,
    };
}

// ========== ツール定義 ==========

export function createAITools(supabase: SupabaseClient, storeId: string) {
    return {
        // 出勤操作
        clockIn: tool({
            description: "スタッフやキャストを出勤させる。名前で指定された人を出勤状態にする。送迎先や出勤時間も指定可能。",
            parameters: z.object({
                name: z.string().describe("出勤させる人の名前（部分一致可）"),
                pickupDestination: z.string().optional().describe("送迎先の住所や場所（送迎が必要な場合）"),
                time: z.string().optional().describe("出勤時間（例: '18:00', '19:30'）。指定しない場合は現在時刻"),
            }),
            execute: async ({ name, pickupDestination, time }) => {
                // 名前でプロフィールを検索
                const { data: profiles, error: searchError } = await supabase
                    .from("profiles")
                    .select("id, display_name, role")
                    .eq("store_id", storeId)
                    .ilike("display_name", `%${name}%`);

                if (searchError) {
                    return { success: false, message: `検索エラー: ${searchError.message}` };
                }

                if (!profiles || profiles.length === 0) {
                    return { success: false, message: `「${name}」に該当するスタッフが見つかりません` };
                }

                if (profiles.length > 1) {
                    const names = profiles.map(p => p.display_name).join(", ");
                    return { success: false, message: `複数の候補があります: ${names}。もう少し具体的に指定してください。` };
                }

                const profile = profiles[0];
                const today = getJSTDateString();

                // 時間指定がある場合はパース、なければ現在時刻
                let clockInTime: string;
                if (time) {
                    const [hours, minutes] = time.split(":").map(Number);
                    const date = new Date();
                    date.setHours(hours, minutes, 0, 0);
                    clockInTime = date.toISOString();
                } else {
                    clockInTime = new Date().toISOString();
                }

                // 既存の出勤チェック
                const { data: existing } = await supabase
                    .from("work_records")
                    .select("id, clock_in, clock_out")
                    .eq("profile_id", profile.id)
                    .eq("work_date", today)
                    .maybeSingle();

                if (existing && !existing.clock_out) {
                    return { success: false, message: `${profile.display_name}さんは既に出勤中です` };
                }

                // Get or create pickup destination if specified
                let pickupDestinationId: string | null = null;
                if (pickupDestination) {
                    pickupDestinationId = await getOrCreatePickupDestination(supabase, storeId, pickupDestination);
                }

                // 新規出勤レコードを作成
                const { error: insertError } = await supabase
                    .from("work_records")
                    .insert({
                        profile_id: profile.id,
                        work_date: today,
                        clock_in: clockInTime,
                        pickup_required: !!pickupDestination,
                        pickup_destination_id: pickupDestinationId,
                    });

                if (insertError) {
                    return { success: false, message: `出勤登録エラー: ${insertError.message}` };
                }

                const timeInfo = time ? ` ${time}に` : "";
                const pickupInfo = pickupDestination ? `（送迎先: ${pickupDestination}）` : "";
                return { success: true, message: `${profile.display_name}さんを${timeInfo}出勤にしました${pickupInfo}` };
            },
        }),

        // 退勤操作
        clockOut: tool({
            description: "スタッフやキャストを退勤させる。名前で指定された人を退勤状態にする。退勤時間も指定可能。",
            parameters: z.object({
                name: z.string().describe("退勤させる人の名前（部分一致可）"),
                time: z.string().optional().describe("退勤時間（例: '23:00', '02:30'）。指定しない場合は現在時刻"),
            }),
            execute: async ({ name, time }) => {
                const { data: profiles } = await supabase
                    .from("profiles")
                    .select("id, display_name")
                    .eq("store_id", storeId)
                    .ilike("display_name", `%${name}%`);

                if (!profiles || profiles.length === 0) {
                    return { success: false, message: `「${name}」に該当するスタッフが見つかりません` };
                }

                if (profiles.length > 1) {
                    const names = profiles.map(p => p.display_name).join(", ");
                    return { success: false, message: `複数の候補があります: ${names}` };
                }

                const profile = profiles[0];
                const today = getJSTDateString();

                // 時間指定がある場合はパース、なければ現在時刻
                let clockOutTime: string;
                if (time) {
                    const [hours, minutes] = time.split(":").map(Number);
                    const date = new Date();
                    date.setHours(hours, minutes, 0, 0);
                    clockOutTime = date.toISOString();
                } else {
                    clockOutTime = new Date().toISOString();
                }

                const { data: existing } = await supabase
                    .from("work_records")
                    .select("id, clock_out")
                    .eq("profile_id", profile.id)
                    .eq("work_date", today)
                    .is("clock_out", null)
                    .maybeSingle();

                if (!existing) {
                    return { success: false, message: `${profile.display_name}さんは出勤していません` };
                }

                const { error: updateError } = await supabase
                    .from("work_records")
                    .update({ clock_out: clockOutTime })
                    .eq("id", existing.id);

                if (updateError) {
                    return { success: false, message: `退勤登録エラー: ${updateError.message}` };
                }

                const timeInfo = time ? ` ${time}に` : "";
                return { success: true, message: `${profile.display_name}さんを${timeInfo}退勤にしました` };
            },
        }),

        // 注文登録
        createOrder: tool({
            description: "卓に注文を追加する。テーブル名とメニュー名、数量を指定する。",
            parameters: z.object({
                tableName: z.string().describe("テーブル名（例: A卓、VIP1）"),
                menuName: z.string().describe("メニュー名（部分一致可）"),
                quantity: z.number().default(1).describe("数量（デフォルト1）"),
                castName: z.string().optional().describe("キャストの名前（ドリンクバックがある場合）"),
            }),
            execute: async ({ tableName, menuName, quantity, castName }) => {
                // テーブルを検索
                const { data: tables } = await supabase
                    .from("tables")
                    .select("id, name")
                    .eq("store_id", storeId)
                    .ilike("name", `%${tableName}%`);

                if (!tables || tables.length === 0) {
                    return { success: false, message: `「${tableName}」というテーブルが見つかりません` };
                }

                const table = tables[0];

                // アクティブなセッションを取得
                const { data: session } = await supabase
                    .from("table_sessions")
                    .select("id")
                    .eq("table_id", table.id)
                    .eq("status", "active")
                    .maybeSingle();

                if (!session) {
                    return { success: false, message: `${table.name}は現在営業中ではありません` };
                }

                // メニューを検索
                const { data: menus } = await supabase
                    .from("menus")
                    .select("id, name, price")
                    .eq("store_id", storeId)
                    .ilike("name", `%${menuName}%`);

                if (!menus || menus.length === 0) {
                    return { success: false, message: `「${menuName}」というメニューが見つかりません` };
                }

                if (menus.length > 1) {
                    const names = menus.map(m => m.name).join(", ");
                    return { success: false, message: `複数のメニューが該当: ${names}` };
                }

                const menu = menus[0];

                // キャストIDを取得（指定がある場合）
                let castId = null;
                if (castName) {
                    const { data: casts } = await supabase
                        .from("profiles")
                        .select("id, display_name")
                        .eq("store_id", storeId)
                        .eq("role", "cast")
                        .ilike("display_name", `%${castName}%`);

                    if (casts && casts.length === 1) {
                        castId = casts[0].id;
                    }
                }

                // 注文を登録
                const { error: insertError } = await supabase
                    .from("orders")
                    .insert({
                        table_session_id: session.id,
                        store_id: storeId,
                        menu_id: menu.id,
                        quantity,
                        amount: menu.price * quantity,
                        cast_id: castId,
                        status: "completed",
                    });

                if (insertError) {
                    return { success: false, message: `注文登録エラー: ${insertError.message}` };
                }

                const castInfo = castId ? `（${castName}さん付）` : "";
                return {
                    success: true,
                    message: `${table.name}に${menu.name} x ${quantity}を追加しました${castInfo}（¥${(menu.price * quantity).toLocaleString()}）`,
                };
            },
        }),

        // 卓を開ける
        openTable: tool({
            description: "卓を開けてお客様を案内する。テーブル名とゲスト人数を指定する。",
            parameters: z.object({
                tableName: z.string().describe("テーブル名"),
                guestCount: z.number().default(1).describe("ゲスト人数（デフォルト1）"),
            }),
            execute: async ({ tableName, guestCount }) => {
                const { data: tables } = await supabase
                    .from("tables")
                    .select("id, name")
                    .eq("store_id", storeId)
                    .ilike("name", `%${tableName}%`);

                if (!tables || tables.length === 0) {
                    return { success: false, message: `「${tableName}」というテーブルが見つかりません` };
                }

                const table = tables[0];

                // 既存のアクティブセッションチェック
                const { data: existingSession } = await supabase
                    .from("table_sessions")
                    .select("id")
                    .eq("table_id", table.id)
                    .eq("status", "active")
                    .maybeSingle();

                if (existingSession) {
                    return { success: false, message: `${table.name}は既に使用中です` };
                }

                const { error: insertError } = await supabase
                    .from("table_sessions")
                    .insert({
                        store_id: storeId,
                        table_id: table.id,
                        guest_count: guestCount,
                        status: "active",
                    });

                if (insertError) {
                    return { success: false, message: `卓オープンエラー: ${insertError.message}` };
                }

                return { success: true, message: `${table.name}を開けました（${guestCount}名様）` };
            },
        }),

        // 卓を閉じる（会計）
        closeTable: tool({
            description: "卓を閉じて会計を完了する。テーブル名を指定する。",
            parameters: z.object({
                tableName: z.string().describe("テーブル名"),
            }),
            execute: async ({ tableName }) => {
                const { data: tables } = await supabase
                    .from("tables")
                    .select("id, name")
                    .eq("store_id", storeId)
                    .ilike("name", `%${tableName}%`);

                if (!tables || tables.length === 0) {
                    return { success: false, message: `「${tableName}」というテーブルが見つかりません` };
                }

                const table = tables[0];

                const { data: session } = await supabase
                    .from("table_sessions")
                    .select("id, total_amount")
                    .eq("table_id", table.id)
                    .eq("status", "active")
                    .maybeSingle();

                if (!session) {
                    return { success: false, message: `${table.name}は使用中ではありません` };
                }

                const now = new Date().toISOString();
                const { error: updateError } = await supabase
                    .from("table_sessions")
                    .update({ status: "closed", end_time: now })
                    .eq("id", session.id);

                if (updateError) {
                    return { success: false, message: `会計エラー: ${updateError.message}` };
                }

                return {
                    success: true,
                    message: `${table.name}の会計を完了しました（合計: ¥${(session.total_amount || 0).toLocaleString()}）`,
                };
            },
        }),

        // ボトルキープ登録
        registerBottleKeep: tool({
            description: "ボトルキープを登録する。ゲストの名前とボトル（メニュー）名を指定する。",
            parameters: z.object({
                guestName: z.string().describe("ゲストの名前（部分一致可）"),
                bottleName: z.string().describe("ボトル（メニュー）名"),
                expirationDays: z.number().optional().describe("有効期限（日数）。指定しない場合は無期限"),
            }),
            execute: async ({ guestName, bottleName, expirationDays }) => {
                // ゲストを検索
                const { data: guests } = await supabase
                    .from("profiles")
                    .select("id, display_name")
                    .eq("store_id", storeId)
                    .eq("role", "guest")
                    .ilike("display_name", `%${guestName}%`);

                if (!guests || guests.length === 0) {
                    return { success: false, message: `「${guestName}」というゲストが見つかりません` };
                }

                if (guests.length > 1) {
                    const names = guests.map(g => g.display_name).join(", ");
                    return { success: false, message: `複数のゲストが該当: ${names}` };
                }

                const guest = guests[0];

                // ボトル（メニュー）を検索
                const { data: menus } = await supabase
                    .from("menus")
                    .select("id, name")
                    .eq("store_id", storeId)
                    .ilike("name", `%${bottleName}%`);

                if (!menus || menus.length === 0) {
                    return { success: false, message: `「${bottleName}」というボトルが見つかりません` };
                }

                if (menus.length > 1) {
                    const names = menus.map(m => m.name).join(", ");
                    return { success: false, message: `複数のボトルが該当: ${names}` };
                }

                const menu = menus[0];

                // 有効期限を計算
                let expirationDate: string | null = null;
                if (expirationDays) {
                    const date = new Date();
                    date.setDate(date.getDate() + expirationDays);
                    expirationDate = date.toISOString().split("T")[0];
                }

                // ボトルキープを登録
                const { data: bottleKeep, error: insertError } = await supabase
                    .from("bottle_keeps")
                    .insert({
                        store_id: storeId,
                        menu_id: menu.id,
                        remaining_amount: 100,
                        expiration_date: expirationDate,
                    })
                    .select("id")
                    .single();

                if (insertError) {
                    return { success: false, message: `ボトルキープ登録エラー: ${insertError.message}` };
                }

                // ホルダーを登録
                const { error: holderError } = await supabase
                    .from("bottle_keep_holders")
                    .insert({
                        bottle_keep_id: bottleKeep.id,
                        profile_id: guest.id,
                    });

                if (holderError) {
                    return { success: false, message: `ホルダー登録エラー: ${holderError.message}` };
                }

                const expirationInfo = expirationDate ? `（期限: ${expirationDate}）` : "";
                return {
                    success: true,
                    message: `${guest.display_name}様の${menu.name}をキープしました${expirationInfo}`,
                };
            },
        }),

        // スタッフ一覧取得
        listStaff: tool({
            description: "現在出勤中のスタッフ一覧を取得する",
            parameters: z.object({}),
            execute: async () => {
                const today = getJSTDateString();

                const { data: timeCards } = await supabase
                    .from("work_records")
                    .select("profile_id, clock_in, profiles(display_name, role)")
                    .eq("work_date", today)
                    .is("clock_out", null);

                if (!timeCards || timeCards.length === 0) {
                    return { success: true, message: "現在出勤中のスタッフはいません", data: [] };
                }

                const staffList = timeCards.map(tc => ({
                    name: (tc.profiles as any)?.display_name,
                    role: (tc.profiles as any)?.role,
                    clockIn: tc.clock_in,
                }));

                return {
                    success: true,
                    message: `現在${staffList.length}名が出勤中です`,
                    data: staffList,
                };
            },
        }),

        // 営業中の卓一覧
        listActiveTables: tool({
            description: "現在営業中の卓一覧を取得する",
            parameters: z.object({}),
            execute: async () => {
                const { data: sessions } = await supabase
                    .from("table_sessions")
                    .select("id, guest_count, start_time, total_amount, tables(name)")
                    .eq("store_id", storeId)
                    .eq("status", "active");

                if (!sessions || sessions.length === 0) {
                    return { success: true, message: "現在営業中の卓はありません", data: [] };
                }

                const tableList = sessions.map(s => ({
                    tableName: (s.tables as any)?.name,
                    guestCount: s.guest_count,
                    startTime: s.start_time,
                    totalAmount: s.total_amount,
                }));

                return {
                    success: true,
                    message: `現在${tableList.length}卓が営業中です`,
                    data: tableList,
                };
            },
        }),

        // キャスト・スタッフ登録
        registerProfile: tool({
            description: "新しいキャストやスタッフ、ゲストを登録する。名前だけで登録可能。",
            parameters: z.object({
                name: z.string().describe("登録する人の名前"),
                role: z.enum(["cast", "staff", "guest"]).default("cast").describe("役割（cast=キャスト、staff=スタッフ、guest=ゲスト）。デフォルトはcast"),
            }),
            execute: async ({ name, role }) => {
                // 同名チェック
                const { data: existing } = await supabase
                    .from("profiles")
                    .select("id, display_name")
                    .eq("store_id", storeId)
                    .eq("display_name", name)
                    .maybeSingle();

                if (existing) {
                    return { success: false, message: `「${name}」は既に登録されています` };
                }

                const roleLabel = role === "cast" ? "キャスト" : role === "staff" ? "スタッフ" : "ゲスト";

                const { error: insertError } = await supabase
                    .from("profiles")
                    .insert({
                        store_id: storeId,
                        display_name: name,
                        role: role,
                        invite_status: "accepted",
                    });

                if (insertError) {
                    return { success: false, message: `登録エラー: ${insertError.message}` };
                }

                return { success: true, message: `${name}さんを${roleLabel}として登録しました` };
            },
        }),

        // 送迎先を設定
        setPickup: tool({
            description: "出勤中のスタッフやキャストの送迎先を設定・変更する。",
            parameters: z.object({
                name: z.string().describe("送迎が必要な人の名前（部分一致可）"),
                destination: z.string().describe("送迎先の住所や場所"),
            }),
            execute: async ({ name, destination }) => {
                const { data: profiles } = await supabase
                    .from("profiles")
                    .select("id, display_name")
                    .eq("store_id", storeId)
                    .ilike("display_name", `%${name}%`);

                if (!profiles || profiles.length === 0) {
                    return { success: false, message: `「${name}」に該当するスタッフが見つかりません` };
                }

                if (profiles.length > 1) {
                    const names = profiles.map(p => p.display_name).join(", ");
                    return { success: false, message: `複数の候補があります: ${names}` };
                }

                const profile = profiles[0];
                const today = getJSTDateString();

                const { data: timeCard } = await supabase
                    .from("work_records")
                    .select("id")
                    .eq("profile_id", profile.id)
                    .eq("work_date", today)
                    .is("clock_out", null)
                    .maybeSingle();

                if (!timeCard) {
                    return { success: false, message: `${profile.display_name}さんは本日出勤していません` };
                }

                // Get or create pickup destination
                const pickupDestinationId = await getOrCreatePickupDestination(supabase, storeId, destination);

                const { error: updateError } = await supabase
                    .from("work_records")
                    .update({
                        pickup_required: true,
                        pickup_destination_id: pickupDestinationId,
                    })
                    .eq("id", timeCard.id);

                if (updateError) {
                    return { success: false, message: `送迎設定エラー: ${updateError.message}` };
                }

                return {
                    success: true,
                    message: `${profile.display_name}さんの送迎先を「${destination}」に設定しました`,
                };
            },
        }),

        // 送迎希望者一覧
        listPickupRequests: tool({
            description: "本日の送迎希望者一覧を取得する",
            parameters: z.object({}),
            execute: async () => {
                const today = getJSTDateString();

                const { data: timeCards } = await supabase
                    .from("work_records")
                    .select("profile_id, pickup_destination_id, pickup_destinations(id, name), profiles(display_name)")
                    .eq("work_date", today)
                    .eq("pickup_required", true)
                    .is("clock_out", null);

                if (!timeCards || timeCards.length === 0) {
                    return { success: true, message: "本日の送迎希望者はいません", data: [] };
                }

                const pickupList = timeCards.map(tc => ({
                    name: (tc.profiles as any)?.display_name,
                    destination: (tc as any).pickup_destinations?.name || null,
                }));

                const listText = pickupList
                    .map(p => `・${p.name}: ${p.destination || "場所未設定"}`)
                    .join("\n");

                return {
                    success: true,
                    message: `本日の送迎希望者は${pickupList.length}名です:\n${listText}`,
                    data: pickupList,
                };
            },
        }),

        // 送迎をキャンセル
        cancelPickup: tool({
            description: "送迎希望をキャンセルする",
            parameters: z.object({
                name: z.string().describe("送迎をキャンセルする人の名前（部分一致可）"),
            }),
            execute: async ({ name }) => {
                const { data: profiles } = await supabase
                    .from("profiles")
                    .select("id, display_name")
                    .eq("store_id", storeId)
                    .ilike("display_name", `%${name}%`);

                if (!profiles || profiles.length === 0) {
                    return { success: false, message: `「${name}」に該当するスタッフが見つかりません` };
                }

                if (profiles.length > 1) {
                    const names = profiles.map(p => p.display_name).join(", ");
                    return { success: false, message: `複数の候補があります: ${names}` };
                }

                const profile = profiles[0];
                const today = getJSTDateString();

                const { data: timeCard } = await supabase
                    .from("work_records")
                    .select("id")
                    .eq("profile_id", profile.id)
                    .eq("work_date", today)
                    .eq("pickup_required", true)
                    .is("clock_out", null)
                    .maybeSingle();

                if (!timeCard) {
                    return { success: false, message: `${profile.display_name}さんは送迎希望を出していません` };
                }

                const { error: updateError } = await supabase
                    .from("work_records")
                    .update({
                        pickup_required: false,
                        pickup_destination_id: null,
                    })
                    .eq("id", timeCard.id);

                if (updateError) {
                    return { success: false, message: `送迎キャンセルエラー: ${updateError.message}` };
                }

                return {
                    success: true,
                    message: `${profile.display_name}さんの送迎希望をキャンセルしました`,
                };
            },
        }),

        // プロフィール検索（アクション付き）
        searchProfile: tool({
            description: "キャスト、スタッフ、ゲストを名前で検索する。検索結果にはプロフィールIDが含まれ、ユーザーがプロフィールを開くためのアクションが提供される。",
            parameters: z.object({
                name: z.string().describe("検索する人の名前（部分一致可）"),
                role: z.enum(["cast", "staff", "guest", "any"]).optional().describe("検索対象の役割。省略時は全て"),
            }),
            execute: async ({ name, role }) => {
                let query = supabase
                    .from("profiles")
                    .select("id, display_name, display_name_kana, role, status, avatar_url")
                    .eq("store_id", storeId)
                    .ilike("display_name", `%${name}%`);

                if (role && role !== "any") {
                    query = query.eq("role", role);
                }

                const { data: profiles, error } = await query;

                if (error) {
                    return { success: false, message: `検索エラー: ${error.message}` };
                }

                if (!profiles || profiles.length === 0) {
                    return {
                        success: true,
                        found: false,
                        message: `「${name}」に該当する人が見つかりません`,
                        actions: []
                    };
                }

                const roleLabels: Record<string, string> = {
                    cast: "キャスト",
                    staff: "スタッフ",
                    guest: "ゲスト",
                    admin: "管理者",
                };

                const results = profiles.map(p => ({
                    id: p.id,
                    name: p.display_name,
                    nameKana: p.display_name_kana,
                    role: p.role,
                    roleLabel: roleLabels[p.role] || p.role,
                    status: p.status,
                }));

                // アクション情報を含める
                const actions = profiles.map(p => ({
                    type: "open_profile",
                    profileId: p.id,
                    label: `${p.display_name}のプロフィール`,
                }));

                return {
                    success: true,
                    found: true,
                    message: profiles.length === 1
                        ? `${profiles[0].display_name}さん（${roleLabels[profiles[0].role] || profiles[0].role}）が見つかりました`
                        : `${profiles.length}件の候補が見つかりました: ${profiles.map(p => p.display_name).join(", ")}`,
                    profiles: results,
                    actions,
                };
            },
        }),

        // ========== 予約管理ツール ==========

        // 今日の予約一覧
        listTodayReservations: tool({
            description: "今日の予約一覧を取得する。日付を指定することも可能。",
            parameters: z.object({
                date: z.string().optional().describe("日付（YYYY-MM-DD形式）。省略時は今日"),
            }),
            execute: async ({ date }) => {
                const targetDate = date || getJSTDateString();

                const { data: reservations, error } = await supabase
                    .from("reservations")
                    .select(`
                        id, guest_name, party_size, reservation_time, status,
                        nominated_cast_id, profiles:nominated_cast_id(display_name),
                        tables:table_id(name)
                    `)
                    .eq("store_id", storeId)
                    .eq("reservation_date", targetDate)
                    .order("reservation_time", { ascending: true });

                if (error) {
                    return { success: false, message: `予約取得エラー: ${error.message}` };
                }

                if (!reservations || reservations.length === 0) {
                    return { success: true, message: `${targetDate}の予約はありません`, data: [] };
                }

                const statusLabels: Record<string, string> = {
                    waiting: "待機中",
                    visited: "来店済",
                    cancelled: "キャンセル",
                };

                const list = reservations.map(r => ({
                    guestName: r.guest_name,
                    partySize: r.party_size,
                    time: r.reservation_time,
                    status: statusLabels[r.status] || r.status,
                    cast: (r.profiles as any)?.display_name || null,
                    table: (r.tables as any)?.name || null,
                }));

                const waitingCount = reservations.filter(r => r.status === "waiting").length;
                const listText = list
                    .map(r => `・${r.time} ${r.guestName}様 ${r.partySize}名${r.cast ? ` (指名:${r.cast})` : ""} [${r.status}]`)
                    .join("\n");

                return {
                    success: true,
                    message: `${targetDate}の予約は${reservations.length}件（待機中:${waitingCount}件）:\n${listText}`,
                    data: list,
                };
            },
        }),

        // 予約作成
        createReservation: tool({
            description: "新規予約を作成する。",
            parameters: z.object({
                guestName: z.string().describe("ゲスト名"),
                partySize: z.number().default(1).describe("人数"),
                date: z.string().optional().describe("予約日（YYYY-MM-DD形式）。省略時は今日"),
                time: z.string().describe("予約時間（HH:MM形式）"),
                castName: z.string().optional().describe("指名キャスト名"),
                contact: z.string().optional().describe("連絡先（電話番号）"),
            }),
            execute: async ({ guestName, partySize, date, time, castName, contact }) => {
                const targetDate = date || getJSTDateString();

                // 指名キャストを検索
                let nominatedCastId = null;
                if (castName) {
                    const { data: casts } = await supabase
                        .from("profiles")
                        .select("id, display_name")
                        .eq("store_id", storeId)
                        .eq("role", "cast")
                        .ilike("display_name", `%${castName}%`);

                    if (casts && casts.length === 1) {
                        nominatedCastId = casts[0].id;
                    }
                }

                // 予約番号を生成
                const { count } = await supabase
                    .from("reservations")
                    .select("id", { count: "exact", head: true })
                    .eq("store_id", storeId)
                    .eq("reservation_date", targetDate);

                const reservationNumber = (count || 0) + 1;

                const { error } = await supabase
                    .from("reservations")
                    .insert({
                        store_id: storeId,
                        guest_name: guestName,
                        party_size: partySize,
                        reservation_date: targetDate,
                        reservation_time: time,
                        nominated_cast_id: nominatedCastId,
                        contact_type: "phone",
                        contact_value: contact || "未設定",
                        reservation_number: reservationNumber,
                        status: "waiting",
                    });

                if (error) {
                    return { success: false, message: `予約登録エラー: ${error.message}` };
                }

                const castInfo = castName ? `（指名: ${castName}）` : "";
                return {
                    success: true,
                    message: `${targetDate} ${time}に${guestName}様 ${partySize}名様の予約を登録しました${castInfo}`,
                };
            },
        }),

        // 予約キャンセル
        cancelReservation: tool({
            description: "予約をキャンセルする。ゲスト名で検索してキャンセル。",
            parameters: z.object({
                guestName: z.string().describe("ゲスト名（部分一致可）"),
                date: z.string().optional().describe("予約日（省略時は今日）"),
            }),
            execute: async ({ guestName, date }) => {
                const targetDate = date || getJSTDateString();

                const { data: reservations, error: searchError } = await supabase
                    .from("reservations")
                    .select("id, guest_name, reservation_time")
                    .eq("store_id", storeId)
                    .eq("reservation_date", targetDate)
                    .eq("status", "waiting")
                    .ilike("guest_name", `%${guestName}%`);

                if (searchError) {
                    return { success: false, message: `検索エラー: ${searchError.message}` };
                }

                if (!reservations || reservations.length === 0) {
                    return { success: false, message: `${guestName}様の予約が見つかりません` };
                }

                if (reservations.length > 1) {
                    const names = reservations.map(r => `${r.guest_name}(${r.reservation_time})`).join(", ");
                    return { success: false, message: `複数の予約が該当: ${names}` };
                }

                const { error: updateError } = await supabase
                    .from("reservations")
                    .update({ status: "cancelled" })
                    .eq("id", reservations[0].id);

                if (updateError) {
                    return { success: false, message: `キャンセルエラー: ${updateError.message}` };
                }

                return { success: true, message: `${reservations[0].guest_name}様の予約をキャンセルしました` };
            },
        }),

        // ========== 売上分析・レポートツール ==========

        // 今日の売上
        getTodaySales: tool({
            description: "今日の売上情報を取得する。日付指定も可能。",
            parameters: z.object({
                date: z.string().optional().describe("日付（YYYY-MM-DD形式）。省略時は今日"),
            }),
            execute: async ({ date }) => {
                const targetDate = date || getJSTDateString();
                const startOfDay = `${targetDate}T00:00:00`;
                const endOfDay = `${targetDate}T23:59:59`;

                const { data: sessions, error } = await supabase
                    .from("table_sessions")
                    .select("id, guest_count, total_amount, status, start_time, end_time, tables(name)")
                    .eq("store_id", storeId)
                    .gte("start_time", startOfDay)
                    .lte("start_time", endOfDay);

                if (error) {
                    return { success: false, message: `売上取得エラー: ${error.message}` };
                }

                const closedSessions = sessions?.filter(s => s.status === "closed") || [];
                const activeSessions = sessions?.filter(s => s.status === "active") || [];

                const totalSales = closedSessions.reduce((sum, s) => sum + (s.total_amount || 0), 0);
                const totalGuests = closedSessions.reduce((sum, s) => sum + (s.guest_count || 0), 0);
                const avgPerGuest = totalGuests > 0 ? Math.round(totalSales / totalGuests) : 0;

                const activeTotalAmount = activeSessions.reduce((sum, s) => sum + (s.total_amount || 0), 0);

                return {
                    success: true,
                    message: `【${targetDate}の売上】
・会計済み: ${closedSessions.length}組 / ¥${totalSales.toLocaleString()}
・営業中: ${activeSessions.length}組 / ¥${activeTotalAmount.toLocaleString()}（暫定）
・来店客数: ${totalGuests}名
・客単価: ¥${avgPerGuest.toLocaleString()}`,
                    data: { totalSales, totalGuests, avgPerGuest, closedCount: closedSessions.length, activeCount: activeSessions.length },
                };
            },
        }),

        // 売上比較
        getSalesSummary: tool({
            description: "売上サマリーを取得。今週/先週、今月/先月などの比較ができる。",
            parameters: z.object({
                period: z.enum(["today", "week", "month"]).default("today").describe("期間（today, week, month）"),
                compare: z.boolean().default(false).describe("前期間と比較するか"),
            }),
            execute: async ({ period, compare }) => {
                const today = new Date();
                let startDate: string, endDate: string;
                let prevStartDate: string | null = null, prevEndDate: string | null = null;

                if (period === "today") {
                    startDate = endDate = getJSTDateString();
                    if (compare) {
                        const yesterday = new Date(today);
                        yesterday.setDate(yesterday.getDate() - 1);
                        prevStartDate = prevEndDate = getJSTDateString(yesterday);
                    }
                } else if (period === "week") {
                    const dayOfWeek = today.getDay();
                    const startOfWeek = new Date(today);
                    startOfWeek.setDate(today.getDate() - dayOfWeek);
                    startDate = getJSTDateString(startOfWeek);
                    endDate = getJSTDateString(today);

                    if (compare) {
                        const prevWeekStart = new Date(startOfWeek);
                        prevWeekStart.setDate(prevWeekStart.getDate() - 7);
                        const prevWeekEnd = new Date(startOfWeek);
                        prevWeekEnd.setDate(prevWeekEnd.getDate() - 1);
                        prevStartDate = getJSTDateString(prevWeekStart);
                        prevEndDate = getJSTDateString(prevWeekEnd);
                    }
                } else {
                    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                    startDate = getJSTDateString(startOfMonth);
                    endDate = getJSTDateString(today);

                    if (compare) {
                        const prevMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                        const prevMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
                        prevStartDate = getJSTDateString(prevMonthStart);
                        prevEndDate = getJSTDateString(prevMonthEnd);
                    }
                }

                const fetchSales = async (start: string, end: string) => {
                    const { data: sessions } = await supabase
                        .from("table_sessions")
                        .select("total_amount, guest_count")
                        .eq("store_id", storeId)
                        .eq("status", "closed")
                        .gte("start_time", `${start}T00:00:00`)
                        .lte("start_time", `${end}T23:59:59`);

                    const total = sessions?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0;
                    const guests = sessions?.reduce((sum, s) => sum + (s.guest_count || 0), 0) || 0;
                    return { total, guests, count: sessions?.length || 0 };
                };

                const current = await fetchSales(startDate, endDate);
                let message = `【${period === "today" ? "今日" : period === "week" ? "今週" : "今月"}の売上】
・売上: ¥${current.total.toLocaleString()}
・来店: ${current.count}組 / ${current.guests}名`;

                if (compare && prevStartDate && prevEndDate) {
                    const prev = await fetchSales(prevStartDate, prevEndDate);
                    const diff = current.total - prev.total;
                    const diffPercent = prev.total > 0 ? Math.round((diff / prev.total) * 100) : 0;
                    const sign = diff >= 0 ? "+" : "";

                    message += `\n\n【前期間比較】
・前期間: ¥${prev.total.toLocaleString()}
・差額: ${sign}¥${diff.toLocaleString()} (${sign}${diffPercent}%)`;
                }

                return { success: true, message, data: current };
            },
        }),

        // トップキャスト
        getTopCasts: tool({
            description: "売上上位のキャストランキングを取得する。",
            parameters: z.object({
                period: z.enum(["today", "week", "month"]).default("month").describe("期間"),
                limit: z.number().default(5).describe("表示人数"),
            }),
            execute: async ({ period, limit }) => {
                const today = new Date();
                let startDate: string;

                if (period === "today") {
                    startDate = getJSTDateString();
                } else if (period === "week") {
                    const startOfWeek = new Date(today);
                    startOfWeek.setDate(today.getDate() - 7);
                    startDate = getJSTDateString(startOfWeek);
                } else {
                    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                    startDate = getJSTDateString(startOfMonth);
                }

                const { data: orders, error } = await supabase
                    .from("orders")
                    .select("cast_id, amount, created_at, profiles:cast_id(display_name)")
                    .eq("store_id", storeId)
                    .not("cast_id", "is", null)
                    .gte("created_at", `${startDate}T00:00:00`);

                if (error) {
                    return { success: false, message: `取得エラー: ${error.message}` };
                }

                // キャストごとの売上を集計
                const castSales: Record<string, { name: string; total: number; count: number }> = {};
                orders?.forEach(order => {
                    const castId = order.cast_id;
                    const castName = (order.profiles as any)?.display_name || "不明";
                    if (!castSales[castId]) {
                        castSales[castId] = { name: castName, total: 0, count: 0 };
                    }
                    castSales[castId].total += order.amount || 0;
                    castSales[castId].count += 1;
                });

                const ranking = Object.values(castSales)
                    .sort((a, b) => b.total - a.total)
                    .slice(0, limit);

                if (ranking.length === 0) {
                    return { success: true, message: "該当期間のドリンクバック売上データがありません" };
                }

                const periodLabel = period === "today" ? "今日" : period === "week" ? "今週" : "今月";
                const listText = ranking
                    .map((c, i) => `${i + 1}. ${c.name}: ¥${c.total.toLocaleString()} (${c.count}件)`)
                    .join("\n");

                return {
                    success: true,
                    message: `【${periodLabel}のキャストランキング】\n${listText}`,
                    data: ranking,
                };
            },
        }),

        // 日報作成
        generateDailyReport: tool({
            description: "本日の日報サマリーを生成する。",
            parameters: z.object({
                date: z.string().optional().describe("日付（省略時は今日）"),
            }),
            execute: async ({ date }) => {
                const targetDate = date || getJSTDateString();
                const startOfDay = `${targetDate}T00:00:00`;
                const endOfDay = `${targetDate}T23:59:59`;

                // 売上データ
                const { data: sessions } = await supabase
                    .from("table_sessions")
                    .select("total_amount, guest_count, status")
                    .eq("store_id", storeId)
                    .gte("start_time", startOfDay)
                    .lte("start_time", endOfDay);

                const closed = sessions?.filter(s => s.status === "closed") || [];
                const totalSales = closed.reduce((sum, s) => sum + (s.total_amount || 0), 0);
                const totalGuests = closed.reduce((sum, s) => sum + (s.guest_count || 0), 0);

                // 出勤データ
                const { data: workRecords } = await supabase
                    .from("work_records")
                    .select("profile_id, clock_in, clock_out, profiles(display_name, role)")
                    .eq("work_date", targetDate)
                    .not("clock_in", "is", null);

                const staffCount = workRecords?.filter(w => (w.profiles as any)?.role === "staff" || (w.profiles as any)?.role === "admin").length || 0;
                const castCount = workRecords?.filter(w => (w.profiles as any)?.role === "cast").length || 0;

                // 予約データ
                const { data: reservations } = await supabase
                    .from("reservations")
                    .select("status")
                    .eq("store_id", storeId)
                    .eq("reservation_date", targetDate);

                const reservationVisited = reservations?.filter(r => r.status === "visited").length || 0;
                const reservationTotal = reservations?.length || 0;

                const report = `【${targetDate} 日報】

📊 売上
・売上合計: ¥${totalSales.toLocaleString()}
・来店組数: ${closed.length}組
・来店客数: ${totalGuests}名
・客単価: ¥${totalGuests > 0 ? Math.round(totalSales / totalGuests).toLocaleString() : 0}

👥 出勤
・スタッフ: ${staffCount}名
・キャスト: ${castCount}名

📅 予約
・予約件数: ${reservationTotal}件
・来店済み: ${reservationVisited}件`;

                return { success: true, message: report };
            },
        }),

        // ========== シフト確認ツール ==========

        // シフト確認
        getScheduledShifts: tool({
            description: "指定日のシフト（出勤予定）を確認する。",
            parameters: z.object({
                date: z.string().optional().describe("日付（省略時は明日）"),
            }),
            execute: async ({ date }) => {
                const targetDate = date || (() => {
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    return getJSTDateString(tomorrow);
                })();

                const { data: workRecords, error } = await supabase
                    .from("work_records")
                    .select("scheduled_start_time, scheduled_end_time, status, profiles(display_name, role)")
                    .eq("work_date", targetDate)
                    .in("status", ["scheduled", "pending", "working", "completed"]);

                if (error) {
                    return { success: false, message: `取得エラー: ${error.message}` };
                }

                if (!workRecords || workRecords.length === 0) {
                    return { success: true, message: `${targetDate}のシフトはありません`, data: [] };
                }

                const roleLabels: Record<string, string> = { cast: "キャスト", staff: "スタッフ", admin: "管理者" };

                const list = workRecords.map(w => ({
                    name: (w.profiles as any)?.display_name,
                    role: roleLabels[(w.profiles as any)?.role] || (w.profiles as any)?.role,
                    startTime: w.scheduled_start_time,
                    endTime: w.scheduled_end_time,
                    status: w.status,
                }));

                const listText = list
                    .map(w => `・${w.name}（${w.role}）${w.startTime ? ` ${w.startTime}〜${w.endTime || ""}` : ""}`)
                    .join("\n");

                return {
                    success: true,
                    message: `【${targetDate}のシフト】${workRecords.length}名\n${listText}`,
                    data: list,
                };
            },
        }),

        // 特定の人のシフト
        getPersonShifts: tool({
            description: "特定の人の今後のシフトを確認する。",
            parameters: z.object({
                name: z.string().describe("名前（部分一致可）"),
                days: z.number().default(7).describe("何日分表示するか"),
            }),
            execute: async ({ name, days }) => {
                const { data: profiles } = await supabase
                    .from("profiles")
                    .select("id, display_name")
                    .eq("store_id", storeId)
                    .ilike("display_name", `%${name}%`);

                if (!profiles || profiles.length === 0) {
                    return { success: false, message: `「${name}」が見つかりません` };
                }

                if (profiles.length > 1) {
                    return { success: false, message: `複数の候補: ${profiles.map(p => p.display_name).join(", ")}` };
                }

                const profile = profiles[0];
                const today = getJSTDateString();
                const endDate = new Date();
                endDate.setDate(endDate.getDate() + days);
                const endDateStr = getJSTDateString(endDate);

                const { data: workRecords } = await supabase
                    .from("work_records")
                    .select("work_date, scheduled_start_time, scheduled_end_time, status")
                    .eq("profile_id", profile.id)
                    .gte("work_date", today)
                    .lte("work_date", endDateStr)
                    .in("status", ["scheduled", "pending", "working", "completed"])
                    .order("work_date", { ascending: true });

                if (!workRecords || workRecords.length === 0) {
                    return { success: true, message: `${profile.display_name}さんの今後${days}日間のシフトはありません` };
                }

                const listText = workRecords
                    .map(w => `・${w.work_date} ${w.scheduled_start_time || ""}〜${w.scheduled_end_time || ""}`)
                    .join("\n");

                return {
                    success: true,
                    message: `【${profile.display_name}さんのシフト】\n${listText}`,
                    data: workRecords,
                };
            },
        }),

        // ========== 在庫・買い出しツール ==========

        // 買い出しリスト取得
        getShoppingList: tool({
            description: "買い出しリストを取得する。",
            parameters: z.object({
                showCompleted: z.boolean().default(false).describe("完了済みも表示するか"),
            }),
            execute: async ({ showCompleted }) => {
                let query = supabase
                    .from("shopping_list")
                    .select("id, name, quantity, is_completed, menus(name)")
                    .eq("store_id", storeId)
                    .order("created_at", { ascending: false });

                if (!showCompleted) {
                    query = query.eq("is_completed", false);
                }

                const { data: items, error } = await query;

                if (error) {
                    return { success: false, message: `取得エラー: ${error.message}` };
                }

                if (!items || items.length === 0) {
                    return { success: true, message: "買い出しリストは空です", data: [] };
                }

                const listText = items
                    .map(item => `${item.is_completed ? "✓" : "○"} ${item.name} x ${item.quantity}`)
                    .join("\n");

                const pendingCount = items.filter(i => !i.is_completed).length;

                return {
                    success: true,
                    message: `【買い出しリスト】未購入: ${pendingCount}件\n${listText}`,
                    data: items,
                };
            },
        }),

        // 買い出しリストに追加
        addToShoppingList: tool({
            description: "買い出しリストにアイテムを追加する。",
            parameters: z.object({
                name: z.string().describe("アイテム名"),
                quantity: z.number().default(1).describe("数量"),
            }),
            execute: async ({ name, quantity }) => {
                const { error } = await supabase
                    .from("shopping_list")
                    .insert({
                        store_id: storeId,
                        name,
                        quantity,
                        is_completed: false,
                    });

                if (error) {
                    return { success: false, message: `追加エラー: ${error.message}` };
                }

                return { success: true, message: `「${name} x ${quantity}」を買い出しリストに追加しました` };
            },
        }),

        // 買い出し完了
        completeShoppingItem: tool({
            description: "買い出しアイテムを購入完了にする。",
            parameters: z.object({
                name: z.string().describe("アイテム名（部分一致可）"),
            }),
            execute: async ({ name }) => {
                const { data: items } = await supabase
                    .from("shopping_list")
                    .select("id, name")
                    .eq("store_id", storeId)
                    .eq("is_completed", false)
                    .ilike("name", `%${name}%`);

                if (!items || items.length === 0) {
                    return { success: false, message: `「${name}」が見つかりません` };
                }

                if (items.length > 1) {
                    return { success: false, message: `複数該当: ${items.map(i => i.name).join(", ")}` };
                }

                const { error } = await supabase
                    .from("shopping_list")
                    .update({ is_completed: true })
                    .eq("id", items[0].id);

                if (error) {
                    return { success: false, message: `更新エラー: ${error.message}` };
                }

                return { success: true, message: `「${items[0].name}」を購入完了にしました` };
            },
        }),

        // ========== 順番待ち管理ツール ==========

        // 順番待ちに追加
        addToQueue: tool({
            description: "順番待ちリストにお客様を追加する。",
            parameters: z.object({
                guestName: z.string().describe("ゲスト名"),
                partySize: z.number().default(1).describe("人数"),
                contact: z.string().optional().describe("連絡先（電話番号）"),
            }),
            execute: async ({ guestName, partySize, contact }) => {
                // 待ち番号を生成
                const { count } = await supabase
                    .from("queue_entries")
                    .select("id", { count: "exact", head: true })
                    .eq("store_id", storeId)
                    .gte("created_at", `${getJSTDateString()}T00:00:00`);

                const queueNumber = (count || 0) + 1;

                const { error } = await supabase
                    .from("queue_entries")
                    .insert({
                        store_id: storeId,
                        guest_name: guestName,
                        party_size: partySize,
                        contact_type: "phone",
                        contact_value: contact || "未設定",
                        queue_number: queueNumber,
                        status: "waiting",
                    });

                if (error) {
                    return { success: false, message: `追加エラー: ${error.message}` };
                }

                return {
                    success: true,
                    message: `${guestName}様（${partySize}名）を順番待ちに追加しました。待ち番号: ${queueNumber}`,
                };
            },
        }),

        // 順番待ち状況
        getQueueStatus: tool({
            description: "現在の順番待ち状況を取得する。",
            parameters: z.object({}),
            execute: async () => {
                const { data: entries, error } = await supabase
                    .from("queue_entries")
                    .select("guest_name, party_size, queue_number, status, created_at")
                    .eq("store_id", storeId)
                    .eq("status", "waiting")
                    .order("queue_number", { ascending: true });

                if (error) {
                    return { success: false, message: `取得エラー: ${error.message}` };
                }

                if (!entries || entries.length === 0) {
                    return { success: true, message: "現在、順番待ちのお客様はいません", data: [] };
                }

                const listText = entries
                    .map(e => `${e.queue_number}. ${e.guest_name}様（${e.party_size}名）`)
                    .join("\n");

                return {
                    success: true,
                    message: `【順番待ち】${entries.length}組\n${listText}`,
                    data: entries,
                };
            },
        }),

        // 次のお客様を呼ぶ
        callNextInQueue: tool({
            description: "順番待ちの次のお客様を呼び出す。",
            parameters: z.object({}),
            execute: async () => {
                const { data: entries } = await supabase
                    .from("queue_entries")
                    .select("id, guest_name, party_size, queue_number")
                    .eq("store_id", storeId)
                    .eq("status", "waiting")
                    .order("queue_number", { ascending: true })
                    .limit(1);

                if (!entries || entries.length === 0) {
                    return { success: false, message: "順番待ちのお客様がいません" };
                }

                const entry = entries[0];

                const { error } = await supabase
                    .from("queue_entries")
                    .update({ status: "notified", notified_at: new Date().toISOString() })
                    .eq("id", entry.id);

                if (error) {
                    return { success: false, message: `更新エラー: ${error.message}` };
                }

                return {
                    success: true,
                    message: `${entry.guest_name}様（${entry.party_size}名）をお呼びしました。待ち番号: ${entry.queue_number}`,
                };
            },
        }),

        // ========== ゲスト情報検索ツール ==========

        // ゲストの来店履歴
        getGuestVisitHistory: tool({
            description: "ゲストの来店履歴を取得する。",
            parameters: z.object({
                guestName: z.string().describe("ゲスト名（部分一致可）"),
                limit: z.number().default(10).describe("表示件数"),
            }),
            execute: async ({ guestName, limit }) => {
                // まずゲストを検索
                const { data: guests } = await supabase
                    .from("profiles")
                    .select("id, display_name")
                    .eq("store_id", storeId)
                    .eq("role", "guest")
                    .ilike("display_name", `%${guestName}%`);

                if (!guests || guests.length === 0) {
                    return { success: false, message: `「${guestName}」様が見つかりません` };
                }

                if (guests.length > 1) {
                    return { success: false, message: `複数の候補: ${guests.map(g => g.display_name).join(", ")}` };
                }

                const guest = guests[0];

                // session_guestsテーブルから来店履歴を取得
                const { data: visits } = await supabase
                    .from("session_guests")
                    .select("table_sessions(start_time, end_time, total_amount, tables(name))")
                    .eq("profile_id", guest.id)
                    .order("created_at", { ascending: false })
                    .limit(limit);

                if (!visits || visits.length === 0) {
                    return { success: true, message: `${guest.display_name}様の来店履歴はありません` };
                }

                const history = visits.map(v => {
                    const session = v.table_sessions as any;
                    return {
                        date: session?.start_time?.split("T")[0],
                        table: session?.tables?.name,
                        amount: session?.total_amount,
                    };
                });

                const listText = history
                    .filter(h => h.date)
                    .map(h => `・${h.date} ${h.table || ""} ¥${(h.amount || 0).toLocaleString()}`)
                    .join("\n");

                return {
                    success: true,
                    message: `【${guest.display_name}様の来店履歴】${visits.length}件\n${listText}`,
                    data: history,
                };
            },
        }),

        // 常連ゲスト一覧
        getFrequentGuests: tool({
            description: "来店回数の多い常連ゲストを取得する。",
            parameters: z.object({
                limit: z.number().default(10).describe("表示人数"),
                days: z.number().default(90).describe("過去何日間のデータか"),
            }),
            execute: async ({ limit, days }) => {
                const startDate = new Date();
                startDate.setDate(startDate.getDate() - days);
                const startDateStr = getJSTDateString(startDate);

                const { data: visits } = await supabase
                    .from("session_guests")
                    .select("profile_id, profiles(display_name), table_sessions(start_time)")
                    .eq("profiles.role", "guest")
                    .gte("table_sessions.start_time", `${startDateStr}T00:00:00`);

                if (!visits || visits.length === 0) {
                    return { success: true, message: "該当期間の来店データがありません" };
                }

                // 来店回数を集計
                const guestCounts: Record<string, { name: string; count: number }> = {};
                visits.forEach(v => {
                    const profileId = v.profile_id;
                    const name = (v.profiles as any)?.display_name;
                    if (name) {
                        if (!guestCounts[profileId]) {
                            guestCounts[profileId] = { name, count: 0 };
                        }
                        guestCounts[profileId].count += 1;
                    }
                });

                const ranking = Object.values(guestCounts)
                    .sort((a, b) => b.count - a.count)
                    .slice(0, limit);

                if (ranking.length === 0) {
                    return { success: true, message: "常連ゲストデータがありません" };
                }

                const listText = ranking
                    .map((g, i) => `${i + 1}. ${g.name}様: ${g.count}回`)
                    .join("\n");

                return {
                    success: true,
                    message: `【常連ゲストランキング（過去${days}日）】\n${listText}`,
                    data: ranking,
                };
            },
        }),

        // ========== ボトルキープ詳細ツール ==========

        // 期限切れ間近のボトル
        getExpiringBottles: tool({
            description: "期限切れが近いボトルキープを取得する。",
            parameters: z.object({
                days: z.number().default(14).describe("何日以内に期限が切れるものを表示するか"),
            }),
            execute: async ({ days }) => {
                const today = getJSTDateString();
                const futureDate = new Date();
                futureDate.setDate(futureDate.getDate() + days);
                const futureDateStr = getJSTDateString(futureDate);

                const { data: bottles, error } = await supabase
                    .from("bottle_keeps")
                    .select(`
                        id, remaining_amount, expiration_date,
                        menus(name),
                        bottle_keep_holders(profiles(display_name))
                    `)
                    .eq("store_id", storeId)
                    .gt("remaining_amount", 0)
                    .not("expiration_date", "is", null)
                    .gte("expiration_date", today)
                    .lte("expiration_date", futureDateStr)
                    .order("expiration_date", { ascending: true });

                if (error) {
                    return { success: false, message: `取得エラー: ${error.message}` };
                }

                if (!bottles || bottles.length === 0) {
                    return { success: true, message: `${days}日以内に期限切れのボトルはありません` };
                }

                const listText = bottles.map(b => {
                    const holderNames = (b.bottle_keep_holders as any[])
                        ?.map(h => h.profiles?.display_name)
                        .filter(Boolean)
                        .join(", ") || "不明";
                    return `・${b.expiration_date} ${(b.menus as any)?.name} (${holderNames}様) 残量${b.remaining_amount}%`;
                }).join("\n");

                return {
                    success: true,
                    message: `【${days}日以内に期限切れのボトル】${bottles.length}件\n${listText}`,
                    data: bottles,
                };
            },
        }),

        // ボトル残量確認
        getBottleDetails: tool({
            description: "ゲストのボトルキープ詳細を確認する。",
            parameters: z.object({
                guestName: z.string().describe("ゲスト名（部分一致可）"),
            }),
            execute: async ({ guestName }) => {
                const { data: guests } = await supabase
                    .from("profiles")
                    .select("id, display_name")
                    .eq("store_id", storeId)
                    .eq("role", "guest")
                    .ilike("display_name", `%${guestName}%`);

                if (!guests || guests.length === 0) {
                    return { success: false, message: `「${guestName}」様が見つかりません` };
                }

                if (guests.length > 1) {
                    return { success: false, message: `複数の候補: ${guests.map(g => g.display_name).join(", ")}` };
                }

                const guest = guests[0];

                const { data: holders } = await supabase
                    .from("bottle_keep_holders")
                    .select("bottle_keeps(id, remaining_amount, expiration_date, menus(name))")
                    .eq("profile_id", guest.id);

                const activeBottles = holders
                    ?.map(h => h.bottle_keeps)
                    .filter((b: any) => b && b.remaining_amount > 0) || [];

                if (activeBottles.length === 0) {
                    return { success: true, message: `${guest.display_name}様のアクティブなボトルキープはありません` };
                }

                const listText = activeBottles.map((b: any) => {
                    const expiry = b.expiration_date ? ` (期限:${b.expiration_date})` : "";
                    return `・${b.menus?.name}: 残量${b.remaining_amount}%${expiry}`;
                }).join("\n");

                return {
                    success: true,
                    message: `【${guest.display_name}様のボトルキープ】${activeBottles.length}件\n${listText}`,
                    data: activeBottles,
                };
            },
        }),

        // ========== 勤怠サマリーツール ==========

        // 勤務時間サマリー
        getWorkHoursSummary: tool({
            description: "特定の人の勤務時間サマリーを取得する。",
            parameters: z.object({
                name: z.string().describe("名前（部分一致可）"),
                period: z.enum(["week", "month"]).default("month").describe("期間"),
            }),
            execute: async ({ name, period }) => {
                const { data: profiles } = await supabase
                    .from("profiles")
                    .select("id, display_name")
                    .eq("store_id", storeId)
                    .ilike("display_name", `%${name}%`);

                if (!profiles || profiles.length === 0) {
                    return { success: false, message: `「${name}」が見つかりません` };
                }

                if (profiles.length > 1) {
                    return { success: false, message: `複数の候補: ${profiles.map(p => p.display_name).join(", ")}` };
                }

                const profile = profiles[0];
                const today = new Date();
                let startDate: string;

                if (period === "week") {
                    const weekAgo = new Date(today);
                    weekAgo.setDate(today.getDate() - 7);
                    startDate = getJSTDateString(weekAgo);
                } else {
                    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                    startDate = getJSTDateString(monthStart);
                }

                const { data: workRecords } = await supabase
                    .from("work_records")
                    .select("work_date, clock_in, clock_out, status")
                    .eq("profile_id", profile.id)
                    .gte("work_date", startDate)
                    .in("status", ["working", "completed"]);

                if (!workRecords || workRecords.length === 0) {
                    return { success: true, message: `${profile.display_name}さんの該当期間の勤務記録はありません` };
                }

                let totalMinutes = 0;
                let completedDays = 0;

                workRecords.forEach(w => {
                    if (w.clock_in && w.clock_out) {
                        const clockIn = new Date(w.clock_in);
                        const clockOut = new Date(w.clock_out);
                        const diffMinutes = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60);
                        totalMinutes += diffMinutes;
                        completedDays++;
                    }
                });

                const totalHours = Math.floor(totalMinutes / 60);
                const remainingMinutes = Math.round(totalMinutes % 60);
                const avgHours = completedDays > 0 ? (totalMinutes / completedDays / 60).toFixed(1) : 0;

                const periodLabel = period === "week" ? "今週" : "今月";

                return {
                    success: true,
                    message: `【${profile.display_name}さんの${periodLabel}の勤務サマリー】
・出勤日数: ${completedDays}日
・総勤務時間: ${totalHours}時間${remainingMinutes}分
・平均勤務時間: ${avgHours}時間/日`,
                    data: { totalHours, totalMinutes, completedDays, avgHours },
                };
            },
        }),

        // 遅刻者一覧
        getLateArrivals: tool({
            description: "遅刻者の一覧を取得する（予定時刻より遅れて出勤した人）。",
            parameters: z.object({
                date: z.string().optional().describe("日付（省略時は今日）"),
                threshold: z.number().default(15).describe("何分以上遅れたら遅刻とするか"),
            }),
            execute: async ({ date, threshold }) => {
                const targetDate = date || getJSTDateString();

                const { data: workRecords, error } = await supabase
                    .from("work_records")
                    .select("scheduled_start_time, clock_in, profiles(display_name)")
                    .eq("work_date", targetDate)
                    .not("scheduled_start_time", "is", null)
                    .not("clock_in", "is", null);

                if (error) {
                    return { success: false, message: `取得エラー: ${error.message}` };
                }

                if (!workRecords || workRecords.length === 0) {
                    return { success: true, message: `${targetDate}の出勤データがありません` };
                }

                const lateArrivals = workRecords.filter(w => {
                    if (!w.scheduled_start_time || !w.clock_in) return false;

                    // scheduled_start_timeは "HH:MM:SS" 形式
                    const [schHour, schMin] = w.scheduled_start_time.split(":").map(Number);
                    const scheduledMinutes = schHour * 60 + schMin;

                    // clock_inはISO形式のタイムスタンプ
                    const clockInDate = new Date(w.clock_in);
                    const clockInMinutes = clockInDate.getHours() * 60 + clockInDate.getMinutes();

                    return clockInMinutes - scheduledMinutes > threshold;
                }).map(w => {
                    const [schHour, schMin] = w.scheduled_start_time!.split(":").map(Number);
                    const scheduledMinutes = schHour * 60 + schMin;
                    const clockInDate = new Date(w.clock_in!);
                    const clockInMinutes = clockInDate.getHours() * 60 + clockInDate.getMinutes();
                    const lateMinutes = clockInMinutes - scheduledMinutes;

                    return {
                        name: (w.profiles as any)?.display_name,
                        scheduled: w.scheduled_start_time,
                        actual: clockInDate.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tokyo" }),
                        lateMinutes,
                    };
                });

                if (lateArrivals.length === 0) {
                    return { success: true, message: `${targetDate}の遅刻者はいません` };
                }

                const listText = lateArrivals
                    .map(l => `・${l.name}: 予定${l.scheduled} → 実際${l.actual}（${l.lateMinutes}分遅刻）`)
                    .join("\n");

                return {
                    success: true,
                    message: `【${targetDate}の遅刻者】${lateArrivals.length}名\n${listText}`,
                    data: lateArrivals,
                };
            },
        }),
    };
}
