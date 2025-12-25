import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import { createServerClient } from "@/lib/supabaseServerClient";

export const maxDuration = 30;

const businessCardSchema = z.object({
    name: z.string().describe("氏名（漢字）"),
    nameKana: z.string().optional().describe("氏名（ふりがな・ひらがな）"),
});

export async function POST(request: Request) {
    try {
        // 認証チェック
        const supabase = await createServerClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await request.formData();
        const image = formData.get("image") as File;

        if (!image) {
            return Response.json({ error: "No image provided" }, { status: 400 });
        }

        // 画像をbase64に変換
        const bytes = await image.arrayBuffer();
        const base64 = Buffer.from(bytes).toString("base64");
        const mimeType = image.type || "image/jpeg";

        // OpenAI Vision APIで名刺を解析
        const result = await generateObject({
            model: openai("gpt-4o"),
            schema: businessCardSchema,
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "この名刺の画像から情報を抽出してください。日本語の名刺の場合、氏名のふりがなも推測してください。電話番号はハイフン区切りで返してください。",
                        },
                        {
                            type: "image",
                            image: `data:${mimeType};base64,${base64}`,
                        },
                    ],
                },
            ],
        });

        return Response.json(result.object);
    } catch (error) {
        console.error("Business card parse error:", error);
        return Response.json(
            { error: "Failed to parse business card" },
            { status: 500 }
        );
    }
}
