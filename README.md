# Nightbase - Monorepo

NightbaseプロジェクトのTurborepo Monorepo構成です。

## 📁 プロジェクト構成

```
nightbase/
├── apps/
│   ├── marketing/          # マーケティングサイト (nightbase.jp)
│   │   ├── src/app/        # LP, ブログ, 事例紹介等
│   │   └── port: 3000
│   └── app/                # アプリ本体 (app.nightbase.jp)
│       ├── src/app/        # App, Admin, Auth, API等
│       └── port: 3001
└── packages/
    └── ui/                 # 共通UIコンポーネント
```

## 🚀 ローカル開発

### 環境要件
- Node.js 20.x以上
- npm 10.x以上

### セットアップ

1. **リポジトリのクローン**
```bash
git clone <repository-url>
cd nightbase
```

2. **依存関係のインストール**
```bash
npm install
```

3. **環境変数の設定**

各アプリの`.env.local`ファイルを作成：

**apps/marketing/.env.local:**
```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**apps/app/.env.local:**
```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=http://localhost:3001

# その他の環境変数は apps/app/.env.local.example を参照
```

### 開発サーバーの起動

**両方同時に起動:**
```bash
npm run dev
```

**個別に起動:**
```bash
# Marketingサイトのみ (port 3000)
npm run dev --workspace=@nightbase/marketing

# Appサイトのみ (port 3001)
npm run dev --workspace=@nightbase/app
```

### ビルド

**全アプリをビルド:**
```bash
npm run build
```

**個別にビルド:**
```bash
npm run build --workspace=@nightbase/marketing
npm run build --workspace=@nightbase/app
```

### その他のコマンド

```bash
# Lint実行
npm run lint

# キャッシュクリア
npm run clean
```

## 🌐 Vercelデプロイ

### 前提条件
- Vercelアカウント
- GitHubリポジトリとの連携

### デプロイ手順

#### 1. Marketingサイト (nightbase.jp)

1. Vercelで新規プロジェクトを作成
2. `apps/marketing`をRoot Directoryに設定
3. Framework Preset: Next.js
4. Build Command: `cd ../.. && npm run build --workspace=@nightbase/marketing`
5. Install Command: `cd ../.. && npm install`
6. Output Directory: `.next`
7. 環境変数を設定:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

#### 2. Appサイト (app.nightbase.jp)

1. Vercelで新規プロジェクトを作成
2. `apps/app`をRoot Directoryに設定
3. Framework Preset: Next.js
4. Build Command: `cd ../.. && npm run build --workspace=@nightbase/app`
5. Install Command: `cd ../.. && npm install`
6. Output Directory: `.next`
7. 環境変数を設定 (apps/app/.env.local.exampleを参照)

### カスタムドメインの設定

1. Vercelのプロジェクト設定でDomainsタブを開く
2. カスタムドメインを追加:
   - Marketing: `nightbase.jp`, `www.nightbase.jp`
   - App: `app.nightbase.jp`
3. DNSレコードを設定（Vercel提供の指示に従う）

## 📦 パッケージ管理

このMonorepoはnpm workspacesを使用しています。

### 新しい依存関係の追加

**特定のアプリに追加:**
```bash
npm install <package> --workspace=@nightbase/marketing
npm install <package> --workspace=@nightbase/app
```

**ルートに追加（開発ツール等）:**
```bash
npm install -D <package>
```

### パッケージの更新

```bash
npm update
```

## 🛠️ トラブルシューティング

### ビルドエラー

```bash
# キャッシュをクリア
npm run clean
rm -rf node_modules
npm install
```

### ポート競合

開発サーバーのポートを変更:
```json
// apps/*/package.json
"dev": "next dev --port <新しいポート>"
```

### Turbopack警告

`next.config.mjs`の`turbopack.root`設定を確認してください。

## 📚 参考資料

- [Next.js 16 Documentation](https://nextjs.org/docs)
- [Turborepo Documentation](https://turbo.build/repo/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)

## 🔗 関連リンク

- Marketing Site: https://nightbase.jp
- App Site: https://app.nightbase.jp
- GitHub: <repository-url>

## 📝 ライセンス

Proprietary
