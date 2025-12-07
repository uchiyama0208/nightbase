import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabaseServiceClient";
import { createServerClient } from "@/lib/supabaseServerClient";

// GET /api/admin/cms?type=blog
export async function GET(request: NextRequest) {
    const supabase = await createServerClient() as any;

    // Check admin auth
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
    const type = searchParams.get("type");

    const serviceClient = createServiceRoleClient() as any;

    let query = serviceClient
        .from("cms_entries")
        .select("*")
        .order("created_at", { ascending: false });

    if (type) {
        query = query.eq("type", type);
    }

    const { data: entries, error } = await query;

    if (error) {
        console.error("Failed to fetch CMS entries:", error);
        return NextResponse.json({ error: "Failed to fetch entries" }, { status: 500 });
    }

    return NextResponse.json({ entries });
}

// POST /api/admin/cms - Create new entry
export async function POST(request: NextRequest) {
    const supabase = await createServerClient() as any;

    // Check admin auth
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

    try {
        const body = await request.json();
        const { type, slug, title, body: content, excerpt, tags, cover_image_url, status, metadata } = body;

        if (!type || !slug || !title) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const serviceClient = createServiceRoleClient() as any;

        const insertData: any = {
            type,
            slug,
            title,
            body: content || null,
            excerpt: excerpt || null,
            tags: tags || [],
            cover_image_url: cover_image_url || null,
            status: status || "draft",
            metadata: metadata || null,
        };

        if (status === "published") {
            insertData.published_at = new Date().toISOString();
        }

        const { data: entry, error } = await serviceClient
            .from("cms_entries")
            .insert(insertData)
            .select()
            .single();

        if (error) {
            console.error("Failed to create CMS entry:", error);
            if (error.code === "23505") {
                return NextResponse.json({ error: "この種類で同じスラッグの記事が既に存在します" }, { status: 400 });
            }
            return NextResponse.json({ error: "Failed to create entry" }, { status: 500 });
        }

        return NextResponse.json({ entry });
    } catch (error) {
        console.error("Error creating CMS entry:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
