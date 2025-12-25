import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { createServerClient } from "@/lib/supabaseServerClient";

export const maxDuration = 60;

export async function POST(request: Request) {
    try {
        // Verify user is authenticated
        const supabase = await createServerClient() as any;
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return new Response(JSON.stringify({ error: "認証が必要です" }), {
                status: 401,
                headers: { "Content-Type": "application/json" },
            });
        }

        const { profileId, role, contextData, profileName } = await request.json();

        if (!profileId || !role || !contextData) {
            return new Response(JSON.stringify({ error: "必要なパラメータが不足しています" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        const roleLabel = role === "guest" ? "ゲスト" : role === "cast" ? "キャスト" : "スタッフ";

        const systemPrompt = `あなたは店舗管理システムのAIアシスタントです。
提供されたデータに基づいて、${roleLabel}の分析レポートを日本語で作成してください。

レポートの形式:
1. 簡潔で読みやすい形式にすること
2. 重要なポイントを箇条書きで整理
3. データに基づいた客観的な分析を行う
4. 改善点や特筆すべき点があれば提案する
5. 全体で300-500文字程度に収める

${role === "guest" ? `
ゲストのレポートでは以下を分析してください:
- 来店パターン（頻度、傾向）
- 利用金額の傾向
- リピート率の評価
- 顧客としての特徴や価値
` : `
${roleLabel}のレポートでは以下を分析してください:
- 勤務状況の傾向
- 出勤の安定性
- 勤務時間のパターン
${role === "cast" ? "- 接客実績の評価" : ""}
- 今後期待される点
`}`;

        const userPrompt = `以下のデータに基づいて、${profileName}さんの分析レポートを作成してください。

${contextData}`;

        const result = await generateText({
            model: openai("gpt-4o-mini") as any,
            system: systemPrompt,
            prompt: userPrompt,
            maxTokens: 1000,
            temperature: 0.7,
        } as any);

        return new Response(JSON.stringify({ report: result.text }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("Error in generate-report API:", error);
        return new Response(JSON.stringify({ error: "レポート生成に失敗しました" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
