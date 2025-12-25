# コーディングルール

## 基本方針

- 必ず既存の shadcn コンポーネントを優先使用する（Button, Input, Select, Dialog, Table, Sheet, Tabs など）
- 新しいコンポーネントは **必ず dark: スタイルも定義する**
- デザインを壊す可能性のあることは禁止：
  - 独自の `bg-` を多用しない
  - `rounded-none`, `border-0` でフラットにしない
  - 影を強くしすぎない（`shadow-lg` 以上は禁止）

---

## 禁止事項

- **ブラウザ標準のダイアログ（`confirm()`, `alert()`, `prompt()`）は一切使用禁止**
  - 確認・警告・入力が必要な場合は、必ず shadcn/ui の `<Dialog>` コンポーネントを使用してモーダルを実装すること

---

## レイアウトルール

- **ボタンが複数縦に並ぶ場合は必ず `gap-2` を適用する**
  - `DialogFooter` や縦並びのボタングループには `className="gap-2"` を付与すること

---

## タイムゾーンルール

- **すべての日時処理は日本時間（JST / Asia/Tokyo）を使用すること**
  - `date.getHours()`, `date.getMinutes()` などは使用禁止（UTCで返される）
  - `new Date().toISOString().split("T")[0]` で日付を取得するのは禁止（UTCで返される）
  - `date.getTime() + 9 * 60 * 60 * 1000` のようなハックは禁止

### 正しい日時取得方法

```typescript
// 日付文字列（YYYY-MM-DD）を取得
new Date().toLocaleDateString("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).replace(/\//g, "-");

// 時刻を表示
date.toLocaleTimeString("ja-JP", {
  timeZone: "Asia/Tokyo",
  hour: "2-digit",
  minute: "2-digit",
});

// 日時を表示
date.toLocaleString("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

// JSTの時/分を取得
const jstDate = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
const hours = jstDate.getHours();
const minutes = jstDate.getMinutes();
```

### 共通ユーティリティ関数（`@/lib/utils`）

- `formatJSTDate(dateString)` - 日付を "YYYY/MM/DD" 形式で表示
- `formatJSTTime(dateString)` - 時刻を "HH:mm" 形式で表示
- `formatJSTDateTime(dateString)` - 日時を "YYYY/MM/DD HH:mm" 形式で表示
- `getJSTDateString(date?)` - 日付を "YYYY-MM-DD" 形式で取得（DB保存用）

### 禁止

- **date-fnsの`format()`は原則使用禁止**
  - タイムゾーン指定ができないため、代わりに上記のユーティリティ関数を使用すること

---

## Supabase Storage ルール

- **RLSポリシー作成時に「Verify JWT with legacy secret」をオンにしない**
  - このオプションがオンになっているとアップロードが失敗する
  - SQLでポリシーを作成する場合はデフォルトでオフなので問題ない
  - Supabaseダッシュボードから手動で作成する場合は注意

---

## Supabase接続方法

ターミナルからSupabaseに接続する際は以下のコマンドを使用すること：

```bash
/usr/local/opt/libpq/bin/psql "postgresql://postgres.ghjuspyjqlmjlqvfstmz:abokado2000%21@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres"
```

**注意:**
- パスワードに `!` が含まれるため、URLエンコード（`%21`）が必要
- 接続文字列形式: `postgresql://postgres.{project_ref}:{password}@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres`

### SQLファイルを実行する例

```bash
/usr/local/opt/libpq/bin/psql "postgresql://postgres.ghjuspyjqlmjlqvfstmz:abokado2000%21@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres" -f path/to/file.sql
```

### ヒアドキュメントでSQLを実行する例

```bash
/usr/local/opt/libpq/bin/psql "postgresql://postgres.ghjuspyjqlmjlqvfstmz:abokado2000%21@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres" << 'EOF'
SELECT * FROM public.users;
EOF
```
