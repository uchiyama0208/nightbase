import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServerClient";

export async function POST(request: NextRequest) {
    try {
        const supabase = await createServerClient() as any;

        // 認証チェック
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json(
                { success: false, error: "認証が必要です" },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { requestDateId, targetDate, storeName, profileId } = body;

        if (!requestDateId || !targetDate || !storeName) {
            return NextResponse.json(
                { success: false, error: "必要なパラメータが不足しています" },
                { status: 400 }
            );
        }

        // 募集日付から募集情報を取得
        const { data: requestDate, error: rdError } = await supabase
            .from("shift_request_dates")
            .select(`
                id,
                target_date,
                shift_requests!inner(
                    id,
                    store_id,
                    title,
                    deadline,
                    target_roles,
                    target_profile_ids
                )
            `)
            .eq("id", requestDateId)
            .single();

        if (rdError || !requestDate) {
            return NextResponse.json(
                { success: false, error: "募集が見つかりません" },
                { status: 404 }
            );
        }

        const shiftRequest = requestDate.shift_requests as any;

        // ユーザーがこの店舗に所属しているか確認
        const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("user_id", user.id)
            .eq("store_id", shiftRequest.store_id)
            .maybeSingle();

        if (!profile) {
            return NextResponse.json(
                { success: false, error: "この操作を行う権限がありません" },
                { status: 403 }
            );
        }

        // 個別通知の場合
        if (profileId) {
            const { data: targetProfile, error: profileError } = await supabase
                .from("profiles")
                .select("id, display_name, line_user_id, line_is_friend")
                .eq("id", profileId)
                .single();

            if (profileError || !targetProfile) {
                return NextResponse.json(
                    { success: false, error: "プロフィールが見つかりません" },
                    { status: 404 }
                );
            }

            if (!targetProfile.line_is_friend) {
                return NextResponse.json(
                    { success: false, error: "LINE未連携のユーザーです" },
                    { status: 400 }
                );
            }

            const message = buildReminderMessage(storeName, targetDate, shiftRequest.deadline);

            const sendResult = await sendLineMessage([targetProfile.line_user_id], message);
            if (!sendResult.success) {
                return NextResponse.json(
                    { success: false, error: sendResult.error },
                    { status: 500 }
                );
            }

            return NextResponse.json({ success: true, sentCount: 1 });
        }

        // まとめて通知の場合
        // 既に提出済みのプロフィールIDを取得
        const { data: submissions } = await supabase
            .from("shift_submissions")
            .select("profile_id")
            .eq("shift_request_date_id", requestDateId);

        const submittedProfileIds = new Set(submissions?.map((s: any) => s.profile_id) || []);

        // 対象プロフィールを取得
        let profilesQuery = supabase
            .from("profiles")
            .select("id, display_name, line_user_id, line_is_friend, role")
            .eq("store_id", shiftRequest.store_id);

        if (shiftRequest.target_profile_ids && shiftRequest.target_profile_ids.length > 0) {
            profilesQuery = profilesQuery.in("id", shiftRequest.target_profile_ids);
        } else if (shiftRequest.target_roles && shiftRequest.target_roles.length > 0) {
            const rolesFilter = shiftRequest.target_roles.includes("staff")
                ? [...shiftRequest.target_roles, "admin"]
                : shiftRequest.target_roles;
            profilesQuery = profilesQuery.in("role", rolesFilter);
        }

        const { data: allProfiles } = await profilesQuery;

        // 未提出かつLINE連携済みのユーザーを抽出
        const notSubmittedProfiles = (allProfiles || []).filter(
            (p: any) => !submittedProfileIds.has(p.id) && p.line_is_friend === true
        );

        if (notSubmittedProfiles.length === 0) {
            return NextResponse.json(
                { success: false, error: "送信対象のユーザーがいません" },
                { status: 400 }
            );
        }

        const lineUserIds = notSubmittedProfiles.map((p: any) => p.line_user_id);
        const message = buildReminderMessage(storeName, targetDate, shiftRequest.deadline);

        const sendResult = await sendLineMessage(lineUserIds, message);
        if (!sendResult.success) {
            return NextResponse.json(
                { success: false, error: sendResult.error },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, sentCount: lineUserIds.length });
    } catch (err) {
        console.error("Shift reminder API error:", err);
        return NextResponse.json(
            { success: false, error: "サーバーエラーが発生しました" },
            { status: 500 }
        );
    }
}

function buildReminderMessage(storeName: string, targetDate: string, deadline: string): string {
    const [year, month, day] = targetDate.split("-").map(Number);
    const dateText = `${month}/${day}`;

    let deadlineText = "";
    if (deadline) {
        const deadlineDate = new Date(deadline);
        deadlineText = deadlineDate.toLocaleString("ja-JP", {
            timeZone: "Asia/Tokyo",
            month: "numeric",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    return `【${storeName}】シフト提出リマインダー

${dateText}のシフト希望がまだ提出されていません。

${deadlineText ? `提出期限: ${deadlineText}\n\n` : ""}アプリからシフト希望を提出してください。`;
}

async function sendLineMessage(lineUserIds: string[], message: string): Promise<{ success: boolean; error?: string }> {
    try {
        const response = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/line-send-message`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                },
                body: JSON.stringify({
                    lineUserIds,
                    message,
                }),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error("LINE send error:", errorText);
            return { success: false, error: errorText };
        }

        return { success: true };
    } catch (error) {
        console.error("LINE send error:", error);
        return { success: false, error: (error as Error).message };
    }
}
