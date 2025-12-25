"use server";

import { createServerClient } from "@/lib/supabaseServerClient";
import { getAuthContextForPage } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";
import OpenAI from "openai";

export interface StorePost {
    id: string;
    store_id: string;
    type: "board" | "manual" | "blog";
    title: string;
    content: any[];
    cover_image_url: string | null;
    visibility: string[];
    status: "draft" | "published";
    published_at: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
    creator?: {
        display_name: string | null;
        avatar_url: string | null;
    };
}

export async function getBoardPosts(storeId: string, userRole: string): Promise<StorePost[]> {
    const supabase = await createServerClient() as any;

    const { data, error } = await supabase
        .from("store_posts")
        .select(`
            *,
            creator:profiles!store_posts_created_by_fkey(display_name, avatar_url)
        `)
        .eq("store_id", storeId)
        .eq("type", "board")
        .eq("status", "published")
        .contains("visibility", [userRole])
        .order("published_at", { ascending: false });

    if (error) {
        console.error("Error fetching board posts:", error);
        return [];
    }

    return data || [];
}

export async function getBoardPost(postId: string): Promise<StorePost | null> {
    const supabase = await createServerClient() as any;

    const { data, error } = await supabase
        .from("store_posts")
        .select(`
            *,
            creator:profiles!store_posts_created_by_fkey(display_name, avatar_url)
        `)
        .eq("id", postId)
        .single();

    if (error) {
        console.error("Error fetching board post:", error);
        return null;
    }

    return data;
}

export async function createBoardPost(formData: FormData) {
    const supabase = await createServerClient() as any;
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("User not authenticated");
    }

    const storeId = formData.get("storeId") as string;
    const title = formData.get("title") as string;
    const contentJson = formData.get("content") as string;
    const coverImageUrl = formData.get("coverImageUrl") as string | null;
    const visibilityJson = formData.get("visibility") as string;
    const status = formData.get("status") as "draft" | "published";

    // Get current profile id
    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .single();

    if (!appUser?.current_profile_id) {
        throw new Error("Profile not found");
    }

    const content = contentJson ? JSON.parse(contentJson) : [];
    const visibility = visibilityJson ? JSON.parse(visibilityJson) : ["staff", "cast", "partner"];

    const { data, error } = await supabase
        .from("store_posts")
        .insert({
            store_id: storeId,
            type: "board",
            title,
            content,
            cover_image_url: coverImageUrl || null,
            visibility,
            status,
            published_at: status === "published" ? new Date().toISOString() : null,
            created_by: appUser.current_profile_id,
        })
        .select()
        .single();

    if (error) {
        console.error("Error creating board post:", error);
        throw new Error("投稿の作成に失敗しました");
    }

    revalidatePath("/app/board");
    return { success: true, postId: data.id };
}

export async function updateBoardPost(formData: FormData) {
    const supabase = await createServerClient() as any;
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("User not authenticated");
    }

    const postId = formData.get("postId") as string;
    const title = formData.get("title") as string;
    const contentJson = formData.get("content") as string;
    const coverImageUrl = formData.get("coverImageUrl") as string | null;
    const visibilityJson = formData.get("visibility") as string;
    const status = formData.get("status") as "draft" | "published";

    const content = contentJson ? JSON.parse(contentJson) : [];
    const visibility = visibilityJson ? JSON.parse(visibilityJson) : ["staff", "cast", "partner"];

    // Get current post to check if we need to set published_at
    const { data: currentPost } = await supabase
        .from("store_posts")
        .select("status, published_at")
        .eq("id", postId)
        .single();

    const publishedAt =
        status === "published" && currentPost?.status !== "published"
            ? new Date().toISOString()
            : currentPost?.published_at;

    const { error } = await supabase
        .from("store_posts")
        .update({
            title,
            content,
            cover_image_url: coverImageUrl || null,
            visibility,
            status,
            published_at: publishedAt,
            updated_at: new Date().toISOString(),
        })
        .eq("id", postId);

    if (error) {
        console.error("Error updating board post:", error);
        throw new Error("投稿の更新に失敗しました");
    }

    revalidatePath("/app/board");
    revalidatePath(`/app/board/${postId}`);
    return { success: true };
}

export async function deleteBoardPost(postId: string) {
    const supabase = await createServerClient() as any;
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("User not authenticated");
    }

    const { error } = await supabase
        .from("store_posts")
        .delete()
        .eq("id", postId);

    if (error) {
        console.error("Error deleting board post:", error);
        throw new Error("投稿の削除に失敗しました");
    }

    revalidatePath("/app/board");
    return { success: true };
}

// Upload image for rich editor content
export async function uploadRichEditorImage(formData: FormData): Promise<string> {
    const supabase = await createServerClient() as any;
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("User not authenticated");
    }

    const file = formData.get("file") as File;
    if (!file) {
        throw new Error("ファイルが選択されていません");
    }

    // Upload to Supabase Storage
    const fileExt = file.name.split(".").pop();
    const fileName = `editor-${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
    const filePath = `editor-images/${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

    if (uploadError) {
        console.error("Upload error:", uploadError);
        throw new Error(`アップロードに失敗しました: ${uploadError.message}`);
    }

    // Get Public URL
    const {
        data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(filePath);

    return publicUrl;
}

// Upload cover image for board post
export async function uploadBoardCoverImage(formData: FormData): Promise<string> {
    const supabase = await createServerClient() as any;
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("User not authenticated");
    }

    const file = formData.get("file") as File;
    if (!file) {
        throw new Error("ファイルが選択されていません");
    }

    // Upload to Supabase Storage (using avatars bucket for board covers too)
    const fileExt = file.name.split(".").pop();
    const fileName = `board-cover-${Date.now()}.${fileExt}`;
    const filePath = `board-covers/${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

    if (uploadError) {
        console.error("Upload error:", uploadError);
        throw new Error(`アップロードに失敗しました: ${uploadError.message}`);
    }

    // Get Public URL
    const {
        data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(filePath);

    return publicUrl;
}

// Delete cover image
export async function deleteBoardCoverImage(imageUrl: string): Promise<void> {
    const supabase = await createServerClient() as any;
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("User not authenticated");
    }

    // Extract file path from URL
    const urlParts = imageUrl.split("/avatars/");
    if (urlParts.length < 2) {
        return; // Not a valid storage URL, skip deletion
    }

    const filePath = urlParts[1];

    const { error } = await supabase.storage
        .from("avatars")
        .remove([filePath]);

    if (error) {
        console.error("Delete error:", error);
        // Don't throw - image might already be deleted
    }
}

// Get all posts for staff (including drafts)
export async function getAllBoardPosts(storeId: string): Promise<StorePost[]> {
    const supabase = await createServerClient() as any;

    const { data, error } = await supabase
        .from("store_posts")
        .select(`
            *,
            creator:profiles!store_posts_created_by_fkey(display_name, avatar_url)
        `)
        .eq("store_id", storeId)
        .eq("type", "board")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching all board posts:", error);
        return [];
    }

    return data || [];
}

// AI generated post interface
export interface GeneratedPost {
    title: string;
    content: any[];
}

// Generate board post with AI
export async function generateBoardPost(
    userInput: string,
    previousContent?: { title: string; content: any[] },
    additionalInstruction?: string
): Promise<GeneratedPost> {
    const supabase = await createServerClient() as any;
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("User not authenticated");
    }

    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    const systemPrompt = `あなたは夜のお店（キャバクラ、クラブ、バーなど）のスタッフ向け掲示板の投稿を作成するアシスタントです。

入力された内容を元に、スタッフ・キャスト向けの掲示板投稿を作成してください。

出力形式:
- title: 投稿のタイトル（簡潔で分かりやすく）
- content: BlockNote形式のJSON配列

BlockNote形式の例:
[
  {
    "id": "unique-id-1",
    "type": "paragraph",
    "props": { "textColor": "default", "backgroundColor": "default", "textAlignment": "left" },
    "content": [{ "type": "text", "text": "本文テキスト", "styles": {} }],
    "children": []
  },
  {
    "id": "unique-id-2",
    "type": "heading",
    "props": { "textColor": "default", "backgroundColor": "default", "textAlignment": "left", "level": 2 },
    "content": [{ "type": "text", "text": "見出しテキスト", "styles": {} }],
    "children": []
  },
  {
    "id": "unique-id-3",
    "type": "bulletListItem",
    "props": { "textColor": "default", "backgroundColor": "default", "textAlignment": "left" },
    "content": [{ "type": "text", "text": "リスト項目", "styles": {} }],
    "children": []
  }
]

注意:
- 各ブロックには一意のidが必要です（例: "block-1", "block-2"など）
- 適切な構造（見出し、段落、リストなど）を使って読みやすくしてください
- 絵文字は適度に使用してOKです
- 丁寧かつ分かりやすい文章にしてください

必ず以下のJSON形式で返答してください:
{
  "title": "タイトル",
  "content": [BlockNote形式の配列]
}`;

    let userMessage = `以下の内容で掲示板投稿を作成してください:\n\n${userInput}`;

    if (previousContent && additionalInstruction) {
        userMessage = `以下は現在の投稿内容です:

タイトル: ${previousContent.title}
本文: ${JSON.stringify(previousContent.content)}

この内容に対して、以下の変更を加えてください:
${additionalInstruction}`;
    }

    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
        throw new Error("AIからの応答がありません");
    }

    try {
        const parsed = JSON.parse(content) as GeneratedPost;
        return parsed;
    } catch (e) {
        console.error("Failed to parse AI response for board:", content);
        throw new Error("AIの応答を解析できませんでした");
    }
}

// ========== マニュアル関連 ==========

export interface ManualTag {
    id: string;
    store_id: string;
    name: string;
    created_at: string;
}

export interface StoreManual {
    id: string;
    store_id: string;
    title: string;
    content: any[];
    visibility: string[];
    status: "draft" | "published";
    created_by: string | null;
    created_at: string;
    updated_at: string;
    creator?: {
        display_name: string | null;
        avatar_url: string | null;
    };
    tags?: ManualTag[];
}

// タグ一覧を取得
export async function getManualTags(storeId: string): Promise<ManualTag[]> {
    const supabase = await createServerClient() as any;

    const { data, error } = await supabase
        .from("manual_tags")
        .select("*")
        .eq("store_id", storeId)
        .order("name", { ascending: true });

    if (error) {
        console.error("Error fetching manual tags:", error);
        return [];
    }

    return data || [];
}

// タグを作成
export async function createManualTag(storeId: string, name: string): Promise<ManualTag> {
    const supabase = await createServerClient() as any;
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("User not authenticated");
    }

    const { data, error } = await supabase
        .from("manual_tags")
        .insert({ store_id: storeId, name })
        .select()
        .single();

    if (error) {
        console.error("Error creating manual tag:", error);
        throw new Error("タグの作成に失敗しました");
    }

    return data;
}

// マニュアル一覧を取得（公開済み、ロールでフィルタ）
export async function getManuals(storeId: string, userRole: string): Promise<StoreManual[]> {
    const supabase = await createServerClient() as any;

    const { data, error } = await supabase
        .from("store_manuals")
        .select(`
            *,
            creator:profiles!store_manuals_created_by_fkey(display_name, avatar_url)
        `)
        .eq("store_id", storeId)
        .eq("status", "published")
        .contains("visibility", [userRole])
        .order("updated_at", { ascending: false });

    if (error) {
        console.error("Error fetching manuals:", error);
        return [];
    }

    // タグを取得
    const manualsWithTags = await Promise.all(
        (data || []).map(async (manual: any) => {
            const { data: tagData } = await supabase
                .from("store_manual_tags")
                .select("tag_id, manual_tags(*)")
                .eq("manual_id", manual.id);

            return {
                ...manual,
                tags: tagData?.map((t: any) => t.manual_tags).filter(Boolean) || [],
            };
        })
    );

    return manualsWithTags;
}

// マニュアル一覧を取得（スタッフ用、下書き含む）
export async function getAllManuals(storeId: string): Promise<StoreManual[]> {
    const supabase = await createServerClient() as any;

    const { data, error } = await supabase
        .from("store_manuals")
        .select(`
            *,
            creator:profiles!store_manuals_created_by_fkey(display_name, avatar_url)
        `)
        .eq("store_id", storeId)
        .order("updated_at", { ascending: false });

    if (error) {
        console.error("Error fetching all manuals:", error);
        return [];
    }

    // タグを取得
    const manualsWithTags = await Promise.all(
        (data || []).map(async (manual: any) => {
            const { data: tagData } = await supabase
                .from("store_manual_tags")
                .select("tag_id, manual_tags(*)")
                .eq("manual_id", manual.id);

            return {
                ...manual,
                tags: tagData?.map((t: any) => t.manual_tags).filter(Boolean) || [],
            };
        })
    );

    return manualsWithTags;
}

// マニュアルを1件取得
export async function getManual(manualId: string): Promise<StoreManual | null> {
    const supabase = await createServerClient() as any;

    const { data, error } = await supabase
        .from("store_manuals")
        .select(`
            *,
            creator:profiles!store_manuals_created_by_fkey(display_name, avatar_url)
        `)
        .eq("id", manualId)
        .single();

    if (error) {
        console.error("Error fetching manual:", error);
        return null;
    }

    // タグを取得
    const { data: tagData } = await supabase
        .from("store_manual_tags")
        .select("tag_id, manual_tags(*)")
        .eq("manual_id", manualId);

    return {
        ...data,
        tags: tagData?.map((t: any) => t.manual_tags).filter(Boolean) || [],
    };
}

// マニュアルを作成
export async function createManual(formData: FormData) {
    const supabase = await createServerClient() as any;
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("User not authenticated");
    }

    const storeId = formData.get("storeId") as string;
    const title = formData.get("title") as string;
    const contentJson = formData.get("content") as string;
    const visibilityJson = formData.get("visibility") as string;
    const status = formData.get("status") as "draft" | "published";
    const tagIdsJson = formData.get("tagIds") as string;

    // Get current profile id
    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .single();

    if (!appUser?.current_profile_id) {
        throw new Error("Profile not found");
    }

    const content = contentJson ? JSON.parse(contentJson) : [];
    const visibility = visibilityJson ? JSON.parse(visibilityJson) : ["staff", "cast", "partner"];
    const tagIds = tagIdsJson ? JSON.parse(tagIdsJson) : [];

    const { data, error } = await supabase
        .from("store_manuals")
        .insert({
            store_id: storeId,
            title,
            content,
            visibility,
            status,
            created_by: appUser.current_profile_id,
        })
        .select()
        .single();

    if (error) {
        console.error("Error creating manual:", error);
        throw new Error("マニュアルの作成に失敗しました");
    }

    // タグを関連付け
    if (tagIds.length > 0) {
        const tagInserts = tagIds.map((tagId: string) => ({
            manual_id: data.id,
            tag_id: tagId,
        }));

        await supabase.from("store_manual_tags").insert(tagInserts);
    }

    revalidatePath("/app/board");
    return { success: true, manualId: data.id };
}

// マニュアルを更新
export async function updateManual(formData: FormData) {
    const supabase = await createServerClient() as any;
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("User not authenticated");
    }

    const manualId = formData.get("manualId") as string;
    const title = formData.get("title") as string;
    const contentJson = formData.get("content") as string;
    const visibilityJson = formData.get("visibility") as string;
    const status = formData.get("status") as "draft" | "published";
    const tagIdsJson = formData.get("tagIds") as string;

    const content = contentJson ? JSON.parse(contentJson) : [];
    const visibility = visibilityJson ? JSON.parse(visibilityJson) : ["staff", "cast", "partner"];
    const tagIds = tagIdsJson ? JSON.parse(tagIdsJson) : [];

    const { error } = await supabase
        .from("store_manuals")
        .update({
            title,
            content,
            visibility,
            status,
            updated_at: new Date().toISOString(),
        })
        .eq("id", manualId);

    if (error) {
        console.error("Error updating manual:", error);
        throw new Error("マニュアルの更新に失敗しました");
    }

    // タグを更新（一度削除して再挿入）
    await supabase.from("store_manual_tags").delete().eq("manual_id", manualId);

    if (tagIds.length > 0) {
        const tagInserts = tagIds.map((tagId: string) => ({
            manual_id: manualId,
            tag_id: tagId,
        }));

        await supabase.from("store_manual_tags").insert(tagInserts);
    }

    revalidatePath("/app/board");
    revalidatePath(`/app/board/manual/${manualId}`);
    return { success: true };
}

// マニュアルを削除
export async function deleteManual(manualId: string) {
    const supabase = await createServerClient() as any;
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("User not authenticated");
    }

    const { error } = await supabase
        .from("store_manuals")
        .delete()
        .eq("id", manualId);

    if (error) {
        console.error("Error deleting manual:", error);
        throw new Error("マニュアルの削除に失敗しました");
    }

    revalidatePath("/app/board");
    return { success: true };
}

// ========== いいね関連 ==========

export interface LikeUser {
    profile_id: string;
    display_name: string | null;
    avatar_url: string | null;
    created_at: string;
}

// 投稿のいいね情報を取得
export async function getPostLikes(postId: string): Promise<{ count: number; isLiked: boolean; users: LikeUser[] }> {
    const supabase = await createServerClient() as any;
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { count: 0, isLiked: false, users: [] };
    }

    // Get current profile
    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .single();

    const currentProfileId = appUser?.current_profile_id;

    // Get likes with user info
    const { data: likes, error } = await supabase
        .from("post_likes")
        .select(`
            profile_id,
            created_at,
            profiles:profiles!post_likes_profile_id_fkey(display_name, avatar_url)
        `)
        .eq("post_id", postId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching post likes:", error);
        return { count: 0, isLiked: false, users: [] };
    }

    const users: LikeUser[] = (likes || []).map((like: any) => ({
        profile_id: like.profile_id,
        display_name: like.profiles?.display_name || null,
        avatar_url: like.profiles?.avatar_url || null,
        created_at: like.created_at,
    }));

    return {
        count: users.length,
        isLiked: currentProfileId ? users.some(u => u.profile_id === currentProfileId) : false,
        users,
    };
}

// 投稿にいいね
export async function togglePostLike(postId: string): Promise<{ isLiked: boolean; count: number }> {
    const supabase = await createServerClient() as any;
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("User not authenticated");
    }

    // Get current profile
    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .single();

    if (!appUser?.current_profile_id) {
        throw new Error("Profile not found");
    }

    // Check if already liked
    const { data: existingLike } = await supabase
        .from("post_likes")
        .select("id")
        .eq("post_id", postId)
        .eq("profile_id", appUser.current_profile_id)
        .maybeSingle();

    if (existingLike) {
        // Unlike
        await supabase
            .from("post_likes")
            .delete()
            .eq("id", existingLike.id);

        const { count } = await supabase
            .from("post_likes")
            .select("*", { count: "exact", head: true })
            .eq("post_id", postId);

        revalidatePath("/app/board");
        return { isLiked: false, count: count || 0 };
    } else {
        // Like
        await supabase
            .from("post_likes")
            .insert({
                post_id: postId,
                profile_id: appUser.current_profile_id,
            });

        const { count } = await supabase
            .from("post_likes")
            .select("*", { count: "exact", head: true })
            .eq("post_id", postId);

        revalidatePath("/app/board");
        return { isLiked: true, count: count || 0 };
    }
}

// マニュアルのいいね情報を取得
export async function getManualLikes(manualId: string): Promise<{ count: number; isLiked: boolean; users: LikeUser[] }> {
    const supabase = await createServerClient() as any;
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { count: 0, isLiked: false, users: [] };
    }

    // Get current profile
    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .single();

    const currentProfileId = appUser?.current_profile_id;

    // Get likes with user info
    const { data: likes, error } = await supabase
        .from("manual_likes")
        .select(`
            profile_id,
            created_at,
            profiles:profiles!manual_likes_profile_id_fkey(display_name, avatar_url)
        `)
        .eq("manual_id", manualId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching manual likes:", error);
        return { count: 0, isLiked: false, users: [] };
    }

    const users: LikeUser[] = (likes || []).map((like: any) => ({
        profile_id: like.profile_id,
        display_name: like.profiles?.display_name || null,
        avatar_url: like.profiles?.avatar_url || null,
        created_at: like.created_at,
    }));

    return {
        count: users.length,
        isLiked: currentProfileId ? users.some(u => u.profile_id === currentProfileId) : false,
        users,
    };
}

// マニュアルにいいね
export async function toggleManualLike(manualId: string): Promise<{ isLiked: boolean; count: number }> {
    const supabase = await createServerClient() as any;
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("User not authenticated");
    }

    // Get current profile
    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .single();

    if (!appUser?.current_profile_id) {
        throw new Error("Profile not found");
    }

    // Check if already liked
    const { data: existingLike } = await supabase
        .from("manual_likes")
        .select("id")
        .eq("manual_id", manualId)
        .eq("profile_id", appUser.current_profile_id)
        .maybeSingle();

    if (existingLike) {
        // Unlike
        await supabase
            .from("manual_likes")
            .delete()
            .eq("id", existingLike.id);

        const { count } = await supabase
            .from("manual_likes")
            .select("*", { count: "exact", head: true })
            .eq("manual_id", manualId);

        revalidatePath("/app/board");
        return { isLiked: false, count: count || 0 };
    } else {
        // Like
        await supabase
            .from("manual_likes")
            .insert({
                manual_id: manualId,
                profile_id: appUser.current_profile_id,
            });

        const { count } = await supabase
            .from("manual_likes")
            .select("*", { count: "exact", head: true })
            .eq("manual_id", manualId);

        revalidatePath("/app/board");
        return { isLiked: true, count: count || 0 };
    }
}

// ========== 既読関連 ==========

// 投稿を既読にする
export async function markPostAsRead(postId: string): Promise<void> {
    const supabase = await createServerClient() as any;
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    // Get current profile
    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .single();

    if (!appUser?.current_profile_id) return;

    // Insert read record (ignore if already exists due to UNIQUE constraint)
    await supabase
        .from("post_reads")
        .upsert({
            post_id: postId,
            profile_id: appUser.current_profile_id,
        }, { onConflict: "post_id,profile_id" });
}

// マニュアルを既読にする
export async function markManualAsRead(manualId: string): Promise<void> {
    const supabase = await createServerClient() as any;
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    // Get current profile
    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .single();

    if (!appUser?.current_profile_id) return;

    // Insert read record (ignore if already exists due to UNIQUE constraint)
    await supabase
        .from("manual_reads")
        .upsert({
            manual_id: manualId,
            profile_id: appUser.current_profile_id,
        }, { onConflict: "manual_id,profile_id" });
}

// 複数の投稿の既読状態を一括取得
export async function getPostReadStatus(postIds: string[]): Promise<Record<string, boolean>> {
    if (postIds.length === 0) return {};

    const supabase = await createServerClient() as any;
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return postIds.reduce((acc, id) => ({ ...acc, [id]: false }), {});
    }

    // Get current profile
    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .single();

    if (!appUser?.current_profile_id) {
        return postIds.reduce((acc, id) => ({ ...acc, [id]: false }), {});
    }

    const { data, error } = await supabase
        .from("post_reads")
        .select("post_id")
        .eq("profile_id", appUser.current_profile_id)
        .in("post_id", postIds);

    if (error) {
        console.error("Error fetching post read status:", error);
        return postIds.reduce((acc, id) => ({ ...acc, [id]: false }), {});
    }

    const readPostIds = new Set((data || []).map((r: any) => r.post_id));
    return postIds.reduce((acc, id) => ({ ...acc, [id]: readPostIds.has(id) }), {});
}

// 複数のマニュアルの既読状態を一括取得
export async function getManualReadStatus(manualIds: string[]): Promise<Record<string, boolean>> {
    if (manualIds.length === 0) return {};

    const supabase = await createServerClient() as any;
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return manualIds.reduce((acc, id) => ({ ...acc, [id]: false }), {});
    }

    // Get current profile
    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .single();

    if (!appUser?.current_profile_id) {
        return manualIds.reduce((acc, id) => ({ ...acc, [id]: false }), {});
    }

    const { data, error } = await supabase
        .from("manual_reads")
        .select("manual_id")
        .eq("profile_id", appUser.current_profile_id)
        .in("manual_id", manualIds);

    if (error) {
        console.error("Error fetching manual read status:", error);
        return manualIds.reduce((acc, id) => ({ ...acc, [id]: false }), {});
    }

    const readManualIds = new Set((data || []).map((r: any) => r.manual_id));
    return manualIds.reduce((acc, id) => ({ ...acc, [id]: readManualIds.has(id) }), {});
}

// 複数の投稿のいいね数を一括取得
export async function getPostLikeCounts(postIds: string[]): Promise<Record<string, number>> {
    if (postIds.length === 0) return {};

    const supabase = await createServerClient() as any;

    const { data, error } = await supabase
        .from("post_likes")
        .select("post_id")
        .in("post_id", postIds);

    if (error) {
        console.error("Error fetching post like counts:", error);
        return {};
    }

    // Count likes per post
    const counts: Record<string, number> = {};
    postIds.forEach(id => { counts[id] = 0; });
    (data || []).forEach((like: any) => {
        counts[like.post_id] = (counts[like.post_id] || 0) + 1;
    });

    return counts;
}

// 複数のマニュアルのいいね数を一括取得
export async function getManualLikeCounts(manualIds: string[]): Promise<Record<string, number>> {
    if (manualIds.length === 0) return {};

    const supabase = await createServerClient() as any;

    const { data, error } = await supabase
        .from("manual_likes")
        .select("manual_id")
        .in("manual_id", manualIds);

    if (error) {
        console.error("Error fetching manual like counts:", error);
        return {};
    }

    // Count likes per manual
    const counts: Record<string, number> = {};
    manualIds.forEach(id => { counts[id] = 0; });
    (data || []).forEach((like: any) => {
        counts[like.manual_id] = (counts[like.manual_id] || 0) + 1;
    });

    return counts;
}

// AI生成（マニュアル用）
export async function generateManual(
    userInput: string,
    previousContent?: { title: string; content: any[] },
    additionalInstruction?: string
): Promise<GeneratedPost> {
    const supabase = await createServerClient() as any;
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("User not authenticated");
    }

    const openaiClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    const systemPrompt = `あなたは夜のお店（キャバクラ、クラブ、バーなど）の店舗内で使用する従業員向けマニュアル・掲示板投稿を作成するアシスタントです。

【重要】これは店舗の従業員（スタッフ・キャスト）が読む社内向けコンテンツです。お客様向けではありません。
- 従業員が業務で参照するマニュアルや、店舗からの連絡事項として作成してください
- 敬語は使いつつも、社内向けの親しみやすいトーンで書いてください

入力された内容を元に、従業員向けのマニュアル・投稿を作成してください。

出力形式:
- title: タイトル（簡潔で分かりやすく）
- content: BlockNote形式のJSON配列

BlockNote形式の例:
[
  {
    "id": "unique-id-1",
    "type": "paragraph",
    "props": { "textColor": "default", "backgroundColor": "default", "textAlignment": "left" },
    "content": [{ "type": "text", "text": "本文テキスト", "styles": {} }],
    "children": []
  },
  {
    "id": "unique-id-2",
    "type": "heading",
    "props": { "textColor": "default", "backgroundColor": "default", "textAlignment": "left", "level": 2 },
    "content": [{ "type": "text", "text": "見出しテキスト", "styles": {} }],
    "children": []
  },
  {
    "id": "unique-id-3",
    "type": "numberedListItem",
    "props": { "textColor": "default", "backgroundColor": "default", "textAlignment": "left" },
    "content": [{ "type": "text", "text": "手順項目", "styles": {} }],
    "children": []
  }
]

注意:
- 各ブロックには一意のidが必要です（例: "block-1", "block-2"など）
- 見出しはlevel: 2またはlevel: 3のみ使用してください（level: 1は使用禁止）
- マニュアルなので手順や説明は番号付きリスト(numberedListItem)を活用してください
- 適切な見出しで構造化してください
- 分かりやすく具体的な説明を心がけてください

必ず以下のJSON形式で返答してください:
{
  "title": "タイトル",
  "content": [BlockNote形式の配列]
}`;

    let userMessage = `以下の内容でマニュアルを作成してください:\n\n${userInput}`;

    if (previousContent && additionalInstruction) {
        userMessage = `以下は現在のマニュアル内容です:

タイトル: ${previousContent.title}
本文: ${JSON.stringify(previousContent.content)}

この内容に対して、以下の変更を加えてください:
${additionalInstruction}`;
    }

    const responseData = await openaiClient.chat.completions.create({
        model: "gpt-4o",
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
    });

    const contentRes = responseData.choices[0]?.message?.content;
    if (!contentRes) {
        throw new Error("AIからの応答がありません");
    }

    try {
        const parsed = JSON.parse(contentRes) as GeneratedPost;
        return parsed;
    } catch (e) {
        console.error("Failed to parse AI response for manual:", contentRes);
        throw new Error("AIの応答を解析できませんでした");
    }
}

// =====================================================
// ページデータ取得（クライアントサイドフェッチ用）
// =====================================================

export async function getBoardPageData() {
    const result = await getAuthContextForPage({ requireStaff: false });

    if ("redirect" in result) {
        return { redirect: result.redirect };
    }

    const { context } = result;
    const { storeId, role } = context;

    const isStaff = role === "staff" || role === "admin";
    const canEdit = isStaff;

    // 掲示板とマニュアルのデータを並列で取得
    const [posts, manuals, manualTags] = await Promise.all([
        isStaff
            ? getAllBoardPosts(storeId)
            : getBoardPosts(storeId, role),
        isStaff
            ? getAllManuals(storeId)
            : getManuals(storeId, role),
        getManualTags(storeId),
    ]);

    // いいね数と既読ステータスを並列で取得
    const [postLikeCounts, postReadStatus, manualLikeCounts, manualReadStatus] = await Promise.all([
        getPostLikeCounts(posts.map(p => p.id)),
        getPostReadStatus(posts.map(p => p.id)),
        getManualLikeCounts(manuals.map(m => m.id)),
        getManualReadStatus(manuals.map(m => m.id)),
    ]);

    return {
        data: {
            posts,
            manuals,
            manualTags,
            storeId,
            isStaff,
            userRole: role,
            postLikeCounts,
            postReadStatus,
            manualLikeCounts,
            manualReadStatus,
            canEdit,
        }
    };
}

// 新規投稿ページデータ取得
export async function getNewPostPageData() {
    const result = await getAuthContextForPage({ requireStaff: true });

    if ("redirect" in result) {
        return { redirect: result.redirect };
    }

    const { context } = result;
    return {
        data: {
            storeId: context.storeId,
        }
    };
}

// 投稿編集ページデータ取得
export async function getEditPostPageData(postId: string) {
    const result = await getAuthContextForPage({ requireStaff: true });

    if ("redirect" in result) {
        return { redirect: result.redirect };
    }

    const { context } = result;
    const post = await getBoardPost(postId);

    if (!post || post.store_id !== context.storeId) {
        return { notFound: true };
    }

    return {
        data: {
            storeId: context.storeId,
            post,
        }
    };
}

// 新規マニュアルページデータ取得
export async function getNewManualPageData() {
    const result = await getAuthContextForPage({ requireStaff: true });

    if ("redirect" in result) {
        return { redirect: result.redirect };
    }

    const { context } = result;
    const tags = await getManualTags(context.storeId);

    return {
        data: {
            storeId: context.storeId,
            tags,
        }
    };
}

// マニュアル編集ページデータ取得
export async function getEditManualPageData(manualId: string) {
    const result = await getAuthContextForPage({ requireStaff: true });

    if ("redirect" in result) {
        return { redirect: result.redirect };
    }

    const { context } = result;
    const [manual, tags] = await Promise.all([
        getManual(manualId),
        getManualTags(context.storeId),
    ]);

    if (!manual || manual.store_id !== context.storeId) {
        return { notFound: true };
    }

    return {
        data: {
            storeId: context.storeId,
            manual,
            tags,
        }
    };
}
