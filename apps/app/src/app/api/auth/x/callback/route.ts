import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServerClient";

const X_TOKEN_URL = "https://api.twitter.com/2/oauth2/token";
const X_USER_URL = "https://api.twitter.com/2/users/me";

interface TokenResponse {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    token_type: string;
    scope: string;
}

interface UserResponse {
    data: {
        id: string;
        name: string;
        username: string;
    };
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const code = searchParams.get("code");
        const state = searchParams.get("state");
        const error = searchParams.get("error");

        // Handle OAuth error
        if (error) {
            console.error("X OAuth error:", error);
            return NextResponse.redirect(new URL(`/app/sns?error=${error}`, request.url));
        }

        if (!code || !state) {
            return NextResponse.redirect(new URL("/app/sns?error=missing_params", request.url));
        }

        // Retrieve stored state and code verifier from cookies
        const storedState = request.cookies.get("x_oauth_state")?.value;
        const codeVerifier = request.cookies.get("x_oauth_code_verifier")?.value;
        const storeId = request.cookies.get("x_oauth_store_id")?.value;

        if (!storedState || !codeVerifier || !storeId) {
            return NextResponse.redirect(new URL("/app/sns?error=session_expired", request.url));
        }

        // Verify state
        if (state !== storedState) {
            return NextResponse.redirect(new URL("/app/sns?error=state_mismatch", request.url));
        }

        // Build callback URL
        const baseUrl = process.env.NODE_ENV === "production"
            ? "https://app.nightbase.jp"
            : "http://localhost:3001";
        const redirectUri = `${baseUrl}/api/auth/x/callback`;

        // Exchange code for tokens
        const tokenParams = new URLSearchParams({
            grant_type: "authorization_code",
            code: code,
            redirect_uri: redirectUri,
            code_verifier: codeVerifier,
        });

        const credentials = Buffer.from(
            `${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`
        ).toString("base64");

        const tokenResponse = await fetch(X_TOKEN_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Authorization": `Basic ${credentials}`,
            },
            body: tokenParams.toString(),
        });

        if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            console.error("Token exchange failed:", errorText);
            return NextResponse.redirect(new URL("/app/sns?error=token_exchange_failed", request.url));
        }

        const tokens: TokenResponse = await tokenResponse.json();

        // Get user info
        const userResponse = await fetch(X_USER_URL, {
            headers: {
                "Authorization": `Bearer ${tokens.access_token}`,
            },
        });

        if (!userResponse.ok) {
            console.error("Failed to get user info");
            return NextResponse.redirect(new URL("/app/sns?error=user_info_failed", request.url));
        }

        const userData: UserResponse = await userResponse.json();

        // Calculate token expiration
        const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

        // Save to database
        const supabase = await createServerClient() as any;

        // Check if account already exists
        const { data: existingAccount } = await supabase
            .from("sns_accounts")
            .select("id")
            .eq("store_id", storeId)
            .eq("platform", "x")
            .maybeSingle();

        if (existingAccount) {
            // Update existing account
            await supabase
                .from("sns_accounts")
                .update({
                    account_id: userData.data.id,
                    account_name: `@${userData.data.username}`,
                    access_token: tokens.access_token,
                    refresh_token: tokens.refresh_token || null,
                    token_expires_at: expiresAt,
                    is_connected: true,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", existingAccount.id);
        } else {
            // Create new account
            await supabase
                .from("sns_accounts")
                .insert({
                    store_id: storeId,
                    platform: "x",
                    account_id: userData.data.id,
                    account_name: `@${userData.data.username}`,
                    access_token: tokens.access_token,
                    refresh_token: tokens.refresh_token || null,
                    token_expires_at: expiresAt,
                    is_connected: true,
                });
        }

        // Clear OAuth cookies
        const response = NextResponse.redirect(new URL("/app/sns?success=x_connected", request.url));
        response.cookies.delete("x_oauth_state");
        response.cookies.delete("x_oauth_code_verifier");
        response.cookies.delete("x_oauth_store_id");

        return response;
    } catch (error) {
        console.error("X OAuth callback error:", error);
        return NextResponse.redirect(new URL("/app/sns?error=callback_failed", request.url));
    }
}
