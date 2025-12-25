import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { createServerClient } from "@/lib/supabaseServerClient";
import { createServiceRoleClient } from "@/lib/supabaseServiceClient";
import { createAITools } from "@/lib/ai-tools";

export const maxDuration = 60;

// Get store context data for AI
async function getStoreContext(storeId: string) {
    const supabase = await createServerClient() as any;

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
    const profiles: any[] = profilesResult.data || [];
    const menus: any[] = menusResult.data || [];
    const seats: any[] = seatsResult.data || [];
    const slips: any[] = slipsResult.data || [];
    const attendance: any[] = attendanceResult.data || [];
    const bottles: any[] = bottlesResult.data || [];

    // Calculate statistics
    const castCount = profiles.filter((p: any) => p.role === "cast").length;
    const staffCount = profiles.filter((p: any) => p.role === "staff" || p.role === "admin").length;
    const totalSeats = seats.length;
    const activeSeats = seats.filter((s: any) => s.status === "occupied").length;

    const totalRevenue = slips
        .filter((s: any) => s.status === "paid")
        .reduce((sum: number, s: any) => sum + (s.total_amount || 0), 0);
    const avgSlipAmount = slips.length > 0 ? totalRevenue / slips.filter((s: any) => s.status === "paid").length : 0;

    const todayAttendance = attendance.filter((a: any) => a.status === "working" || a.status === "checked_in");

    return `
## 店舗情報
- 店舗名: ${store?.name || "不明"}
- 住所: ${store?.address || "未設定"}

## スタッフ情報
- キャスト数: ${castCount}名
- スタッフ数: ${staffCount}名
- プロフィール一覧: ${profiles.map((p: any) => `${p.display_name}(${p.role})`).join(", ")}

## 本日の出勤状況
- 出勤中: ${todayAttendance.length}名
${attendance.map((a: any) => `- ${(a.profiles as any)?.display_name || "不明"}: ${a.status}`).join("\n")}

## メニュー情報
- メニュー数: ${menus.length}件
- カテゴリ: ${[...new Set(menus.map((m: any) => m.category))].filter(Boolean).join(", ")}
- 主なメニュー: ${menus.slice(0, 10).map((m: any) => `${m.name}(¥${m.price?.toLocaleString()})`).join(", ")}

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
${bottles.slice(0, 5).map((b: any) => `- ${b.customer_name}: ${b.bottle_name}`).join("\n")}
`;
}

export async function POST(req: Request) {
    try {
        const supabase = await createServerClient() as any;

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
                    .in("id", oldMessages.map((m: any) => m.id));
            }
        }

        const systemPrompt = `あなたは「Nightbase」という夜のお店（キャバクラ、クラブ、バーなど）向けの業務管理システムのAIアシスタントです。

## あなたの役割
- 店舗運営に関する質問に答える
- データに基づいた分析やアドバイスを提供する
- 売上、出勤、在庫などの状況を説明する
- 業務効率化の提案をする
- ユーザーからの指示に基づいて操作を実行する

## 実行できる操作

### 基本操作
- キャスト/スタッフ/ゲストの登録（例: 「さつきをキャスト登録して」「田中をスタッフ登録して」「山田さんをゲスト登録して」）
- 出勤/退勤の登録（例: 「ゆりを出勤にして」「ゆりを18:00に出勤にして」「太郎を23:30に退勤にして」「ゆりを新宿駅で出勤にして」）
- 送迎の管理（例: 「あやかの送迎先を渋谷駅にして」「送迎希望者は？」「まりの送迎をキャンセル」）
- 卓のオープン/クローズ（例: 「A卓を開けて」「VIP1の会計をして」）
- 注文の登録（例: 「A卓にビール3本」「B卓にシャンパン、あやか付きで」）
- ボトルキープの登録（例: 「山田さんのウイスキーをキープして」）
- プロフィール検索（例: 「あいりはいる？」「田中さんを探して」）

### 予約管理
- 予約一覧の確認（例: 「今日の予約を教えて」「明日の予約は？」）
- 予約の作成（例: 「20時に山田様3名で予約入れて」「佐藤様2名、あいり指名で21時に予約」）
- 予約のキャンセル（例: 「山田様の予約をキャンセル」）

### 売上分析・レポート
- 売上確認（例: 「今日の売上は？」「昨日の売上を教えて」）
- 売上比較（例: 「今週の売上を先週と比較して」「今月の売上サマリー」）
- キャストランキング（例: 「今月のトップキャストは？」「今週のキャストランキング」）
- 日報作成（例: 「今日の日報を作成して」「昨日の日報」）

### シフト確認
- シフト一覧（例: 「明日の出勤予定は？」「来週月曜のシフト」）
- 個人のシフト（例: 「あいりの今後のシフトは？」「田中さんの来週のシフト」）

### 買い出し・在庫
- 買い出しリスト確認（例: 「買い出しリストを見せて」）
- 買い出しリストに追加（例: 「ビール2ケースを買い出しリストに追加」）
- 購入完了（例: 「ビールを購入完了にして」）

### 順番待ち管理
- 順番待ちに追加（例: 「田中様2名を待ちリストに追加」）
- 順番待ち状況（例: 「待ち状況は？」「何組待ってる？」）
- 次のお客様を呼ぶ（例: 「次のお客様を呼んで」）

### ゲスト情報
- 来店履歴（例: 「山田様の来店履歴」）
- 常連ゲスト（例: 「常連のお客様は？」「よく来るお客様」）

### ボトルキープ詳細
- 期限切れ確認（例: 「期限切れ間近のボトルは？」）
- ボトル残量（例: 「山田様のボトル残量は？」）

### 勤怠サマリー
- 勤務時間確認（例: 「あいりの今月の勤務時間は？」）
- 遅刻者確認（例: 「今日の遅刻者は？」「昨日遅刻した人」）

## 現在の店舗データ
${storeContext}

## アクションボタンについて
ユーザーが特定の人物について質問した場合（例:「○○というキャストはいる？」）、searchProfileツールを使って検索してください。
検索結果が見つかった場合、回答の最後に以下の形式でアクション情報を含めてください:

[[ACTION:open_profile:プロフィールID:ラベル]]

例: 「あいりさん（キャスト）が見つかりました。[[ACTION:open_profile:abc123:あいりのプロフィールを開く]]」

複数の候補がある場合は、それぞれにアクションを追加してください。

## 注意事項
- 日本語で回答してください
- 操作を実行したら、結果を簡潔に報告してください
- 名前が曖昧な場合は確認してください
- 金額は日本円で表示してください`;

        // Create tools with service role client for write operations
        const serviceSupabase = createServiceRoleClient() as any;
        const tools = createAITools(serviceSupabase, profile.store_id);

        const result = streamText({
            model: openai("gpt-4o-mini") as any,
            system: systemPrompt,
            messages,
            tools: tools as any,
            maxSteps: 5,
            onFinish: async ({ text }) => {
                // Save assistant response to database
                if (text) {
                    await supabase.from("ai_chat_messages").insert({
                        store_id: profile.store_id,
                        profile_id: profile.id,
                        role: "assistant",
                        content: text,
                    });
                }
            },
        } as any);

        return result.toTextStreamResponse();
    } catch (error) {
        console.error("AI Chat error:", error);
        return new Response("Internal Server Error", { status: 500 });
    }
}
