import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabaseServiceClient";
import { createServerClient } from "@/lib/supabaseServerClient";

// GET /api/admin/cms/[id]
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const serviceClient = createServiceRoleClient() as any;

    const { data: entry, error } = await serviceClient
        .from("cms_entries")
        .select("*")
        .eq("id", id)
        .single();

    if (error) {
        console.error("Failed to fetch CMS entry:", error);
        return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    return NextResponse.json({ entry });
}

// PUT /api/admin/cms/[id] - Update entry
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    try {
        const body = await request.json();
        const { slug, title, body: content, excerpt, tags, cover_image_url, status, metadata } = body;

        if (!slug || !title) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const serviceClient = createServiceRoleClient() as any;

        // Get current entry to check status change
        const { data: currentEntry } = await serviceClient
            .from("cms_entries")
            .select("status, published_at")
            .eq("id", id)
            .single();

        const updateData: any = {
            slug,
            title,
            body: content || null,
            excerpt: excerpt || null,
            tags: tags || [],
            cover_image_url: cover_image_url || null,
            status: status || "draft",
            metadata: metadata || null,
        };

        // Set published_at when first publishing
        if (status === "published" && currentEntry?.status !== "published") {
            updateData.published_at = new Date().toISOString();
        }

        const { data: entry, error } = await serviceClient
            .from("cms_entries")
            .update(updateData)
            .eq("id", id)
            .select()
            .single();

        if (error) {
            console.error("Failed to update CMS entry:", error);
            if (error.code === "23505") {
                return NextResponse.json({ error: "この種類で同じスラッグの記事が既に存在します" }, { status: 400 });
            }
            return NextResponse.json({ error: "Failed to update entry" }, { status: 500 });
        }

        return NextResponse.json({ entry });
    } catch (error) {
        console.error("Error updating CMS entry:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// DELETE /api/admin/cms/[id]
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const serviceClient = createServiceRoleClient() as any;

    const { error } = await serviceClient
        .from("cms_entries")
        .delete()
        .eq("id", id);

    if (error) {
        console.error("Failed to delete CMS entry:", error);
        return NextResponse.json({ error: "Failed to delete entry" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
