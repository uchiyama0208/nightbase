"use server";

import { revalidatePath } from "next/cache";
import {
    getAuthContext,
    getAuthContextForPage,
    logQueryError,
} from "@/lib/auth-helpers";
import { createServiceRoleClient } from "@/lib/supabaseServerClient";
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
        const { storeId } = await getAuthContext();
        const adminClient = createServiceRoleClient();

        const { data, error } = await adminClient
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

// 参考画像の型
export interface ReferenceImage {
    data: string; // base64
    mimeType: string;
}

// Google Gemini API (Nano Banana Pro / Gemini 3 Pro Image) で画像生成
async function generateWithGemini(
    prompt: string,
    width: number,
    height: number,
    referenceImages?: ReferenceImage[]
): Promise<{ success: boolean; imageUrl?: string; imageData?: string; mimeType?: string; error?: string }> {
    const apiKey = process.env.GOOGLE_API_KEY;

    if (!apiKey) {
        console.error("GOOGLE_API_KEY is not set");
        return { success: false, error: "APIキーが設定されていません" };
    }

    try {
        // アスペクト比を計算
        let aspectRatio = "1:1";
        if (width > height) {
            aspectRatio = width / height >= 1.7 ? "16:9" : "4:3";
        } else if (height > width) {
            aspectRatio = height / width >= 1.7 ? "9:16" : "3:4";
        }

        // partsを構築（テキスト + 参考画像）
        const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

        // 参考画像がある場合はプロンプトに指示を追加
        let finalPrompt = prompt;
        if (referenceImages && referenceImages.length > 0) {
            finalPrompt = `${prompt}\n\n添付された画像をポスターのデザイン内に組み込んで使用してください。人物写真の場合は、その人物をポスターのメインビジュアルとして配置してください。`;

            // 画像を追加
            for (const img of referenceImages) {
                parts.push({
                    inlineData: {
                        mimeType: img.mimeType,
                        data: img.data
                    }
                });
            }
        }

        // テキストプロンプトを追加
        parts.push({ text: finalPrompt });

        // Nano Banana Pro (Gemini 3 Pro Image) API を呼び出し
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-goog-api-key": apiKey,
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: parts
                        }
                    ],
                    generationConfig: {
                        responseModalities: ["Image"],
                        imageConfig: {
                            aspectRatio: aspectRatio
                        }
                    }
                }),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Gemini API error:", response.status, errorText);
            return { success: false, error: `画像生成に失敗しました (${response.status}): ${errorText.slice(0, 100)}` };
        }

        const data = await response.json();

        // レスポンスから画像データを抽出
        const imagePart = data.candidates?.[0]?.content?.parts?.find(
            (part: any) => part.inlineData?.mimeType?.startsWith("image/")
        );

        if (!imagePart?.inlineData?.data) {
            console.error("No image in response:", JSON.stringify(data, null, 2));
            return { success: false, error: "画像が生成されませんでした" };
        }

        // Base64画像データを返す（アップロードは呼び出し元で行う）
        return {
            success: true,
            imageData: imagePart.inlineData.data,
            mimeType: imagePart.inlineData.mimeType || "image/png"
        };
    } catch (error) {
        console.error("Gemini API error:", error);
        return { success: false, error: "画像生成APIでエラーが発生しました" };
    }
}

// Pollinations.ai (Flux) で画像生成（フォールバック用）
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

// 参考画像の使用モード
export type ImageUsageMode = "embed" | "reference" | "none";

// 画像生成
export async function generateImage(
    prompt: string,
    imageType: GeneratedImage["image_type"],
    width: number,
    height: number,
    templateId?: string,
    templateName?: string,
    referenceImages?: ReferenceImage[],
    imageUsageMode?: ImageUsageMode
): Promise<{ success: boolean; image?: GeneratedImage; error?: string }> {
    let step = "init";
    try {
        step = "auth";
        const { supabase, storeId, profileId } = await getAuthContext();

        step = "credits-check";
        // クレジットチェック
        const credits = await getStoreCredits();
        if (!credits || credits.ai_credits < 1) {
            return { success: false, error: "クレジットが不足しています" };
        }

        // Gemini APIで画像生成
        let imageUrl: string;
        let modelUsed = "gemini";

        // プロンプトに額縁・背景なしの指示を追加（夜の店向けのコンテキスト含む）
        let enhancedPrompt = imageType === "poster" || imageType === "menu"
            ? `${prompt}\n\nIMPORTANT INSTRUCTIONS:\n1. This is for a Japanese nightclub/hostess club/host club/girls bar/lounge establishment. The design should be glamorous, luxurious, and appealing to customers.\n2. Generate ONLY the design itself. Do NOT include any frame, border, mockup, wall, room background, or decorative elements around the design. The design should fill the entire image with no margins or external elements.\n3. Use elegant typography and high-end visual aesthetics suitable for nightlife entertainment venues.`
            : prompt;

        // 参考画像の使用モードに応じてプロンプトを調整
        if (referenceImages && referenceImages.length > 0 && imageUsageMode) {
            if (imageUsageMode === "embed") {
                enhancedPrompt = `${enhancedPrompt}\n\n添付された画像をポスターのデザイン内に組み込んで使用してください。人物写真の場合は、その人物をポスターのメインビジュアルとして配置してください。`;
            } else if (imageUsageMode === "reference") {
                enhancedPrompt = `${enhancedPrompt}\n\n添付された画像のスタイル、色使い、雰囲気を参考にして、同じようなテイストでデザインを生成してください。画像そのものは使用せず、あくまで参考としてください。`;
            }
        }

        if (process.env.GOOGLE_API_KEY) {
            step = "gemini-call";
            // 参考画像を渡す（モードがnoneの場合は渡さない）
            const imagesToPass = (imageUsageMode && imageUsageMode !== "none") ? referenceImages : undefined;
            const result = await generateWithGemini(enhancedPrompt, width, height, imagesToPass) as any;

            if (!result.success) {
                return { success: false, error: result.error || "画像生成に失敗しました" };
            }

            if (!result.imageData) {
                return { success: false, error: "画像データがありません" };
            }

            step = "storage-upload";
            // Base64をBlobに変換してStorageにアップロード
            const binaryData = Buffer.from(result.imageData, "base64");
            const fileName = `ai-create-${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
            const filePath = `ai-generated/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from("avatars")
                .upload(filePath, binaryData, {
                    contentType: result.mimeType || "image/png",
                });

            if (uploadError) {
                console.error("Upload error:", uploadError);
                return { success: false, error: `アップロード失敗: ${uploadError.message}` };
            }

            step = "get-url";
            const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);
            imageUrl = publicUrl;
        } else {
            step = "pollinations";
            const result = await generateWithPollinations(prompt, width, height);
            if (!result.success || !result.imageUrl) {
                return { success: false, error: result.error || "画像生成に失敗しました" };
            }
            imageUrl = result.imageUrl;
            modelUsed = "flux";
        }

        step = "credit-consume";
        // サービスロールクライアントでRLSをバイパス
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const adminClient = createServiceRoleClient() as any;

        // クレジット消費（画像生成成功後）
        const { error: creditError } = await adminClient
            .from("stores")
            .update({ ai_credits: credits.ai_credits - 1 })
            .eq("id", storeId);

        if (creditError) {
            logQueryError(creditError, "consuming credit");
            return { success: false, error: "クレジット消費失敗" };
        }

        step = "save-history";
        // 履歴保存
        const { data: image, error: insertError } = await adminClient
            .from("ai_generated_images")
            .insert({
                store_id: storeId,
                created_by: profileId,
                template_id: templateId || null,
                template_name: templateName || null,
                prompt,
                image_url: imageUrl,
                image_type: imageType,
                size_width: width,
                size_height: height,
                model_used: modelUsed,
                credits_used: 1,
            })
            .select()
            .single();

        if (insertError) {
            logQueryError(insertError, "saving generated image");
            return { success: false, error: `履歴保存失敗: ${insertError.message}` };
        }

        revalidatePath("/app/ai-create");
        return { success: true, image: image as GeneratedImage };
    } catch (e) {
        console.error(`Error at step [${step}]:`, e);
        return { success: false, error: `エラー[${step}]: ${e instanceof Error ? e.message : String(e)}` };
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

// クレジット購入（Stripe Checkout）
export async function purchaseCredits(
    credits: number,
    priceYen: number
): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
        const { storeId } = await getAuthContext();

        const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeSecretKey) {
            console.error("STRIPE_SECRET_KEY is not set");
            return { success: false, error: "決済システムが設定されていません" };
        }

        // Stripe SDKを動的インポート
        const Stripe = (await import("stripe")).default;
        const stripe = new Stripe(stripeSecretKey);

        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://app.nightbase.jp";

        // Stripe Checkoutセッションを作成
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [
                {
                    price_data: {
                        currency: "jpy",
                        product_data: {
                            name: `AIクレジット ${credits}クレジット`,
                            description: `AI画像生成に使用できるクレジット ${credits}回分`,
                        },
                        unit_amount: priceYen,
                    },
                    quantity: 1,
                },
            ],
            mode: "payment",
            success_url: `${siteUrl}/app/ai-create?purchase=success&credits=${credits}`,
            cancel_url: `${siteUrl}/app/ai-create?purchase=cancelled`,
            metadata: {
                store_id: storeId,
                credits: credits.toString(),
                type: "ai_credits",
            },
        });

        if (!session.url) {
            return { success: false, error: "決済URLの取得に失敗しました" };
        }

        return { success: true, url: session.url };
    } catch (e) {
        console.error("Error creating checkout session:", e);
        return { success: false, error: "決済セッションの作成に失敗しました" };
    }
}
