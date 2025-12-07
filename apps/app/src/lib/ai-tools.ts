import { z } from "zod";
import { tool } from "ai";
import { SupabaseClient } from "@supabase/supabase-js";
import { getJSTDateString } from "./utils";

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
                    .from("time_cards")
                    .select("id, clock_in, clock_out")
                    .eq("user_id", profile.id)
                    .eq("work_date", today)
                    .maybeSingle();

                if (existing && !existing.clock_out) {
                    return { success: false, message: `${profile.display_name}さんは既に出勤中です` };
                }

                // 新規出勤レコードを作成
                const { error: insertError } = await supabase
                    .from("time_cards")
                    .insert({
                        user_id: profile.id,
                        work_date: today,
                        clock_in: clockInTime,
                        pickup_required: !!pickupDestination,
                        pickup_destination: pickupDestination || null,
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
                    .from("time_cards")
                    .select("id, clock_out")
                    .eq("user_id", profile.id)
                    .eq("work_date", today)
                    .is("clock_out", null)
                    .maybeSingle();

                if (!existing) {
                    return { success: false, message: `${profile.display_name}さんは出勤していません` };
                }

                const { error: updateError } = await supabase
                    .from("time_cards")
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
                    .from("time_cards")
                    .select("user_id, clock_in, profiles(display_name, role)")
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
                        approval_status: "approved",
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
                    .from("time_cards")
                    .select("id")
                    .eq("user_id", profile.id)
                    .eq("work_date", today)
                    .is("clock_out", null)
                    .maybeSingle();

                if (!timeCard) {
                    return { success: false, message: `${profile.display_name}さんは本日出勤していません` };
                }

                const { error: updateError } = await supabase
                    .from("time_cards")
                    .update({
                        pickup_required: true,
                        pickup_destination: destination,
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
                    .from("time_cards")
                    .select("user_id, pickup_destination, profiles(display_name)")
                    .eq("work_date", today)
                    .eq("pickup_required", true)
                    .is("clock_out", null);

                if (!timeCards || timeCards.length === 0) {
                    return { success: true, message: "本日の送迎希望者はいません", data: [] };
                }

                const pickupList = timeCards.map(tc => ({
                    name: (tc.profiles as any)?.display_name,
                    destination: tc.pickup_destination,
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
                    .from("time_cards")
                    .select("id")
                    .eq("user_id", profile.id)
                    .eq("work_date", today)
                    .eq("pickup_required", true)
                    .is("clock_out", null)
                    .maybeSingle();

                if (!timeCard) {
                    return { success: false, message: `${profile.display_name}さんは送迎希望を出していません` };
                }

                const { error: updateError } = await supabase
                    .from("time_cards")
                    .update({
                        pickup_required: false,
                        pickup_destination: null,
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
    };
}
