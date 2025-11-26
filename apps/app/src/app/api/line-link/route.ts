import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");
    const mode = searchParams.get("mode") || "link";

    // userId is required for linking, but optional for login
    if (mode === "link" && !userId) {
        return NextResponse.json({ error: "Missing userId for linking mode" }, { status: 400 });
    }

    const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
        return NextResponse.json({ error: "Missing Supabase URL" }, { status: 500 });
    }

    // Construct the edge function URL
    const edgeFunctionUrl = new URL(`${supabaseUrl}/functions/v1/line-auth`);
    edgeFunctionUrl.searchParams.set("mode", mode);

    // Only add userId if it exists
    if (userId) {
        edgeFunctionUrl.searchParams.set("userId", userId);
    }

    // Pass the current origin as frontend_url
    edgeFunctionUrl.searchParams.set("frontend_url", request.nextUrl.origin);

    // Redirect to the edge function
    return NextResponse.redirect(edgeFunctionUrl.toString());
}
