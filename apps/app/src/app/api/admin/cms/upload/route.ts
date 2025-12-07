import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabaseServiceClient";
import { createServerClient } from "@/lib/supabaseServerClient";

// POST /api/admin/cms/upload - Upload image
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
        const formData = await request.formData();
        const file = formData.get("file") as File;
        const type = formData.get("type") as string || "content"; // 'cover' or 'content'

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const serviceClient = createServiceRoleClient() as any;

        // Upload to Supabase Storage
        const fileExt = file.name.split(".").pop();
        const fileName = `cms-${type}-${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
        const filePath = `cms-images/${fileName}`;

        // Convert File to ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);

        const { error: uploadError } = await serviceClient.storage
            .from("public-assets")
            .upload(filePath, buffer, {
                contentType: file.type,
            });

        if (uploadError) {
            console.error("Upload error:", uploadError);
            return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
        }

        // Get Public URL
        const { data: { publicUrl } } = serviceClient.storage
            .from("public-assets")
            .getPublicUrl(filePath);

        return NextResponse.json({ url: publicUrl });
    } catch (error) {
        console.error("Error uploading file:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
