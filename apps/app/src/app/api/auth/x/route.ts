import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServerClient";
import crypto from "crypto";

// X OAuth 2.0 with PKCE
const X_AUTH_URL = "https://twitter.com/i/oauth2/authorize";
const SCOPES = ["tweet.read", "tweet.write", "users.read", "offline.access"];

function generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString("base64url");
}

function generateCodeChallenge(verifier: string): string {
    return crypto.createHash("sha256").update(verifier).digest("base64url");
}

function generateState(): string {
    return crypto.randomBytes(16).toString("hex");
}

export async function GET(request: NextRequest) {
    try {
        const supabase = await createServerClient() as any;
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.redirect(new URL("/login", request.url));
        }

        // Get current profile
        const { data: appUser } = await supabase
            .from("users")
            .select("current_profile_id")
            .eq("id", user.id)
            .maybeSingle();

        if (!appUser?.current_profile_id) {
            return NextResponse.redirect(new URL("/app/me", request.url));
        }

        const { data: profile } = await supabase
            .from("profiles")
            .select("store_id, role")
            .eq("id", appUser.current_profile_id)
            .maybeSingle();

        if (!profile?.store_id || (profile.role !== "staff" && profile.role !== "admin")) {
            return NextResponse.redirect(new URL("/app/sns", request.url));
        }

        // Generate PKCE values
        const codeVerifier = generateCodeVerifier();
        const codeChallenge = generateCodeChallenge(codeVerifier);
        const state = generateState();

        // Build callback URL
        const baseUrl = process.env.NODE_ENV === "production"
            ? "https://app.nightbase.jp"
            : "http://localhost:3001";
        const redirectUri = `${baseUrl}/api/auth/x/callback`;

        // Build authorization URL
        const params = new URLSearchParams({
            response_type: "code",
            client_id: process.env.X_CLIENT_ID!,
            redirect_uri: redirectUri,
            scope: SCOPES.join(" "),
            state: state,
            code_challenge: codeChallenge,
            code_challenge_method: "S256",
        });

        const authUrl = `${X_AUTH_URL}?${params.toString()}`;

        // Store state and code verifier in cookie for verification
        const response = NextResponse.redirect(authUrl);

        // Set cookies with OAuth state (expires in 10 minutes)
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax" as const,
            maxAge: 600, // 10 minutes
            path: "/",
        };

        response.cookies.set("x_oauth_state", state, cookieOptions);
        response.cookies.set("x_oauth_code_verifier", codeVerifier, cookieOptions);
        response.cookies.set("x_oauth_store_id", profile.store_id, cookieOptions);

        return response;
    } catch (error) {
        console.error("X OAuth initiation error:", error);
        return NextResponse.redirect(new URL("/app/sns?error=oauth_init_failed", request.url));
    }
}
