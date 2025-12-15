import { NextRequest, NextResponse } from "next/server";

// OpenAI Admin API requires Admin API key
const OPENAI_ADMIN_KEY = process.env.OPENAI_ADMIN_KEY;
// Optional: Filter by specific project ID (get from OpenAI dashboard -> Settings -> General -> Project ID)
const OPENAI_PROJECT_ID = process.env.OPENAI_PROJECT_ID;

interface CostBucket {
    object: string;
    amount: {
        value: number;
        currency: string;
    };
    line_item: {
        name: string;
        cost: number;
    } | null;
    start_time: number;
    end_time: number;
}

interface CostsResponse {
    object: string;
    data: CostBucket[];
    has_more: boolean;
    next_page: string | null;
}

interface UsageBucket {
    object: string;
    start_time: number;
    end_time: number;
    results: {
        object: string;
        input_tokens: number;
        output_tokens: number;
        num_model_requests: number;
        project_id?: string;
        user_id?: string;
        api_key_id?: string;
        model?: string;
    }[];
}

interface UsageResponse {
    object: string;
    data: UsageBucket[];
    has_more: boolean;
    next_page: string | null;
}

export async function GET(request: NextRequest) {
    if (!OPENAI_ADMIN_KEY) {
        return NextResponse.json(
            { error: "OpenAI Admin API key not configured" },
            { status: 500 }
        );
    }

    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get("period") || "30days";

    // Calculate start time based on period
    const now = Math.floor(Date.now() / 1000);
    let startTime: number;

    switch (period) {
        case "today":
            // Start of today in JST
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            startTime = Math.floor(todayStart.getTime() / 1000);
            break;
        case "7days":
            startTime = now - 7 * 24 * 60 * 60;
            break;
        case "30days":
            startTime = now - 30 * 24 * 60 * 60;
            break;
        case "90days":
            startTime = now - 90 * 24 * 60 * 60;
            break;
        default:
            startTime = now - 30 * 24 * 60 * 60;
    }

    try {
        // Fetch costs data
        const costsUrl = new URL("https://api.openai.com/v1/organization/costs");
        costsUrl.searchParams.set("start_time", startTime.toString());
        costsUrl.searchParams.set("limit", "100");
        costsUrl.searchParams.set("bucket_width", "1d");
        // Filter by project if specified
        if (OPENAI_PROJECT_ID) {
            costsUrl.searchParams.set("project_ids", OPENAI_PROJECT_ID);
        }

        const costsRes = await fetch(costsUrl.toString(), {
            headers: {
                "Authorization": `Bearer ${OPENAI_ADMIN_KEY}`,
                "Content-Type": "application/json",
            },
        });

        if (!costsRes.ok) {
            const errorText = await costsRes.text();
            console.error("OpenAI Costs API error:", costsRes.status, errorText);
            return NextResponse.json(
                { error: `OpenAI API error: ${costsRes.status}` },
                { status: costsRes.status }
            );
        }

        const costsData: CostsResponse = await costsRes.json();

        // Fetch usage data (completions)
        const usageUrl = new URL("https://api.openai.com/v1/organization/usage/completions");
        usageUrl.searchParams.set("start_time", startTime.toString());
        usageUrl.searchParams.set("limit", "100");
        usageUrl.searchParams.set("bucket_width", "1d");
        usageUrl.searchParams.set("group_by", "model");
        // Filter by project if specified
        if (OPENAI_PROJECT_ID) {
            usageUrl.searchParams.set("project_ids", OPENAI_PROJECT_ID);
        }

        const usageRes = await fetch(usageUrl.toString(), {
            headers: {
                "Authorization": `Bearer ${OPENAI_ADMIN_KEY}`,
                "Content-Type": "application/json",
            },
        });

        let usageData: UsageResponse | null = null;
        if (usageRes.ok) {
            usageData = await usageRes.json();
        }

        // Calculate totals
        let totalCost = 0;
        const dailyCosts: { date: string; cost: number }[] = [];

        for (const bucket of costsData.data) {
            totalCost += bucket.amount.value;
            const date = new Date(bucket.start_time * 1000).toLocaleDateString("ja-JP", {
                month: "short",
                day: "numeric",
            });
            dailyCosts.push({
                date,
                cost: bucket.amount.value,
            });
        }

        // Calculate usage totals by model
        const modelUsage: Record<string, { inputTokens: number; outputTokens: number; requests: number }> = {};
        let totalInputTokens = 0;
        let totalOutputTokens = 0;
        let totalRequests = 0;

        if (usageData) {
            for (const bucket of usageData.data) {
                for (const result of bucket.results) {
                    const model = result.model || "unknown";
                    if (!modelUsage[model]) {
                        modelUsage[model] = { inputTokens: 0, outputTokens: 0, requests: 0 };
                    }
                    modelUsage[model].inputTokens += result.input_tokens;
                    modelUsage[model].outputTokens += result.output_tokens;
                    modelUsage[model].requests += result.num_model_requests;

                    totalInputTokens += result.input_tokens;
                    totalOutputTokens += result.output_tokens;
                    totalRequests += result.num_model_requests;
                }
            }
        }

        // Convert model usage to array and sort by requests
        const modelBreakdown = Object.entries(modelUsage)
            .map(([model, data]) => ({
                model,
                ...data,
                totalTokens: data.inputTokens + data.outputTokens,
            }))
            .sort((a, b) => b.requests - a.requests);

        return NextResponse.json({
            overview: {
                totalCost: Math.round(totalCost * 100) / 100,
                currency: costsData.data[0]?.amount.currency || "usd",
                totalInputTokens,
                totalOutputTokens,
                totalTokens: totalInputTokens + totalOutputTokens,
                totalRequests,
            },
            dailyCosts: dailyCosts.reverse(), // Oldest to newest for chart
            modelBreakdown,
            period,
        });
    } catch (error) {
        console.error("OpenAI Usage API error:", error);
        return NextResponse.json(
            { error: "Failed to fetch OpenAI usage data" },
            { status: 500 }
        );
    }
}
