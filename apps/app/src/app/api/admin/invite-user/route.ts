import { NextResponse } from "next/server";

import { createAdminServerClient } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabaseServiceClient";

const ALLOWED_ROLES = new Set(["admin", "editor", "viewer"]);

function normalizeEmail(email: unknown): string | null {
  if (typeof email !== "string") {
    return null;
  }

  const trimmed = email.trim().toLowerCase();
  if (!trimmed || !trimmed.includes("@")) {
    return null;
  }

  return trimmed;
}

export async function POST(request: Request) {
  let profile: { role: string } | null = null;
  let requestBody: Record<string, unknown> | null = null;

  try {
    ({ profile } = await createAdminServerClient());
  } catch (error) {
    console.error("[InviteUser] 認証エラー", error);
    return NextResponse.json({ error: "認証情報を確認してください" }, { status: 401 });
  }

  try {
    if (profile?.role !== "admin") {
      return NextResponse.json({ success: false, message: "管理者のみが招待できます" }, { status: 403 });
    }

    requestBody = await request.json().catch(() => null);
    const email = normalizeEmail(requestBody?.email);
    const role: string | null = typeof requestBody?.role === "string" ? requestBody.role : null;
    const displayName = typeof requestBody?.displayName === "string" ? requestBody.displayName.trim() : "";

    if (!email || !role || !ALLOWED_ROLES.has(role)) {
      return NextResponse.json({ success: false, message: "入力内容を確認してください" }, { status: 400 });
    }

    const adminClient = createServiceRoleClient() as any;

    const redirectTo = process.env.NEXT_PUBLIC_SITE_URL
      ? `${process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")}/admin`
      : undefined;

    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: displayName ? { display_name: displayName } : undefined,
    });

    if (inviteError) {
      console.error("[InviteUser] Supabase auth error", { body: requestBody, error: inviteError });
      const normalizedMessage = inviteError.message?.includes("already registered")
        ? "このメールアドレスのユーザーは既に登録されています"
        : inviteError.message;
      return NextResponse.json({ success: false, message: normalizedMessage }, { status: 400 });
    }

    const invitedUser = inviteData?.user;
    if (!invitedUser?.id) {
      return NextResponse.json({ success: false, message: "ユーザーIDの取得に失敗しました" }, { status: 500 });
    }

    const { error: profileError } = await adminClient
      .from("profiles")
      .upsert(
        {
          user_id: invitedUser.id,
          email,
          display_name: displayName || null,
          role,
        } as any,
        { onConflict: "user_id" }
      );

    if (profileError) {
      console.error("[InviteUser] profiles upsert error", { body: requestBody, error: profileError });
      return NextResponse.json({ success: false, message: profileError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[InviteUser] 予期せぬエラー", { body: requestBody, error });
    return NextResponse.json({ success: false, message: "ユーザー招待に失敗しました" }, { status: 500 });
  }
}
