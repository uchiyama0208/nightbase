import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { createServerClient } from "@/lib/supabaseServerClient";

export const maxDuration = 60;

// Get store context data for AI
async function getStoreContext(storeId: string) {
    const supabase = await createServerClient();

    // Fetch all relevant store data in parallel
    const [
        storeResult,
        profilesResult,
        menusResult,
        seatsResult,
        slipsResult,
        attendanceResult,
        bottlesResult,
    ] = await Promise.all([
        // Store info
        supabase.from("stores").select("*").eq("id", storeId).single(),
        // Profiles (staff and casts)
        supabase.from("profiles").select("id, display_name, role, status").eq("store_id", storeId),
        // Menus
        supabase.from("menus").select("id, name, price, category").eq("store_id", storeId),
        // Seats
        supabase.from("seats").select("id, name, capacity, status").eq("store_id", storeId),
        // Recent slips (last 30 days)
        supabase
            .from("slips")
            .select("id, total_amount, status, created_at")
            .eq("store_id", storeId)
            .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
            .order("created_at", { ascending: false })
            .limit(100),
        // Today's attendance
        supabase
            .from("attendance")
            .select("id, profile_id, status, check_in_time, check_out_time, profiles(display_name)")
            .eq("store_id", storeId)
            .gte("created_at", new Date().toISOString().split("T")[0]),
        // Bottle keeps
        supabase
            .from("bottle_keeps")
            .select("id, customer_name, bottle_name, status, expires_at")
            .eq("store_id", storeId)
            .eq("status", "active"),
    ]);

    const store = storeResult.data;
    const profiles = profilesResult.data || [];
    const menus = menusResult.data || [];
    const seats = seatsResult.data || [];
    const slips = slipsResult.data || [];
    const attendance = attendanceResult.data || [];
    const bottles = bottlesResult.data || [];

    // Calculate statistics
    const castCount = profiles.filter(p => p.role === "cast").length;
    const staffCount = profiles.filter(p => p.role === "staff" || p.role === "admin").length;
    const totalSeats = seats.length;
    const activeSeats = seats.filter(s => s.status === "occupied").length;

    const totalRevenue = slips
        .filter(s => s.status === "paid")
        .reduce((sum, s) => sum + (s.total_amount || 0), 0);
    const avgSlipAmount = slips.length > 0 ? totalRevenue / slips.filter(s => s.status === "paid").length : 0;

    const todayAttendance = attendance.filter(a => a.status === "working" || a.status === "checked_in");

    return `
## 店舗情報
- 店舗名: ${store?.name || "不明"}
- 住所: ${store?.address || "未設定"}

## スタッフ情報
- キャスト数: ${castCount}名
- スタッフ数: ${staffCount}名
- プロフィール一覧: ${profiles.map(p => `${p.display_name}(${p.role})`).join(", ")}

## 本日の出勤状況
- 出勤中: ${todayAttendance.length}名
${attendance.map(a => `- ${(a.profiles as any)?.display_name || "不明"}: ${a.status}`).join("\n")}

## メニュー情報
- メニュー数: ${menus.length}件
- カテゴリ: ${[...new Set(menus.map(m => m.category))].filter(Boolean).join(", ")}
- 主なメニュー: ${menus.slice(0, 10).map(m => `${m.name}(¥${m.price?.toLocaleString()})`).join(", ")}

## 席情報
- 総席数: ${totalSeats}席
- 使用中: ${activeSeats}席
- 空き: ${totalSeats - activeSeats}席

## 売上情報（過去30日）
- 総売上: ¥${totalRevenue.toLocaleString()}
- 伝票数: ${slips.length}件
- 平均客単価: ¥${Math.round(avgSlipAmount).toLocaleString()}

## ボトルキープ
- アクティブなボトルキープ: ${bottles.length}件
${bottles.slice(0, 5).map(b => `- ${b.customer_name}: ${b.bottle_name}`).join("\n")}
`;
}

export async function POST(req: Request) {
    try {
        const supabase = await createServerClient();

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return new Response("Unauthorized", { status: 401 });
        }

        // Get current profile and verify role
        const { data: appUser } = await supabase
            .from("users")
            .select("current_profile_id")
            .eq("id", user.id)
            .maybeSingle();

        if (!appUser?.current_profile_id) {
            return new Response("No profile selected", { status: 400 });
        }

        const { data: profile } = await supabase
            .from("profiles")
            .select("id, store_id, role")
            .eq("id", appUser.current_profile_id)
            .maybeSingle();

        if (!profile?.store_id) {
            return new Response("No store found", { status: 400 });
        }

        // Check if user has admin or staff role
        if (!["admin", "staff"].includes(profile.role)) {
            return new Response("Permission denied", { status: 403 });
        }

        const { messages } = await req.json();

        // Get store context
        const storeContext = await getStoreContext(profile.store_id);

        // Save user message to database
        const lastUserMessage = messages[messages.length - 1];
        if (lastUserMessage?.role === "user") {
            await supabase.from("ai_chat_messages").insert({
                store_id: profile.store_id,
                profile_id: profile.id,
                role: "user",
                content: lastUserMessage.content,
            });

            // Cleanup old messages (keep only last 50)
            const { data: oldMessages } = await supabase
                .from("ai_chat_messages")
                .select("id")
                .eq("store_id", profile.store_id)
                .order("created_at", { ascending: false })
                .range(50, 1000);

            if (oldMessages && oldMessages.length > 0) {
                await supabase
                    .from("ai_chat_messages")
                    .delete()
                    .in("id", oldMessages.map(m => m.id));
            }
        }

        const systemPrompt = `あなたは「Nightbase」という夜のお店（キャバクラ、クラブ、バーなど）向けの業務管理システムのAIアシスタントです。

## あなたの役割
- 店舗運営に関する質問に答える
- データに基づいた分析やアドバイスを提供する
- 売上、出勤、在庫などの状況を説明する
- 業務効率化の提案をする

## 現在の店舗データ
${storeContext}

## 注意事項
- 日本語で回答してください
- データに基づいて具体的に回答してください
- 分からないことは正直に分からないと言ってください
- 簡潔で分かりやすい回答を心がけてください
- 金額は日本円で表示してください`;

        const result = await streamText({
            model: openai("gpt-4o-mini"),
            system: systemPrompt,
            messages,
            onFinish: async ({ text }) => {
                // Save assistant response to database
                await supabase.from("ai_chat_messages").insert({
                    store_id: profile.store_id,
                    profile_id: profile.id,
                    role: "assistant",
                    content: text,
                });
            },
        });

        return result.toDataStreamResponse();
    } catch (error) {
        console.error("AI Chat error:", error);
        return new Response("Internal Server Error", { status: 500 });
    }
}
