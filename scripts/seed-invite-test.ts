/**
 * 招待テスト用の仮データを作成するスクリプト
 * 
 * 使用方法:
 * npx tsx scripts/seed-invite-test.ts
 * 
 * 環境変数が必要:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY (または NEXT_PUBLIC_SUPABASE_ANON_KEY)
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// Load env from apps/app/.env.local manually
const envPath = path.resolve(__dirname, "../apps/app/.env.local");
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    for (const line of envContent.split("\n")) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
            const [key, ...valueParts] = trimmed.split("=");
            const value = valueParts.join("=").replace(/^["']|["']$/g, "");
            if (key && value && !process.env[key]) {
                process.env[key] = value;
            }
        }
    }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("環境変数が設定されていません");
    console.error("NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl ? "SET" : "NOT SET");
    console.error("SUPABASE_SERVICE_ROLE_KEY:", supabaseKey ? "SET" : "NOT SET");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

const STORE_ID = "ae5a4088-3468-4688-9a6f-467ea3fe26e4";

async function main() {
    console.log("=== 招待テストデータ作成 ===\n");

    // 1. まずstoreが存在するか確認
    const { data: store, error: storeError } = await supabase
        .from("stores")
        .select("id, name")
        .eq("id", STORE_ID)
        .maybeSingle();

    if (storeError) {
        console.error("Store取得エラー:", storeError);
        return;
    }

    if (!store) {
        console.error(`Store ID ${STORE_ID} が見つかりません`);
        return;
    }

    console.log(`Store: ${store.name} (${store.id})\n`);

    // 2. 招待用のプロフィールを作成（pending状態）
    const inviteExpiresAt = new Date();
    inviteExpiresAt.setDate(inviteExpiresAt.getDate() + 7); // 7日後に期限切れ

    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .insert({
            store_id: STORE_ID,
            real_name: "テスト招待ユーザー",
            display_name: "テスト太郎",
            role: "cast",
            invite_status: "pending",
            invite_expires_at: inviteExpiresAt.toISOString(),
            // user_id は null（まだ紐付いていない）
        })
        .select()
        .single();

    if (profileError) {
        console.error("Profile作成エラー:", profileError);
        return;
    }

    console.log("招待プロフィールを作成しました:");
    console.log(`  ID: ${profile.id}`);
    console.log(`  名前: ${profile.real_name}`);
    console.log(`  役割: ${profile.role}`);
    console.log(`  有効期限: ${profile.invite_expires_at}`);
    console.log("");

    // 3. 招待URLを生成
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
    const inviteUrl = `${baseUrl}/invite/${profile.id}`;

    console.log("=== 招待URL ===");
    console.log(inviteUrl);
    console.log("");
    console.log("このURLにアクセスして招待フローをテストできます。");
}

main().catch(console.error);
