import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const LINE_AUTHORIZE_URL = "https://access.line.me/oauth2/v2.1/authorize";

serve(async (req) => {
    const url = new URL(req.url);
    let mode = url.searchParams.get("mode") || "join-store";
    let inviteToken = url.searchParams.get("invite_token");
    let userId = url.searchParams.get("userId");

    // Check if request has body (POST request)
    if (req.method === "POST") {
        try {
            const body = await req.json();
            if (body.mode) mode = body.mode;
            if (body.inviteToken) inviteToken = body.inviteToken;
            if (body.userId) userId = body.userId;
        } catch (e) {
            console.error("Error parsing request body:", e);
        }
    }

    // Generate random state for CSRF protection
    const state = crypto.randomUUID();

    console.log("=== LINE AUTH DEBUG ===");
    console.log("Request URL:", req.url);
    console.log("Mode:", mode);
    console.log("Invite Token:", inviteToken);
    console.log("User ID:", userId);
    console.log("=======================");

    // Get environment variables
    const channelId = Deno.env.get("LINE_CHANNEL_ID");
    const callbackUrl = Deno.env.get("LINE_CALLBACK_URL");

    if (!channelId || !callbackUrl) {
        return new Response(
            JSON.stringify({ error: "Missing LINE configuration" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }

    // Build LINE authorization URL
    const authUrl = new URL(LINE_AUTHORIZE_URL);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", channelId);
    authUrl.searchParams.set("redirect_uri", callbackUrl);

    // Construct state with optional invite token or userId
    let stateValue = `${state}:${mode}`;
    if (inviteToken) {
        stateValue += `:${inviteToken}`;
    } else if (userId) {
        stateValue += `:${userId}`;
    }
    authUrl.searchParams.set("state", stateValue);
    authUrl.searchParams.set("scope", "profile openid email");
    authUrl.searchParams.set("bot_prompt", "aggressive");

    // Redirect to LINE
    return new Response(null, {
        status: 302,
        headers: {
            "Location": authUrl.toString(),
        },
    });
});
