"use server";

import { revalidatePath } from "next/cache";
import {
    getAuthContext,
    getAuthContextForPage,
    logQueryError,
} from "@/lib/auth-helpers";
import { SYSTEM_TEMPLATES, SIZE_PRESETS } from "./templates";

export interface GeneratedImage {
    id: string;
    store_id: string;
    created_by: string | null;
    template_id: string | null;
    template_name: string | null;
    prompt: string;
    image_url: string;
    image_type: "poster" | "pop" | "menu" | "sns" | "custom";
    size_width: number;
    size_height: number;
    model_used: string;
    credits_used: number;
    created_at: string;
}

export interface StoreCredits {
    ai_credits: number;
    ai_credits_reset_at: string;
}

// クレジット情報取得
export async function getStoreCredits(): Promise<StoreCredits | null> {
    try {
        const { supabase, storeId } = await getAuthContext();

        // 月初リセットチェック
        const { data: store, error } = await supabase
            .from("stores")
            .select("ai_credits, ai_credits_reset_at")
            .eq("id", storeId)
            .single();

        if (error) {
            logQueryError(error, "fetching store credits");
            return null;
        }

        const storeData = store as StoreCredits | null;
        if (!storeData) return null;

        // 月が変わっていたらリセット
        const resetDate = new Date(storeData.ai_credits_reset_at);
        const now = new Date();
        if (resetDate.getMonth() !== now.getMonth() || resetDate.getFullYear() !== now.getFullYear()) {
            const { data: updated, error: updateError } = await supabase
                .from("stores")
                .update({
                    ai_credits: 30,
                    ai_credits_reset_at: now.toISOString(),
                })
                .eq("id", storeId)
                .select("ai_credits, ai_credits_reset_at")
                .single();

            if (updateError) {
                logQueryError(updateError, "resetting credits");
                return storeData;
            }
            return updated as StoreCredits;
        }

        return storeData;
    } catch {
        return null;
    }
}

// 生成履歴取得
export async function getGeneratedImages(limit = 50): Promise<GeneratedImage[]> {
    try {
        const { supabase, storeId } = await getAuthContext();

        const { data, error } = await supabase
            .from("ai_generated_images")
            .select("*")
            .eq("store_id", storeId)
            .order("created_at", { ascending: false })
            .limit(limit);

        if (error) {
            logQueryError(error, "fetching generated images");
            return [];
        }

        return data as GeneratedImage[];
    } catch {
        return [];
    }
}

// Pollinations.ai (Flux) で画像生成
async function generateWithPollinations(
    prompt: string,
    width: number,
    height: number
): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
    try {
        // プロンプトをURLエンコード
        const encodedPrompt = encodeURIComponent(prompt);

        // Pollinations.ai API URL
        const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&nologo=true&model=flux`;

        // 画像が生成されるか確認（HEADリクエスト）
        const response = await fetch(imageUrl, { method: "HEAD" });

        if (!response.ok) {
            return { success: false, error: "画像生成に失敗しました" };
        }

        return { success: true, imageUrl };
    } catch (error) {
        console.error("Pollinations API error:", error);
        return { success: false, error: "画像生成APIでエラーが発生しました" };
    }
}

// 画像生成
export async function generateImage(
    prompt: string,
    imageType: GeneratedImage["image_type"],
    width: number,
    height: number,
    templateId?: string,
    templateName?: string
): Promise<{ success: boolean; image?: GeneratedImage; error?: string }> {
    try {
        const { supabase, storeId, userId } = await getAuthContext();

        // クレジットチェック
        const credits = await getStoreCredits();
        if (!credits || credits.ai_credits < 1) {
            return { success: false, error: "クレジットが不足しています" };
        }

        // Pollinations.ai (Flux) で画像生成
        const result = await generateWithPollinations(prompt, width, height);

        if (!result.success || !result.imageUrl) {
            return { success: false, error: result.error || "画像生成に失敗しました" };
        }

        // クレジット消費
        const { error: creditError } = await supabase
            .from("stores")
            .update({ ai_credits: credits.ai_credits - 1 })
            .eq("id", storeId);

        if (creditError) {
            logQueryError(creditError, "consuming credit");
            return { success: false, error: "クレジットの消費に失敗しました" };
        }

        // 履歴保存
        const { data: image, error: insertError } = await supabase
            .from("ai_generated_images")
            .insert({
                store_id: storeId,
                created_by: userId,
                template_id: templateId || null,
                template_name: templateName || null,
                prompt,
                image_url: result.imageUrl,
                image_type: imageType,
                size_width: width,
                size_height: height,
                model_used: "flux",
                credits_used: 1,
            })
            .select()
            .single();

        if (insertError) {
            logQueryError(insertError, "saving generated image");
            return { success: false, error: "画像の保存に失敗しました" };
        }

        revalidatePath("/app/ai-create");
        return { success: true, image: image as GeneratedImage };
    } catch (e) {
        console.error("Error generating image:", e);
        return { success: false, error: "画像生成に失敗しました" };
    }
}

// 画像削除
export async function deleteGeneratedImage(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        const { supabase, storeId } = await getAuthContext();

        const { error } = await supabase
            .from("ai_generated_images")
            .delete()
            .eq("id", id)
            .eq("store_id", storeId);

        if (error) {
            logQueryError(error, "deleting generated image");
            return { success: false, error: "削除に失敗しました" };
        }

        revalidatePath("/app/ai-create");
        return { success: true };
    } catch {
        return { success: false, error: "削除に失敗しました" };
    }
}

// ページデータ取得
export async function getAICreatePageData() {
    const result = await getAuthContextForPage({ requireStaff: true });

    if ("redirect" in result) {
        return result;
    }

    const [credits, images] = await Promise.all([
        getStoreCredits(),
        getGeneratedImages(),
    ]);

    return {
        data: {
            credits,
            images,
            templates: SYSTEM_TEMPLATES,
            sizePresets: SIZE_PRESETS,
        }
    };
}
