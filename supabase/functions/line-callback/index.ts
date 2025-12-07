import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const LINE_TOKEN_URL = "https://api.line.me/oauth2/v2.1/token";
const LINE_PROFILE_URL = "https://api.line.me/v2/profile";

interface LineTokenResponse {
    access_token: string;
    token_type: string;
    refresh_token: string;
    expires_in: number;
    scope: string;
    id_token: string;
}

interface LineProfile {
    userId: string;
    displayName: string;
    pictureUrl?: string;
    statusMessage?: string;
}

serve(async (req) => {
    try {
        const url = new URL(req.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");

        if (!code || !state) {
            return new Response("Missing code or state", { status: 400 });
        }

        // Note: searchParams.get() already decodes the value once
        // So we should NOT call decodeURIComponent again on the whole state
        // The frontendUrl inside state is still encoded and will be decoded separately
        console.log("Raw state from searchParams:", state);

        // Parse state to get mode, optional invite token, frontendUrl, and redirect
        // Format: uuid:mode:extraParam:encodedFrontendUrl:encodedRedirect
        // Since frontendUrl is encoded, its ":" becomes "%3A" and won't be split
        const stateParts = state.split(":");
        const mode = stateParts[1];
        let extraParam = stateParts[2];

        // Handle "null" string or undefined/empty
        if (extraParam === "null" || extraParam === "undefined" || !extraParam) {
            extraParam = null;
        }

        // Parse frontendUrl and redirect from remaining parts
        // The format is: uuid:mode:extraParam:encodedFrontendUrl:encodedRedirect
        // Since URLs are encoded, they won't contain ":" until decoded
        let frontendUrlFromState: string | null = null;
        let redirectFromState: string | null = null;

        if (stateParts.length > 3) {
            const frontendUrlPart = stateParts[3];
            if (frontendUrlPart && frontendUrlPart !== "null") {
                try {
                    frontendUrlFromState = decodeURIComponent(frontendUrlPart);
                } catch (e) {
                    console.error("Failed to decode frontendUrl from state:", e);
                    frontendUrlFromState = frontendUrlPart;
                }
            }
        }

        if (stateParts.length > 4) {
            // Rejoin the rest in case redirect URL contained ":" after decoding
            const redirectPart = stateParts.slice(4).join(":");
            if (redirectPart && redirectPart !== "null") {
                try {
                    redirectFromState = decodeURIComponent(redirectPart);
                } catch (e) {
                    console.error("Failed to decode redirect from state:", e);
                    redirectFromState = redirectPart;
                }
            }
        }

        const inviteToken = mode !== 'link' ? extraParam : null;
        const linkUserId = mode === 'link' ? extraParam : null;

        console.log("=== DEBUG LOGS ===");
        console.log("Raw State:", state);
        console.log("State Parts:", JSON.stringify(stateParts));
        console.log("Mode:", mode);
        console.log("Extra Param:", extraParam);
        console.log("Invite Token:", inviteToken);
        console.log("Link User ID:", linkUserId);
        console.log("Frontend URL from State:", frontendUrlFromState);
        console.log("Redirect from State:", redirectFromState);
        console.log("==================");

        // Get environment variables
        const channelId = Deno.env.get("LINE_CHANNEL_ID");
        const channelSecret = Deno.env.get("LINE_CHANNEL_SECRET");
        const callbackUrl = Deno.env.get("LINE_CALLBACK_URL");
        // Supabase automatically provides SUPABASE_URL
        // SERVICE_ROLE_KEY is set manually (SUPABASE_ prefix is reserved)
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseServiceKey = Deno.env.get("SERVICE_ROLE_KEY");

        console.log("=== ENV DEBUG ===");
        console.log("SUPABASE_URL:", supabaseUrl ? "SET" : "NOT SET");
        console.log("SERVICE_ROLE_KEY:", supabaseServiceKey ? `SET (${supabaseServiceKey.substring(0, 20)}...)` : "NOT SET");
        console.log("=================");

        // Use frontendUrl from state if available, otherwise fallback to env var or default
        const frontendUrl = frontendUrlFromState || Deno.env.get("FRONTEND_URL") || "http://localhost:3000";

        if (!channelId || !channelSecret || !callbackUrl || !supabaseUrl || !supabaseServiceKey) {
            return new Response("Missing configuration", { status: 500 });
        }

        // Exchange code for access token
        const tokenParams = new URLSearchParams({
            grant_type: "authorization_code",
            code,
            redirect_uri: callbackUrl,
            client_id: channelId,
            client_secret: channelSecret,
        });

        const tokenResponse = await fetch(LINE_TOKEN_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: tokenParams.toString(),
        });

        if (!tokenResponse.ok) {
            const error = await tokenResponse.text();
            console.error("Token exchange failed:", error);
            return new Response(`Token exchange failed: ${error}`, { status: 500 });
        }

        const tokenData: LineTokenResponse = await tokenResponse.json();

        // Get LINE user profile
        const profileResponse = await fetch(LINE_PROFILE_URL, {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
            },
        });

        if (!profileResponse.ok) {
            const error = await profileResponse.text();
            console.error("Profile fetch failed:", error);
            return new Response(`Profile fetch failed: ${error}`, { status: 500 });
        }

        const profile: LineProfile = await profileResponse.json();

        // Create Supabase admin client
        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });

        // Email for this LINE user
        // Append timestamp to avoid "Database error checking email" if a previous account is corrupted
        const email = `${profile.userId}-${Date.now()}@line.nightbase.app`;

        let userId: string | null = null;
        let invitedProfileId: string | null = null;

        // PRIORITY 0: Handle account linking
        if (linkUserId) {
            console.log("Processing account linking for user:", linkUserId);
            userId = linkUserId;

            // Check if this LINE ID is already linked to another user
            const { data: existingLinkedProfiles } = await supabase
                .from("profiles")
                .select("user_id")
                .eq("line_user_id", profile.userId);

            // If we are in link mode, check if the linked user is different from the current user
            if (mode === 'link' && linkUserId && userId !== linkUserId) {
                console.log(`LINE ID ${profile.userId} is taken by ${userId}, but will be moved to ${linkUserId}`);
                // Allow taking over the LINE ID by clearing the old link
                const { error: unlinkError } = await supabase
                    .from("profiles")
                    .update({ line_user_id: null })
                    .eq("line_user_id", profile.userId);

                if (unlinkError) {
                    console.error("Failed to unlink old profile:", unlinkError);
                }

                // Set userId to linkUserId to proceed with linking to the current user
                userId = linkUserId;
            } else if (mode !== 'link') {
                // Login mode: use the found user
                // userId is already set
            }

            // Protect existing email users' authentication credentials
            // Get existing user info from Auth and public.users
            const { data: existingAuthUser } = await supabase.auth.admin.getUserById(linkUserId);
            const { data: existingUserData } = await supabase
                .from("users")
                .select("email, primary_email")
                .eq("id", linkUserId)
                .maybeSingle();

            // Check if this is an email user (not a LINE placeholder email)
            const isEmailUser = existingAuthUser?.user?.email &&
                !existingAuthUser.user.email.endsWith("@line.nightbase.app") &&
                !existingAuthUser.user.email.endsWith("@line-v2.nightbase.app");

            console.log("Link - isEmailUser:", isEmailUser);
            console.log("Link - auth email:", existingAuthUser?.user?.email);
            console.log("Link - users data:", existingUserData);

            if (isEmailUser) {
                // This is a mail-registered user linking their LINE account
                // We need to preserve their email login credentials

                // Set primary_email if not already set
                if (!existingUserData?.primary_email) {
                    console.log("Setting primary_email for email user:", existingAuthUser.user.email);
                    await supabase
                        .from("users")
                        .update({ primary_email: existingAuthUser.user.email })
                        .eq("id", linkUserId);
                }

                // DO NOT change auth.users.email or password
                // DO NOT change public.users.email
                // This allows the user to continue logging in with their email and password
            }

            // Update all profiles for this user with LINE info
            // Or should we only update the current profile? 
            // Usually linking is per-user, so updating all profiles for this user seems correct
            // as they represent the same person in different stores.
            // Update all profiles for this user with LINE info
            const { data: updatedProfiles, error: updateError } = await supabase
                .from("profiles")
                .update({
                    line_user_id: profile.userId,
                    avatar_url: profile.pictureUrl,
                })
                .eq("user_id", userId)
                .select();

            if (updateError) {
                console.error("Failed to link account:", updateError);
                return new Response(`連携に失敗しました: ${updateError.message}`, { status: 500 });
            }

            // If no profiles updated, try via users.current_profile_id
            if (!updatedProfiles || updatedProfiles.length === 0) {
                console.log("No profiles updated via user_id, trying current_profile_id...");
                const { data: userData } = await supabase
                    .from("users")
                    .select("current_profile_id")
                    .eq("id", userId)
                    .maybeSingle();

                if (userData?.current_profile_id) {
                    const { error: fallbackError } = await supabase
                        .from("profiles")
                        .update({
                            line_user_id: profile.userId,
                            avatar_url: profile.pictureUrl,
                        })
                        .eq("id", userData.current_profile_id);

                    if (fallbackError) {
                        console.error("Fallback link failed:", fallbackError);
                        return new Response(`連携に失敗しました: ${fallbackError.message}`, { status: 500 });
                    }
                } else {
                    console.error("No profile found for user to link");
                    return new Response("連携するプロフィールが見つかりません", { status: 404 });
                }
            }

            // Redirect back to me page with timestamp to bust cache
            const finalUrl = new URL(`${frontendUrl}/app/me`);
            finalUrl.searchParams.set('_t', Date.now().toString());
            return new Response(null, {
                status: 302,
                headers: {
                    "Location": finalUrl.toString(),
                    "Cache-Control": "no-cache, no-store, must-revalidate",
                },
            });
        }

        // PRIORITY 1: Handle invitation if token exists
        if (inviteToken) {
            // Validate UUID format
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(inviteToken)) {
                console.error("Invalid invite token format:", inviteToken);
                // Treat as invalid token, but don't crash - just proceed as normal login
            } else {
                console.log("Processing invitation with token:", inviteToken);

                // Verify invitation
                const cleanInviteToken = inviteToken.trim();
                console.log(`Searching for invitation with ID: "${cleanInviteToken}" (Length: ${cleanInviteToken.length})`);

                const { data: invitation, error: inviteError } = await supabase
                    .from("profiles")
                    .select("*")
                    .eq("id", cleanInviteToken)
                    .maybeSingle();

                if (inviteError) {
                    console.error("Error searching for invitation:", inviteError);
                    return new Response(`招待データの検索中にエラーが発生しました: ${inviteError.message} (Token: ${cleanInviteToken})`, { status: 500 });
                }

                if (!invitation) {
                    console.error("Invitation not found for token:", cleanInviteToken);
                    const hasServiceKey = !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
                    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "unknown";

                    // Debug: Check if we can see any profiles
                    const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true });
                    const { data: sample } = await supabase.from("profiles").select("id").limit(1).maybeSingle();

                    return new Response(
                        `招待が見つかりません。\nToken: "${cleanInviteToken}" (Len: ${cleanInviteToken.length})\nServiceKey: ${hasServiceKey}\nDB: ${supabaseUrl.substring(0, 20)}...\nCount: ${count}\nSampleID: ${sample?.id}\nMode: ${mode}`,
                        { status: 404 }
                    );
                } else if (invitation.invite_status !== "pending") {
                    console.error("Invitation is not pending:", invitation.invite_status);
                    return new Response("この招待は既に使用されているか、無効です", { status: 400 });
                } else {
                    // Valid invitation found
                    invitedProfileId = invitation.id;
                    console.log("Invited profile ID:", invitedProfileId);

                    // Check if invited profile already has a user_id
                    if (invitation.user_id) {
                        console.log("Invited profile already has a user_id:", invitation.user_id);
                        userId = invitation.user_id;
                    }

                    if (userId) {
                        const password = profile.userId;
                        const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
                            password: password,
                        });

                        if (updateError) {
                            console.error("Password update failed:", updateError);
                        }
                    }
                }
            }
        }

        // If we have an invited profile but no user yet, create one and link it
        if (invitedProfileId && !userId) {
            // Profile not yet linked - create new user and link to invited profile
            const password = profile.userId;
            let { data: newAuthUser, error: authError } = await supabase.auth.admin.createUser({
                email,
                password: password,
                email_confirm: true,
                user_metadata: {
                    line_user_id: profile.userId,
                    name: profile.displayName,
                    avatar_url: profile.pictureUrl,
                },
            });

            if (authError) {
                console.error("=== INVITATION AUTH ERROR DETAILS ===");
                console.error("Error message:", authError.message);
                console.error("Error name:", authError.name);
                console.error("Error status:", authError.status);
                console.error("Full error:", JSON.stringify(authError, null, 2));
                console.error("Attempted email:", email);
                console.error("Invitation profile ID:", invitedProfileId);
                console.error("====================================");

                // Check if error is because user already exists
                if (authError.message?.includes("already been registered")) {
                    console.log("User already exists, attempting to recover userId...");

                    // Strategy 1: Try to sign in with the expected password (LINE user ID)
                    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                        email,
                        password: password,
                    });

                    if (signInData.user) {
                        console.log("Recovered userId via sign-in");
                        newAuthUser = { user: signInData.user };
                    } else {
                        console.log("Sign-in recovery failed, trying listUsers...", signInError);

                        // Strategy 2: Use listUsers to find by email (with higher limit)
                        const { data: users, error: listError } = await supabase.auth.admin.listUsers({
                            page: 1,
                            perPage: 1000
                        });

                        if (listError) {
                            console.error("listUsers failed:", listError);
                        }

                        const foundUser = users?.users.find((u: any) => u.email === email);

                        if (foundUser) {
                            console.log("Recovered userId via listUsers");
                            newAuthUser = { user: foundUser };
                        } else {
                            console.error("User exists but could not be found via sign-in or listUsers");
                            return new Response(`ユーザーの作成に失敗しました: ${authError.message}`, { status: 500 });
                        }
                    }
                } else {
                    console.error("Invitation user creation failed with non-duplicate error");
                    return new Response(`ユーザーの作成に失敗しました: ${authError.message}`, { status: 500 });
                }
            }

            if (!newAuthUser?.user) {
                return new Response("ユーザーの作成に失敗しました", { status: 500 });
            }

            userId = newAuthUser.user.id;

            // Link the LINE user to the invited profile and update invite status
            const { error: updateProfileError } = await supabase
                .from("profiles")
                .update({
                    user_id: userId,
                    line_user_id: profile.userId,
                    avatar_url: profile.pictureUrl,
                    invite_status: "accepted",
                    invite_token: null, // Clear token
                    invite_expires_at: null
                })
                .eq("id", invitedProfileId);

            if (updateProfileError) {
                console.error("Failed to link profile to user:", updateProfileError);
                return new Response("プロフィールのリンクに失敗しました", { status: 500 });
            }

            // Create or update users table record with current_profile_id and LINE info
            const { error: upsertUserError } = await supabase
                .from("users")
                .upsert({
                    id: userId,
                    email: email,
                    current_profile_id: invitedProfileId,
                    avatar_url: profile.pictureUrl,
                    display_name: profile.displayName,
                }, {
                    onConflict: "id"
                });

            if (upsertUserError) {
                console.error("Failed to create/update users record:", upsertUserError);
                return new Response("ユーザーレコードの作成に失敗しました", { status: 500 });
            }
        }

        // If userId is still not set (no invitation or invalid), try normal login/registration
        let loginEmail = email;
        let isEmailUser = false; // Track if this is an email user (not LINE-only)

        // If userId is still not set (no invitation or invalid), try normal login/registration
        if (!userId) {
            // Check if this LINE user is already linked to an existing account
            const { data: linkedProfile } = await supabase
                .from("profiles")
                .select("user_id")
                .eq("line_user_id", profile.userId)
                .limit(1)
                .maybeSingle();

            if (linkedProfile) {
                console.log("Found existing profile linked to LINE:", linkedProfile.user_id);
                // User already exists with this LINE ID
                userId = linkedProfile.user_id;

                if (!userId) {
                    console.error("Profile found but no user_id linked:", linkedProfile);

                    // Attempt to recover: Find user who has this profile as current_profile_id
                    const { data: recoverUser } = await supabase
                        .from("users")
                        .select("id")
                        .eq("current_profile_id", linkedProfile.id)
                        .maybeSingle();

                    if (recoverUser) {
                        console.log("Recovering profile link for user:", recoverUser.id);
                        // Fix the profile
                        await supabase
                            .from("profiles")
                            .update({ user_id: recoverUser.id })
                            .eq("id", linkedProfile.id);

                        userId = recoverUser.id;
                    } else {
                        return new Response("LINE連携されたプロフィールにユーザーが紐付いていません", { status: 500 });
                    }
                }

                // Update latest LINE profile info
                if (profile.pictureUrl) {
                    console.log("Updating profile avatar from LINE for user:", userId);
                    await supabase
                        .from("profiles")
                        .update({
                            avatar_url: profile.pictureUrl,
                        })
                        .eq("user_id", userId);
                }

                // Get current auth user email
                const { data: authUser } = await supabase.auth.admin.getUserById(userId);

                // Check if this is an email user (not a LINE placeholder email)
                // Email users should keep their original password
                isEmailUser = authUser?.user?.email &&
                    !authUser.user.email.endsWith("@line.nightbase.app") &&
                    !authUser.user.email.endsWith("@line-v2.nightbase.app");

                console.log("Re-login - isEmailUser:", isEmailUser);
                console.log("Re-login - auth email:", authUser?.user?.email);

                if (isEmailUser) {
                    // This is an email user who has linked their LINE account
                    // Use their auth email for login and DO NOT change password
                    loginEmail = authUser.user.email;

                    // Set primary_email if not already set (for email users who linked before the fix)
                    const { data: userData } = await supabase
                        .from("users")
                        .select("primary_email")
                        .eq("id", userId)
                        .maybeSingle();

                    if (!userData?.primary_email) {
                        console.log("Setting primary_email during re-login for email user:", authUser.user.email);
                        await supabase
                            .from("users")
                            .update({ primary_email: authUser.user.email })
                            .eq("id", userId);
                    }

                    // DO NOT update password - preserve user's email login password
                } else if (authUser?.user?.email) {
                    // This is a LINE-only user (email ends with @line.nightbase.app)
                    loginEmail = authUser.user.email;
                    // Update password to LINE user ID for consistent LINE login
                    await supabase.auth.admin.updateUserById(userId, {
                        password: profile.userId,
                    });
                } else {
                    // Fallback to LINE email format
                    loginEmail = `${profile.userId}@line-v2.nightbase.app`;
                }

                // Update users table with latest LINE avatar and display name
                await supabase
                    .from("users")
                    .update({
                        avatar_url: profile.pictureUrl,
                        display_name: profile.displayName,
                    })
                    .eq("id", userId);
            } else {
                // New LINE user

                // If mode is 'login', do not create a new user automatically.
                // Redirect to unregistered page instead.
                if (mode === "login") {
                    console.log("User not found in login flow, redirecting to unregistered page...");
                    const redirectUrl = `${frontendUrl}/login/unregistered`;

                    return new Response(null, {
                        status: 302,
                        headers: {
                            "Location": redirectUrl,
                            "Cache-Control": "no-cache, no-store, must-revalidate",
                        },
                    });
                }

                // Create new user with password (LINE user ID as password)
                // loginEmail is already set to default
                // Use direct fetch to Admin API to bypass potential client issues

                console.log("=== CREATE USER DEBUG ===");
                console.log("URL:", `${supabaseUrl}/auth/v1/admin/users`);
                console.log("Email:", loginEmail);
                console.log("Service Key (first 30 chars):", supabaseServiceKey?.substring(0, 30));
                console.log("=========================");

                const createUserResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "apikey": supabaseServiceKey,
                        "Authorization": `Bearer ${supabaseServiceKey}`,
                    },
                    body: JSON.stringify({
                        email: loginEmail,
                        password: profile.userId,
                        email_confirm: true,
                        user_metadata: {
                            line_user_id: profile.userId,
                            name: profile.displayName,
                            avatar_url: profile.pictureUrl,
                        },
                    }),
                });

                let newAuthUser: { user: any } | null = null;
                let authError: { message: string; name?: string; status?: number } | null = null;

                if (!createUserResponse.ok) {
                    const errorData = await createUserResponse.json();
                    authError = {
                        message: errorData.msg || errorData.message || "Unknown error",
                        name: "AuthApiError",
                        status: createUserResponse.status,
                    };
                } else {
                    const userData = await createUserResponse.json();
                    newAuthUser = { user: userData };
                }

                if (authError) {
                    console.error("=== AUTH ERROR DETAILS ===");
                    console.error("Error message:", authError.message);
                    console.error("Error name:", authError.name);
                    console.error("Error status:", authError.status);
                    console.error("Full error:", JSON.stringify(authError, null, 2));
                    console.error("Attempted email:", loginEmail);
                    console.error("========================");

                    // Check if error is because user already exists
                    if (authError.message?.includes("already been registered")) {
                        console.log("User already exists, attempting to recover userId...");

                        // Strategy 1: Try to sign in with the expected password (LINE user ID)
                        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                            email: loginEmail,
                            password: profile.userId,
                        });

                        if (signInData.user) {
                            console.log("Recovered userId via sign-in");
                            newAuthUser = { user: signInData.user };
                        } else {
                            console.log("Sign-in recovery failed, trying listUsers...", signInError);

                            // Strategy 2: Use listUsers to find by email (with higher limit)
                            const { data: users, error: listError } = await supabase.auth.admin.listUsers({
                                page: 1,
                                perPage: 1000
                            });

                            if (listError) {
                                console.error("listUsers failed:", listError);
                            }

                            const foundUser = users?.users.find((u: any) => u.email === loginEmail);

                            if (foundUser) {
                                console.log("Recovered userId via listUsers");
                                newAuthUser = { user: foundUser };
                            } else {
                                console.error("User exists but could not be found via sign-in or listUsers");
                                return new Response(`ユーザーの作成に失敗しました: ${authError.message}`, { status: 500 });
                            }
                        }
                    } else {
                        console.error("User creation failed with non-duplicate error");
                        return new Response(`ユーザーの作成に失敗しました: ${authError.message}`, { status: 500 });
                    }
                }

                if (!newAuthUser?.user) {
                    return new Response("ユーザーの作成に失敗しました", { status: 500 });
                }

                userId = newAuthUser.user.id;

                // Create profile for new user
                const { error: profileError } = await supabase
                    .from("profiles")
                    .insert({
                        user_id: userId,
                        line_user_id: profile.userId,
                        real_name: profile.displayName,
                        avatar_url: profile.pictureUrl,
                    });

                if (profileError) {
                    console.error("Profile creation failed:", profileError);
                    return new Response(`プロフィールの作成に失敗しました: ${profileError.message}`, { status: 500 });
                }

                // Create users table record with LINE info
                const { error: upsertUserError } = await supabase
                    .from("users")
                    .upsert({
                        id: userId,
                        email: loginEmail,
                        avatar_url: profile.pictureUrl,
                        display_name: profile.displayName,
                        // current_profile_id will be set when they create a store or join one
                    }, {
                        onConflict: "id"
                    });

                if (upsertUserError) {
                    console.error("Failed to create users record:", upsertUserError);
                }
            }
        }

        // Sign in with password to get session tokens
        let signInData: any;

        if (isEmailUser) {
            // For email users who have linked their LINE account,
            // DO NOT change their password. Instead, use Admin API to create session.
            console.log("Email user LINE login - using Admin API to create session");

            // Supabase doesn't have a direct "createSession" method, so we use a workaround:
            // Generate a magic link and extract the tokens from it
            const { data: magicLinkData, error: magicLinkError } = await supabase.auth.admin.generateLink({
                type: 'magiclink',
                email: loginEmail,
            });

            if (magicLinkError || !magicLinkData) {
                console.error("Failed to generate magic link:", magicLinkError);
                return new Response(`セッションの作成に失敗しました`, { status: 500 });
            }

            // The magic link contains tokens in the URL
            // We can use the hashed_token to create a session
            const { data: sessionData, error: sessionError } = await supabase.auth.verifyOtp({
                token_hash: magicLinkData.properties.hashed_token,
                type: 'magiclink',
            });

            if (sessionError || !sessionData?.session) {
                console.error("Failed to create session from magic link:", sessionError);
                return new Response(`セッションの作成に失敗しました`, { status: 500 });
            }

            signInData = sessionData;
        } else {
            // For LINE-only users, sign in with LINE user ID as password
            const { data, error: signInError } = await supabase.auth.signInWithPassword({
                email: loginEmail,
                password: profile.userId,
            });

            if (signInError || !data.session) {
                console.error("Sign in failed:", signInError);
                console.error("Attempted email:", loginEmail);
                return new Response(`ログインに失敗しました: ${signInError?.message}`, { status: 500 });
            }

            signInData = data;
        }

        if (!signInData?.session) {
            console.error("No session created");
            return new Response(`セッションの作成に失敗しました`, { status: 500 });
        }

        // Check if user has a profile and store
        const { data: userProfile } = await supabase
            .from("profiles")
            .select("id, real_name, store_id")
            .eq("user_id", userId)
            .limit(1)
            .maybeSingle();

        // Determine redirect URL based on existing data
        let redirectUrl: string;

        if (inviteToken) {
            // Invitation flow: always go to dashboard after processing
            redirectUrl = `${frontendUrl}/app/dashboard`;
        } else if (redirectFromState) {
            // Custom redirect specified (e.g., from join page)
            redirectUrl = `${frontendUrl}${redirectFromState}`;
        } else if (userProfile && userProfile.real_name && userProfile.store_id) {
            // User has profile and store, go to dashboard
            redirectUrl = `${frontendUrl}/app/dashboard`;
        } else if (mode === "create-store") {
            // Creating new store, go to profile/store setup
            redirectUrl = `${frontendUrl}/onboarding/profile?mode=create`;
        } else if (mode === "join-store") {
            // Joining existing store
            redirectUrl = `${frontendUrl}/onboarding/select-store`;
        } else if (mode === "onboarding") {
            // Onboarding flow: go to choice page
            redirectUrl = `${frontendUrl}/onboarding/choice`;
        } else {
            // Default: go to dashboard
            redirectUrl = `${frontendUrl}/app/dashboard`;
        }

        // Check friendship status
        let isFriend = false;
        try {
            const friendshipResponse = await fetch("https://api.line.me/friendship/v1/status", {
                headers: {
                    Authorization: `Bearer ${tokenData.access_token}`,
                },
            });

            if (friendshipResponse.ok) {
                const friendshipData = await friendshipResponse.json();
                isFriend = friendshipData.friendFlag;

                // Save friendship status to database
                const { error: friendshipUpdateError } = await supabase
                    .from("profiles")
                    .update({ line_is_friend: isFriend })
                    .eq("user_id", userId);

                if (friendshipUpdateError) {
                    console.error("Failed to save friendship status:", friendshipUpdateError);
                } else {
                    console.log("Saved friendship status:", isFriend, "for user:", userId);
                }
            } else {
                console.error("Friendship check failed:", await friendshipResponse.text());
            }
        } catch (error) {
            console.error("Friendship check error:", error);
        }

        // Redirect to frontend callback page to handle session setting
        const finalUrl = new URL(`${frontendUrl}/auth/line-callback`);
        finalUrl.searchParams.set("access_token", signInData.session.access_token);
        finalUrl.searchParams.set("refresh_token", signInData.session.refresh_token);
        finalUrl.searchParams.set("is_friend", String(isFriend));
        finalUrl.searchParams.set("next", redirectUrl.replace(frontendUrl || "", "")); // Relative path for next

        return new Response(null, {
            status: 302,
            headers: {
                "Location": finalUrl.toString(),
            },
        });

    } catch (error) {
        console.error("Callback error:", error);
        return new Response(`Internal error: ${(error as Error).message}`, { status: 500 });
    }
});
