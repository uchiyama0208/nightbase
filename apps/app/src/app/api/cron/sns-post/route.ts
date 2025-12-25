import { createServiceRoleClient } from "@/lib/supabaseServiceClient";
import { NextResponse } from "next/server";

const X_TOKEN_URL = "https://api.twitter.com/2/oauth2/token";
const X_TWEET_URL = "https://api.twitter.com/2/tweets";

interface XTokenResponse {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
}

async function refreshXToken(refreshToken: string): Promise<XTokenResponse> {
    const credentials = Buffer.from(
        `${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`
    ).toString("base64");

    const response = await fetch(X_TOKEN_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": `Basic ${credentials}`,
        },
        body: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: refreshToken,
        }).toString(),
    });

    if (!response.ok) {
        throw new Error("Token refresh failed");
    }

    return response.json();
}

async function getValidXToken(supabase: any, account: any): Promise<string> {
    const expiresAt = account.token_expires_at ? new Date(account.token_expires_at) : null;
    const now = new Date();

    if (expiresAt && expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
        if (!account.refresh_token) {
            throw new Error("No refresh token");
        }

        const newTokens = await refreshXToken(account.refresh_token);
        const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000).toISOString();

        await supabase
            .from("sns_accounts")
            .update({
                access_token: newTokens.access_token,
                refresh_token: newTokens.refresh_token || account.refresh_token,
                token_expires_at: newExpiresAt,
                updated_at: new Date().toISOString(),
            })
            .eq("id", account.id);

        return newTokens.access_token;
    }

    return account.access_token;
}

async function postToX(supabase: any, account: any, content: string): Promise<string> {
    const accessToken = await getValidXToken(supabase, account);

    const response = await fetch(X_TWEET_URL, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: content }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        if (response.status === 401) {
            await supabase
                .from("sns_accounts")
                .update({ is_connected: false, updated_at: new Date().toISOString() })
                .eq("id", account.id);
        }

        throw new Error(errorData.detail || `X API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data.id;
}

export async function GET() {
    try {
        const supabase = createServiceRoleClient() as any;
        const now = new Date().toISOString();
        const results: { postId: string; success: boolean; error?: string }[] = [];

        // Get pending scheduled posts that are due
        const { data: pendingPosts, error: fetchError } = await supabase
            .from("sns_scheduled_posts")
            .select("*")
            .eq("status", "pending")
            .lte("scheduled_at", now)
            .order("scheduled_at", { ascending: true })
            .limit(50);

        if (fetchError) {
            throw fetchError;
        }

        if (!pendingPosts || pendingPosts.length === 0) {
            return NextResponse.json({
                success: true,
                message: "No pending posts",
                processed: 0,
            });
        }

        for (const post of pendingPosts) {
            const postResults: { platform: string; success: boolean; error?: string }[] = [];

            // Get SNS accounts for this store
            const { data: accounts } = await supabase
                .from("sns_accounts")
                .select("*")
                .eq("store_id", post.store_id)
                .eq("is_connected", true);

            for (const platform of post.platforms) {
                const account = accounts?.find((a: any) => a.platform === platform);

                if (!account) {
                    postResults.push({ platform, success: false, error: "Account not connected" });
                    continue;
                }

                try {
                    if (platform === "x") {
                        const tweetId = await postToX(supabase, account, post.content);
                        postResults.push({ platform, success: true });
                    }
                } catch (error) {
                    console.error(`Error posting to ${platform}:`, error);
                    const message = error instanceof Error ? error.message : "投稿に失敗しました";
                    postResults.push({ platform, success: false, error: message });
                }
            }

            // Update post status
            const allFailed = postResults.every(r => !r.success);
            const errorMessage = postResults
                .filter(r => !r.success && r.error)
                .map(r => `${r.platform}: ${r.error}`)
                .join(", ");

            await supabase
                .from("sns_scheduled_posts")
                .update({
                    status: allFailed ? "failed" : "posted",
                    error_message: allFailed ? errorMessage : null,
                })
                .eq("id", post.id);

            results.push({
                postId: post.id,
                success: !allFailed,
                error: allFailed ? errorMessage : undefined,
            });
        }

        return NextResponse.json({
            success: true,
            processed: results.length,
            results,
        });
    } catch (error) {
        console.error("SNS post cron error:", error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        }, { status: 500 });
    }
}
