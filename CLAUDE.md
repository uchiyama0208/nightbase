# CLAUDE.md - Claude Code用ルール

このファイルはClaude Codeがコーディングする際に従うべきルールを記述します。

---

## 前提

- フレームワーク: **Next.js App Router**
- 言語: **TypeScript**
- UI 基盤: **Tailwind CSS + shadcn/ui**
- ダークモード: `class` 切り替え（`dark:` プレフィックス）
- ページはすべて **業務アプリっぽいモダンな見た目**（Linear / Notion / Vercel 風）

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

- **正しい日時取得方法:**
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

- **共通ユーティリティ関数（`@/lib/utils`）:**
  - `formatJSTDate(dateString)` - 日付を "YYYY/MM/DD" 形式で表示
  - `formatJSTTime(dateString)` - 時刻を "HH:mm" 形式で表示
  - `formatJSTDateTime(dateString)` - 日時を "YYYY/MM/DD HH:mm" 形式で表示
  - `getJSTDateString(date?)` - 日付を "YYYY-MM-DD" 形式で取得（DB保存用）

- **date-fnsの`format()`は原則使用禁止**
  - タイムゾーン指定ができないため、代わりに上記のユーティリティ関数を使用すること

---

## デザインコンセプト

- **モダンでシンプルな業務アプリ**
- 角丸・余白・行間をしっかりとり、詰め込みすぎない
- ライトモード: 「白 + 薄いグレー + ブランドブルー」
- ダークモード: 「濃いネイビー / スレート + アクセントブルー」
- 影は控えめに、**カードの境界は「角丸 + 薄いボーダー」メイン**

---

## デザイントークン

### 角丸（Border Radius）
- コンテナ要素（Card, Dialog, Table Wrapper）: `rounded-3xl`（24px）
- 入力要素（Input, Select, Button）: `rounded-full` または `rounded-2xl`
- 小さな要素（Checkbox, Badge）: `rounded-md` 〜 `rounded-full`

### 背景色
- カード: `bg-white dark:bg-gray-900`
- アプリ全体: `bg-slate-50 dark:bg-slate-950`

### テキスト色
- ベース文字: `text-gray-900 dark:text-gray-100`
- 補足説明: `text-muted-foreground` または `text-gray-500 dark:text-gray-400`

### ボーダー
- 標準: `border-gray-200 dark:border-gray-700`

---

## コンポーネントルール

### ボタン（shadcn Button）
原則として shadcn/ui の `<Button>` を使う。生の `<button>` を直接スタイルしない。

```tsx
// Primary
<Button className="rounded-lg px-4 py-2 text-sm font-medium">
  保存する
</Button>

// Secondary
<Button variant="outline" className="rounded-lg">
  キャンセル
</Button>

// Destructive
<Button variant="destructive" className="rounded-lg">
  削除する
</Button>

// Icon Button (丸いプラスボタンなど)
<Button
  size="icon"
  className="h-10 w-10 rounded-full bg-blue-600 text-white hover:bg-blue-700 border-none shadow-md transition-all hover:scale-105 active:scale-95"
>
  <Plus className="h-5 w-5" />
</Button>
```

### 入力フォーム
```tsx
<div className="space-y-1.5">
  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
    ラベル
  </label>
  <Input
    placeholder="テキストを入力"
    className="h-9 rounded-lg border-gray-200 bg-white text-sm
               focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0
               dark:border-gray-700 dark:bg-gray-900"
  />
</div>
```

### モーダル（Dialog）
```tsx
<DialogContent className="max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-xl
                          dark:border-gray-800 dark:bg-gray-900">
  <DialogHeader className="space-y-1.5">
    <DialogTitle className="text-base font-semibold text-gray-900 dark:text-gray-50">
      モーダルタイトル
    </DialogTitle>
  </DialogHeader>
  {/* 本文内容 */}
  <DialogFooter className="mt-4 flex justify-end gap-2">
    {/* ボタンたち */}
  </DialogFooter>
</DialogContent>
```

---

## テーブルコンポーネントテンプレート

テーブルを作成する際は以下のテンプレートを使用すること：

```tsx
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

// 外側のラッパー: 角丸、ボーダー、白背景
<div className="overflow-hidden rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
    <Table>
        <TableHeader>
            <TableRow className="bg-gray-50 dark:bg-gray-800/50">
                {/* 各列は均等幅(w-1/N)、中央揃え */}
                <TableHead className="w-1/5 text-center text-gray-900 dark:text-gray-100">列名1</TableHead>
                <TableHead className="w-1/5 text-center text-gray-900 dark:text-gray-100">列名2</TableHead>
                {/* ... */}
            </TableRow>
        </TableHeader>
        <TableBody>
            {/* 空の場合 */}
            {items.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        データがありません
                    </TableCell>
                </TableRow>
            ) : (
                items.map(item => (
                    <TableRow
                        key={item.id}
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                        onClick={() => handleClick(item)}
                    >
                        <TableCell className="text-center text-gray-900 dark:text-gray-100">
                            {item.field1}
                        </TableCell>
                        <TableCell className="text-center text-gray-900 dark:text-gray-100">
                            {item.field2}
                        </TableCell>
                        {/* ... */}
                    </TableRow>
                ))
            )}
        </TableBody>
    </Table>
</div>
```

**ポイント:**
- 外側ラッパー: `rounded-3xl`, `border border-gray-200 dark:border-gray-700`, `bg-white dark:bg-gray-900`, `overflow-hidden`
- ヘッダー行: `bg-gray-50 dark:bg-gray-800/50`
- 各セル: 均等幅 (`w-1/N`)、`text-center`、`text-gray-900 dark:text-gray-100`
- ホバー: `hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors`
- クリック可能な行: `cursor-pointer`

---

## トグルボタンテンプレート

```tsx
const [activeIndex, setActiveIndex] = useState(0);

<div className="relative inline-flex h-10 items-center rounded-full bg-gray-100 dark:bg-gray-800 p-1">
    <div
        className="absolute h-8 rounded-full bg-white dark:bg-gray-700 shadow-sm transition-transform duration-300 ease-in-out"
        style={{
            width: "80px",
            left: "4px",
            transform: `translateX(calc(${activeIndex} * (80px + 0px)))`
        }}
    />
    <button
        type="button"
        onClick={() => setActiveIndex(0)}
        className={`relative z-10 w-20 flex items-center justify-center h-8 rounded-full text-sm font-medium transition-colors duration-200 ${activeIndex === 0 ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}
    >
        オプション1
    </button>
    <button
        type="button"
        onClick={() => setActiveIndex(1)}
        className={`relative z-10 w-20 flex items-center justify-center h-8 rounded-full text-sm font-medium transition-colors duration-200 ${activeIndex === 1 ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}
    >
        オプション2
    </button>
</div>
```

---

## コーディングルール

- 必ず既存の shadcn コンポーネントを優先使用する（Button, Input, Select, Dialog, Table, Sheet, Tabs など）
- 新しいコンポーネントは **必ず dark: スタイルも定義する**
- デザインを壊す可能性のあることは禁止：
  - 独自の `bg-` を多用しない
  - `rounded-none`, `border-0` でフラットにしない
  - 影を強くしすぎない（`shadow-lg` 以上は禁止）

---

## Supabase接続方法

ターミナルからSupabaseに接続する際は以下のコマンドを使用すること：

```bash
/usr/local/opt/libpq/bin/psql "postgresql://postgres.ghjuspyjqlmjlqvfstmz:abokado2000%21@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres"
```

**注意:**
- パスワードに `!` が含まれるため、URLエンコード（`%21`）が必要
- 接続文字列形式: `postgresql://postgres.{project_ref}:{password}@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres`

**SQLファイルを実行する例:**
```bash
/usr/local/opt/libpq/bin/psql "postgresql://postgres.ghjuspyjqlmjlqvfstmz:abokado2000%21@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres" -f path/to/file.sql
```

**ヒアドキュメントでSQLを実行する例:**
```bash
/usr/local/opt/libpq/bin/psql "postgresql://postgres.ghjuspyjqlmjlqvfstmz:abokado2000%21@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres" << 'EOF'
SELECT * FROM public.users;
EOF
```
