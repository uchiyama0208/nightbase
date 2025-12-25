"use client";

import { useEffect, useState, useRef } from "react";
import { Auth0Client } from "@auth0/auth0-spa-js";
import { createBrowserClient } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { acceptInvitation } from "@/app/app/(main)/invitations/actions";
import { toast } from "@/components/ui/use-toast";

export default function Auth0CallbackPage() {
    const router = useRouter();
    const [status, setStatus] = useState("認証処理中...");
    const [debugInfo, setDebugInfo] = useState<string>("");
    const supabase = createBrowserClient() as any;
    const processedRef = useRef(false);

    useEffect(() => {
        if (processedRef.current) return;
        processedRef.current = true;

        const handleCallback = async () => {
            try {
                const domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN;
                const clientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID;

                if (!domain || !clientId) {
                    throw new Error("Auth0 configuration missing");
                }

                const auth0 = new Auth0Client({
                    domain,
                    clientId,
                    cacheLocation: "localstorage",
                    authorizationParams: {
                        redirect_uri: `${window.location.origin}/auth/callback/auth0`,
                    },
                });

                // Handle the redirect callback
                const result = await auth0.handleRedirectCallback();

                // Get the invitation token from appState
                const invitationToken = result.appState?.invitationToken;

                // Get ID Token
                const idTokenClaims = await auth0.getIdTokenClaims();
                const idToken = idTokenClaims?.__raw;

                if (!idToken || !idTokenClaims) {
                    throw new Error("No ID token found");
                }

                const claimsInfo = `Issuer: ${idTokenClaims.iss}\nAudience: ${idTokenClaims.aud}`;
                setDebugInfo(claimsInfo);

                setStatus(`Supabaseにログイン中...\nIssuer: ${idTokenClaims.iss}\nAudience: ${idTokenClaims.aud}`);

                // Sign in to Supabase with the ID token
                const { data: { session }, error: signInError } = await supabase.auth.signInWithIdToken({
                    provider: 'auth0',
                    token: idToken,
                });

                if (signInError) {
                    // Throwing with claims info
                    throw new Error(`Supabase Sign-In Failed: ${signInError.message} (Issuer: ${idTokenClaims.iss}, Audience: ${idTokenClaims.aud})`);
                }

                // Check for onboarding mode
                const mode = result.appState?.mode;

                if (mode === "create-store") {
                    setStatus("プロフィール登録へ移動します...");
                    router.push("/onboarding/profile?mode=create");
                    return;
                } else if (mode === "join-store") {
                    setStatus("店舗選択へ移動します...");
                    router.push("/onboarding/select-store");
                    return;
                }

                if (invitationToken) {
                    setStatus("招待を処理中...");
                    // Link user to invitation
                    const result = await acceptInvitation(invitationToken);
                    if (!result.success) {
                        console.error("Invitation accept error:", result.error);
                        toast({ title: "招待の処理に失敗しました: " + result.error, variant: "destructive" });
                    }
                }

                setStatus("完了しました。ダッシュボードへ移動します...");
                router.push("/app/dashboard");

            } catch (error) {
                console.error("Callback error:", error);
                const errorMessage = error instanceof Error ? error.message : "Unknown error";
                const errorDetails = JSON.stringify(error, null, 2);

                // Retrieve claims from state if available, or try to get them from error context if possible (hard here)
                // But we set debugInfo state earlier, so we can tell user to look at it, 
                // OR we can construct a more helpful message if we have the claims in scope.
                // We don't have claims in scope here easily unless we move the try/catch or var declaration.
                // Let's rely on the debugInfo state being rendered, but make the error message point to it.

                setStatus(`エラーが発生しました: ${errorMessage}\n\n【重要】下の「Debug Info」にあるIssuerとAudienceをSupabaseの設定と照らし合わせてください。\n\n詳細: ${errorDetails}`);
            }
        };

        handleCallback();
    }, [router, supabase]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
            <div className="text-center space-y-4 max-w-lg w-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
                <p className="text-lg font-medium text-gray-900 dark:text-white whitespace-pre-wrap break-words">{status}</p>

                {debugInfo && (
                    <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded text-left text-xs font-mono overflow-auto max-h-40">
                        <p className="font-bold mb-2">Debug Info (Supabase設定と一致させてください):</p>
                        <pre className="whitespace-pre-wrap break-all">{debugInfo}</pre>
                    </div>
                )}
            </div>
        </div>
    );
}

export const dynamic = 'force-dynamic';
