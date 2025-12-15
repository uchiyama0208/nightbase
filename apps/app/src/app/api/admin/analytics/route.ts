import { NextRequest, NextResponse } from "next/server";
import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { createServerClient } from "@/lib/supabaseServerClient";
import path from "path";

// Initialize GA4 client
const credentialsPath = path.join(process.cwd(), "google-credentials.json");
const analyticsDataClient = new BetaAnalyticsDataClient({
    keyFilename: credentialsPath,
});

const propertyId = process.env.GA_PROPERTY_ID;

export async function GET(request: NextRequest) {
    // Check admin auth
    const supabase = await createServerClient() as any;
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userData } = await supabase
        .from("users")
        .select("is_admin")
        .eq("id", user.id)
        .maybeSingle();

    if (!userData?.is_admin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!propertyId) {
        return NextResponse.json({ error: "GA_PROPERTY_ID not configured" }, { status: 500 });
    }

    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get("period") || "7days";

    // Calculate date range
    let startDate: string;
    switch (period) {
        case "today":
            startDate = "today";
            break;
        case "7days":
            startDate = "7daysAgo";
            break;
        case "30days":
            startDate = "30daysAgo";
            break;
        case "90days":
            startDate = "90daysAgo";
            break;
        default:
            startDate = "7daysAgo";
    }

    try {
        // Fetch multiple reports in parallel
        const [
            overviewResponse,
            trafficSourcesResponse,
            topPagesResponse,
            deviceResponse,
        ] = await Promise.all([
            // Overview metrics
            analyticsDataClient.runReport({
                property: `properties/${propertyId}`,
                dateRanges: [{ startDate, endDate: "today" }],
                metrics: [
                    { name: "activeUsers" },
                    { name: "sessions" },
                    { name: "screenPageViews" },
                    { name: "averageSessionDuration" },
                    { name: "bounceRate" },
                ],
            }),
            // Traffic sources
            analyticsDataClient.runReport({
                property: `properties/${propertyId}`,
                dateRanges: [{ startDate, endDate: "today" }],
                dimensions: [{ name: "sessionSource" }],
                metrics: [{ name: "sessions" }],
                orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
                limit: 10,
            }),
            // Top pages
            analyticsDataClient.runReport({
                property: `properties/${propertyId}`,
                dateRanges: [{ startDate, endDate: "today" }],
                dimensions: [{ name: "pagePath" }],
                metrics: [{ name: "screenPageViews" }],
                orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
                limit: 10,
            }),
            // Device breakdown
            analyticsDataClient.runReport({
                property: `properties/${propertyId}`,
                dateRanges: [{ startDate, endDate: "today" }],
                dimensions: [{ name: "deviceCategory" }],
                metrics: [{ name: "sessions" }],
            }),
        ]);

        // Parse overview
        const overviewRow = overviewResponse[0]?.rows?.[0];
        const overview = {
            activeUsers: parseInt(overviewRow?.metricValues?.[0]?.value || "0"),
            sessions: parseInt(overviewRow?.metricValues?.[1]?.value || "0"),
            pageViews: parseInt(overviewRow?.metricValues?.[2]?.value || "0"),
            avgSessionDuration: parseFloat(overviewRow?.metricValues?.[3]?.value || "0"),
            bounceRate: parseFloat(overviewRow?.metricValues?.[4]?.value || "0") * 100,
        };

        // Parse traffic sources
        const trafficSources = trafficSourcesResponse[0]?.rows?.map((row) => ({
            source: row.dimensionValues?.[0]?.value || "Unknown",
            sessions: parseInt(row.metricValues?.[0]?.value || "0"),
        })) || [];

        // Parse top pages
        const topPages = topPagesResponse[0]?.rows?.map((row) => ({
            path: row.dimensionValues?.[0]?.value || "/",
            views: parseInt(row.metricValues?.[0]?.value || "0"),
        })) || [];

        // Parse device breakdown
        const devices = deviceResponse[0]?.rows?.map((row) => ({
            device: row.dimensionValues?.[0]?.value || "Unknown",
            sessions: parseInt(row.metricValues?.[0]?.value || "0"),
        })) || [];

        return NextResponse.json({
            overview,
            trafficSources,
            topPages,
            devices,
            period,
        });
    } catch (error: any) {
        console.error("Analytics API error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch analytics" },
            { status: 500 }
        );
    }
}
