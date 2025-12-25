# CLAUDE.md

このファイルはClaude Codeがコーディングする際に従うべきルールを記述します。

## コミュニケーション

- **必ず日本語で会話すること**

## コードコメント

- **全角記号を使わない** - `（）`、`：`、`、`、`。`などはコード内で使用禁止

## 技術スタック

- フレームワーク: **Next.js App Router**
- 言語: **TypeScript**
- UI: **Tailwind CSS + shadcn/ui**
- DB: **Supabase**

## ドキュメント

詳細なルールは以下を参照：

- [デザインシステム](./docs/design-system.md) - デザイントークン、色、文字サイズ、アイコン
- [コンポーネントテンプレート](./docs/component-templates.md) - モーダル、テーブル、ボタン等のテンプレート
- [コーディングルール](./docs/coding-rules.md) - タイムゾーン、Supabase、禁止事項

## データベース接続情報

### Dev環境 (ip4)

マイグレーション実行:
```bash
/usr/local/opt/libpq/bin/psql "postgresql://postgres.ghjuspyjqlmjlqvfstmz:abokado2000%21@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres" -f <migration_file.sql>
```
