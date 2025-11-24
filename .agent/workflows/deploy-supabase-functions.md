---
description: Supabase Edge Functionsのデプロイ方法
---

# Supabase Edge Functionsのデプロイ

## 重要: 必ず --no-verify-jwt フラグを使用すること

**LINE認証用のEdge Functions (`line-auth`, `line-callback`) は公開エンドポイントである必要があるため、必ず以下のコマンドでデプロイしてください:**

```bash
npx supabase functions deploy --no-verify-jwt
```

または個別にデプロイする場合:

```bash
npx supabase functions deploy line-auth --no-verify-jwt
npx supabase functions deploy line-callback --no-verify-jwt
```

## 理由

- Supabase Edge Functionsはデフォルトで`verify_jwt = true`（JWT認証が必要）
- `config.toml`に`verify_jwt = false`を設定しても、Supabase CLIが正しく読み込まない場合がある
- LINE認証フローは公開エンドポイントなので、JWT検証をオフにする必要がある
- `--no-verify-jwt`フラグを付けないと、デプロイ後に「Missing authorization header」エラーが発生する

## デプロイ手順

// turbo-all

1. **全てのEdge Functionsをデプロイ**
```bash
npx supabase functions deploy --no-verify-jwt
```

2. **デプロイ後の確認**
   - Supabase Dashboard → Edge Functions → line-auth → Details
   - Supabase Dashboard → Edge Functions → line-callback → Details
   - 両方とも「Verify JWT」がオフになっていることを確認

3. **もしVerify JWTがオンになっている場合**
   - ダッシュボードから手動でオフにする
   - 再度`--no-verify-jwt`フラグを付けてデプロイ

## 注意事項

- **絶対に`npx supabase functions deploy`だけでデプロイしないこと**
- 必ず`--no-verify-jwt`フラグを付ける
- このフラグを忘れると、LINE認証が動作しなくなる
