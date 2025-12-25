import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { createServerClient } from "@/lib/supabaseServerClient";
import path from "path";

const SITE_URL = "https://nightbase.jp";

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

    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get("period") || "7days";

    // Calculate date range
    const endDate = new Date();
    let startDate = new Date();

    switch (period) {
        case "today":
            startDate.setDate(endDate.getDate() - 1);
            break;
        case "7days":
            startDate.setDate(endDate.getDate() - 7);
            break;
        case "30days":
            startDate.setDate(endDate.getDate() - 30);
            break;
        case "90days":
            startDate.setDate(endDate.getDate() - 90);
            break;
        default:
            startDate.setDate(endDate.getDate() - 7);
    }

    const formatDate = (date: Date) => date.toISOString().split("T")[0];

    try {
        // Initialize auth
        const credentialsPath = path.join(process.cwd(), "google-credentials.json");
        const auth = new google.auth.GoogleAuth({
            keyFile: credentialsPath,
            scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
        });

        const searchconsole = google.searchconsole({ version: "v1", auth });

        // Fetch search analytics
        const [queryResponse, pageResponse, overviewResponse] = await Promise.all([
            // Top queries
            searchconsole.searchanalytics.query({
                siteUrl: SITE_URL,
                requestBody: {
                    startDate: formatDate(startDate),
                    endDate: formatDate(endDate),
                    dimensions: ["query"],
                    rowLimit: 10,
                },
            }),
            // Top pages
            searchconsole.searchanalytics.query({
                siteUrl: SITE_URL,
                requestBody: {
                    startDate: formatDate(startDate),
                    endDate: formatDate(endDate),
                    dimensions: ["page"],
                    rowLimit: 10,
                },
            }),
            // Overview (total)
            searchconsole.searchanalytics.query({
                siteUrl: SITE_URL,
                requestBody: {
                    startDate: formatDate(startDate),
                    endDate: formatDate(endDate),
                },
            }),
        ]);

        // Parse overview
        const overviewRow = overviewResponse.data.rows?.[0];
        const overview = {
            clicks: overviewRow?.clicks || 0,
            impressions: overviewRow?.impressions || 0,
            ctr: (overviewRow?.ctr || 0) * 100,
            position: overviewRow?.position || 0,
        };

        // Parse queries
        const queries = queryResponse.data.rows?.map((row) => ({
            query: row.keys?.[0] || "",
            clicks: row.clicks || 0,
            impressions: row.impressions || 0,
            ctr: (row.ctr || 0) * 100,
            position: row.position || 0,
        })) || [];

        // Parse pages
        const pages = pageResponse.data.rows?.map((row) => ({
            page: row.keys?.[0]?.replace(SITE_URL, "") || "/",
            clicks: row.clicks || 0,
            impressions: row.impressions || 0,
            ctr: (row.ctr || 0) * 100,
            position: row.position || 0,
        })) || [];

        return NextResponse.json({
            overview,
            queries,
            pages,
            period,
        });
    } catch (error) {
        console.error("Search Console API error:", error);
        const message = error instanceof Error ? error.message : "Failed to fetch search console data";
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}
