"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createBrowserClient } from "@/lib/supabaseClient";

export function OnboardingChoiceAuth() {
    const searchParams = useSearchParams();
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        const handleSession = async () => {
            const accessToken = searchParams.get("access_token");
            const refreshToken = searchParams.get("refresh_token");

            if (!accessToken || !refreshToken || processing) {
                return;
            }

            setProcessing(true);

            try {
                const supabase = createBrowserClient() as any;
                const { error } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                });

                if (error) {
                    console.error("Error setting session:", error);
                } else {
                    // Remove tokens from URL for cleaner history
                    const newUrl = new URL(window.location.href);
                    newUrl.searchParams.delete("access_token");
                    newUrl.searchParams.delete("refresh_token");
                    window.history.replaceState({}, "", newUrl.toString());
                }
            } catch (err) {
                console.error("Unexpected error setting session:", err);
            }
        };

        handleSession();
    }, [searchParams, processing]);

    return null;
}
