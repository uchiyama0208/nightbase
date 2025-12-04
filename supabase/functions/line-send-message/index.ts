import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
};

const LINE_PUSH_URL = "https://api.line.me/v2/bot/message/push";
const LINE_MULTICAST_URL = "https://api.line.me/v2/bot/message/multicast";

interface SendMessageRequest {
    lineUserIds: string[];
    message: string;
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    if (req.method !== "POST") {
        return new Response("Method not allowed", {
            status: 405,
            headers: corsHeaders,
        });
    }

    try {
        const body: SendMessageRequest = await req.json();
        const { lineUserIds, message } = body;

        if (!lineUserIds || lineUserIds.length === 0 || !message) {
            return new Response(
                JSON.stringify({ error: "Missing required fields" }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        const channelAccessToken = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN");
        if (!channelAccessToken) {
            console.error("LINE_CHANNEL_ACCESS_TOKEN not configured");
            return new Response(
                JSON.stringify({ error: "LINE_CHANNEL_ACCESS_TOKEN not configured" }),
                {
                    status: 500,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        let response: Response;
        let sentCount = 0;

        if (lineUserIds.length === 1) {
            // Push Message (単一ユーザー)
            response = await fetch(LINE_PUSH_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${channelAccessToken}`,
                },
                body: JSON.stringify({
                    to: lineUserIds[0],
                    messages: [{ type: "text", text: message }],
                }),
            });
            sentCount = 1;
        } else {
            // Multicast (複数ユーザー、最大500人)
            // 500人を超える場合は分割して送信
            const chunks: string[][] = [];
            for (let i = 0; i < lineUserIds.length; i += 500) {
                chunks.push(lineUserIds.slice(i, i + 500));
            }

            for (const chunk of chunks) {
                response = await fetch(LINE_MULTICAST_URL, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${channelAccessToken}`,
                    },
                    body: JSON.stringify({
                        to: chunk,
                        messages: [{ type: "text", text: message }],
                    }),
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error("LINE Multicast error:", errorText);
                    return new Response(
                        JSON.stringify({ error: `LINE API error: ${errorText}` }),
                        {
                            status: response.status,
                            headers: { ...corsHeaders, "Content-Type": "application/json" },
                        }
                    );
                }

                sentCount += chunk.length;
            }
        }

        // 単一送信の場合のエラーチェック
        if (lineUserIds.length === 1 && !response!.ok) {
            const errorText = await response!.text();
            console.error("LINE Push error:", errorText);
            return new Response(
                JSON.stringify({ error: `LINE API error: ${errorText}` }),
                {
                    status: response!.status,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        return new Response(
            JSON.stringify({ success: true, sentCount }),
            {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    } catch (error) {
        console.error("Error:", error);
        return new Response(
            JSON.stringify({ error: (error as Error).message }),
            {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    }
});
