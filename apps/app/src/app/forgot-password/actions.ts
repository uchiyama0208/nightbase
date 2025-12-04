"use server";

import { createServerClient } from "@/lib/supabaseServerClient";
import { headers } from "next/headers";

export async function requestPasswordReset(email: string) {
    if (!email) {
        return { success: false, error: "メールアドレスを入力してください" };
    }

    const supabase = await createServerClient();

    // Get the origin from the request headers for proper redirect
    const headersList = await headers();
    const origin = headersList.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001";

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/reset-password`,
    });

    if (error) {
        console.error("Password reset error:", error);
        // Don't reveal if email exists or not for security
        // Always return success to prevent email enumeration
    }

    // Always return success to prevent email enumeration attacks
    return { success: true };
}
