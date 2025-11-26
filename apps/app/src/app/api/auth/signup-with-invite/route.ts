import { createServerClient } from "@/lib/supabaseServerClient";
import { NextResponse } from "next/server";
import { getInvitationByToken } from "@/app/app/(main)/invitations/actions";
import crypto from "crypto";

export async function POST(request: Request) {
    try {
        const { email, password, inviteToken, invitePassword } = await request.json();

        if (!email || !password || !inviteToken) {
            return NextResponse.json(
                { success: false, message: "メールアドレス、パスワード、招待トークンが必要です" },
                { status: 400 }
            );
        }

        // Validate invite password if required
        const invitation = await getInvitationByToken(inviteToken);
        if (!invitation) {
            return NextResponse.json(
                { success: false, message: "招待が見つかりません" },
                { status: 404 }
            );
        }

        if (invitation.has_password) {
            if (!invitePassword) {
                return NextResponse.json(
                    { success: false, message: "招待パスワードが必要です" },
                    { status: 400 }
                );
            }
            const hash = crypto.createHash("sha256").update(invitePassword).digest("hex");
            if (hash !== invitation.password_hash) {
                return NextResponse.json(
                    { success: false, message: "招待パスワードが間違っています" },
                    { status: 400 }
                );
            }
        }

        const supabase = await createServerClient();

        // Create user with Supabase Auth
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/invite/${inviteToken}`,
                data: {
                    invite_token: inviteToken,
                },
            },
        });

        if (error) {
            console.error("Signup error:", error);
            return NextResponse.json(
                { success: false, message: error.message },
                { status: 400 }
            );
        }

        if (!data.user) {
            return NextResponse.json(
                { success: false, message: "ユーザーの作成に失敗しました" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "確認メールを送信しました。メールをご確認ください。",
        });
    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json(
            { success: false, message: "予期しないエラーが発生しました" },
            { status: 500 }
        );
    }
}
